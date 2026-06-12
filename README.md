# ChankoBlog

ChankoBlog 是一个基于 Nuxt 4 的内容驱动个人博客。它以 Markdown 文章为核心，提供文章、归档、项目、友链、订阅、评论、后台管理、SEO 体检、备份恢复和访问统计等功能。

项目不是一个最小模板，而是一套可以直接部署的个人站点：前台负责阅读体验和内容发现，后台负责内容生产、审核、备份和运维观察。

## Features

- **内容系统**：基于 Nuxt Content 管理 Markdown 文章和关于页。
- **文章工作流**：支持草稿、待审、定时、发布、归档、置顶、锁定和发布前检查。
- **后台管理**：文章、媒体、项目、友链、评论、通知、关于页、SEO、备份、日志统一管理。
- **Markdown 编辑体验**：快捷工具栏、模板、分栏预览、MDC/Nuxt Content 完整渲染。
- **搜索增强**：前台支持文章、项目、内容全文检索和 `category=`、`tag=` 等筛选语法。
- **控制面板**：站内通知、阅读模式、后台入口、订阅中心和文章提交日历。
- **评论系统**：通过 Waline 接入评论，支持本地 Docker 部署、评论治理规则和后台评论管理。
- **SEO 与订阅**：集成 Nuxt SEO，提供 sitemap、robots、RSS、Atom、JSON Feed 和 OPML。
- **数据与运维**：访问统计、后台日志、数据备份/恢复预览、媒体使用关系、友链巡检。
- **AI 摘要**：支持通过 AI API Key 为文章生成摘要，并缓存结果。

## Tech Stack

- Nuxt 4
- Vue 3
- TypeScript
- Tailwind CSS v4
- Nuxt Content 3
- Nuxt Image
- Nuxt SEO
- Waline
- PostgreSQL
- pnpm

## Requirements

建议使用以下运行环境：

- Node.js 20.19+ 或 Node.js 22+
- pnpm 9+
- Docker / Docker Compose，用于本地或服务器部署 Waline 与 PostgreSQL
- PostgreSQL 16，用于 Waline 评论、后台日志、文章历史和自动保存

Windows、Linux、macOS 都可以开发；生产部署建议使用 Linux 服务器。

## Quick Start

```bash
git clone <your-repository-url>
cd ChankoBlog
pnpm install
cp .env.example .env
pnpm dev
```

打开：

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin

首次运行后台前，请至少在 `.env` 中配置：

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
```

## Environment Variables

复制 `.env.example`：

```bash
cp .env.example .env
```

核心配置：

| 变量 | 说明 |
| --- | --- |
| `NUXT_PUBLIC_SITE_URL` | 站点公开地址，生产环境必须改成真实域名。 |
| `ADMIN_USERNAME` | 后台登录用户名，默认 `admin`。 |
| `ADMIN_PASSWORD` | 后台登录密码，生产环境必须设置。 |
| `ADMIN_SESSION_SECRET` | 后台会话密钥，生产环境至少 32 位随机字符串。 |
| `NUXT_PUBLIC_WALINE_SERVER_URL` | Waline 服务地址。 |
| `WALINE_JWT_TOKEN` | Waline 登录和服务端令牌，生产环境必须设置为强随机值。 |
| `WALINE_SITE_URL` | Waline 绑定的站点地址。 |
| `WALINE_SECURE_DOMAINS` | 允许接入评论服务的域名列表。 |
| `WALINE_POSTGRES_*` | Waline PostgreSQL 连接信息。 |
| `ADMIN_POSTGRES_*` | 后台日志、版本、自动保存使用的 PostgreSQL；为空时复用 Waline/PG 配置。 |
| `AI_SUMMARY_API_KEY` | AI 摘要 API Key。 |
| `AI_SUMMARY_ENDPOINT` | AI 摘要接口地址。 |
| `NOTIFICATION_SMTP_*` | 后台重要通知的邮件发送配置。 |

生产环境建议使用专门的随机值：

```bash
openssl rand -base64 32
```

如果服务器没有 `openssl`，可以使用任意密码管理器生成 32 位以上随机字符串。

## Project Structure

```text
.
├── app/                         # Nuxt 应用代码
│   ├── components/              # 前台与后台组件
│   ├── components/admin/        # 后台管理组件
│   ├── composables/             # 组合式逻辑
│   ├── config/                  # 可维护配置，如后台面板、模板、评论规则
│   ├── layouts/                 # 前台和后台 Layout
│   └── pages/                   # 页面路由
├── content/                     # Nuxt Content 内容
│   ├── blog/                    # Markdown 文章
│   └── about.md                 # 关于页
├── data/                        # JSON 数据，如项目、友链、通知、访问统计
├── docker/                      # Waline/PostgreSQL 初始化脚本
├── public/                      # 静态资源和媒体文件
├── server/                      # Nitro API、服务端工具、订阅源、管理接口
├── shared/                      # 前后端共享代码
├── content.config.ts            # Nuxt Content Collection 定义
├── docker-compose.waline.yml    # Waline + PostgreSQL
├── nuxt.config.ts               # Nuxt 配置
└── package.json
```

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

至少配置后台登录信息：

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
```

