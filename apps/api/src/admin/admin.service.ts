import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderService } from '../order/order.service';
import { WithdrawalService } from '../commission/withdrawal.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private order: OrderService,
    private withdrawal: WithdrawalService,
  ) {}

  async listCategories() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async listProducts(includeInactive = true) {
    return this.prisma.product.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(data: {
    sku: string;
    name: string;
    description?: string;
    imageUrl?: string;
    supplierPrice: number | string;
    retailPrice: number | string;
    inventory?: number;
    categoryId?: string;
    isActive?: boolean;
  }) {
    return this.prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        supplierPrice: new Decimal(data.supplierPrice),
        retailPrice: new Decimal(data.retailPrice),
        inventory: data.inventory ?? 0,
        categoryId: data.categoryId ?? null,
        isActive: data.isActive ?? true,
      },
      include: { category: true },
    });
  }

  async updateProduct(
    id: string,
    data: {
      sku?: string;
      name?: string;
      description?: string;
      imageUrl?: string;
      supplierPrice?: number | string;
      retailPrice?: number | string;
      inventory?: number;
      categoryId?: string | null;
      isActive?: boolean;
    },
  ) {
    const payload: Record<string, unknown> = {};
    if (data.sku !== undefined) payload.sku = data.sku;
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl;
    if (data.supplierPrice !== undefined) payload.supplierPrice = new Decimal(data.supplierPrice);
    if (data.retailPrice !== undefined) payload.retailPrice = new Decimal(data.retailPrice);
    if (data.inventory !== undefined) payload.inventory = data.inventory;
    if (data.categoryId !== undefined) payload.categoryId = data.categoryId;
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    return this.prisma.product.update({
      where: { id },
      data: payload as never,
      include: { category: true },
    });
  }

  async getDashboard() {
    const [orderCount, userCount, productCount] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.product.count(),
    ]);
    const gmv = await this.prisma.order.aggregate({
      where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
      _sum: { payAmount: true },
    });
    return {
      orderCount,
      userCount,
      productCount,
      gmv: gmv._sum.payAmount?.toString() ?? '0',
    };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        email: true,
        inviteCode: true,
        reviewStatus: true,
        createdAt: true,
        role: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async listOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, phone: true, email: true } }, items: { include: { product: true } } },
      take: 100,
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    if (status === OrderStatus.COMPLETED) {
      await this.order.complete(orderId);
      return this.prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { product: true } } },
    });
  }

  async listCommissions() {
    return this.prisma.commission.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, phone: true, email: true } }, order: { select: { orderNo: true, payAmount: true } } },
      take: 200,
    });
  }

  async listWithdrawals() {
    return this.withdrawal.listAll();
  }

  async reviewWithdrawal(id: string, status: 'APPROVED' | 'REJECTED', reviewedBy?: string) {
    return this.withdrawal.review(id, status, reviewedBy);
  }
}
