import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RoleCode } from '@prisma/client';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(phoneOrEmail: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: phoneOrEmail }, { email: phoneOrEmail }],
      },
      include: { role: true },
    });
    if (!user || !user.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return user;
  }

  async login(phoneOrEmail: string, password: string) {
    const account = String(phoneOrEmail || '').trim();
    const pwd = String(password || '').trim();

    // 开发环境：超级管理员 18800000000 / Admin123! 直接放行（不依赖数据库密码）
    if (process.env.NODE_ENV !== 'production' && (account === '18800000000' || account === 'superadmin@example.com') && pwd === 'Admin123!') {
      const role = await this.prisma.role.findUnique({ where: { code: RoleCode.SUPER_ADMIN } });
      if (role) {
        const superAdmin = await this.prisma.user.findFirst({
          where: { roleId: role.id },
          include: { role: true },
        });
        if (superAdmin) {
          console.log('[Auth] 开发环境放行，超级管理员登录成功');
          return this.issueTokens(superAdmin);
        }
      }
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ phone: account }, { email: account }] },
      include: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException('手机号/邮箱或密码错误');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('手机号/邮箱或密码错误');
    }
    const ok = await bcrypt.compare(pwd, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('手机号/邮箱或密码错误');
    }
    if (user.reviewStatus !== 'APPROVED' && user.role?.code !== 'SUPER_ADMIN' && user.role?.code !== 'ADMIN') {
      throw new UnauthorizedException('账号待审核');
    }
    return this.issueTokens(user);
  }

  /** 仅开发环境：重置超级管理员密码为 Admin123!，便于登录 */
  async devResetSuperAdminPassword(): Promise<{ ok: boolean; message: string }> {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, message: '仅开发环境可用' };
    }
    const { RoleCode } = await import('@prisma/client');
    const role = await this.prisma.role.findUnique({ where: { code: RoleCode.SUPER_ADMIN } });
    if (!role) return { ok: false, message: '未找到 SUPER_ADMIN 角色' };
    const user = await this.prisma.user.findFirst({ where: { roleId: role.id } });
    if (!user) return { ok: false, message: '未找到超级管理员用户' };
    const newHash = await bcrypt.hash('Admin123!', SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
    return { ok: true, message: '超级管理员密码已重置为 Admin123!，请用 18800000000 / Admin123! 登录' };
  }

  async issueTokens(user: { id: string; phone: string | null; email: string | null; role?: { code: string } | null }) {
    const payload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role?.code ?? 'CUSTOMER',
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      },
    );
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  async register(data: { phone?: string; email?: string; password: string; inviteCode?: string }) {
    const inviter = data.inviteCode
      ? await this.prisma.user.findUnique({ where: { inviteCode: data.inviteCode } })
      : null;
    const inviteCode = this.generateInviteCode();
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const reviewRequired = process.env.LOGIN_REVIEW_ENABLED === 'true';
    const user = await this.prisma.user.create({
      data: {
        phone: data.phone,
        email: data.email,
        passwordHash,
        inviteCode,
        inviterId: inviter?.id,
        reviewStatus: reviewRequired ? 'PENDING' : 'APPROVED',
        mustChangePwd: false,
      },
      include: { role: true },
    });
    if (inviter) {
      await this.ensureReferralRelations(user.id, inviter.id);
    }
    return this.issueTokens(user);
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  private async ensureReferralRelations(inviteeId: string, inviterId: string) {
    const MAX_DEPTH = 2;
    const existing = await this.prisma.referralRelation.findMany({
      where: { userId: inviterId },
      orderBy: { level: 'asc' },
    });
    const toCreate: { userId: string; parentId: string; level: number }[] = [
      { userId: inviteeId, parentId: inviterId, level: 1 },
    ];
    for (const rel of existing) {
      if (rel.level < MAX_DEPTH) {
        toCreate.push({ userId: inviteeId, parentId: rel.parentId, level: rel.level + 1 });
      }
    }
    for (const r of toCreate) {
      await this.prisma.referralRelation.upsert({
        where: {
          userId_parentId: { userId: inviteeId, parentId: r.parentId },
        },
        create: r,
        update: {},
      });
    }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET,
      });
      if (payload.type !== 'refresh') throw new Error();
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });
      if (!user) throw new UnauthorizedException();
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token invalid');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}
