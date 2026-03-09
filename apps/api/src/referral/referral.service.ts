import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_DEPTH = 2;

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  async getMyReferralInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    });
    const relations = await this.prisma.referralRelation.findMany({
      where: { parentId: userId },
      include: { user: { select: { id: true, phone: true, createdAt: true } } },
    });
    return {
      inviteCode: user?.inviteCode,
      level1Count: relations.filter((r) => r.level === 1).length,
      level2Count: relations.filter((r) => r.level === 2).length,
      relations: relations.slice(0, 50),
    };
  }
}
