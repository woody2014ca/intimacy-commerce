# 二级域名部署：shop.kunlunfo.com

按下面步骤操作，即可把商城前台挂在 **https://shop.kunlunfo.com**，API 单独部署并配置 CORS。

---

## 一、前置准备

- 代码已推送到 Git（GitHub / GitLab 等），便于 Vercel 和 API 托管拉取。
- 已有 **PostgreSQL** 线上库（Neon / Railway / Supabase 等），并拿到 `DATABASE_URL`。
- 拥有 **kunlunfo.com** 的 DNS 管理权限（可添加 CNAME 记录）。

---

## 二、部署前端（Vercel → shop.kunlunfo.com）

### 1. 在 Vercel 创建项目

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 等登录。
2. **Add New** → **Project**，选择本仓库（intimacy-commerce）。
3. 在配置里：
   - **Root Directory**：点 **Edit**，填 `apps/web`，确认。
   - **Framework Preset**：保持 **Next.js**。
   - **Build Command**：留空（用默认）或填 `pnpm run build`。
   - **Install Command**：填 `cd ../.. && pnpm install`（从 monorepo 根目录安装依赖）。
   - **Output Directory**：留空（Next 默认）。

### 2. 环境变量

在 Vercel 项目 **Settings → Environment Variables** 添加：

| 名称 | 值 | 说明 |
|------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://你的API域名` | 例如 `https://api-ec.kunlunfo.com` 或 Railway 提供的 xxx.up.railway.app |

**不要**设置 `NEXT_PUBLIC_BASE_PATH`（二级域名不需要）。

### 3. 部署并绑定域名

1. 点 **Deploy**，等构建完成。
2. 在 **Settings → Domains** 里点 **Add**，输入：**shop.kunlunfo.com**。
3. 按 Vercel 提示，到域名服务商处添加 **CNAME**：
   - **主机/名称**：`shop`（或 `shop.kunlunfo.com` 视服务商而定）
   - **目标/值**：`cname.vercel-dns.com`（或 Vercel 页面上显示的记录）
4. 保存后等 SSL 生效，访问 **https://shop.kunlunfo.com** 应能打开商城首页。

---

## 三、部署 API（Railway / Render 等）

API 需单独部署，并开放给前端的域名调用。

### 1. 以 Railway 为例

1. 打开 [railway.app](https://railway.app)，用 GitHub 登录。
2. **New Project** → **Deploy from GitHub repo**，选本仓库。
3. 在项目里 **New** → **Service**，选该仓库；**Root Directory** 设为 `apps/api`（如支持）。
4. **Variables** 里添加（必填）：
   - `DATABASE_URL`：你的 PostgreSQL 连接串。
   - `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`：生产用随机长字符串。
   - `CORS_ORIGIN`：`https://shop.kunlunfo.com`（与前端域名一致；多个用英文逗号分隔）。
5. **Settings** 里设置 **Start Command** 为：  
   `npx prisma migrate deploy && node dist/main`  
   或先构建再启动：Build 用 `pnpm install && pnpm run build`，Start 用 `node dist/main`。
6. 部署完成后，在 **Settings → Networking** 里生成 **Public URL**，得到类似：  
   `https://xxx.up.railway.app`。  
   若你有 API 子域（如 api-ec.kunlunfo.com），可在 DNS 里 CNAME 到该地址。

### 2. 把 API 地址填回前端

把上一步得到的 API 地址（如 `https://xxx.up.railway.app` 或 `https://api-ec.kunlunfo.com`）填到 **Vercel** 的 `NEXT_PUBLIC_API_URL`，然后重新部署一次前端（或等下次自动部署）。

---

## 四、数据库与初始化

- 线上库首次使用需执行迁移与 seed：
  - 在 API 部署环境或本地（`DATABASE_URL` 指向线上库）执行：
    - `pnpm db:migrate`（或 `cd apps/api && npx prisma migrate deploy`）
    - `pnpm seed`（或 `cd apps/api && npx ts-node -r tsconfig-paths/register scripts/seed.ts`）
- 若使用 Neon 等云库，可在本地用同一 `DATABASE_URL` 跑上述命令。

---

## 五、DNS 汇总（二级域名方案）

| 类型 | 主机 | 值/目标 |
|------|------|--------|
| CNAME | shop | cname.vercel-dns.com（以 Vercel 页面为准） |

API 若用自有域名（如 api-ec.kunlunfo.com），再为 API 服务添加一条 CNAME 指向 Railway/Render 提供的域名即可。

---

## 六、自检清单

- [ ] Vercel 项目 Root Directory = `apps/web`，Install = `cd ../.. && pnpm install`。
- [ ] `NEXT_PUBLIC_API_URL` 为线上 API 地址（https 且无末尾斜杠）。
- [ ] API 环境变量中 `CORS_ORIGIN` 含 `https://shop.kunlunfo.com`。
- [ ] 线上数据库已执行 migrate + seed。
- [ ] DNS 中 shop 的 CNAME 已生效，https://shop.kunlunfo.com 可访问且能登录、调接口。

完成后，用 **https://shop.kunlunfo.com** 访问商城，用 **https://shop.kunlunfo.com/login** 登录（如 ref1@example.com / Ref123! 需先 seed）。
