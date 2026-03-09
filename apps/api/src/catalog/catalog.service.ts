import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async listProducts() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(idOrSku: string) {
    return this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSku }, { sku: idOrSku }], isActive: true },
      include: { category: true },
    });
  }

  async listContent() {
    return this.prisma.contentPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
