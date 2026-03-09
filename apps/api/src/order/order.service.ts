import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionService } from '../commission/commission.service';
import { OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private commission: CommissionService,
  ) {}

  async create(userId: string, items: { productId: string; quantity: number }[], couponId?: string) {
    const orderNo = 'O' + Date.now() + Math.random().toString(36).slice(2, 8).toUpperCase();
    let totalAmount = new Decimal(0);
    const orderItems: { productId: string; quantity: number; price: Decimal; total: Decimal }[] = [];
    for (const item of items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.inventory < item.quantity) throw new Error('库存不足');
      const price = product.retailPrice;
      const total = price.mul(item.quantity);
      totalAmount = totalAmount.add(total);
      orderItems.push({ productId: product.id, quantity: item.quantity, price, total });
    }
    const order = await this.prisma.order.create({
      data: {
        orderNo,
        userId,
        status: OrderStatus.CREATED,
        totalAmount,
        payAmount: totalAmount,
        couponId,
        items: {
          create: orderItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            total: i.total,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
    for (const item of order.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { inventory: { decrement: item.quantity } },
      });
    }
    return order;
  }

  async pay(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order || order.status !== OrderStatus.CREATED) throw new Error('订单无效');
    const sandboxSuccess = process.env.PAY_SANDBOX_SUCCESS !== 'false';
    if (sandboxSuccess) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });
    }
    return this.prisma.order.findUnique({ where: { id: orderId } });
  }

  async complete(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.status !== OrderStatus.PAID) return null;
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED },
    });
    await this.commission.runSettlementForOrder(orderId);
    return this.prisma.order.findUnique({ where: { id: orderId } });
  }

  async listByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    });
  }
}