### 3. Start Waline and PostgreSQL

评论和后台部分持久化能力依赖 PostgreSQL。开发环境可以直接使用项目自带的 compose：

```bash
pnpm comments:pull
pnpm comments:up
```

服务地址：

- Waline：http://localhost:8360
- Waline Admin：http://localhost:8360/ui
- PostgreSQL：localhost:5432

第一次进入 Waline 后台时，访问：

```text
http://localhost:8360/ui/register
```

注册第一个管理员账号。

停止评论服务：

```bash
pnpm comments:down
```

### 4. Start Nuxt

```bash
pnpm dev
```

### 5. Type check and build

```bash
.\node_modules\.bin\vue-tsc.CMD --noEmit
.\node_modules\.bin\tsc.CMD --noEmit
pnpm build
```

Linux/macOS 可以使用：

```bash
./node_modules/.bin/vue-tsc --noEmit
./node_modules/.bin/tsc --noEmit
pnpm build
```

## Content Authoring

文章存放在 `content/blog/*.md`。

基础 frontmatter：

```md
---
title: "文章标题"
description: "文章摘要"
date: 2026-06-05
author: Chanko
authorUrl: /about
category: "开发记录"
views: 0
workflowStatus: published
published: true
locked: false
pinned: false
tags:
  - Nuxt
  - Blog
---

正文内容。
```

常用状态：

| 字段 | 说明 |
| --- | --- |
| `workflowStatus: draft` | 草稿，不在前台展示。 |
| `workflowStatus: review` | 待审，不在前台展示。 |
| `workflowStatus: scheduled` | 定时发布，需配合 `scheduledAt`。 |
| `workflowStatus: published` | 已发布，前台展示。 |
| `workflowStatus: archived` | 归档，不作为公开文章展示。 |
| `locked: true` | 文章页显示锁定状态。 |
| `pinned: true` | 文章列表优先展示。 |

后台文章编辑器会写入同一套 Markdown 文件，建议生产环境为内容仓库做好版本控制或备份。

## Production Deployment

以下流程以一台 Linux 服务器为例，使用 Node 运行 Nuxt，使用 Docker Compose 运行 Waline 与 PostgreSQL。

### 1. Prepare server

安装 Node、pnpm、Git、Docker：

```bash
node -v
corepack enable
corepack prepare pnpm@latest --activate
docker version
docker compose version
```

### 2. Clone repository

```bash
git clone <your-repository-url> /var/www/chankoblog
cd /var/www/chankoblog
pnpm install --frozen-lockfile
```

### 3. Create production `.env`

```bash
cp .env.example .env
```

生产环境至少需要修改：

```bash
NUXT_PUBLIC_SITE_URL=https://example.com

ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters

NUXT_PUBLIC_WALINE_SERVER_URL=https://comments.example.com
WALINE_JWT_TOKEN=replace-with-a-long-random-token
WALINE_SITE_NAME=ChankoBlog
WALINE_SITE_URL=https://example.com
WALINE_SECURE_DOMAINS=example.com,comments.example.com
WALINE_POSTGRES_DB=waline
WALINE_POSTGRES_USER=waline
WALINE_POSTGRES_PASSWORD=replace-with-a-strong-db-password
WALINE_POSTGRES_HOST=127.0.0.1
WALINE_POSTGRES_PORT=5432
```

如果后台持久化使用单独数据库，再配置：

