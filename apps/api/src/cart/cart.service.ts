import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } },
      });
    }
    return cart;
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    if (quantity <= 0) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
      return this.getOrCreateCart(userId);
    }
    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity },
    });
    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
    return this.getOrCreateCart(userId);
  }
}
