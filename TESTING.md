# 如何测试商城成果

按下面顺序做一遍，即可在本地完整验证 API、后台和前台。

---

## Windows / PowerShell 用户必读

### 1. 报错「无法加载 pnpm.ps1，禁止运行脚本」

PowerShell 默认禁止运行脚本，可用下面两种方式之一：

**方式 A（推荐）**：用 `pnpm.cmd` 代替 `pnpm`，所有文档里的 `pnpm` 都改成：

```powershell
pnpm.cmd i
pnpm.cmd db:migrate
pnpm.cmd seed
pnpm.cmd dev
```

**方式 B**：放开当前用户脚本执行（只需执行一次）：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

执行后再用 `pnpm i`、`pnpm dev` 等即可。

**方式 C**：若仍无法用 pnpm，可用 npm + 进入子目录执行（在项目根目录先执行 `npm install` 安装依赖，然后）：

```powershell
# 迁移
cd apps\api
npx prisma migrate deploy
# seed（在 apps\api 下执行，会读取 ../../.env 的 DATABASE_URL）
npx ts-node -r tsconfig-paths/register scripts/seed.ts
cd ../..
# 启动（开两个终端：一个跑 API，一个跑 Web）
cd apps\api
npx nest start --watch
# 另开终端
cd apps\web
npx next dev
```

### 2. 本机没有 Docker

无法运行 `docker compose` 时，用**云 PostgreSQL** 即可，无需安装 Docker：

1. 任选一家免费 PostgreSQL 服务并拿到连接串，例如：
   - **Neon**：https://neon.tech 注册 → 新建项目 → 复制 Connection string（PostgreSQL）
   - **Supabase**：https://supabase.com → 新建项目 → Settings → Database → Connection string（URI）
   - **Railway**：https://railway.app → New Project → PostgreSQL → 复制 DATABASE_URL
2. 打开项目根目录和 `apps\api` 下的 `.env`，把其中的 `DATABASE_URL` 改成你的连接串，例如：
   ```env
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   ```
3. **跳过** `docker compose up -d`，直接执行后面的 `pnpm.cmd db:migrate` 和 `pnpm.cmd seed`。

---

## 一、环境准备（首次必做）

### 1. 进入项目并安装依赖

```bash
cd intimacy-commerce
pnpm i
```

（Windows 若报脚本被禁止，请用上面的 **pnpm.cmd** 或 设置 ExecutionPolicy。若无 pnpm：`npm install -g pnpm`）

### 2. 配置环境变量

```bash
# 复制到项目根目录
copy .env.example .env

# 复制到 API 目录（迁移和 seed 会读这里的 DATABASE_URL）
copy .env apps\api\.env
```

Windows 用 `copy`；Mac/Linux 用 `cp`。

### 3. 启动数据库

**有 Docker 时**：

```bash
docker compose up -d
```

确认容器在跑：`docker ps`，应看到 `intimacy-commerce-db`。

**没有 Docker 时**：使用云 PostgreSQL，在 `.env` 和 `apps\api\.env` 里填好 `DATABASE_URL` 后跳过本步，直接做第 4 步。

### 4. 执行迁移

```bash
pnpm db:migrate
```

### 5. 执行种子（重要：会打印超级管理员密码）

```bash
pnpm seed
```

**请留意控制台输出**，会类似：

```
========================================
SUPER_ADMIN 初始账号（首次登录后请修改密码）
Email: superadmin@example.com
Phone: 18800000000
初始密码: XyZ9Abc2KlmNpqRs
========================================
```

把 **邮箱/手机号** 和 **初始密码** 记下来，后面登录用。  
其他管理员（ADMIN、FINANCE 等）默认密码为：`ChangeMe123!`

### 6. 启动前后端

```bash
pnpm dev
```

会同时启动：

- **API**：http://localhost:4000  
- **前台**：http://localhost:3000  

---

## 二、在浏览器里测试（推荐）

### 1. 打开后台登录页

浏览器访问：**http://localhost:3000/admin**

用 seed 打印的 **手机号或邮箱** + **初始密码** 登录。

- 手机号示例：`18800000000`  
- 邮箱示例：`superadmin@example.com`  
- 密码：控制台里打印的那一串

登录成功后会进入简易仪表盘（GMV、订单数、用户数等）。

### 2. 前台首页

访问：**http://localhost:3000**

可看到首页文案和「管理后台」「商品列表」等入口。

### 3. 商品接口（无需登录）

访问：**http://localhost:4000/catalog/products**

应返回 JSON，内含主商品「亲密升级礼盒（调情香氛套装）」等。

---

## 三、用接口直接测试（可选）

用 PowerShell、curl 或 Postman 均可。

### 1. 管理员登录拿 Token

```powershell
# PowerShell
$body = '{"phoneOrEmail":"18800000000","password":"这里填seed打印的初始密码"}'
Invoke-RestMethod -Uri http://localhost:4000/auth/login -Method Post -Body $body -ContentType "application/json"
```

返回里会有 `accessToken`，复制备用。

### 2. 用 Token 访问后台数据

```powershell
$token = "这里填上一步的 accessToken"
Invoke-RestMethod -Uri http://localhost:4000/admin/dashboard -Headers @{ Authorization = "Bearer $token" }
```

应返回仪表盘数据（订单数、用户数、GMV 等）。

### 3. 用户注册 + 登录（测试 C 端）

