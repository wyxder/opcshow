# 🛠️ WYX.SPACE 技术开发设计规范（TSD）

> 文档版本：v1.0 ｜ 状态：评审稿 ｜ 日期：2026-10-31
> 上游文档：[PRD.md](computer://e:\Code\AI\Start\Web\Blog\resume1\PRD.md) ｜ 数据改造：[数据库.md](computer://e:\Code\AI\Start\Web\Blog\resume1\数据库.md) ｜ 实施记录：[fx1.md](computer://e:\Code\AI\Start\Web\Blog\resume1\fx1.md)
>
> **文档定位**：把 PRD 的「要什么」翻译成「怎么做」。所有设计条目都可回溯到 PRD 章节（见第 9 节追溯矩阵）。
> **现状约束**：仓库当前后端为零依赖 Node HTTP（`server/index.mjs`），PRD 目标后端为 Python 3.11 + FastAPI。本文对**两套实现同时给出规范**：接口契约、错误体、数据模型保持一致，允许分阶段替换。

---

## 目录

- [1. 总体架构设计](#1-总体架构设计)
- [2. 模块划分与职责](#2-模块划分与职责)
- [3. 核心技术方案选型](#3-核心技术方案选型)
- [4. 关键流程与数据模型](#4-关键流程与数据模型)
- [5. 接口定义](#5-接口定义)
- [6. 异常与边界处理](#6-异常与边界处理)
- [7. 性能与安全考量](#7-性能与安全考量)
- [8. 开发规范与测试验收](#8-开发规范与测试验收)
- [9. PRD 功能点追溯矩阵](#9-prd-功能点追溯矩阵)
- [10. 附录：运行、部署与术语](#10-附录运行部署与术语)

---

## 1. 总体架构设计

### 1.1 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         浏览器 / 移动端浏览器                        │
│  React 18 + TypeScript + Vite（公共站 Layout + 后台 AdminShell）      │
│  · 路由级懒加载 · 预渲染 HTML · Service Worker 离线 · 主题系统        │
└───────────────┬─────────────────────────────────────────────────────┘
                │ HTTPS  （同源 /api，Cookie 会话）
┌───────────────▼─────────────────────────────────────────────────────┐
│  Nginx（生产） / Vite dev server（开发，VITE_API_BASE 跨域白名单）    │
├─────────────────────────────────────────────────────────────────────┤
│  API 层                                                              │
│  现状：Node 22 零依赖 HTTP（server/index.mjs，127.0.0.1:8787）        │
│  目标：Python 3.11 + FastAPI（uvicorn，Pydantic 校验，OpenAPI 自动）   │
│  · 路由：auth / content / guestbook / files / analytics / ai /       │
│          settings / admin / system                                   │
│  · 横切：CORS / Origin 校验 / 限流 / 请求 ID / 统一错误体 / 审计       │
├───────────────┬──────────────────────────┬──────────────────────────┤
│  业务服务层    │  AI 子系统                │  异步任务                 │
│  内容状态机    │  RAG 索引 + 检索          │  resume.parse / 备份      │
│  会话与 RBAC   │  LLM 网关（OpenAI 兼容）  │  重试 2 次 → 死信          │
│  审核 / 文件   │  缓存 / 配额 / 用量记账   │                          │
├───────────────┴──────────────────────────┴──────────────────────────┤
│  数据层                                                              │
│  现状：JSON 文件（JsonStore：原子写 + 串行队列 + 内存缓存）            │
│  阶段一：SQLite（账户三表）  阶段三：PostgreSQL 16 + Redis            │
│  文件：本机 uploads → S3/OSS（STORAGE_DRIVER 切换）                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

| 原则 | 落地方式 | 对应 PRD |
| --- | --- | --- |
| 前后端分离 | 前端只通过 `/api` JSON/SSE 通信；无服务端模板渲染 | §5 技术架构 |
| 契约优先 | `/api/openapi.json` 输出的 OpenAPI 3.1 为唯一契约；Node 与 FastAPI 必须一致 | §5.2 |
| 渐进替换 | 数据库/后端按驱动开关切换（`STORAGE_DRIVER`），可一键回滚 | §5、§7 风险 |
| 诚实降级 | 无模型密钥时走站内检索回答；未接 API 时后台显示「演示模式」且不伪装真实数据 | §3 特色功能、§4 A-01 |
| 安全默认 | 会话 HttpOnly + SameSite、Origin 校验、CSP、限流、审计，默认开启 | §5.3 非功能 |
| 可观测 | 每个请求带 `X-Request-Id`，结构化日志 + 审计日志 + `/healthz`、`/readyz` | §5.3 |

### 1.3 运行形态

| 形态 | 组成 | 适用 |
| --- | --- | --- |
| 本地开发 | `npm run dev`（Vite 5273）+ `npm run api`（Node 8787） | 日常开发 |
| 单机生产 | Nginx 静态资源 + 反向代理 `/api` + Node/FastAPI 单实例 | 个人站当前形态 |
| 容器化 | `docker-compose.yml`：`api` 服务（`server/Dockerfile`）+ 可选 Postgres | 自托管交付 |
| 多实例（目标） | FastAPI × N + PostgreSQL + Redis + 对象存储 | Team/Pro 套餐 |

### 1.4 Node → FastAPI 迁移边界

| 维度 | Node 现状 | FastAPI 目标 | 迁移风险控制 |
| --- | --- | --- | --- |
| 路由 | `server/lib/router.mjs`（支持 `/api` 与 `/api/v1`） | `app/routers/*.py`，`APIRouter(prefix="/api")` + 版本子路由 | URL 不变，前端零改动 |
| 校验 | `server/lib/validate.mjs`（等价 zod 的零依赖实现） | Pydantic v2 模型 | 错误码映射为 `INVALID_INPUT` |
| 错误体 | `sendError` → `{code,message,requestId,details}` | 全局 `exception_handler` 产出同结构 | 前端 `services/http.ts` 不改 |
| 会话 | Cookie `wyx_session` / `__Host-wyx_session` | 同名字段，Starlette `Response.set_cookie` | 用同一哈希规则 |
| 数据 | `JsonStore` | SQLAlchemy 2.x + Alembic（见 [数据库.md](computer://e:\Code\AI\Start\Web\Blog\resume1\数据库.md)） | 先账户表，双写/影子读 |
| SSE | 手写 `text/event-stream` | `StreamingResponse` | 事件格式 `delta/done/error` 不变 |

---

## 2. 模块划分与职责

### 2.1 前端模块

| 模块 | 目录 | 职责 | 明确不做 | 对应 PRD |
| --- | --- | --- | --- | --- |
| 公共站页面 | `src/pages/*` | 首页、学习、阅读、简历、工具箱、文件、生活、关于、留言、友链 | 不直接发请求，统一走 `src/services` | §2.1 |
| 后台页面 | `src/admin/pages/*` | 8 个一级入口、23 个 Tab 的交互与表单 | 不实现鉴权逻辑（由 `AdminApp` 守卫） | §2.2 |
| 后台框架 | `src/admin/AdminShell.tsx`、`AdminApp.tsx` | 左侧导航、Tab 路由、登录守卫、待审计数 badge、演示模式横幅 | 不承载具体业务 | §2.2 |
| 服务层 | `src/services/*` | 封装 `/api` 调用、超时、错误归一、SSE 解析 | 不写 UI 状态 | §5.2 |
| 组件层 | `src/components/*` | Layout、AIAssistant、ErrorBoundary、ThemeSwitcher、Modal 等 | 不感知后端细节 | §2.1、§3 |
| 基础设施 | `src/lib/*` | SEO、主题、工具函数、埋点、SW 注册 | 不做业务决策 | §3、§5.3 |
| 构建脚本 | `scripts/*.mjs` | 预渲染、SEO 生成、质量门禁 | 不参与运行时逻辑 | §3 特色功能 |

### 2.2 后端模块

| 模块 | 目录 | 职责 | 关键约束 | 对应 PRD |
| --- | --- | --- | --- | --- |
| 入口 | `server/index.mjs` | 创建 HTTP 服务、CORS/安全头、路由分发、启动校验、优雅退出 | 启动前必须 `assertSecureConfig()` | §5.1 |
| 路由 | `server/routes/*.mjs` | 参数解析、鉴权、业务编排、响应 | 不直接读写文件，统一走 store/repo | §2、§5.2 |
| 基础设施 | `server/lib/http.mjs` | 错误体、限流、Cookie 解析、ipHash、cursor 分页、幂等、日志 | 所有响应经 `sendJson/sendError` | §5.3、§6 |
| 存储 | `server/lib/store.mjs` | `JsonStore`、`getStores()`、备份/恢复 | 写操作必须 `update()`，禁止裸写 | §5.1、§7 |
| 鉴权 | `server/lib/auth.mjs` | 口令哈希、会话、RBAC、审计、Cookie | 会话只存 sid 哈希 | §2.2 个人中心、§5.3 |
| 内容 | `server/routes/content.mjs` | 10 个 domain、状态机、ETag/乐观锁、分页 | 公开读只返回 `published` | §2.2 内容管理 |
| 互动 | `guestbook.mjs`、`settings.mjs` | 留言审核、友链申请、资料与站点设置 | 先审后发 | §2.1、§2.2 |
| 文件 | `files.mjs` | 签名直传、可见性、回收站、短链、Range 下载 | key 白名单 + 签名登记 | §3 文件直传 |
| 埋点 | `analytics.mjs`、`lib/hits.mjs` | 埋点写入、错误上报、7/30 天聚合 | 只存 IP 哈希；缓存分窗 | §3 无 Cookie 埋点 |
| AI | `server/ai/*`、`routes/ai.mjs` | 索引、检索、网关、SSE、Prompt、用量、评测 | 无密钥必须降级，不伪造模型 | §4 |
| 后台 | `routes/admin.mjs` | 总览、改密、会话、审计、周报、简历版本 | 全部 `requireRole` | §2.2 |
| 系统 | `routes/system.mjs` | 任务、备份、指标、OG、OpenAPI、健康检查 | 备份 id 白名单 | §3 备份、§7 |

### 2.3 脚本与质量门禁

| 脚本 | 作用 | 何时运行 | 对应 PRD |
| --- | --- | --- | --- |
| `scripts/check-api.mjs` | 临时数据目录 + 随机端口的端到端冒烟（50+ 断言） | 每次 API 改动 | §8 验收 |
| `scripts/eval-ai.mjs` | 40 条问答 + 8 条注入，输出命中率/MRR/引用正确率 | 每次 AI 改动 | §4 A-07 |
| `scripts/check-data.mjs` | 数据口径一致性（派生值 vs 真源） | `npm run check` | §3 数据门禁 |
| `scripts/check-budget.mjs` | 入口包 ≤ 50 kB、CSS ≤ 15 kB | `npm run check` | §5.3 |
| `scripts/contrast-check.mjs` | 5×5 主题对比度 | `npm run check` | §5.3 |
| `scripts/prerender.mjs` | 生成 9 个静态页 + 每篇 SVG OG | `npm run build` | §3 预渲染 |
| `scripts/gen-seo.mjs` | sitemap / robots / 结构化数据 | `npm run build` | §2.2 站点设置 |

### 2.4 分层调用规则（强制）

1. `routes → lib/ai → store/repo`，**路由不得直接 `readFile`**（`files.mjs` 读写上传目录属例外，需按 key 白名单）。
2. 前端 `pages/components → services → fetch`，**页面不得散写 `fetch`**。
3. 跨层禁止反向依赖：`lib` 不得 import `routes`；`services` 不得 import 页面。
4. 所有写操作必须落审计（`audit()`），且审计失败不得阻断主流程（记录告警即可）。

---

## 3. 核心技术方案选型

| 技术点 | 选型（现状） | 选型（目标） | 理由 | 备选与放弃原因 | 对应 PRD |
| --- | --- | --- | --- | --- | --- |
| 前端框架 | React 18 + TypeScript | 保持 React；Vue 3 仅作二次开发分支 | 现有组件与路由体系成熟；TS 提供契约类型 | Vue（重写成本高）、Svelte（生态不足） | §5 |
| 构建工具 | Vite 5 | 保持 | 冷启动快、按路由分包、生态稳定 | Webpack（慢）、Rspack（团队不熟） | §5 |
| 样式 | Tailwind CSS + CSS 变量主题 | 保持 | 设计令牌统一（paper/ink/admin-*），响应式断点内置 | CSS-in-JS（运行时开销） | §5 |
| 动画 | framer-motion | 保持 | 路由过渡与列表动效声明式 | 手写 CSS（维护差） | §3 主题 |
| 路由 | react-router 6（懒加载） | 保持 | 路由级 chunk，满足 50 kB 预算 | 手写路由（无收益） | §5.3 |
| SEO/首屏 | 构建期预渲染 + 每篇 OG | 保持，可选 SSR | 静态托管也能有正文与分享卡 | 纯 CSR（首屏空、SEO 差） | §3 预渲染 |
| 离线 | Service Worker（network-first / SWR） | 保持 | 弱网可用、更新提示 | 不引入 Workbox（体积/复杂度） | §3 PWA |
| 后端语言 | Node 22（零依赖） | **Python 3.11 + FastAPI** | PRD 指定；Pydantic 校验 + OpenAPI 自动文档 | Java（启动重、迭代慢）；继续 Node（不满足 PRD 目标） | §5 |
| 数据访问 | JSON 文件（`JsonStore`） | SQLAlchemy 2.x + Alembic | 强约束、事务、索引、迁移 | 继续 JSON（并发/唯一约束缺失） | §5、[数据库.md](computer://e:\Code\AI\Start\Web\Blog\resume1\数据库.md) |
| 数据库 | JSON → SQLite（阶段一） | **PostgreSQL 16**（阶段三） | 账户强一致、可托管备份、`pgvector` 预留 | MongoDB（关系与唯一约束弱）；MySQL（无额外收益） | §5 |
| 缓存 | 进程内 Map（限流/聚合/AI 缓存） | Redis（多实例） | 现状单实例足够；多实例需共享限流与配额 | Memcached（功能少） | §5.1 |
| AI 检索 | 站内 RAG（关键词/片段检索） | `pgvector` 向量检索（可选混合） | 无密钥也能答；有向量后召回更好 | 纯向量（冷启动差）、纯关键词（语义弱） | §4 A-01/A-02 |
| LLM 接入 | OpenAI 兼容网关 | 保持（多模型登记） | 换模型不改代码 | 各家私有 SDK（锁定） | §4 A-05/A-10 |
| 流式输出 | SSE（`delta/done/error`） | 保持 | 浏览器原生、易调试 | WebSocket（运维重） | §4 A-01 |
| 文件存储 | 本机 `uploads` + 签名直传 | S3/OSS 兼容驱动 | 接口同构，驱动切换 | 直接传服务器（不可扩展） | §3 文件 |
| 部署 | Docker + Nginx | 保持，多实例上编排 | 自托管交付简单 | Serverless（长连接/SW 不友好） | §5.1 |
| 测试 | 脚本化冒烟 + 评测 + 门禁 | FastAPI 阶段补 pytest | 现状无框架单测，先守住端到端 | 只做手工（回归不可控） | §8 |

---

## 4. 关键流程与数据模型

### 4.1 登录与会话

```
浏览器                     API                         存储
  │ POST /api/auth/login     │                            │
  ├─────────────────────────►│ 限流(10/10min/IP)          │
  │                          │ 查用户 → scrypt 校验        │
  │                          │ 失败 → 审计 + 401           │
  │                          │ 成功 → sid=random(32B)      │
  │                          │      → sessions 存 sha256   │
  │◄─────────────────────────┤ Set-Cookie: HttpOnly        │
  │    后续请求自动带 Cookie   │ getSession: sha256(sid) 查  │
  ├─────────────────────────►│ 过期 → 401                 │
  │ POST /api/auth/logout    │ 删除会话 + 审计             │
  │◄─────────────────────────┤ 清除两种 Cookie 名          │
```

| 关键点 | 规则 | 对应 PRD |
| --- | --- | --- |
| 口令哈希 | `scrypt(password, 16B salt, 64B)`，存 `salt:hash`，校验用 `timingSafeEqual` | §2.2 安全 |
| 会话存储 | 只存 `sha256(sid)`；默认 TTL 7 天；登录时清理过期并截断 500 条 | §2.2 账号 |
| Cookie | `HttpOnly; SameSite=Lax; Path=/`；HTTPS 下 `__Host-` 前缀 + `Secure` | §5.3 |
| 限流 | 路由层 10 次/10 分钟 + 业务层 8 次/10 分钟，双层防绕过 | §5.3 |
| 失败审计 | `auth.login.failed` / `auth.login` / `auth.logout` 全量记录 | §3 审计 |

### 4.2 内容编辑与状态机

```
draft ──提交──► pending ──通过──► published ──下架──► hidden
  ▲                │                 │                 │
  └────撤回─────────┘                 └────重新发布──────┘
（hidden 也可回到 published；非法迁移返回 422）
```

| 关键点 | 规则 | 对应 PRD |
| --- | --- | --- |
| 乐观锁 | 响应带 `ETag`/`X-Content-Version`；PUT 需 `If-Match: <version>`，不匹配 409 | §3 乐观锁 |
| 状态机 | `POST /api/content/:domain/:id/status` 只接受合法迁移；PUT 忽略 `status` 防止绕过 | §2.2 内容管理 |
| 删除语义 | `DELETE` 等价「转 hidden」，不物理删除 | §2.2 |
| 审计 | 每次写记录 before/after + actor | §3 审计 |

### 4.3 留言与友链审核

| 步骤 | 行为 | 输出 |
| --- | --- | --- |
| 提交 | 校验昵称/邮箱/正文；同站重复友链 409；留言按 IP 限流 | 201 + `pending` |
| 公开读 | 只查 `status=published`，cursor 分页 | 公开墙 |
| 审核 | `approve` / `reject` / `PATCH` 友链状态；幂等 | 200 + 状态 |
| 互动 | 点赞按 `likedBy`（IP 哈希）去重；举报累计 `reports` | 计数 |
| 计数 | `/api/guestbook/pending/count` 供侧栏 badge | `{count}` |

### 4.4 文件上传与分享

```
POST /api/files/sign ──► { key, uploadUrl, expiresAt(10min), maxBytes }
PUT  /api/files/upload/:key（必须命中签名 + key 正则 + 体积不超声明）
POST /api/files/share ──► { token(9B base64url), expiresAt, hasPassword }
GET  /api/files/download/:token（密码校验 / 过期 404 / Range / visits+1）
```

| 边界 | 规则 |
| --- | --- |
| key 格式 | `^[a-z0-9-]+\.[a-z0-9]+$`，防路径穿越 |
| 体积 | 默认上限 50 MB；超过声明体积 422；空文件 422 |
| 类型 | 扩展名白名单（pdf/md/zip/xlsx/fig/py/csv/pptx/docx/html/txt/png/jpg/webp/avif/svg） |
| 签名 | 服务端登记，10 分钟过期；未签名/过期 410 |
| 分享 | token 随机；可选密码（`salt:hash`）；`expiresDays` 0–3650；下载计数 |

### 4.5 AI 对话（SSE）

```
POST /api/ai/chat { message, context, history, stream, sessionId }
  1) 限流 + 配额（`day|ip`，默认 60/天）
  2) 月预算硬拦截（默认 3,000,000 tokens）
  3) 缓存键 = sha256(归一化问题 + context + prompt 版本)，6 小时，上限 500
  4) 命中 → 直接回放；未命中 → 检索 topK → 组装 Prompt → 调模型
  5) SSE 事件：delta（增量文本）→ done（引用 + 用量）→ error（可降级）
  6) 记账 usage + 写会话；失败回落站内检索回答（source=retrieval）
```

| 关键点 | 规则 | 对应 PRD |
| --- | --- | --- |
| 降级 | 无 `AI_API_KEY`/`AI_BASE_URL` 时 `hasModelKey()=false`，直接检索回答并标注来源 | §4 A-01 |
| 注入防护 | 命中注入样例直接拦截；输出做边界裁剪 | §4 A-04 |
| 评测 | HitRate@5 ≥ 0.85、MRR ≥ 0.65、引用正确率 ≥ 0.9、注入拦截 100% | §4 A-07 |
| 版本 | Prompt 版本化 + 回滚；缓存键带版本，避免旧答案串新 Prompt | §4 A-06 |
| 成本 | 输入+输出分开计费；pricePer1k 可配 | §4 A-05 |

### 4.6 备份与恢复

| 步骤 | 现状实现 | 目标实现 |
| --- | --- | --- |
| 创建 | `backupSnapshot()` 全量 JSON，**排除 sessions**，写 `data/backups/backup-*.json` | SQLite `VACUUM INTO` / PG `pg_dump` |
| 列表 | 读目录，返回 id/createdAt/entries | 同左 + 任务表 |
| 恢复 | id 正则白名单 + `restoreSnapshot()` + 索引/聚合缓存失效 | 停服替换文件 / `pg_restore` + 缓存失效 |
| 安全 | 拒绝 `..`、拒绝非本服务命名 | 同上 + 备份加密 |

### 4.7 数据模型

**当前 JSON 实体（真源）**

| 实体 | 关键字段 | 约束/上限 | 迁移目标表 |
| --- | --- | --- | --- |
| User | `id, user, role, passwordHash, createdAt` | `user` 唯一（应加） | `users` |
| Session | `id(sha256), user, role, createdAt, expiresAt` | TTL 7d；上限 500 | `sessions` |
| AuditLog | `id, actor, action, target, before, after, ts` | 上限 2000（应归档） | `audit_logs` |
| ContentItem | `id, status, version, updatedAt + domain 字段` | `status ∈ draft/pending/published/hidden` | `documents(domain,id,data_json,version,status)` |
| GuestMessage | `id, user, email, text, color, source, status, flagged, digest, ipHash, likes, likedBy, reports, createdAt, reviewedBy, reviewedAt` | pending 先审后发 | `guestbook_messages` |
| FriendLink | `id, name, url, desc, status, version, source, createdAt` | url 去重 | `friend_links` |
| FileRecord | `id, name, ext, size, sizeBytes, category, storageKey, visibility, status, downloads, date, createdAt` | key 白名单；status ∈ published/trashed | `files` |
| ShareLink | `id, fileId, name, token, passwordHash, expiresAt, visits, createdAt` | token 唯一 | `file_shares` |
| TrackHit | `id, path, kind(page/ai), referrer, sessionHash, stayMs, ipHash, ts` | 上限 20000 | `analytics_hits`（TTL 分区） |
| AiUsage | `id, day, ip, model, tokens, cost, latency, source, ok, ts` | 上限 5000 | `ai_usage` |
| AiQuota | `day|ip → count` | 按天配额 | `ai_quota` |
| Job | `id, type, status(running/completed/dead), attempts, input, result, error, createdAt, finishedAt` | 重试 2 次；上限 500 | `jobs` |

**ER 关系（目标库）**

```
users 1 ──< sessions
users 1 ──< audit_logs (actor 逻辑关联，非强外键)
users 1 ──< documents(owner, 可选)
files 1 ──< file_shares
ai_sessions 1 ──< ai_messages
```

> 完整 DDL、索引与迁移步骤见 [数据库.md](computer://e:\Code\AI\Start\Web\Blog\resume1\数据库.md) 第 6、7 节。

---

## 5. 接口定义

### 5.1 通用约定

| 项 | 规范 |
| --- | --- |
| 前缀 | 同时支持 `/api/...` 与 `/api/v1/...`（`router.mjs` 自动注册两份） |
| 方法 | GET/HEAD 安全；写操作 POST/PUT/PATCH/DELETE；`OPTIONS` 返回 204 |
| 内容类型 | JSON `application/json; charset=utf-8`；文件流 `application/octet-stream`；AI `text/event-stream` |
| 错误体 | `{ code, message, requestId, details? }`；HTTP 状态码与 `code` 双轨 |
| 请求 ID | 响应头 `X-Request-Id`，同时写入错误体与日志 |
| 缓存 | 普通写响应 `Cache-Control: no-store`；公开读可 `public, max-age=60`；OG `86400` |
| 分页 | cursor（`nextCursor`），`limit` 1–100，默认 20 |
| 并发控制 | `ETag` / `X-Content-Version` + `If-Match`；冲突 409 |
| 幂等 | 写接口可带 `Idempotency-Key`，5 分钟内重复返回首次结果 |
| 时间 | JSON 用 ISO 8601（`createdAt/ts`）；会话过期用毫秒时间戳（内部） |
| 跨域 | 白名单 `API_CORS_ORIGIN`；允许 `credentials`；暴露 `ETag/X-Content-Version/X-Request-Id` |

### 5.2 接口清单

> 权限列：`公开` / `会话` / `admin+editor` / `admin`。所有 `/api/admin/*` 默认 `admin`，标 `editor` 者除外。

| 分组 | 方法与路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| Auth | `POST /api/auth/login` | 登录，下发 HttpOnly Cookie | 公开 + 限流 |
| Auth | `POST /api/auth/logout` | 退出并清 Cookie | 会话/公开 |
| Auth | `GET /api/auth/session` | 当前会话 | 会话 |
| Auth | `POST /api/auth/refresh` | 刷新校验（不续期） | 会话 |
| Auth | `GET /api/auth/csrf` | 返回防护方案说明 | 公开 |
| Content | `GET /api/content/meta` | 各 domain 计数/状态概览 | 公开 |
| Content | `GET /api/content/:domain` | 列表（只返回 published，cursor 分页，ETag） | 公开 |
| Content | `GET /api/content/:domain/:id` | 详情 | 公开 / 会话可见草稿（按实现） |
| Content | `POST /api/content` | 新建内容 | admin+editor |
| Content | `PUT /api/content/:domain/:id` | 更新（`If-Match` 乐观锁，忽略 status） | admin+editor |
| Content | `POST /api/content/:domain/:id/status` | 状态机迁移 | admin+editor |
| Content | `DELETE /api/content/:domain/:id` | 转 hidden | admin+editor |
| Profile | `GET /api/profile` | 公开资料（settings 优先，回落种子） | 公开 |
| Profile | `PUT /api/admin/profile` | 更新资料 | admin |
| Settings | `GET/PUT /api/admin/settings` | 站点 SEO/主题设置 | admin |
| Friends | `POST /api/friend-requests` | 访客申请友链（3 次/小时） | 公开 + 限流 |
| Friends | `GET /api/admin/friend-requests` | 待审列表 | admin+editor |
| Friends | `PATCH /api/admin/friend-requests/:id` | 通过/拒绝 | admin+editor |
| Guestbook | `GET /api/guestbook` | 公开墙（published，分页） | 公开 |
| Guestbook | `POST /api/guestbook` | 提交（进 pending） | 公开 + 限流 |
| Guestbook | `POST /api/guestbook/:id/approve` / `reject` | 审核 | admin+editor |
| Guestbook | `POST /api/guestbook/:id/like` / `report` | 点赞（IP 去重）/ 举报 | 公开 |
| Guestbook | `DELETE /api/guestbook/:id` | 删除 | admin |
| Guestbook | `GET /api/guestbook/pending/count` | 待审计数 | admin+editor |
| Files | `POST /api/files/sign` | 申请上传签名（10 分钟） | admin+editor |
| Files | `PUT /api/files/upload/:key` | 直传（签名校验） | admin+editor |
| Files | `GET /api/files` | 文件列表（`scope=admin` 可见私密/回收站） | 公开 / 会话 |
| Files | `POST /api/files/:id/visibility` | 公开/私密 | admin+editor |
| Files | `DELETE /api/files/:id` | 转回收站；`?permanent=1` 彻底删除 | admin+editor |
| Files | `POST /api/files/:id/restore` | 回收站恢复 | admin+editor |
| Files | `POST /api/files/share` | 创建短链（密码/有效期） | admin+editor |
| Files | `GET /api/files/shares` | 分享列表（隐藏 passwordHash） | 会话 |
| Files | `DELETE /api/files/share/:token` | 取消分享 | admin+editor |
| Files | `GET /api/files/download-by-id/:id` | 按 ID 下载（Range） | 按可见性 |
| Files | `GET /api/files/download/:token` | 短链下载（密码/过期/计数） | 公开 |
| Analytics | `POST /api/track` | 埋点（120 次/分钟） | 公开 + 限流 |
| Analytics | `POST /api/client-errors` | 前端错误上报（20 次/分钟） | 公开 + 限流 |
| Analytics | `GET /api/analytics/summary` | 7d/30d 聚合（5 分钟缓存） | admin |
| AI | `POST /api/ai/chat` | SSE 对话 | 公开 + 配额 |
| AI | `POST /api/ai/feedback` / `GET /api/ai/feedback` | 反馈 / 列表 | 公开 / admin |
| AI | `PATCH /api/ai/feedback/:id` | 标记已审阅 | admin |
| AI | `GET /api/ai/sessions/:id` | 会话详情 | admin |
| AI | `GET /api/ai/usage` | 用量与成本 | admin |
| AI | `GET/POST /api/ai/models`、`PATCH/DELETE /api/ai/models/:id` | 模型登记与启停 | admin |
| AI | `GET/POST /api/ai/prompts`、`PUT/DELETE /api/ai/prompts/:id` | Prompt 版本管理 | admin |
| AI | `POST /api/ai/prompts/:id/rollback` | 回滚 | admin |
| AI | `POST /api/ai/reindex` | 重建索引 | admin |
| AI | `GET /api/ai/health` / `GET /api/ai/eval` | 健康 / 评测报告 | 公开 / admin |
| Admin | `GET /api/admin/overview` | 总览 KPI + 趋势 | admin+editor |
| Admin | `POST /api/admin/password` | 改密（撤销其它会话） | admin |
| Admin | `GET /api/admin/security` | 安全信息（2FA 如实标注） | admin |
| Admin | `GET /api/admin/sessions`、`DELETE /api/admin/sessions/:id` | 会话列表 / 撤销（撤销自己 422） | admin |
| Admin | `GET /api/admin/audit` | 审计日志 | admin |
| Admin | `POST /api/admin/report` | 规则周报（非模型） | admin |
| Admin | `GET /api/admin/resume`、`PUT /api/admin/resume/modules` | 简历模块 | admin+editor |
| Admin | `POST /api/admin/resume/versions`、`POST .../:id/restore`、`DELETE .../:id` | 版本管理 | admin+editor |
| Admin | `DELETE /api/admin/backup/:id` | 删除备份 | admin |
| System | `POST /api/resume/parse` | 简历解析任务（202） | admin+editor |
| System | `GET /api/jobs`、`GET /api/jobs/:id` | 任务列表 / 状态 | admin+editor |
| System | `POST/GET /api/admin/backup`、`POST /api/admin/backup/:id/restore` | 备份 | admin |
| System | `GET /api/admin/metrics` | 运行指标 | admin |
| System | `GET /api/og/:file` | 文章 OG SVG | 公开 |
| System | `GET /api/openapi.json` | OpenAPI 3.1 | 公开 |
| System | `GET /healthz`、`GET /readyz` | 健康 / 就绪 | 公开 |

### 5.3 关键接口详例

**登录**

```http
POST /api/auth/login
Content-Type: application/json

{ "user": "admin", "password": "********" }
```

```http
200 OK
Set-Cookie: wyx_session=<sid>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800
X-Request-Id: req_<uuid>

{ "mode": "real", "user": "admin", "role": "admin", "expiresAt": "2026-11-07T…Z" }
```

失败：`401 {code:"INVALID_CREDENTIALS"}`；超限：`429 {code:"RATE_LIMITED"}`。

**内容更新（乐观锁）**

```http
PUT /api/content/articles/a1
If-Match: "3"
Content-Type: application/json

{ "title": "…", "abstract": "…" }
```

```json
200 { "id": "a1", "version": 4, "updatedAt": "2026-10-31T…Z" }
409 { "code": "VERSION_CONFLICT", "message": "内容已被他人修改，请刷新后重试", "requestId": "req_…" }
```

**AI 对话（SSE）**

```http
POST /api/ai/chat
Accept: text/event-stream

{ "message": "他做过哪些 RAG 项目？", "context": { "path": "/work/resume" }, "stream": true }
```

```
event: delta
data: {"text":"他在……"}

event: done
data: {"source":"model","citations":[{"title":"…","path":"/learn/…"}],"usage":{"tokens":…}}

event: error
data: {"code":"MODEL_UNAVAILABLE","message":"模型暂不可用，已切换站内检索"}
```

**文件签名**

```json
POST /api/files/sign → 200
{
  "driver": "local",
  "key": "m3k2-9f8c1a.pdf",
  "uploadUrl": "/api/files/upload/m3k2-9f8c1a.pdf",
  "method": "PUT",
  "expiresAt": "2026-10-31T…Z",
  "maxBytes": 52428800,
  "headers": { "Content-Type": "application/octet-stream" }
}
```

### 5.4 版本与兼容

1. `/api/v1/*` 与 `/api/*` 同时可用，前端无需迁移。
2. 破坏性变更必须新增版本或新增字段，禁止改字段语义。
3. OpenAPI 文档随代码发布，`scripts/check-api.mjs` 校验 `GET /api/openapi.json` 可取。
4. Node → FastAPI 迁移期：两套实现并行部署时，以 OpenAPI + 冒烟脚本为一致性基线。

---

## 6. 异常与边界处理

### 6.1 错误码表

| HTTP | code | 触发场景 | 前端处理 |
| --- | --- | --- | --- |
| 400 | `INVALID_INPUT` / `INVALID_JSON` | 参数类型/长度/格式错误 | 表单内联提示 + `details` |
| 401 | `UNAUTHORIZED` / `INVALID_CREDENTIALS` | 未登录 / 口令错误 | 跳登录或提示 |
| 403 | `FORBIDDEN` / `ORIGIN_FORBIDDEN` | 角色不足 / 来源不允许 | 提示无权限 |
| 404 | `NOT_FOUND` | 资源不存在 / 分享过期 | 空状态页 |
| 405 | `METHOD_NOT_ALLOWED` | 缺少 id 等 | 修正请求 |
| 409 | `VERSION_CONFLICT` / `DUPLICATE` | 乐观锁冲突 / 重复友链 | 刷新重试 |
| 410 | `SIGNATURE_REQUIRED` / `SIGNATURE_EXPIRED` | 未签名 / 签名过期 | 重新申请签名 |
| 413 | `PAYLOAD_TOO_LARGE` | 请求体超限 | 提示压缩/分片 |
| 422 | `INVALID_TRANSITION` / `MIME_NOT_ALLOWED` / `SIZE_MISMATCH` | 状态非法 / 类型不允许 / 体积不符 | 明确原因 |
| 429 | `RATE_LIMITED` | 限流 / AI 配额 | 倒计时重试 |
| 500 | `INTERNAL_ERROR` | 未捕获异常 | 通用错误 + requestId |
| 503 | `OFFLINE` / `MODEL_UNAVAILABLE` | 离线 / 模型不可用 | 离线页 / 检索降级 |

### 6.2 分层异常策略

| 层 | 策略 |
| --- | --- |
| 校验层 | 抛 `{status:400, code:'INVALID_INPUT', details}`（`validate.mjs` / Pydantic 422→映射 400 或保留 422） |
| 业务层 | 抛带 `status/code` 的 Error（如 409/422）；禁止直接 `res.end` |
| 路由层 | 统一 `errorOf(err)`：有 `status` 用原值，否则 500 且消息替换为「服务端异常」 |
| 全局层 | 记录 `requestId` + 前 4 行堆栈；响应头已发送时仅结束流 |
| 前端 | `ErrorBoundary` 兜底；`services` 归一错误；离线走 SW 缓存页 |

### 6.3 边界清单

| 对象 | 边界 | 行为 |
| --- | --- | --- |
| 请求体 | JSON 默认 1 MB；简历 2 MB；资料 256 KB；上传 50 MB | 超限 413 |
| 文本 | 标题/摘要/留言等有 min/max；去除控制字符 | 400 + 字段名 |
| 分页 | `limit` 1–100，非法回落 20 | 返回 `nextCursor` |
| 时间 | `stayMs` 0–24h；分享有效期 0–3650 天 | 越界 400 |
| 文件 | key 正则、扩展名白名单、签名有效期 10 分钟 | 410/422 |
| 会话 | TTL 7 天、上限 500、过期清理 | 401 |
| 审计 | 上限 2000（应改归档） | 超出截断 + 告警 |
| 埋点 | 20000 条上限；聚合缓存 5 分钟，7d/30d 分键 | 超限淘汰 |
| AI | 日配额 60、月预算 3M tokens、缓存 500 条/6h | 429 / 降级 |
| 任务 | 重试 2 次后 `dead`；上限 500 | 可见死信 |
| 中文/编码 | 路径参数 `decodeURIComponent`；输出 UTF-8 | 非法编码 400 |

### 6.4 前端异常与降级

| 场景 | 处理 |
| --- | --- |
| 路由级崩溃 | `RouteErrorBoundary` + 重试按钮 |
| API 不可用 | 后台显示「演示模式」横幅，列表读本地快照，写操作禁用或标注「未接入」 |
| 断网 | SW 返回离线页；`/api` 请求返回 503 `{code:'OFFLINE'}` |
| 模型不可用 | AI 助手回落检索回答，并明确 `source=retrieval` |
| 数据缺失 | 空状态组件，不填充假数字（`check:data` 守住口径） |

---

## 7. 性能与安全考量

### 7.1 性能目标与预算

| 指标 | 目标 | 现状值/手段 |
| --- | --- | --- |
| 入口包（gzip） | ≤ 50 kB | 实测 49.98 kB；SW 注册动态 import 避免撑爆 |
| CSS（gzip） | ≤ 15 kB | 实测 15.02 kB；Tailwind 按需 |
| 首屏可读 | 预渲染保证有正文 | 9 个静态页（首页/学习/6 篇/简历） |
| 路由切换 | 懒加载 + 过渡 340ms | framer-motion，`mode="wait"` |
| 聚合接口 | 缓存 5 分钟，7d/30d 分键 | `lib/hits.mjs` |
| AI 首包 | 首 token ≤ 8s，总超时 25s | 网关超时配置 |
| 写操作 | 单文件原子写，串行队列 | `JsonStore.update()` |
| 移动端 | 断点响应 + 抽屉侧栏 + 触控 ≥ 44px | Tailwind + AdminShell |

### 7.2 优化手段

| 手段 | 说明 | 对应 PRD |
| --- | --- | --- |
| 路由级 code splitting | 公共页与后台重页独立 chunk | §5.3 |
| 构建期预渲染 | 首屏正文与 SEO/OG 静态化 | §3 预渲染 |
| 图片策略 | SVG/WebP/AVIF + 懒加载 + 尺寸占位 | §5.3 |
| 缓存分层 | 浏览器（静态资源长缓存）、SW（stale-while-revalidate）、服务端聚合缓存 | §3 PWA |
| 分页 | cursor 替代 offset，避免深分页 | §5.3 |
| AI 缓存 | 归一化 + 版本化键，命中不消耗额度 | §4 A-03 |
| 数据裁剪 | 列表只返回卡片字段；详情单独取 | §5.3 |

### 7.3 安全设计

| 面 | 措施 | 代码位置 |
| --- | --- | --- |
| 认证 | scrypt 加盐哈希 + `timingSafeEqual`；不存明文 | `server/lib/auth.mjs` |
| 会话 | 只存 `sha256(sid)`；HttpOnly + SameSite=Lax；HTTPS 下 `__Host-` + `Secure` | 同上 |
| CSRF | 非安全方法 Origin 白名单校验 + SameSite | `server/lib/http.mjs` |
| XSS | 富文本白名单清洗；CSP `default-src 'self'`、`script-src 'self'`、`object-src 'none'`、`frame-ancestors 'none'` | `validate.safeHtml` + `setCommonHeaders` |
| 点击劫持 | `X-Frame-Options: DENY` | 同上 |
| 传输 | HSTS（仅 TLS 连接下发） | 同上 |
| 限流 | 登录、埋点、错误上报、友链、AI 配额 | `rateLimit()` |
| 越权 | `requireRole` 统一拦截；撤销当前会话 422 | `auth.mjs`、`admin.mjs` |
| 路径穿越 | 上传 key 正则；备份 id 白名单；下载按记录取 storageKey | `files.mjs`、`system.mjs` |
| 注入 | AI 注入样例拦截 + 输出边界 | `server/ai/safety.mjs` |
| 密钥 | 仅服务端 `.env`；`.env.example` 只有变量名；前端只读状态 | `env.mjs`、`.gitignore` |
| 审计 | 所有写操作记录 actor/action/before/after/ts | `audit()` |
| 隐私 | 埋点只存 IP 哈希（`sha256(ip|IP_SALT)` 截断）；备份排除会话 | `http.mjs`、`store.mjs` |

### 7.4 可用性与可观测

| 能力 | 实现 |
| --- | --- |
| 健康检查 | `/healthz` 返回状态与 uptime |
| 就绪检查 | `/readyz` 含数据目录可写探针 |
| 运行指标 | `/api/admin/metrics`：内存、PID、node 版本、审计数、任务死信、模型配置 |
| 结构化日志 | 单行 JSON（`ts/level/event/...`），`LOG_LEVEL` 可调 |
| 请求追踪 | `X-Request-Id` 贯穿响应、错误体、日志 |
| 优雅退出 | SIGINT/SIGTERM → 记审计 → `server.close()` → 退出 |

---

## 8. 开发规范与测试验收

### 8.1 目录与命名

| 类型 | 规范 | 示例 |
| --- | --- | --- |
| 后端路由 | `server/routes/<domain>.mjs`，单文件一个领域 | `guestbook.mjs` |
| 后端库 | `server/lib/<topic>.mjs`，纯函数优先 | `validate.mjs` |
| 前端页面 | `src/pages/<Name>.tsx`；后台 `src/admin/pages/<Name>Page.tsx` | `Home.tsx`、`OverviewPage.tsx` |
| 服务 | `src/services/<domain>.ts`，导出类型 + 函数 | `auth.ts`、`admin.ts` |
| 组件 | 通用 `src/components/`，后台 UI `src/admin/ui.tsx` | `AIAssistant.tsx` |
| 命名 | 函数/变量 camelCase；类型 PascalCase；常量 UPPER_SNAKE；DB 列 snake_case | `ROLE_ADMIN`、`password_hash` |
| 导入别名 | 前端统一 `@/` 前缀 | `@/services/http` |

### 8.2 代码风格

| 项 | 规范 |
| --- | --- |
| 缩进 | 2 空格 |
| 引号 | 单引号；JSX 属性用双引号 |
| 分号 | 服务端 `.mjs` 省略分号；前端 TS 省略分号 |
| TypeScript | `strict` 开启；禁止 `any` 逃逸（必要时 `unknown` + 收窄） |
| 注释 | 只解释「为什么」，文件头写模块职责与接口清单 |
| 错误 | 业务错误用 `Object.assign(new Error(msg), {status, code})`，禁止裸 `throw new Error` 表达业务语义 |
| 日志 | 禁止 `console.log` 输出敏感信息（口令、Cookie、sid） |

### 8.3 分支与提交

| 项 | 规范 |
| --- | --- |
| 分支 | `main` 稳定；功能分支 `feat/<topic>`；修复 `fix/<topic>` |
| 提交 | Conventional Commits：`feat: …` / `fix: …` / `docs: …` / `refactor: …` |
| 合并前 | `npm run verify` 必须通过（构建 + 门禁 + API 冒烟 + AI 评测） |
| 契约变更 | 先改 PRD/TSD → 再改 OpenAPI → 再改实现 → 最后补冒烟断言 |

### 8.4 测试分层

| 层级 | 内容 | 命令 | 通过标准 |
| --- | --- | --- | --- |
| 静态 | 类型检查、构建 | `npm run build` | 0 error；预渲染 9 页 + 6 OG |
| 门禁 | 数据口径、对比度、预算 | `npm run check` | 全部通过；入口 ≤ 50 kB、CSS ≤ 15 kB |
| API 冒烟 | 临时目录 + 随机端口端到端（50+ 断言） | `node scripts/check-api.mjs` | 全部通过（含 RBAC、状态机、乐观锁、上传、AI、备份、改密） |
| AI 评测 | 40 问答 + 8 注入 | `node scripts/eval-ai.mjs` | HitRate@5 ≥ 0.85、MRR ≥ 0.65、引用 ≥ 0.9、注入 100% |
| 手工 | 移动端布局、离线、主题切换、后台 23 Tab | 浏览器 | 第 8.5 节 DoD |
| 目标补充 | FastAPI 单测（pytest）+ 前端（Vitest） | 待落地 | 核心服务覆盖率 ≥ 70% |

### 8.5 完成定义（DoD）

- [ ] 功能与 PRD 条目一一对应，追溯矩阵已更新
- [ ] 新接口已进 OpenAPI，错误码沿用第 6.1 节
- [ ] 入参校验与边界（长度/体积/分页/权限）齐全
- [ ] 写操作有审计；敏感字段不入日志
- [ ] `npm run verify` 全绿
- [ ] 移动端（375px）无横向滚动，触控目标 ≥ 44px
- [ ] 无新增 `any`、无未使用变量、无死代码
- [ ] 文档（PRD/TSD/数据库）同步更新

### 8.6 验收用例（摘要）

| 用例 | 步骤 | 预期 |
| --- | --- | --- |
| 未登录访问后台 | 打开 `/admin` 调写接口 | 401；页面跳登录 |
| editor 越权 | editor 改站点设置 | 403 |
| 并发编辑 | 两个会话同版本 PUT | 第二个 409 |
| 非法状态 | `draft → published` 直跳 | 422 |
| 待审隔离 | 提交留言后看公开墙 | 不出现；审核后出现 |
| 上传绕过 | 不带签名 PUT | 410 |
| 分享安全 | 错误密码/过期链接 | 401 / 404 |
| AI 降级 | 去掉模型密钥 | `source=retrieval`，有引用 |
| AI 配额 | 超过日配额 | 429，前端提示 |
| 备份恢复 | 创建快照 → 恢复 → 查会话 | 快照不含 sessions；恢复后索引重建 |
| 改密 | 改密后旧口令登录 | 401；旧会话失效 |
| 离线 | 断网刷新 | 离线页可重试；静态页可用 |

---

## 9. PRD 功能点追溯矩阵

### 9.1 核心功能

| PRD 条目 | 优先级 | 技术实现（模块/接口） | TSD 章节 | 验收 |
| --- | --- | --- | --- | --- |
| §2.1 首页总览 | P0 | `src/pages/Home.tsx` + 预渲染 + `/api/content/meta` | 2.1、7.1 | 首屏有正文；`check:budget` |
| §2.1 学习/阅读 | P0 | `Learn.tsx`、`Reader.tsx` + `/api/content/articles` | 2.1、5.2 | cursor 分页、OG 可取 |
| §2.1 简历/工具箱/文件 | P0/P1 | `Resume.tsx`、`Toolbox.tsx`、`Files.tsx` + `/api/files` | 2.1、5.2 | 下载/筛选可用 |
| §2.1 生活/关于/留言/友链 | P1/P0 | `Moments/Love/Travel/MusicBox/About/Timeline/Guestbook/Friends` | 2.1、4.3 | 留言先审后发 |
| §2.1 全站 AI 助手 | P0 | `AIAssistant.tsx` + `/api/ai/chat`（SSE） | 4.5、5.3 | 引用 ≥ 3；降级可用 |
| §2.2 首页总览（总览/数据看板） | P0 | `OverviewPage`、`AnalyticsPage` + `/api/admin/overview`、`/api/analytics/summary` | 2.1、5.2 | KPI 与接口一致；缓存分窗 |
| §2.2 个人中心（资料/账号/安全） | P0 | `ProfilePage` + `/api/admin/profile`、`/api/auth/session`、`/api/admin/password`、`/api/admin/security` | 4.1、5.2 | 改密后旧口令 401 |
| §2.2 内容管理 | P0 | `ContentPage` + `/api/content/*`（状态机 + 乐观锁） | 4.2、5.3 | 409/422 生效 |
| §2.2 简历管理 | P1 | `ResumeAdminPage` + `/api/resume/parse`、`/api/admin/resume/*` | 4.7、5.2 | 版本创建/恢复/删除 |
| §2.2 文件资源 | P0/P1 | `FilesAdminPage` + `/api/files/*` | 4.4 | 签名校验、短链下载 |
| §2.2 审核 | P0 | `ModerationPage` + `/api/guestbook/*`、`/api/admin/friend-requests` | 4.3 | badge 数字真实 |
| §2.2 AI 配置 | P1 | `AiConfigPage` + `/api/ai/models|prompts|usage` | 4.5 | 版本回滚、用量可读 |
| §2.2 站点设置 | P0 | `SettingsPage` + `/api/admin/settings`、`/api/admin/backup` | 4.6 | SEO 生效、快照可恢复 |

### 9.2 特色功能

| PRD 条目 | 技术实现 | TSD 章节 | 验收 |
| --- | --- | --- | --- |
| 站内 RAG 助手 + 引用 | `server/ai/{indexer,rag,gateway}.mjs` | 4.5 | 引用 ≥ 3、来源可点 |
| 无模型检索降级 | `source=retrieval` | 4.5 | 去密钥仍可答 |
| Prompt 版本/回滚 | `/api/ai/prompts/*` + 版本字段 | 4.5 | 回滚后新版本号 |
| 用量/配额/成本 | `server/ai/usage.mjs` + `/api/ai/usage` | 4.5 | 429 与报表 |
| 简历解析 + 版本 | `routes/system.mjs` job + `lib/resume.mjs` | 4.7 | 202 → completed |
| 乐观锁 + 状态机 | `routes/content.mjs` | 4.2 | 409 / 422 |
| 文件签名 + 短链 | `routes/files.mjs` | 4.4 | 410 / 401 / 404 |
| 无 Cookie 埋点 | `routes/analytics.mjs`、`lib/hits.mjs` | 4.7、7.3 | 只有哈希，无明文 IP |
| PWA 离线 | `public/sw.js`、`sw-register.ts` | 7.2 | 断网可重试 |
| 预渲染 + 每篇 OG | `scripts/prerender.mjs` | 7.1 | 9 页 + 每篇 SVG |
| 数据/性能/对比度门禁 | `scripts/check-*.mjs` | 8.4 | `npm run check` |
| 审计 + 备份恢复 | `auth.audit`、`routes/system.mjs` | 4.6、7.3 | 快照不含 sessions |
| 主题 + 移动抽屉 | `ThemeProvider`、`AdminShell` | 7.1 | 375px 可用 |
| 诚实演示模式 | `serverConfig.enabled` | 6.4 | 明确标注未接入 |

### 9.3 AI 应用

| PRD 编号 | 技术落点 | TSD 章节 | 指标 |
| --- | --- | --- | --- |
| A-01 站内问答 | `/api/ai/chat` + RAG | 4.5 | HitRate@5、引用率 |
| A-02 检索索引 | `ai/indexer.mjs` | 4.5 | 索引可重建 |
| A-03 答案缓存 | `cacheKey` + 6h/500 | 4.5 | 命中率 |
| A-04 注入防护 | `ai/safety.mjs` | 7.3 | 拦截 100% |
| A-05 配额成本 | `ai/usage.mjs` | 4.5 | 429、月预算 |
| A-06 Prompt 运营 | `/api/ai/prompts/*` | 4.5 | 回滚可用 |
| A-07 评测闭环 | `scripts/eval-ai.mjs` | 8.4 | 阈值达标 |
| A-08 简历解析 | `/api/resume/parse` | 4.7 | 字段/置信度 |
| A-09 运营周报 | `/api/admin/report` | 5.2 | 规则生成 |
| A-10 AI 配置后台 | `AiConfigPage` + models API | 2.1、4.5 | 配置生效 |

### 9.4 用户流程

| PRD 流程 | 技术链路 | TSD 章节 |
| --- | --- | --- |
| F-01 首次访问 | 预渲染 HTML → Hydrate → 路由懒加载 | 7.1、7.2 |
| F-02 AI 提问 | SSE + 检索 + 配额 | 4.5 |
| F-03 留言 | `POST /api/guestbook` → pending | 4.3 |
| F-04 下载 | 短链 → 密码/过期 → Range | 4.4 |
| F-05 登录 | `POST /api/auth/login` → Cookie | 4.1 |
| F-06 巡检 | `/api/admin/overview` + 待审计数 | 5.2 |
| F-07 发布 | 状态机 + `If-Match` | 4.2 |
| F-08 审核 | approve/reject + 计数刷新 | 4.3 |
| F-09 简历 | job 202 → 轮询 `/api/jobs/:id` | 4.7 |
| F-10 上传分享 | sign → upload → share | 4.4 |
| F-11 AI 配置 | models/prompts/usage | 4.5 |
| F-12 改密 | `POST /api/admin/password` + 撤销会话 | 4.1 |
| F-13 备份 | snapshot → restore → 缓存失效 | 4.6 |
| F-14 移动应急 | 抽屉侧栏 + 卡片流 | 7.1 |

---

## 10. 附录：运行、部署与术语

### 10.1 本地运行

```powershell
# 1) 前端
npm run dev                     # http://localhost:5273

# 2) 后端（另开终端）
Copy-Item .env.example .env      # 修改 ADMIN_PASS / EDITOR_PASS
npm run api                     # http://127.0.0.1:8787

# 3) 前端指向后端
# .env.local: VITE_API_BASE=http://127.0.0.1:8787
```

### 10.2 质量命令

```powershell
npm run build        # tsc + SEO + vite build + 预渲染
npm run check        # 数据口径 / 对比度 / 预算
node scripts/check-api.mjs   # API 端到端冒烟
node scripts/eval-ai.mjs     # AI 评测
npm run verify       # 以上全部
```

### 10.3 容器部署

```powershell
docker compose up -d --build
# api 服务：server/Dockerfile，端口 8787，卷 ./server/data:/data，健康检查 /healthz
```

### 10.4 关键环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` / `HOST` | 8787 / 127.0.0.1 | API 监听 |
| `API_DATA_DIR` | `server/data` | 数据目录 |
| `API_CORS_ORIGIN` | localhost 白名单 | 跨域来源（逗号分隔） |
| `ADMIN_PASS` / `EDITOR_PASS` | 无（必须配置） | 启动强校验，缺失拒绝启动 |
| `SESSION_TTL_MS` | 7 天 | 会话有效期 |
| `COOKIE_SECURE` | 0 | HTTPS 下设为 1（启用 `__Host-`） |
| `TRUST_PROXY` | 0 | 反向代理后设为 1 |
| `IP_SALT` | `wyx` | IP 哈希盐 |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | 空 / 空 / deepseek-chat | 模型网关 |
| `AI_DAILY_QUOTA` / `AI_MONTHLY_TOKEN_BUDGET` | 60 / 3,000,000 | 配额与预算 |
| `UPLOAD_MAX_BYTES` / `UPLOAD_ALLOWED_EXT` | 50 MB / 白名单 | 上传限制 |
| `STORAGE_DRIVER` | `local`（新增 `json/sqlite/postgres`） | 存储驱动 |

### 10.5 术语表

| 术语 | 含义 |
| --- | --- |
| domain | 内容域：articles/projects/moments/trips/tracks/friends/awards/skills/resources/toolbox |
| 乐观锁 | 以版本号 `If-Match` 防止并发覆盖 |
| 状态机 | `draft → pending → published → hidden` 合法迁移 |
| RAG | 检索增强生成：先检索站内片段，再让模型基于片段回答 |
| 降级 / retrieval-only | 无模型密钥时用检索结果直接组装回答 |
| 演示模式 | 未接后端时的只读回退，界面明确标注 |
| 死信 | 重试耗尽仍失败的任务（`status=dead`） |
| 门禁 | 构建/CI 中强制通过的质量检查 |

### 10.6 待办（按优先级）

| 优先级 | 事项 | 关联 |
| --- | --- | --- |
| P0 | 账户三表落到 SQLite，按 [数据库.md](computer://e:\Code\AI\Start\Web\Blog\resume1\数据库.md) 执行 | PRD §2.2 个人中心 |
| P1 | Node → FastAPI 等价实现，OpenAPI 一致性校验加入 CI | PRD §5 |
| P1 | 数据导出/导入脚本（JSON ↔ DB）双向 | PRD §7 数据主权 |
| P2 | Redis 承载限流/配额，支持多实例 | PRD §7 投资点 |
| P2 | `pgvector` 检索与评测基线对比 | PRD §4 A-01/A-02 |

---

**变更记录**

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0 | 2026-10-31 | 首版：架构、模块、选型、流程与模型、接口、异常、性能安全、规范与验收、PRD 追溯 |
