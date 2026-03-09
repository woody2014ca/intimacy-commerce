import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        inviteCode: true,
        level: true,
        reviewStatus: true,
        privacyMode: true,
        createdAt: true,
      },
    });
    return user;
  }

  /** 积分：当前余额 + 最近明细 */
  async getPoints(userId: string) {
    const last = await this.prisma.pointsLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const ledger = await this.prisma.pointsLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { balance: last?.balance ?? 0, ledger };
  }

  /** 我领取的优惠券列表（未使用） */
  async getClaimedCoupons(userId: string) {
    return this.prisma.couponClaim.findMany({
      where: { userId, usedAt: null },
      include: { coupon: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 通过券码领取优惠券 */
  async claimCouponByCode(userId: string, code: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), enabled: true },
    });
    if (!coupon) throw new Error('优惠券不存在或已失效');
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) throw new Error('优惠券未到可用时间');
    if (coupon.validTo && now > coupon.validTo) throw new Error('优惠券已过期');
    if (coupon.totalQuantity != null && coupon.claimedCount >= coupon.totalQuantity) throw new Error('优惠券已领完');
    const existing = await this.prisma.couponClaim.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (existing) throw new Error('您已领取过该优惠券');
    const limit = coupon.claimLimitPerUser ?? 1;
    const count = await this.prisma.couponClaim.count({ where: { userId, couponId: coupon.id } });
    if (count >= limit) throw new Error('已达领取上限');
    await this.prisma.$transaction([
      this.prisma.couponClaim.create({ data: { couponId: coupon.id, userId } }),
      this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { claimedCount: { increment: 1 } },
      }),
    ]);
    return this.getClaimedCoupons(userId);
  }
}
