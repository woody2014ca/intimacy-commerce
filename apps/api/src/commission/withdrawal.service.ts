import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CommissionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WithdrawalService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  /** 用户可提现余额：已释放佣金 - 已通过/已打款提现 */
  async getAvailableBalance(userId: string): Promise<number> {
    const released = await this.prisma.commission.aggregate({
      where: { userId, status: CommissionStatus.RELEASED },
      _sum: { amount: true },
    });
    const withdrawn = await this.prisma.withdrawal.aggregate({
      where: { userId, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { amount: true },
    });
    const r = Number(released._sum.amount ?? 0);
    const w = Number(withdrawn._sum.amount ?? 0);
    return Math.max(0, r - w);
  }

  async create(userId: string, amount: number) {
    const cfg = this.settings.getCommission();
    const min = cfg.withdrawal?.minAmount ?? 200;
    const dailyLimit = cfg.withdrawal?.dailyLimit ?? 20000;
    if (amount < min) throw new Error(`单笔最低提现 ¥${min}`);
    const available = await this.getAvailableBalance(userId);
    if (amount > available) throw new Error('可提现余额不足');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySum = await this.prisma.withdrawal.aggregate({
      where: { userId, status: { in: ['PENDING', 'APPROVED', 'PAID'] }, createdAt: { gte: todayStart } },
      _sum: { amount: true },
    });
    const todayTotal = Number(todaySum._sum.amount ?? 0);
    if (todayTotal + amount > dailyLimit) throw new Error(`超过每日提现上限 ¥${dailyLimit}`);
    const feeRate = cfg.withdrawal?.feeRate ?? 0;
    const fee = new Decimal(amount * feeRate);
    return this.prisma.withdrawal.create({
      data: { userId, amount: new Decimal(amount), fee },
    });
  }

  async listByUser(userId: string) {
    return this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll() {
    return this.prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, phone: true, email: true } } },
      take: 200,
    });
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', reviewedBy?: string) {
    const w = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!w || w.status !== 'PENDING') throw new Error('该提现单不可审核');
    return this.prisma.withdrawal.update({
      where: { id },
      data: { status, reviewedBy: reviewedBy ?? null, reviewedAt: new Date() },
    });
  }
}
