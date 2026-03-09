# 最少步骤部署（尽量不填变量）

不想填一堆环境变量的话，按下面做，**只动鼠标点几下**。

---

## 一、后端 API（Railway）

### 1. 新建项目并部署代码

1. 打开 [railway.app](https://railway.app) 登录（用 GitHub）。
2. 点 **New** → **Deploy from GitHub repo**。
3. 选仓库 **woody2014ca/intimacy-commerce**（或你的仓库名）。
4. 部署完成后，会有一个服务（可能叫 intimacy-commerce 或 api）。点进这个服务。

### 2. 设置根目录（Root Directory）

在服务里打开 **Settings**，找到 **Root Directory**（或 **Source** 里的 Root Directory），填：

```text
apps/api
```

保存。

### 3. 加数据库（点一下就行）

1. 回到**项目首页**（不是服务里），点 **+ New**。
2. 选 **Database** → **PostgreSQL**。
3. 等几秒，Railway 会建好一个 PostgreSQL，并自动生成连接串。

### 4. 把数据库“连”到 API（不复制粘贴）

1. 再点进 **API 那个服务**（不是 Database）。
2. 打开 **Variables**。
3. 点 **+ New Variable** 或 **Add Variable**，选 **Reference**（引用）。
4. 在列表里选刚建的 **PostgreSQL** 服务，变量选 **DATABASE_URL**。  
   这样 API 就自动用上数据库了，**不用自己复制一长串**。  
（若界面没有 Reference：到 Postgres 服务的 **Variables** 里复制 `DATABASE_URL` 的值，贴到 API 服务的 Variables 里也行。）

### 5. 启动命令（避免数据库没表）

在 API 服务的 **Settings** 里找到 **Deploy** 或 **Start Command**，填：

```text
pnpm run start:prod
```

没有这项就留空也行（默认会跑 `node dist/main`，但第一次需要先跑一次迁移，见下面「可选」）。

### 6. 部署

点 **Deploy** 或 **Redeploy**，等跑完。  
在 **Settings** → **Networking** 里点 **Generate Domain**，会得到一个地址，例如 `https://xxx.up.railway.app`，这就是你的 **API 地址**。

---

**小结：你只需要**

- 选仓库、设 Root 为 `apps/api`
- 点一下 New → PostgreSQL
- 在 API 的 Variables 里用 **Reference** 引用 PostgreSQL 的 **DATABASE_URL**
- 选填 Start Command：`pnpm run start:prod`
- Deploy，然后生成 Domain

**不用填** JWT、CORS（不填的话 CORS 会允许所有来源，先能跑起来再说）。

---

### 可选：第一次建表

如果部署后访问 API 报错和数据库/表有关，说明还没跑迁移。在 Railway 里：

- 该服务的 **Settings** → **Deploy** 里把 **Start Command** 设为：`pnpm run start:prod`（会先执行 `prisma migrate deploy` 再启动），再 Redeploy；  
  或  
- 用 Railway 的 **One-off run** / **Shell**（若有）：执行一次 `npx prisma migrate deploy`。

---

## 二、前端（Vercel）

1. 打开 [vercel.com](https://vercel.com)，**Add New** → **Project**，选同一个仓库 **intimacy-commerce**。
2. **Root Directory** 点 **Edit**，填：`apps/web`，确认。
3. 环境变量只加**一条**：  
   **Name**：`NEXT_PUBLIC_API_URL`  
   **Value**：把上面 Railway 给你的 API 地址贴进去（如 `https://xxx.up.railway.app`，不要末尾斜杠）。
4. 点 **Deploy**。

---

## 三、验证

- 打开 Vercel 部署好的前端地址，能打开首页、能登录或看商品，就说明前后端都通了。
- 以后若要限制只允许你的前端访问 API，再到 Railway 的 API 服务 **Variables** 里加一条 **CORS_ORIGIN**，值为你的前端域名（如 `https://xxx.vercel.app`）。
