import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionService } from './commission.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class CommissionCronService {
  constructor(
    private prisma: PrismaService,
    private commission: CommissionService,
  ) {}

  @Cron(process.env.CRON_SETTLEMENT || '0 3 * * *')
  async settlement() {
    const completed = await this.prisma.order.findMany({
      where: { status: OrderStatus.COMPLETED },
      select: { id: true },
    });
    for (const o of completed) {
      await this.commission.runSettlementForOrder(o.id);
    }
  }

  @Cron(process.env.CRON_FREEZE_EXPIRE || '30 3 * * *')
  async freezeExpire() {
    await this.commission.releaseFrozenCommissions();
  }
}
