import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CommissionStatus, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const MAX_REF_DEPTH = 2;

@Injectable()
export class CommissionService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async runSettlementForOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order || order.status !== OrderStatus.COMPLETED) return;

    const cfg = this.settings.getCommission();
    if (cfg.triggerStatus !== 'COMPLETED') return;

    const relations = await this.prisma.referralRelation.findMany({
      where: { userId: order.userId },
      include: { parent: true },
    });
    if (relations.length > MAX_REF_DEPTH) {
      console.error(`[Commission] Alert: order ${orderId} has referral depth > ${MAX_REF_DEPTH}`);
      return;
    }

    const payAmount = Number(order.payAmount);
    const snapshot = {
      orderId: order.id,
      orderNo: order.orderNo,
      payAmount,
      level1Rate: cfg.level1Rate,
      level2Rate: cfg.level2Rate,
      freezeDays: cfg.freezeDays,
      at: new Date().toISOString(),
    };

    const freezeEndsAt = new Date();
    freezeEndsAt.setDate(freezeEndsAt.getDate() + cfg.freezeDays);

    for (const rel of relations) {
      if (rel.level < 1 || rel.level > MAX_REF_DEPTH) continue;
      const rate = rel.level === 1 ? cfg.level1Rate : cfg.level2Rate;
      const amount = new Decimal(payAmount * rate);
      const snapshotJson = JSON.stringify({ ...snapshot, beneficiaryId: rel.parentId, level: rel.level, rate, amount: amount.toNumber() });

      const existing = await this.prisma.commission.findUnique({
        where: {
          orderId_userId_level: { orderId: order.id, userId: rel.parentId, level: rel.level },
        },
      });
      if (existing) continue;

      await this.prisma.commission.create({
        data: {
          orderId: order.id,
          userId: rel.parentId,
          level: rel.level,
          amount,
          status: CommissionStatus.FROZEN,
          snapshotJson,
          freezeEndsAt,
        },
      });
    }
  }

  async releaseFrozenCommissions(): Promise<void> {
    const cfg = this.settings.getCommission();
    const now = new Date();
    await this.prisma.commission.updateMany({
      where: {
        status: CommissionStatus.FROZEN,
        freezeEndsAt: { lte: now },
      },
      data: {
        status: CommissionStatus.RELEASED,
        releasedAt: now,
      },
    });
  }

  async listByUser(userId: string) {
    return this.prisma.commission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { orderNo: true, payAmount: true } } },
    });
  }
}