```powershell
# 注册（邀请码可选）
$reg = '{"email":"test999@test.com","password":"Test123!","inviteCode":"可留空或填已有用户的邀请码"}'
Invoke-RestMethod -Uri http://localhost:4000/auth/register -Method Post -Body $reg -ContentType "application/json"

# 登录
$login = '{"phoneOrEmail":"test999@test.com","password":"Test123!"}'
$res = Invoke-RestMethod -Uri http://localhost:4000/auth/login -Method Post -Body $login -ContentType "application/json"
# res.accessToken 用于后续请求
```

### 4. 查看商品、加购、下单（需用户 Token）

- 商品列表：`GET http://localhost:4000/catalog/products`  
- 加购：`POST http://localhost:4000/cart/items`，Header：`Authorization: Bearer <用户token>`，Body：`{"productId":"<商品id>","quantity":1}`  
- 下单：`POST http://localhost:4000/order`，Body：`{"items":[{"productId":"<商品id>","quantity":1}]}`  
- 模拟支付：`POST http://localhost:4000/order/<订单id>/pay`  

用 seed 创建的「主商品」的 id 可从 `GET /catalog/products` 返回里取。

---

## 四、常见问题

| 现象 | 处理 |
|------|------|
| **PowerShell：无法加载 pnpm.ps1，禁止运行脚本** | 用 `pnpm.cmd` 代替 `pnpm`（如 `pnpm.cmd i`），或执行 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| **docker 无法识别** | 本机不装 Docker 也可：用云 PostgreSQL（Neon/Supabase/Railway），把连接串写入 `.env` 的 `DATABASE_URL`，跳过 `docker compose` |
| `pnpm` 找不到 | 先执行 `npm install -g pnpm` |
| 迁移报错 `DATABASE_URL` | 确认已把 `.env` 复制到 `apps/api/.env`，且 DATABASE_URL 可连（本地 Docker 或云库） |
| seed 没打印密码 | 检查 `.env` 里 `BOOTSTRAP_SUPER_ADMIN=true`，再跑一次 `pnpm seed` 或 `pnpm.cmd seed` |
| 登录 401 | 确认用的是 seed 打印的**初始密码**，不是 `ChangeMe123!`（那是其他管理员用的） |
| **登录成功但仪表盘报 401 / 登录已过期或无效** | 1) 先关掉所有跑 API 的窗口，执行 `netstat -ano \| findstr :4000` 看谁占 4000，用 `taskkill /PID <进程号> /F` 结束；2) 只开一个终端，在项目根目录执行 `pnpm dev`，等 API 和 Web 都起来后再用 http://localhost:3000/admin 登录；3) 浏览器地址用 **http://localhost:3000** 不要用 127.0.0.1 |
| 8080/3000/4000 被占用 | 改 `.env` 里 `PORT` 或 Next 端口，或关掉占用端口的程序 |

---

## 五、测试检查清单

- [ ] `docker compose up -d` 后数据库正常  
- [ ] `pnpm db:migrate` 成功  
- [ ] `pnpm seed` 成功且看到 SUPER_ADMIN 密码  
- [ ] `pnpm dev` 后能打开 http://localhost:3000 和 http://localhost:4000  
- [ ] 在 http://localhost:3000/admin 用超级管理员账号登录成功  
- [ ] 登录后能看到仪表盘数据  
- [ ] http://localhost:4000/catalog/products 返回商品列表  

做完以上步骤，即表示当前商城（API + 后台登录 + 仪表盘 + 种子数据）在本地测试通过。

---

## 六、推荐与佣金 / 积分 / 优惠券测试数据

执行 `pnpm seed` 后会自动生成一套**推荐与佣金测试账号**，便于实际验证二级推荐、佣金发放、积分和优惠券。

### 测试账号（统一密码：`Ref123!`）

| 邮箱 | 说明 |
|------|------|
| ref1@example.com | 根推荐人，无上级；有积分、已领 NEW100 |
| ref2@example.com | ref1 的一级；有积分、已领 NEW100+REPEAT200 |
| ref3@example.com | ref1 的一级；有积分 |
| ref4@example.com ~ ref12@example.com | 下级用户，部分为二级推荐；ref4 有积分、已领 ASSIST300 |

### 推荐关系（二级）

- **ref1** → 一级：ref2、ref3；二级：ref4、ref5、ref6、ref7、ref8、ref9、ref10、ref11、ref12（通过各自一级归属到 ref1）
- **ref2** → 一级：ref4、ref5；二级：ref8、ref9、ref12
- **ref3** → 一级：ref6、ref7；二级：ref10
- **ref4** → 一级：ref8；二级：ref11  
- **ref5** → 一级：ref9；二级：ref12  
- **ref6** → 一级：ref10  

### 已生成数据

- **已完成订单**：ref4～ref12 各 1 单，金额 ¥2180，状态 COMPLETED。
- **佣金**：按一级 18%、二级 6% 结算；前 4 笔订单的佣金已过冻结期并置为 RELEASED（可测提现），其余为 FROZEN。
- **积分**：ref1～ref4 有积分明细（注册奖励、推荐奖励、首单奖励等）。
- **优惠券**：ref1 已领 NEW100，ref2 已领 NEW100+REPEAT200，ref4 已领 ASSIST300。

### 如何验证

1. **用户端**：用 ref1@example.com / Ref123! 登录 → 打开 **个人中心** → 切到「推荐」看一级/二级人数；切到「佣金」看记录；切到「积分」看余额与明细；切到「优惠券」看已领取；切到「提现」看可提现余额并尝试申请。
2. **管理后台**：用超级管理员登录 → **佣金管理** 看佣金列表；**提现管理** 看提现列表并对 PENDING 做通过/拒绝；**订单管理** 看已完成订单。
3. **多账号**：用 ref2、ref4 等分别登录，对比各自推荐人数、佣金和积分差异。