```bash
ADMIN_POSTGRES_DB=chankoblog_admin
ADMIN_POSTGRES_USER=chankoblog_admin
ADMIN_POSTGRES_PASSWORD=replace-with-a-strong-db-password
ADMIN_POSTGRES_HOST=127.0.0.1
ADMIN_POSTGRES_PORT=5432
```

如果不配置 `ADMIN_POSTGRES_*`，后台日志、文章历史和自动保存会复用 `WALINE_POSTGRES_*`。

### 4. Start Waline

```bash
pnpm comments:pull
pnpm comments:up
```

确认容器状态：

```bash
docker compose -f docker-compose.waline.yml ps
```

生产环境第一次部署后，打开 Waline 注册页：

```text
https://comments.example.com/ui/register
```

注册第一个管理员账号。

### 5. Build Nuxt

```bash
pnpm build
```

构建产物在 `.output/`。本地预览：

```bash
pnpm preview
```

直接运行生产服务：

```bash
PORT=3000 node .output/server/index.mjs
```

## Process Management

### Option A: PM2

如果服务器已有 PM2：

```bash
pm2 start .output/server/index.mjs --name chankoblog --time --env production
pm2 save
pm2 startup
```

更新后：

```bash
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 restart chankoblog
```

### Option B: systemd

创建 `/etc/systemd/system/chankoblog.service`：

```ini
[Unit]
Description=ChankoBlog Nuxt Server
After=network.target docker.service

[Service]
Type=simple
WorkingDirectory=/var/www/chankoblog
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/chankoblog/.env
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable chankoblog
sudo systemctl start chankoblog
sudo systemctl status chankoblog
```

如果你的 Node 不在 `/usr/bin/node`，用 `which node` 查看真实路径后替换。

## Reverse Proxy

### Blog site

Nginx 示例：

