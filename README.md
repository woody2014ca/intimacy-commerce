# Intimacy Education Commerce Platform

**亲密关系教育电商平台** — 电商系统，非多级营销。所有佣金仅来源于商品销售。

- 形态：Web H5 前台 + Admin 后台 + API 服务
- 技术栈：TypeScript 全栈，Next.js (App Router) + NestJS + Prisma + PostgreSQL
- 推荐：**仅两级**（Level1/Level2），代码层锁死 MAX_REF_DEPTH=2

---

## 快速启动

```bash
# 1. 安装依赖
pnpm i

# 2. 复制环境变量
cp .env.example .env
# 编辑 .env，至少修改 JWT_ACCESS_SECRET、JWT_REFRESH_SECRET、DATABASE_URL（若未用默认）
# 从项目根目录运行迁移/seed 时，请同时复制 .env 到 apps/api/.env，以便 Prisma 能读到 DATABASE_URL

# 3. 启动数据库
docker compose up -d

# 4. 数据库迁移
pnpm db:migrate

# 5. 种子数据（含 SUPER_ADMIN、默认券、主商品、测试用户、系统设置）
pnpm seed

# 6. 启动开发（API 4000 + Web 3000）
pnpm dev
```

- 前台：http://localhost:3000  
- 后台：http://localhost:3000/admin（**可在此用超级管理员账号登录并查看仪表盘**）  
- API：http://localhost:4000  

**首次启动**：若 `BOOTSTRAP_SUPER_ADMIN=true`，运行 `pnpm seed` 时控制台会打印 SUPER_ADMIN 的随机初始密码，用该密码在 `/admin` 登录。禁止使用默认 admin/admin。

**如何测试**：详见 [TESTING.md](./TESTING.md)，包含浏览器登录、接口示例和常见问题。

---

## 项目结构

```
intimacy-commerce/
├── apps/
│   ├── api/          # NestJS REST API
│   └── web/          # Next.js 前台 + Admin
├── packages/
│   └── shared/       # 共享类型、Zod、工具
├── default-settings.seed.json   # 系统设置/功能开关/默认券/VIP 初始化
├── .env.example
├── docker-compose.yml
└── pnpm-workspace.yaml
```

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 并行启动 API + Web |
| `pnpm db:migrate` | 执行 Prisma 迁移 |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm seed` | 执行种子脚本（读 default-settings.seed.json） |
| `pnpm build` | 全量构建 |

---

## 角色与权限

- **SUPER_ADMIN**：全部数据、配置、财务、审计、导出、模拟登录
- **ADMIN**：商品/订单/内容/营销，不可改风控参数
- **FINANCE**：提现审核、佣金、对账导出
- **OPERATOR**：订单、用户、发货、售后
- **SUPPLIER_VIEW**：仅供货相关订单/库存，手机号脱敏
- **CUSTOMER**：前台用户

---

## 合规与风控

- 推荐深度：**最多 2 级**（代码 + 配置双保险）
- 佣金：仅订单状态为 **COMPLETED** 时结算
- 冻结期：可配置（默认 10 天），到期转可提现
- 提现：人工审核，可配置最低金额与每日上限

---

## 环境说明

- 复制 `.env.example` 为 `.env` 后即可按上述步骤启动。
- 功能开关、佣金比例、登录审核、隐私发货等见 `.env` 与 `default-settings.seed.json`。
- 种子脚本会从 `default-settings.seed.json` 初始化系统设置、默认券、VIP 计划、主商品及测试账号。
