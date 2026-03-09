import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || 'dev-secret-change-me',
    });
  }

  async validate(payload: { sub: string }) {
    const userId = typeof payload.sub === 'string' ? payload.sub : String(payload.sub);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[JwtStrategy] validate, sub:', userId, 'type:', typeof payload.sub);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        const superAdmin = await this.prisma.user.findFirst({
          where: { role: { code: RoleCode.SUPER_ADMIN } },
          include: { role: true },
        });
        if (superAdmin && superAdmin.id === userId) {
          console.log('[JwtStrategy] 按 id 未查到，按 SUPER_ADMIN 兜底成功');
          return superAdmin;
        }
        console.log('[JwtStrategy] 用户不存在 id=', userId, '库里超级管理员 id=', superAdmin?.id);
      }
      throw new UnauthorizedException();
    }
    return user;
  }
}
