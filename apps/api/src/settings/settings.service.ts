import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_REF_DEPTH_HARD = 2; // 代码层锁死

@Injectable()
export class SettingsService {
  private cache: Record<string, unknown> = {};

  constructor(private prisma: PrismaService) {}

  async loadFromDb() {
    const rows = await this.prisma.systemSetting.findMany();
    for (const row of rows) {
      try {
        this.cache[row.key] = JSON.parse(row.valueJson);
      } catch {
        this.cache[row.key] = row.valueJson;
      }
    }
  }

  get<T = unknown>(key: string): T | undefined {
    if (this.cache[key] !== undefined) return this.cache[key] as T;
    const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '');
    const env = process.env[envKey];
    if (env !== undefined) {
      if (env === 'true') return true as T;
      if (env === 'false') return false as T;
      if (/^\d+$/.test(env)) return Number(env) as T;
      if (/^\d+\.\d+$/.test(env)) return Number(env) as T;
      return env as T;
    }
    return undefined;
  }

  getFeature(name: string): boolean {
    const features = this.get<Record<string, boolean>>('features') || {};
    return features[name] === true;
  }

  getCompliance() {
    const c = this.get<{ maxReferralDepth?: number; supplierViewMaskPhone?: boolean; auditLogRetentionDays?: number }>('compliance') || {};
    return {
      maxReferralDepth: Math.min(c.maxReferralDepth ?? MAX_REF_DEPTH_HARD, MAX_REF_DEPTH_HARD),
      supplierViewMaskPhone: c.supplierViewMaskPhone ?? true,
      auditLogRetentionDays: c.auditLogRetentionDays ?? 365,
    };
  }

  getCommission() {
    const commission = this.get<{
      level1Rate?: number;
      level2Rate?: number;
      triggerStatus?: string;
      freezeDays?: number;
      withdrawal?: { minAmount?: number; feeRate?: number; reviewMode?: string; dailyLimit?: number };
    }>('commission') || {};
    return {
      level1Rate: commission.level1Rate ?? Number(process.env.COMMISSION_LEVEL1_RATE) ?? 0.18,
      level2Rate: commission.level2Rate ?? Number(process.env.COMMISSION_LEVEL2_RATE) ?? 0.06,
      triggerStatus: commission.triggerStatus ?? process.env.COMMISSION_TRIGGER_STATUS ?? 'COMPLETED',
      freezeDays: commission.freezeDays ?? Number(process.env.COMMISSION_FREEZE_DAYS) ?? 10,
      withdrawal: {
        minAmount: commission.withdrawal?.minAmount ?? Number(process.env.WITHDRAW_MIN_AMOUNT) ?? 200,
        feeRate: commission.withdrawal?.feeRate ?? Number(process.env.WITHDRAW_FEE_RATE) ?? 0,
        reviewMode: commission.withdrawal?.reviewMode ?? process.env.WITHDRAW_REVIEW_MODE ?? 'MANUAL',
        dailyLimit: commission.withdrawal?.dailyLimit ?? Number(process.env.WITHDRAW_DAILY_LIMIT) ?? 20000,
      },
    };
  }

  maxReferralDepth(): number {
    return Math.min(
      this.getCompliance().maxReferralDepth,
      MAX_REF_DEPTH_HARD,
    );
  }
}
