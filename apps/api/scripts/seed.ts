/**
 * Seed script: reads default-settings.seed.json, populates system settings,
 * default coupons, VIP plan, primary product, roles, and admin/test users.
 * Run: pnpm seed (from repo root)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config(); // also load apps/api/.env if present

import { PrismaClient, RoleCode } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function loadDefaultSettings(): Promise<Record<string, unknown>> {
  const paths = [
    path.join(__dirname, '../../default-settings.seed.json'),
    path.join(process.cwd(), 'default-settings.seed.json'),
    path.join(process.cwd(), '../default-settings.seed.json'),
    path.join(process.cwd(), '../../default-settings.seed.json'),
  ].map((p) => path.resolve(p));
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw) as Record<string, unknown>;
    }
  }
  throw new Error('default-settings.seed.json not found. Tried: ' + paths.join('; '));
}

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  const dbHint = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@').replace(/\?.*$/, '') : '(未设置)';
  console.log('Seed 使用的 DB:', dbHint);

  const settings = await loadDefaultSettings();

  // 1) System settings (key-value)
  const keys = [
    'features',
    'compliance',
    'product',
    'commission',
    'marketing',
    'membership',
    'loginReview',
    'shippingPrivacy',
    'observability',
  ];
  for (const key of keys) {
    const value = (settings as Record<string, unknown>)[key];
    if (value === undefined) continue;
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, valueJson: JSON.stringify(value) },
      update: { valueJson: JSON.stringify(value) },
    });
  }
  console.log('System settings upserted.');

  // 2) Roles
  const roleDefs: { code: RoleCode; name: string; permissions: string[] }[] = [
    { code: 'SUPER_ADMIN', name: '超级管理员', permissions: ['*'] },
    { code: 'ADMIN', name: '运营管理员', permissions: ['product', 'order', 'content', 'marketing', 'user'] },
    { code: 'FINANCE', name: '财务', permissions: ['commission', 'withdrawal', 'export'] },
    { code: 'OPERATOR', name: '客服/运营', permissions: ['order', 'user'] },
    { code: 'SUPPLIER_VIEW', name: '供货方只读', permissions: ['order_view', 'inventory'] },
    { code: 'CUSTOMER', name: '用户', permissions: [] },
  ];
  const roleIds: Record<string, string> = {};
  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      create: { code: r.code, name: r.name, permissions: r.permissions },
      update: { name: r.name, permissions: r.permissions },
    });
    roleIds[r.code] = role.id;
  }
  console.log('Roles upserted.');

  // 3) Default coupons from marketing.coupons
  const marketing = settings.marketing as { coupons?: Array<{ code: string; name: string; type: string; amountOff: number; minOrderAmount: number; validDays: number; claimLimitPerUser: number; enabled: boolean }> };
  if (marketing?.coupons?.length) {
    for (const c of marketing.coupons) {
      const validTo = new Date();
      validTo.setDate(validTo.getDate() + (c.validDays || 30));
      await prisma.coupon.upsert({
        where: { code: c.code },
        create: {
          code: c.code,
          name: c.name,
          type: c.type || 'AMOUNT_OFF',
          amountOff: c.amountOff,
          minOrderAmount: c.minOrderAmount,
          validTo,
          claimLimitPerUser: c.claimLimitPerUser ?? 1,
          enabled: c.enabled !== false,
        },
        update: {
          name: c.name,
          amountOff: c.amountOff,
          minOrderAmount: c.minOrderAmount,
          validTo,
          claimLimitPerUser: c.claimLimitPerUser ?? 1,
          enabled: c.enabled !== false,
        },
      });
    }
    console.log('Coupons upserted.');
  }

  // 4) VIP plan from membership.plans
  const membership = settings.membership as { plans?: Array<{ code: string; name: string; price: number; durationDays: number; benefits: Record<string, unknown>; enabled: boolean }> };
  if (membership?.plans?.length) {
    for (const p of membership.plans) {
      await prisma.membershipPlan.upsert({
        where: { code: p.code },
        create: {
          code: p.code,
          name: p.name,
          price: p.price,
          durationDays: p.durationDays,
          benefitsJson: JSON.stringify(p.benefits || {}),
          enabled: p.enabled !== false,
        },
        update: {
          name: p.name,
          price: p.price,
          durationDays: p.durationDays,
          benefitsJson: JSON.stringify(p.benefits || {}),
          enabled: p.enabled !== false,
        },
      });
    }
    console.log('Membership plans upserted.');
  }

  // 5) Primary product
  const productCfg = settings.product as { primarySku?: string; primaryName?: string; primaryPrice?: number };
  const sku = productCfg?.primarySku || 'GIFTBOX-2180';
  const productName = productCfg?.primaryName || '亲密升级礼盒（调情香氛套装）';
  const price = productCfg?.primaryPrice ?? 2180;
  await prisma.product.upsert({
    where: { sku },
    create: {
      sku,
      name: productName,
      description: '高端礼盒，调情香氛套装',
      supplierPrice: price * 0.5,
      retailPrice: price,
      inventory: 100,
      limitPerUser: 2,
      limitPeriod: 'DAYS_30',
      isActive: true,
    },
    update: {
      name: productName,
      retailPrice: price,
      isActive: true,
    },
  });
  console.log('Primary product upserted:', sku);

  // 6) Admin users (one per role except CUSTOMER)
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'OPERATOR', 'SUPPLIER_VIEW'];
  const defaultPwd = 'ChangeMe123!';
  const hashedDefault = await bcrypt.hash(defaultPwd, SALT_ROUNDS);

  for (const code of adminRoles) {
    const email = code === 'SUPER_ADMIN'
      ? (process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || 'superadmin@example.com')
      : `${code.toLowerCase()}@example.com`;
    const phone = code === 'SUPER_ADMIN'
      ? (process.env.BOOTSTRAP_SUPER_ADMIN_PHONE || '18800000000')
      : undefined;
    const inviteCode = code.toUpperCase().slice(0, 4) + Math.random().toString(36).slice(2, 8);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { roleId: roleIds[code] },
      });
      continue;
    }
    await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        passwordHash: hashedDefault,
        inviteCode,
        roleId: roleIds[code],
        reviewStatus: 'APPROVED',
        mustChangePwd: code === 'SUPER_ADMIN' && process.env.BOOTSTRAP_SUPER_ADMIN === 'true',
      },
    });
  }
  console.log('Admin users created (password for non-super:', defaultPwd, ')');

  // 7) Bootstrap SUPER_ADMIN: 固定初始密码便于首次登录（可设 env SUPER_ADMIN_INITIAL_PASSWORD 覆盖）
  if (process.env.BOOTSTRAP_SUPER_ADMIN === 'true') {
    const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || 'superadmin@example.com';
    const phone = process.env.BOOTSTRAP_SUPER_ADMIN_PHONE || '18800000000';
    const superAdmin = await prisma.user.findFirst({
      where: { roleId: roleIds.SUPER_ADMIN },
    });
    if (superAdmin) {
      const initialPwd = process.env.SUPER_ADMIN_INITIAL_PASSWORD || 'Admin123!';
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: {
          passwordHash: await bcrypt.hash(initialPwd, SALT_ROUNDS),
          mustChangePwd: true,
          email,
          phone,
        },
      });
      console.log('\n========================================');
      console.log('SUPER_ADMIN 初始账号（首次登录后请修改密码）');
      console.log('Email:', email);
      console.log('Phone:', phone);
      console.log('初始密码:', initialPwd);
      const verify = await bcrypt.compare(initialPwd, (await prisma.user.findUnique({ where: { id: superAdmin.id }, select: { passwordHash: true } }))!.passwordHash!);
      console.log('密码校验:', verify ? 'OK' : 'FAIL');
      console.log('========================================\n');
    }
  }

  // 8) Test users (CUSTOMER)
  const customerRoleId = roleIds.CUSTOMER;
  for (let i = 1; i <= 3; i++) {
    const inviteCode = 'TEST' + i + Math.random().toString(36).slice(2, 6);
    const exist = await prisma.user.findFirst({ where: { email: `test${i}@example.com` } });
    if (!exist) {
      await prisma.user.create({
        data: {
          email: `test${i}@example.com`,
          phone: `1380000000${i}`,
          passwordHash: await bcrypt.hash('Test123!', SALT_ROUNDS),
          inviteCode,
          roleId: customerRoleId,
          reviewStatus: 'APPROVED',
        },
      });
    }
  }
  console.log('Test users created (test1@example.com ... Test123!)');

  // 9) Sample content
  const contentSlugs = ['intro', 'communication', 'boundaries'];
  for (const slug of contentSlugs) {
    await prisma.contentPost.upsert({
      where: { slug },
      create: {
        title: slug === 'intro' ? '性商教育导论' : (slug === 'communication' ? '沟通与亲密' : '边界与尊重'),
        slug,
        body: '示例内容正文。',
        type: 'ARTICLE',
        isVipOnly: slug !== 'intro',
        publishedAt: new Date(),
      },
      update: {},
    });
  }
  console.log('Sample content created.');

  // 10) 推荐与佣金测试数据：多级用户、推荐关系、已完成订单、佣金、积分、优惠券
  const product = await prisma.product.findUnique({ where: { sku: productCfg?.primarySku || 'GIFTBOX-2180' } });
  if (!product) throw new Error('Primary product not found');
  const level1Rate = (settings.commission as { level1Rate?: number })?.level1Rate ?? 0.18;
  const level2Rate = (settings.commission as { level2Rate?: number })?.level2Rate ?? 0.06;
  const freezeDays = (settings.commission as { freezeDays?: number })?.freezeDays ?? 10;

  const refUsers: { id: string; email: string; inviteCode: string }[] = [];
  const refPwd = await bcrypt.hash('Ref123!', SALT_ROUNDS);

  // 创建 12 个推荐测试用户：ref1 为根，ref2/ref3 为一级，ref4/ref5 为 ref2 下级，ref6/ref7 为 ref3 下级，ref8 为 ref4 下级，ref9 为 ref5，ref10 为 ref6，ref11 为 ref8，ref12 为 ref9
  for (let i = 1; i <= 12; i++) {
    const email = `ref${i}@example.com`;
    const inviteCode = 'REF' + String(i).padStart(2, '0') + Math.random().toString(36).slice(2, 6).toUpperCase();
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      refUsers.push({ id: existing.id, email, inviteCode: existing.inviteCode });
      continue;
    }
    const u = await prisma.user.create({
      data: {
        email,
        phone: `139001000${String(i).padStart(2, '0')}`,
        passwordHash: refPwd,
        inviteCode,
        roleId: customerRoleId,
        reviewStatus: 'APPROVED',
      },
    });
    refUsers.push({ id: u.id, email, inviteCode: u.inviteCode });
  }
  console.log('Referral test users:', refUsers.length, '(ref1@example.com ~ ref12@example.com, 密码 Ref123!)');

  // 推荐关系：(子, 父, level)。ref1 无上级；ref2/ref3 的上级是 ref1；ref4/ref5 的上级是 ref2；ref6/ref7 的上级是 ref3；ref8 的上级是 ref4；ref9->ref5；ref10->ref6；ref11->ref8；ref12->ref9
  const refTree: [number, number, number][] = [
    [2, 1, 1], [3, 1, 1],
    [4, 2, 1], [4, 1, 2], [5, 2, 1], [5, 1, 2],
    [6, 3, 1], [6, 1, 2], [7, 3, 1], [7, 1, 2],
    [8, 4, 1], [8, 2, 2], [9, 5, 1], [9, 2, 2],
    [10, 6, 1], [10, 3, 2], [11, 8, 1], [11, 4, 2],
    [12, 9, 1], [12, 5, 2],
  ];
  for (const [childIdx, parentIdx, level] of refTree) {
    const userId = refUsers[childIdx - 1].id;
    const parentId = refUsers[parentIdx - 1].id;
    await prisma.referralRelation.upsert({
      where: { userId_parentId: { userId, parentId } },
      create: { userId, parentId, level },
      update: {},
    });
  }
  console.log('Referral relations created (level1 + level2).');

  // 已完成订单：由 ref4, ref5, ref6, ref7, ref8, ref9, ref10, ref11, ref12 各下一单，金额 2180，状态 COMPLETED
  const orderCreators = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  const completedOrders: { id: string; userId: string; payAmount: number }[] = [];
  for (const idx of orderCreators) {
    const user = refUsers[idx - 1];
    const orderNo = 'R' + Date.now() + '-' + idx + Math.random().toString(36).slice(2, 6);
    const payAmount = 2180;
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: user.id,
        status: 'COMPLETED',
        totalAmount: payAmount,
        payAmount,
        paidAt: new Date(),
        items: {
          create: [{
            productId: product.id,
            quantity: 1,
            price: payAmount,
            total: payAmount,
          }],
        },
      },
      include: { items: true },
    });
    completedOrders.push({ id: order.id, userId: user.id, payAmount });
  }
  console.log('Completed orders created:', completedOrders.length);

  // 为每个已完成订单结算佣金（一级 18%、二级 6%）
  const freezeEndsAtFuture = new Date();
  freezeEndsAtFuture.setDate(freezeEndsAtFuture.getDate() + freezeDays);
  const freezeEndsAtPast = new Date();
  freezeEndsAtPast.setDate(freezeEndsAtPast.getDate() - 5); // 部分佣金设为“已过冻结期”
  let orderIndex = 0;
  for (const order of completedOrders) {
    const relations = await prisma.referralRelation.findMany({
      where: { userId: order.userId },
      orderBy: { level: 'asc' },
    });
    const usePastFreeze = orderIndex < 4; // 前 4 笔订单的佣金用“已过冻结期”，便于立即释放
    orderIndex++;
    for (const rel of relations) {
      if (rel.level > 2) continue;
      const rate = rel.level === 1 ? level1Rate : level2Rate;
      const amount = Math.round(order.payAmount * rate * 100) / 100;
      const snapshotJson = JSON.stringify({
        orderId: order.id,
        payAmount: order.payAmount,
        level: rel.level,
        rate,
        amount,
        at: new Date().toISOString(),
      });
      await prisma.commission.upsert({
        where: {
          orderId_userId_level: { orderId: order.id, userId: rel.parentId, level: rel.level },
        },
        create: {
          orderId: order.id,
          userId: rel.parentId,
          level: rel.level,
          amount,
          status: 'FROZEN',
          snapshotJson,
          freezeEndsAt: usePastFreeze ? freezeEndsAtPast : freezeEndsAtFuture,
        },
        update: {},
      });
    }
  }
  console.log('Commissions settled (FROZEN, freezeDays=', freezeDays, ').');

  // 将已过冻结期的佣金置为 RELEASED，便于测试提现
  await prisma.commission.updateMany({
    where: { freezeEndsAt: { lte: new Date() } },
    data: { status: 'RELEASED', releasedAt: new Date() },
  });
  console.log('Commissions past freeze date released (for withdrawal test).');

  // 积分：为 ref1, ref2, ref3, ref4 写入积分明细
  const pointsReasons = [
    { userIdIdx: 1, delta: 100, reason: '注册奖励' },
    { userIdIdx: 1, delta: 50, reason: '完善资料' },
    { userIdIdx: 2, delta: 100, reason: '注册奖励' },
    { userIdIdx: 2, delta: 200, reason: '推荐奖励' },
    { userIdIdx: 3, delta: 100, reason: '注册奖励' },
    { userIdIdx: 4, delta: 100, reason: '注册奖励' },
    { userIdIdx: 4, delta: 80, reason: '首单奖励' },
  ];
  for (const { userIdIdx, delta, reason } of pointsReasons) {
    const userId = refUsers[userIdIdx - 1].id;
    const last = await prisma.pointsLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const balance = (last?.balance ?? 0) + delta;
    await prisma.pointsLedger.create({
      data: { userId, delta, balance, reason },
    });
  }
  console.log('Points ledger created for ref1~ref4.');

  // 优惠券领取：ref1 领 NEW100，ref2 领 NEW100+REPEAT200，ref4 领 ASSIST300
  const coupons = await prisma.coupon.findMany({ where: { enabled: true } });
  const new100 = coupons.find((c) => c.code === 'NEW100');
  const repeat200 = coupons.find((c) => c.code === 'REPEAT200');
  const assist300 = coupons.find((c) => c.code === 'ASSIST300');
  const claimList: { userIdIdx: number; coupon: { id: string } | undefined }[] = [
    { userIdIdx: 1, coupon: new100 },
    { userIdIdx: 2, coupon: new100 },
    { userIdIdx: 2, coupon: repeat200 },
    { userIdIdx: 4, coupon: assist300 },
  ];
  for (const { userIdIdx, coupon } of claimList) {
    if (!coupon) continue;
    const userId = refUsers[userIdIdx - 1].id;
    const existing = await prisma.couponClaim.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (!existing) {
      await prisma.couponClaim.create({ data: { couponId: coupon.id, userId } });
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { claimedCount: { increment: 1 } },
      });
    }
  }
  console.log('Coupon claims created (NEW100, REPEAT200, ASSIST300).');

  console.log('\n--- 推荐与佣金测试账号 ---');
  console.log('ref1@example.com ~ ref12@example.com  密码: Ref123!');
  console.log('推荐关系: ref1 -> ref2/ref3; ref2 -> ref4/ref5; ref3 -> ref6/ref7; ref4 -> ref8; ref5 -> ref9; ref6 -> ref10; ref8 -> ref11; ref9 -> ref12');
  console.log('已完成订单: ref4~ref12 各 1 单 ¥2180，佣金已结算(一级18%% 二级6%%)，部分已释放可测提现');
  console.log('积分: ref1/ref2/ref3/ref4 有积分明细');
  console.log('优惠券: ref1 领 NEW100, ref2 领 NEW100+REPEAT200, ref4 领 ASSIST300');
  console.log('---\n');
}

main()
  .then(() => {
    console.log('Seed completed.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
