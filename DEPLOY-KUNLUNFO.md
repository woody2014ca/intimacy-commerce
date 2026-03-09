# 在 kunlunfo.com 下挂载商城测试环境

有两种常见做法，任选其一即可。

---

## 方案一：二级路径（例如 www.kunlunfo.com/shop）

商城挂在主站**子路径**下，例如：  
**https://www.kunlunfo.com/shop**（首页）、**https://www.kunlunfo.com/shop/login**（登录）等。

### 1. 本仓库内要做的配置

- **Next 配置**：已支持通过环境变量 `NEXT_PUBLIC_BASE_PATH` 设置 basePath（如 `/shop`）。  
  部署时在构建环境里设置：  
  `NEXT_PUBLIC_BASE_PATH=/shop`（不要末尾斜杠）。
- **API 地址**：部署后前端要请求**线上 API**。  
  构建/运行环境设置：  
  `NEXT_PUBLIC_API_URL=https://你的API域名`  
  例如 API 单独部署在 `https://api-ec.kunlunfo.com`，则填该地址。

### 2. 部署前端

- 将 `apps/web`（或整仓）部署到任意能跑 Next 的环境（Vercel / 自有 Node / Docker 等）。
- 构建命令使用：  
  `cd apps/web && pnpm build`（或 `npm run build`），并设置：
  - `NEXT_PUBLIC_BASE_PATH=/shop`
  - `NEXT_PUBLIC_API_URL=https://你的API域名`
- 若部署在**独立域名/端口**（例如 `https://ec-app.kunlunfo.com`），则先保证 `https://ec-app.kunlunfo.com/shop` 能打开商城。

### 3. 主站（www.kunlunfo.com）反向代理到商城

在主站所在服务器（Nginx / Apache / 云 WAF 等）上，把路径 `/shop` 代理到上面部署好的 Next 应用。

**Nginx 示例**（Next 跑在同一台机 3000 端口时）：

```nginx
location /shop {
    proxy_pass http://127.0.0.1:3000/shop;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

若 Next 部署在别的机器（如 `https://ec-app.kunlunfo.com`），则：

```nginx
location /shop {
    proxy_pass https://ec-app.kunlunfo.com/shop;
    proxy_ssl_server_name on;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

然后重载 Nginx。访问 **https://www.kunlunfo.com/shop** 即可进入商城测试。

---

## 方案二：二级域名（例如 shop.kunlunfo.com）

商城用**独立子域**，例如：  
**https://shop.kunlunfo.com**（首页）、**https://shop.kunlunfo.com/login** 等。  
无需 basePath，部署更简单。

### 1. 部署前端

- 将 Next 应用部署到 Vercel / 自有服务器等。
- 在托管平台绑定域名：**shop.kunlunfo.com**（或你定的名字，如 `ec.kunlunfo.com`）。
- 环境变量设置：  
  `NEXT_PUBLIC_API_URL=https://你的API域名`  
  （不设 `NEXT_PUBLIC_BASE_PATH` 或留空。）

### 2. DNS

在域名服务商处为 kunlunfo.com 添加解析：

- **类型**：CNAME  
- **主机**：shop（或你用的子域）  
- **值**：托管平台给的域名（如 Vercel 的 `xxx.vercel.app`）或你服务器的域名。

生效后，访问 **https://shop.kunlunfo.com** 即可测试商城。

---

## API 后端上线（两种方案都需要）

- 将 `apps/api`（NestJS）部署到 **Railway / Render / 自有服务器** 等，并配置：
  - `DATABASE_URL`（线上 PostgreSQL）
  - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
  - `CORS`：允许来源包含 `https://www.kunlunfo.com` 和 `https://shop.kunlunfo.com`（或你实际用的前端域名）
- 记下 API 的线上地址，例如 `https://api-ec.kunlunfo.com`，填到前端的 `NEXT_PUBLIC_API_URL`。

---

## 小结

| 方式       | 访问地址示例                    | 本仓库配置 |
|------------|---------------------------------|------------|
| 二级路径   | https://www.kunlunfo.com/shop   | `NEXT_PUBLIC_BASE_PATH=/shop` + 主站反代 |
| 二级域名   | https://shop.kunlunfo.com       | 仅 `NEXT_PUBLIC_API_URL`，绑定子域 |

两种方式下，API 都需单独部署并配置 CORS 和数据库。若你确定用哪一种（路径或子域），我可以再按你的实际域名和托管方式写一版更贴合的步骤（含 Vercel/Railway 等）。