```nginx
server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Waline

如果 Waline 使用独立域名：

```nginx
server {
  listen 80;
  server_name comments.example.com;

  location / {
    proxy_pass http://127.0.0.1:8360;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

配置 HTTPS 后，请同步更新：

```bash
NUXT_PUBLIC_SITE_URL=https://example.com
NUXT_PUBLIC_WALINE_SERVER_URL=https://comments.example.com
WALINE_SITE_URL=https://example.com
WALINE_SECURE_DOMAINS=example.com,comments.example.com
```

## Admin Panel

后台地址：

```text
/admin
```

后台功能：

- 总览：文章数、观看量、评论量、项目数、最新内容。
- 文章：新建、编辑、发布检查、定时发布、版本历史、自动保存、草稿箱。
- 媒体：上传、预览、使用关系。
- 项目：添加、删除、巡检、排序、首页展示。
- 友链：申请、审核、巡检、重复和垃圾申请过滤。
- 评论：评论列表、审核、删除、治理规则、命中统计。
- 通知：前台通知和后台事件通知，重要事件可邮件发送。
- SEO：公开页面、订阅源和文章元信息检查。
- 备份：按当前模块导出备份，恢复前可预览差异。
- 日志：后台变更审计。

生产环境务必：

- 设置强密码。
- 设置 32 位以上 `ADMIN_SESSION_SECRET`。
- 使用 HTTPS。
- 不要公开 `.env`、`.data`、数据库端口。
- Nginx 层可以额外限制 `/admin` 的访问 IP。

## AI Summary

AI 摘要由 `app.config.ts` 中的 `aiSummary` 控制，密钥从环境变量读取：

```bash
AI_SUMMARY_API_KEY=replace-with-api-key
AI_SUMMARY_ENDPOINT=https://api.openai.com/v1/chat/completions
```

摘要会缓存到 Nitro storage：

```text
.data/ai-summary
```

如果修改文章后需要重新生成摘要，可以清理对应缓存，或在后台触发重新生成逻辑。

## Notifications and Email

后台通知由事件触发，例如：

- 待审评论
- 友链申请
- 构建失败
- AI 摘要失败

如果需要邮件提醒，配置：

```bash
NOTIFICATION_SMTP_HOST=smtp.example.com
NOTIFICATION_SMTP_PORT=587
NOTIFICATION_SMTP_SECURE=false
NOTIFICATION_SMTP_USER=notice@example.com
NOTIFICATION_SMTP_PASSWORD=replace-with-password
NOTIFICATION_EMAIL_FROM=notice@example.com
NOTIFICATION_EMAIL_TO=admin@example.com
```

哪些通知通过邮件发送，可以在后台通知配置中调整。

## SEO and Feeds

公开端点：

- `/sitemap.xml`
- `/robots.txt`
- `/rss.xml`
- `/atom.xml`
- `/feed.json`
- `/opml.xml`

部署后建议检查：

```bash
curl -I https://example.com/sitemap.xml
curl -I https://example.com/robots.txt
curl -I https://example.com/rss.xml
```

`NUXT_PUBLIC_SITE_URL` 必须是生产域名，否则 sitemap、订阅源和结构化数据会生成错误地址。

## Backup and Persistence

需要重点备份：

```text
content/
data/
public/media/
.data/
docker/waline-postgres/
```

如果使用 Docker Compose 中的 PostgreSQL，数据库数据默认在：

```text
.data/waline-postgres
```

后台也提供按模块导出备份和恢复预览。建议策略：

- 每次发布前导出文章备份。
- 每周备份 `content/`、`data/`、`public/media/`。
- 每天备份 PostgreSQL。
- 更新依赖或迁移服务器前先做完整备份。

PostgreSQL 手动备份示例：

```bash
docker exec chanko-waline-postgres pg_dump -U waline waline > waline-backup.sql
```

恢复示例：

```bash
cat waline-backup.sql | docker exec -i chanko-waline-postgres psql -U waline waline
```

## Update Workflow

```bash
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 restart chankoblog
```

如果使用 systemd：

```bash
sudo systemctl restart chankoblog
```

如果 Waline 镜像需要更新：

```bash
pnpm comments:pull
pnpm comments:down
pnpm comments:up
```

## Troubleshooting

### The admin page has no data after login

检查：

- `ADMIN_PASSWORD` 是否配置。
- `ADMIN_SESSION_SECRET` 是否配置且长度足够。
- PostgreSQL 是否运行。
- `ADMIN_POSTGRES_*` 或 `WALINE_POSTGRES_*` 是否正确。

### Comments are not displayed

检查：

- `NUXT_PUBLIC_WALINE_SERVER_URL` 是否指向可访问的 Waline 服务。
- `WALINE_SECURE_DOMAINS` 是否包含当前站点域名。
- Nginx 是否正确代理 Waline。
- 浏览器控制台是否有 CORS 或 401 错误。

### Sitemap or feeds point to localhost

设置生产域名：

```bash
NUXT_PUBLIC_SITE_URL=https://example.com
```

然后重新构建：

```bash
pnpm build
```

### Nuxt Content database errors in development

如果多个 dev server 同时运行，Nuxt Content 的本地缓存可能出现 SQLite 表冲突。停止重复进程后重新启动：

```bash
pnpm dev
```

必要时清理本地缓存：

```bash
rm -rf .nuxt .data/content
pnpm dev
```

Windows PowerShell：

```powershell
Remove-Item -Recurse -Force .nuxt
pnpm dev
```

## Scripts

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务。 |
| `pnpm build` | 构建生产产物。 |
| `pnpm preview` | 本地预览生产产物。 |
| `pnpm generate` | 生成静态产物。 |
| `pnpm comments:pull` | 拉取 Waline 官方镜像。 |
| `pnpm comments:up` | 启动 Waline 与 PostgreSQL。 |
| `pnpm comments:down` | 停止 Waline 与 PostgreSQL。 |

## Deployment Checklist

- [ ] `NUXT_PUBLIC_SITE_URL` 已设置为生产域名。
- [ ] `ADMIN_PASSWORD` 已设置为强密码。
- [ ] `ADMIN_SESSION_SECRET` 至少 32 位。
- [ ] `WALINE_JWT_TOKEN` 已设置为强随机值。
- [ ] `WALINE_SECURE_DOMAINS` 包含生产域名。
- [ ] PostgreSQL 数据目录已持久化。
- [ ] Nginx 已配置 HTTPS。
- [ ] `/sitemap.xml`、`/robots.txt`、`/rss.xml` 可访问。
- [ ] `/admin` 可登录且后台数据正常。
- [ ] 备份策略已配置。

## License

当前仓库未声明开源许可证。公开发布前请根据你的使用意图补充 `LICENSE` 文件。
