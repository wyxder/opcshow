# 🚀 WYX.SPACE · 晓叶个人站

把「简历 + 作品集 + 博客 + 生活记录 + 管理后台 + 自建 API」装进同一个仓库。
前台是 React SPA（5 套主题、6 篇长文、⌘K 检索、PWA 离线壳），服务端是零 npm 依赖的 Node API（内容状态机、留言审核、文件签名直传、埋点聚合、AI 网关 + 站内 RAG）。

**技术栈：**
[![React][react-badge]][react-url] [![TypeScript][ts-badge]][ts-url] [![Vite][vite-badge]][vite-url] [![Tailwind CSS][tw-badge]][tw-url] [![Framer Motion][fm-badge]][fm-url] [![React Router][rr-badge]][rr-url] [![Lucide][lu-badge]][lu-url] [![Node][node-badge]][node-url] [![Docker][docker-badge]][docker-url]

---

## 📋 项目简介

| 项目 | 说明 |
|---|---|
| **产品定位** | 求职作品集 + 个人博客 + 生活记录站，单域名多频道（首页 / 学习 / 工作 / 生活 / 我的 / 后台） |
| **架构形态** | 同仓双端：`src/` React SPA + `server/` Node API。**不配 `VITE_API_BASE` 时整站纯前端运行**（静态数据 + localStorage），配了才走真实接口 |
| **路由规模** | 前台 15 个页面（另含 2 条频道重定向）+ 后台 8 大区块 23 个 Tab，5 类主导航 20 个子入口 |
| **主题系统** | 51 个语义变量（颜色 24 + 形态 27），5 套主题各覆盖 50 项（`--gutter` 共享），`data-theme` 切换 + `localStorage` 持久化 + 首屏防闪烁 + 打印回落 |
| **内容体量** | 7 个项目、6 篇长文（Section→Sub→Block，6 种内容块）、16 项竞赛荣誉、3 项研究/专利、9 条资源（5 条真实可下载）、11 座城市旅拍、1240 天恋爱记录 |
| **前端交互** | 命令面板、拖拽轮播、数字滚动、3D 倾斜名片、弹幕墙、代码复制、目录跟随、打印简历、SSE/预置双模 AI 助手、Service Worker 离线 |
| **服务端能力** | scrypt + HttpOnly Cookie 会话与 RBAC、内容状态机（草稿→待审→发布→下线）+ 乐观锁、留言审核/点赞/举报、文件签名上传与分享短链、埋点聚合、AI 网关（SSE）、BM25 检索与引用校验、Prompt 版本与用量配额、备份恢复、OpenAPI |
| **构建产物** | 2006 modules；CSS 82.45 KB（gzip 15.05）、**入口 JS 71.10 KB（gzip 33.06）**、后台 chunk 156.89 KB（gzip 49.57）、Home chunk 43.72 KB（gzip 12.42）；预渲染 9 个静态页 + 6 张文章 OG；`sitemap.xml` 20 条 + `rss.xml` 6 篇 |
| **运行环境** | 前端 Node ≥ 18（Vite 5）；服务端建议 Node 22（镜像 `node:22-alpine`），零第三方依赖 |

> ⚠️ **诚实声明（2026-10-31 校准）**
> 1. **内容仍是「代码里的常量」为主**：15 个前台页面直接 `import src/data/*.ts`；`src/services/*` 提供了同构的接口层，只有部署时配置 `VITE_API_BASE` 才会真正读服务端。
> 2. **服务端是真实可运行的**：43 项冒烟 + 契约用例全部通过（登录/RBAC、状态机、乐观锁、留言审核、文件直传/分享、AI 缓存与上下文、埋点看板、资料/设置/友链、简历任务、OpenAPI、备份），数据落在 `server/data/*.json`（原子写 + 串行队列，不是数据库）。
> 3. **AI 依赖你自备密钥**：未配置 `AI_BASE_URL` / `AI_API_KEY` 时，服务端只做「BM25 检索摘录」，不冒充模型；前端再叠一层「作者手写预置问答」，三条路径在 UI 上都带 `source` 角标。
> 4. **真实媒体尚未接入**：仓库里没有本人照片与音频，`src/data/media.ts` 是空清单（页面回落 Plate 图形）；音乐盒为模拟播放；`public/og/*.svg` 为手写 SVG OG，部分平台只认 PNG。

---

## 🛠️ 技术栈

### 前端（全部已实现）

| 分类 | 选型 | 版本 | 在本项目中的职责 |
|---|---|---|---|
| 框架 | React | 18.3 | UI 渲染，StrictMode 下开发，函数组件 + Hooks |
| 语言 | TypeScript | 5.6 | `strict: true`，全站类型化，`tsc -b` 纳入构建门禁 |
| 构建 | Vite | 5.4 | 开发服务（5273，`host: true`）+ 生产构建，`manualChunks` 拆 react / motion / icons |
| 样式 | Tailwind CSS | 3.4 | 原子类 + `@layer components`；色值/圆角/描边/阴影/字族全部指向 CSS 变量 |
| 动画 | Framer Motion | 11.11 | 页面转场、滚动进度、拖拽轮播、数字滚动、弹窗弹簧 |
| 路由 | React Router DOM | 6.28 | 嵌套路由 + 路由级 `lazy` + `Navigate` 重定向 + 哈希锚点 |
| 图标 | Lucide React | 0.462 | 全站图标，独立 chunk（避免各页面各留一份） |
| 状态 | Context + Hooks | — | `ThemeProvider`；页面态 `useState`；持久态统一走 `lib/storage.ts` |
| 离线 | Service Worker（手写） | `wyx-v1` | 壳预缓存 + 导航 network-first + 静态资源 SWR + `/api` 不伪造成功 |

### 服务端（零 npm 依赖）

| 分类 | 实现 | 说明 |
|---|---|---|
| 运行时 | `node:http` | 单进程 HTTP 服务，`npm run api` 起在 `127.0.0.1:8787` |
| 路由 | `server/lib/router.mjs` | 极简模式路由，自动兼容 `/api/...` 与 `/api/v1/...` |
| 校验 | `server/lib/validate.mjs` | `text / object / email / oneOf / integer / arrayOf / containsBlocked`，错误统一 422 |
| HTTP 基础 | `server/lib/http.mjs` | 统一错误体、CSP 等安全头、CORS 白名单、令牌桶限流、`Idempotency-Key`、ETag、IP 哈希 |
| 鉴权 | `server/lib/auth.mjs` | scrypt 加盐密码、HttpOnly `wyx_session` Cookie、SameSite=Lax、RBAC（admin / editor）、审计日志 |
| 持久化 | `server/lib/store.mjs` | JSON 文件 + 原子写（临时文件 rename）+ 串行写队列 + 快照备份/恢复 |
| AI 网关 | `server/ai/gateway.mjs` | OpenAI 兼容 `chat/completions`，SSE 逐 token 透传，首 token 8s 超时、失败重试 1 次 |
| 检索 | `server/ai/rag.mjs` | 按 Section→Sub 切块 → 中文 uni/bigram 分词 → BM25 → 阅读位置加权 → 引用校验 |
| 安全 | `server/ai/safety.mjs` | 注入样例拦截、PII 打码、输出敏感词过滤 |
| 用量 | `server/ai/usage.mjs` | IP + 天配额、6 小时答案缓存、token/成本记账、月度预算 |
| 部署 | `server/Dockerfile` | `node:22-alpine`，非 root 运行，`/data` 卷，`/healthz` 健康检查 |

### 工程脚本（`scripts/`）

| 脚本 | npm 命令 | 作用 |
|---|---|---|
| `gen-seo.mjs` | `npm run gen:seo` | 从 `src/data` 生成 `sitemap.xml`（20 条）与 `rss.xml`（6 篇） |
| `prerender.mjs` | `npm run prerender` | 生成 9 个静态正文页（首页 / 学习列表 / 简历 / 6 篇文章）+ 6 张文章 OG，给爬虫与禁用 JS 的访客兜底 |
| `gen-content-snapshot.mjs` | `npm run gen:content` | 把 `src/data/*.ts` 打成 `server/seed/content.json`，统一补 `status` / `version` |
| `eval-ai.mjs` | `npm run eval:ai` | 40 条站内问答 + 12 条注入 + 5 条上下文定位；产出 HitRate@5 / MRR / 上下文命中 / 引用正确率 / 拦截率 |
| `check-api.mjs` | `npm run check:api` | 起临时实例跑 43 项接口冒烟 + 契约断言（独立数据目录，跑完即销毁） |
| `check-data.mjs` | `npm run check:data` | 索引与正文一致、派生计数、`href="#"` 死链、localStorage 字面量、`Date.now()` id |
| `contrast-check.mjs` | `npm run check:contrast` | 5 套主题 × 5 条 WCAG 规则 |
| `check-budget.mjs` | `npm run check:budget` | 入口 JS ≤ 45 kB、首屏 CSS ≤ 20 kB、单页 chunk ≤ 50 kB（gzip） |
| `gen-files.mjs` / `gen-og.mjs` / `copy-assets.mjs` | 手动 | 生成可下载 ZIP、站点 OG PNG、把简历原件复制进 `public/files` |
| `find-chunk.mjs` | 手动 | 排查某段正文被打进哪个 chunk |

---

## 🏗️ 架构与数据流

```text
浏览器（React SPA）
├─ src/data/*.ts            静态内容：前台默认数据源（typed 常量）
├─ src/services/*.ts        适配层：config → http → 真实接口 / 本地兜底
└─ localStorage             主题 / 收藏 / 本机埋点 / 阅读位置（统一 wyx:*@v1 + 形状校验）
        │
        │  VITE_API_BASE 为空 = 不启用（纯前端演示模式）
        ▼  VITE_API_BASE=https://wyx.space
server/（node:http，零 npm 依赖）
├─ routes/     auth · content · guestbook · files · analytics · ai · system
├─ lib/        router · validate · http(限流/CORS/安全头) · auth(RBAC/审计) · store(JSON 原子写)
├─ ai/         gateway(SSE) · indexer · rag(BM25) · prompts · safety · usage
└─ data/       content / users / sessions / guestbook / files / analytics / ai / jobs / audit（9 个 JSON，运行时生成，git 忽略）
```

**双轨降级**（每一层都如实标注当前能力）：

| 能力 | 未配 `VITE_API_BASE` | 已配 `VITE_API_BASE` |
|---|---|---|
| 内容读取 | `src/data` 常量 | 经 `services/content.ts` 走 `GET /api/content/:domain`，失败回落本地快照 |
| 后台写入 | 抛 `NotSupportedError`，界面提示「演示模式，不会真的保存」 | 真实写 `server/data`，带 `If-Match` 乐观锁 |
| 留言墙 | localStorage（明示「仅你可见」） | 提交 → 待审核 → 后台通过后上墙 |
| 文件下载 | `public/files/*` 静态下载 | 静态文件仍直下；新增签名上传、短链（密码/过期/Range/计数） |
| 埋点 | 本机会话样本（sessionStorage） | `POST /api/track` + `GET /api/analytics/summary` |
| AI 问答 | 作者手写预置问答 | 模型 SSE → 失败降级为检索摘录 → 前端再降级为预置 |

---

## 📁 目录结构

```text
resume1/
├─ index.html                      # 入口 HTML：SEO/OG、字体分层加载、主题防闪烁内联脚本
├─ vite.config.ts                  # @→src、5273 端口、react/motion/icons 手动分包
├─ tailwind.config.js              # 令牌映射层：颜色/字族/阴影/描边/圆角 全部 var()
├─ tsconfig.json                   # strict + paths 映射 @/*
├─ package.json                    # dev / build / api / gen:* / check:* / eval:ai
├─ .env.example                    # 服务端与前端变量示例（不含任何真实密钥）
├─ docker-compose.yml              # 一键起 API，数据卷挂 ./server/data
├─ doc/
│  └─ collaboration-rules.md       # 文档存放与批量提交约定
├─ fx.md / fx1.md                  # 需求分析与实现清单（每条对应代码落点）
├─ 简历/AI全栈开发-晓叶-研2.docx  # 简历原件（copy-assets 的输入）
├─ theme-preview/index.html        # 8 款主题设计稿对比页（上线 5 款：01/02/03/05/06）
├─ scripts/                        # 生成 / 预渲染 / 评测 / 门禁脚本（见上表）
├─ server/
│  ├─ index.mjs                    # API 入口：安全头 → CORS → Origin 校验 → 路由 → 审计日志
│  ├─ lib/{env,http,router,validate,auth,store}.mjs
│  ├─ routes/{auth,content,guestbook,files,analytics,ai,system}.mjs
│  ├─ ai/{gateway,indexer,prompts,rag,safety,usage}.mjs
│  ├─ seed/content.json            # 内容种子（14 个数据集合：9 个可写域 + 工具/学历/研究/统计/时间轴）
│  ├─ Dockerfile
│  └─ data/                        # 运行时数据（git 忽略，备份可直接拷走）
├─ public/
│  ├─ sw.js · offline.html · site.webmanifest
│  ├─ robots.txt                   # 后台与交互参数页不索引
│  ├─ sitemap.xml · rss.xml        # 构建期生成（git 忽略）
│  ├─ og-cover.png · og/*.svg      # 站点封面 + 每篇文章 OG（构建期生成）
│  └─ files/                       # 简历 docx/打印版 HTML、md、py、csv、zip（真实可下载）
├─ src/
│  ├─ main.tsx                     # 挂载：ErrorBoundary > ThemeProvider > BrowserRouter > App
│  ├─ App.tsx                      # 路由分发：/admin/* 走后台，其余走 Layout + 动画出口；路由级懒加载
│  ├─ index.css                    # ⭐ 主题令牌唯一数据源（5 个 [data-theme] 块 + 组件层 + 打印样式）
│  ├─ theme/                       # theme.ts（元信息/读写）+ ThemeProvider（跨标签页同步）
│  ├─ components/                  # Layout / AIAssistant / ThemeSwitcher / ProjectModal / SmartImage / ErrorBoundary
│  │  └─ ui/                       # Modal / Toast / primitives（Reveal·Marquee·Tilt·CountUp·Plate…）
│  ├─ data/                        # 前台默认数据源（9 个模块，全部 typed）
│  ├─ pages/                       # 15 个前台页面
│  ├─ admin/                       # 后台：AdminApp / AdminShell / LoginPage / ui.tsx / data.ts / 9 个页面
│  ├─ services/                    # 适配层：ai / analytics / audio / auth / config / content / files / guestbook / http / observability
│  ├─ lib/                         # utils / storage / search / seo / a11y / assistant
│  └─ sw-register.ts               # 生产环境懒加载注册 SW，新版本提示
└─ dist/                           # 构建产物（git 忽略）
```

---

## ⚡ 核心功能模块

### 前台

| # | 模块 | 关键文件 | 已实现能力 |
|---|---|---|---|
| 1 | **主题引擎** | `index.css` · `theme/*` · `ThemeSwitcher.tsx` | 5 套主题（纸感极简 / 实验室科技 / 瑞士国际 / 终端极客 / 设计师青春）、51 个语义变量（每套覆盖 50，`--gutter` 共享）、圆角·描边·阴影·字族·纹理随主题变化、`localStorage` 记忆、深色系统偏好回落终端主题、`meta[theme-color]` 同步、打印黑白 |
| 2 | **导航与检索** | `Layout.tsx` · `lib/search.ts` | 固定毛玻璃顶栏、悬停大下拉、移动全屏菜单、`⌘K / Ctrl+K` 命令面板（页面 + 文章 + 项目聚合，同义词归一化，方向键与回车导航）、滚动进度条 |
| 3 | **首页叙述** | `Home.tsx` | 标签化 Hero、3D 倾斜名片与详情弹窗、CountUp 数据条、拖拽/自动播放项目轮播、技能 Bento、荣誉榜 + 全览弹窗、生活切片 |
| 4 | **长文阅读** | `Reader.tsx` · `articles.ts` | 三级目录（Section→Sub）、`IntersectionObserver` 目录高亮、6 种内容块渲染、代码一键复制、阅读位置记忆、正文排版随主题（`.prose-read`） |
| 5 | **AI 助手** | `AIAssistant.tsx` · `services/ai.ts` | 浮屏入口 + `open-assistant` 事件、SSE 流式输出、阅读上下文注入（当前文章/小节）、可点引用、停止/重试、`source` 角标区分模型/检索/预置 |
| 6 | **简历与打印** | `Resume.tsx` · `index.css` | 一页纸版式、`window.print()`、打印专用样式（隐藏导航/纹理/动画，白底黑字，防分页断裂）、docx 与原稿下载 |
| 7 | **生活频道** | `Love/Moments/Travel/MusicBox.tsx` | 恋爱天数与手记、朋友圈（本地追加/点赞/评论）、旅拍地图散点 + 轨迹 + 城市筛选、音乐盒（可插拔音频源，缺失时明示「试听暂缺」） |
| 8 | **资源与工具** | `Toolbox.tsx` · `Files.tsx` · `services/files.ts` | 工具/Prompt 收藏、资源按类型色标 + 网格/列表 + 分类筛选 + 搜索、`resolveDownload()` 统一判断「静态下载 / 签名下载 / 待上传」 |
| 9 | **留言弹幕墙** | `Guestbook.tsx` · `services/guestbook.ts` | 弹幕滚动墙、提交→审核→上墙、点赞（服务端按 IP 哈希去重）、举报、本机模式与真实模式同接口 |
| 10 | **工程化外壳** | `ErrorBoundary` · `observability` · `sw-register` | 三层错误边界（root / app / route）、错误上报（仅在显式配置端点时发送错误摘要：消息/栈/路由/UA，不带表单内容）、SW 离线壳 + 新版本确认、`prefers-reduced-motion` 降级 |

### 服务端

| # | 模块 | 关键文件 | 已实现能力 |
|---|---|---|---|
| 1 | **鉴权与审计** | `auth.mjs` · `routes/auth.mjs` | 登录/登出/会话/刷新、scrypt 加盐、HttpOnly Cookie、admin 与 editor 两角色、登录限流（10 次/10 分钟）、写操作审计 |
| 2 | **内容与发布** | `routes/content.mjs` | 9 个内容域 CRUD、`draft→pending→published→hidden` 状态机（非法迁移 422）、`If-Match` 乐观锁（409）、ETag + cursor 分页、`scope=admin` 才见草稿 |
| 3 | **留言与审核** | `routes/guestbook.mjs` | 公开墙只返回 published、提交进审核队列（30 秒去重、敏感词标记）、通过/拒绝/点赞/举报（3 次举报回待审）、待审计数 |
| 4 | **文件与分享** | `routes/files.mjs` | 直传签名（返回 10 分钟有效期、扩展名与体积白名单）、上传登记、公开/私密切换、回收站与恢复、分享短链（scrypt 密码 + 过期 + 访问计数）、Range 下载 |
| 5 | **埋点与看板** | `routes/analytics.mjs` | 只存 path/referrer/会话哈希/停留时长，IP 仅哈希；7/30 天 PV·UV·AI 会话·热门页·平均停留，5 分钟缓存；前端错误收集 |
| 6 | **AI 网关** | `routes/ai.mjs` · `ai/*` | SSE 或 JSON 双模、检索 + 模型、引用校验（覆盖率 < 0.5 标记 degraded）、注入拦截、PII 打码、6 小时缓存、IP 日配额、模型/Prompt 版本与回滚、reindex、评测报告 |
| 7 | **异步任务** | `routes/system.mjs` | 简历解析（本地规则 + 置信度，失败 2 次进死信）、任务查询、全量 JSON 备份/恢复、运行指标、每篇文章 OG SVG、OpenAPI 3.1 |
| 8 | **可观测与安全** | `lib/http.mjs` · `index.mjs` | 请求 ID、结构化日志、统一错误体、CSP/nosniff/COOP/HSTS、Origin 校验抗 CSRF、按 IP 令牌桶限流、优雅停机 |

### 三条关键链路

**① AI 问答（四级降级，全程不白屏）**

```text
用户提问（带当前文章/小节上下文）
  └─> 前端 services/ai.ts
       ├─ 未配置 API_BASE ──────────────► 预置问答（作者手写，source=preset）
       └─ POST /api/ai/chat
            ├─ 注入检测命中 ────────────► 固定拒绝话术（flagged=true）
            ├─ 命中 6h 缓存 ────────────► 直接回放（cached=true）
            ├─ 有模型密钥 ──────────────► SSE 流式（source=model）→ 引用校验
            │                              └─ 校验不通过 → degraded=true，附检索引用
            └─ 无密钥 / 模型失败 ───────► 检索摘录（source=retrieval）
                                           └─ 失败再降级 → 前端预置问答
```

**② 内容发布（写操作全程可追溯）**

```text
后台 ContentPage
  └─> services/content.ts（服务端 PUT /api/content/:domain/:id，带 If-Match version）
        ├─ version 不匹配 → 409 VERSION_CONFLICT，前端提示刷新
        └─ 成功后 version+1 → POST /:id/status 走状态机 → 审计日志
           （索引不会自动重建：需 POST /api/ai/reindex 或重启，见「已知边界」）
```

**③ 文件分享**

```text
POST /api/files/sign（校验扩展名/体积，发 10 分钟上传凭证；上传时校验 key 格式与体积）
  → PUT /api/files/upload/:key（写 server/data/uploads，登记元数据，默认 private）
  → POST /api/files/:id/visibility（改公开）
  → POST /api/files/share（生成 token + 可选密码/有效期）
  → GET /api/files/download/:token（校验密码/过期 → 计数 → Range 流式下载）
```

---

## ⚙️ 本地开发

### 1. 前端

```bash
git clone <repo-url> resume1
cd resume1
npm install        # 5 项运行时依赖 + 9 项开发依赖
npm run dev        # http://localhost:5273（host:true，可用局域网 IP 手机调试）
```

要求：**Node ≥ 18**、npm ≥ 9。不配任何环境变量也能跑（纯前端演示模式）。

### 2. 服务端（可选）

```bash
cp .env.example .env         # 必须把 ADMIN_PASS / EDITOR_PASS 改成 ≥ 8 位的口令
npm run api                  # http://127.0.0.1:8787
```

首次启动会：校验口令（缺口令直接拒绝启动）、写入 `server/data/users.json`（scrypt 哈希）与 `sessions.json`、把 `server/seed/content.json` 落成 `content.json`、搭建 BM25 索引。

> 已有 `server/data/users.json` 时，改 `.env` 口令不会覆盖旧哈希；需删除该文件后重启重建账号（后续会补改密接口）。

### 3. 前后端联调

在根目录 `.env` 追加（Vite 只读取 `VITE_` 前缀）：

```bash
VITE_API_BASE=http://127.0.0.1:8787
```

同时把服务端 `API_CORS_ORIGIN` 补上 **5273**：

```bash
API_CORS_ORIGIN=http://localhost:5273,http://127.0.0.1:5273,http://localhost:4173
```

> ⚠️ `.env.example` 里的默认白名单写的是 `5173`（Vite 模板端口），本项目实际端口是 **5273**；不改会在浏览器里看到 CORS 拦截、接口请求全部回落本地。

### 4. 环境变量

| 变量 | 默认 | 作用 |
|---|---|---|
| `PORT` / `HOST` | `8787` / `127.0.0.1` | API 监听地址；容器内改 `0.0.0.0` |
| `API_DATA_DIR` | `server/data` | JSON 数据目录；容器内建议 `/data` |
| `API_CORS_ORIGIN` | `localhost:5273,127.0.0.1:5273,localhost:4173` | 前端来源白名单（逗号分隔） |
| `ADMIN_USER` / `ADMIN_PASS` | `admin` / **必须显式设置** | 未设置、`change-me` 或少于 8 位时服务拒绝启动；首次启动写入 `users.json` |
| `EDITOR_USER` / `EDITOR_PASS` | `editor` / **必须显式设置** | 同上；编辑可写内容与审核，不能改系统设置/密钥 |
| `SESSION_TTL_MS` | `604800000` | 会话有效期（7 天） |
| `COOKIE_SECURE` | `0` | HTTPS 环境设 `1`，Cookie 带 Secure |
| `IP_SALT` | `change-me` | 埋点与点赞的 IP 哈希盐（生产必改） |
| `TRUST_PROXY` | `0` | 设为 `1` 才信任 `X-Real-IP` / `X-Forwarded-For`（部署在 Nginx 后时启用） |
| `AI_BASE_URL` / `AI_API_KEY` | 空 | OpenAI 兼容网关；**留空则只做检索摘录** |
| `AI_MODEL` | `deepseek-chat` | 默认模型名 |
| `AI_TIMEOUT_MS` / `AI_FIRST_TOKEN_MS` | `25000` / `8000` | 总超时与首 token 超时 |
| `AI_MAX_OUTPUT_TOKENS` | `700` | 单次输出上限 |
| `AI_DAILY_QUOTA` / `AI_MONTHLY_TOKEN_BUDGET` | `60` / `3000000` | 按 IP 日配额 / 月度 token 预算 |
| `UPLOAD_MAX_BYTES` / `UPLOAD_ALLOWED_EXT` | `52428800` / 见示例 | 上传体积与扩展名白名单 |
| `STORAGE_DRIVER` | `local` | 本地磁盘驱动（S3/OSS 驱动为后续项） |
| `VITE_API_BASE` | 空 | 前端接口基地址；**空 = 纯前端演示模式** |
| `VITE_API_TIMEOUT` | `12000` | 前端请求超时（毫秒） |
| `VITE_AUDIO_BASE` | 空 | 音乐试听 manifest 前缀；空则明示「试听暂缺」 |
| `VITE_ERROR_REPORT_PATH` | 空 | 错误上报端点；空则不发送任何请求 |

---

## 🚀 构建与部署

### 1. 生产构建

```bash
npm run build
# = tsc -b（类型门禁）
# → npm run gen:seo（sitemap 20 条 + rss 6 篇）
# → vite build（2005 modules，输出 dist/assets）
# → npm run prerender（9 个静态页 + 6 张文章 OG）
npm run preview     # 端口 4173，验证 dist/
```

### 2. Nginx（静态 + 反代 API）

```nginx
server {
  listen 443 ssl http2;
  server_name wyx.space;
  root /var/www/wyx-space/dist;
  index index.html;

  # SPA：直连子路由不 404
  location / {
    try_files $uri $uri/ /index.html;
  }

  # 预渲染产物优先命中（/learn/<id>/index.html）
  location ~ ^/(learn|work|me|life)(/.*)?$ {
    try_files $uri $uri/index.html /index.html;
  }

  # API 反代（SSE 必须关闭缓冲）
  location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_buffering off;
    proxy_read_timeout 60s;
  }

  location = /healthz { proxy_pass http://127.0.0.1:8787/healthz; }

  location ~* \.(js|css|woff2|png|svg|webp|avif)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  location = /index.html { add_header Cache-Control "no-cache"; }

  # fx2 FE-15：静态层 CSP（主题引导已抽成 /theme-boot.js，无需 unsafe-inline）
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
}
```

> `sw.js` 与 `offline.html` 建议单独设 `Cache-Control: no-cache`，否则服务工作线程更新会滞后。

### 3. Docker（只容器化 API）

```bash
cp .env.example .env          # 改密码与盐
docker compose up -d --build  # wyx-api:local，端口 8787，数据卷 ./server/data:/data
curl http://127.0.0.1:8787/healthz
```

前端仍是静态产物，交给 CDN / Nginx / 对象存储托管。

### 4. 静态托管（Vercel / Netlify / OSS / GitHub Pages）

| 项 | 值 |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| SPA 重写 | Vercel 自动识别；Netlify 需 `/* /index.html 200`；OSS/COS 把 404 指到 `index.html` |
| 子路径（如 GitHub Pages `/resume1/`） | `vite.config.ts` 加 `base: '/resume1/'`，`main.tsx` 的 `<BrowserRouter basename="/resume1">` |
| API | 单独部署到 VPS/Fly/Render，再由前端 `VITE_API_BASE` 指向它，并把它加进 `API_CORS_ORIGIN` |

### 5. 上线检查清单

- [ ] `npm run build` 通过（`tsc -b` + 预渲染）
- [ ] `.env` 已改：`ADMIN_PASS` / `EDITOR_PASS` / `IP_SALT` / `COOKIE_SECURE=1`
- [ ] `API_CORS_ORIGIN` 含线上域名，且不含 `*`
- [ ] `VITE_API_BASE` 指向 HTTPS 接口；登录后 `/admin` 能读会话
- [ ] 5 套主题逐页复核（尤其 03/05 的直角与无阴影形态）
- [ ] 移动端（≤1024）菜单主题宫格可用、无横向滚动
- [ ] 简历页打印预览正常（黑白、不截断）
- [ ] 直连 `/learn/rag-engineering`、`/admin/settings/theme` 不 404
- [ ] `npm run check:api`、`npm run eval:ai` 在目标环境通过
- [ ] `server/data` 已纳入备份（`POST /api/admin/backup` 或直接拷贝 JSON）

---

## 📦 API 接口

### 约定

- 统一前缀 `/api`，同时兼容 `/api/v1`（路由层自动注册两份）。
- 错误体固定：`{ code, message, requestId, details? }`；成功为业务对象。
- 鉴权：`wyx_session` HttpOnly Cookie（SameSite=Lax），写接口需 `admin` 或 `editor`。
- 限流（按 IP，内存令牌桶）：AI 20/分、留言 3/分、登录 10/10 分、埋点 120/分、下载 30/分。
- 幂等：写接口可带 `Idempotency-Key`，5 分钟内同 key + 同 body 返回首次结果（内存实现）；内容更新用 `If-Match: "version"` 防并发覆盖。
- 完整机器可读契约：`GET /api/openapi.json`（OpenAPI 3.1，由服务端运行时生成）。

### 公开 / 访客

| 方法 | 路径 | 用途 | 备注 |
|---|---|---|---|
| `GET` | `/healthz` `/readyz` | 存活 / 就绪 | `readyz` 会初始化并读取一遍数据存储 |
| `GET` | `/api/content/meta` | 内容域计数与版本 | 登录后才返回草稿数 |
| `GET` | `/api/content/:domain` | 已发布列表 | `?cursor=&limit=`，ETag 304；`?scope=admin` 需登录 |
| `GET` | `/api/content/:domain/:id` | 单条详情 | 草稿仅登录可见 |
| `GET` | `/api/profile` | 公开个人资料 | 读 `settings.json`，回落内容种子 |
| `POST` | `/api/friend-requests` | 提交友链 | `{ name, url, desc }` → 201 `pending`，同 IP 3 次/小时 |
| `GET` | `/api/guestbook` | 公共留言墙 | 仅 `published`，cursor 分页 |
| `GET` | `/api/guestbook/pending/count` | 待审数量 | 未登录返回 0 |
| `POST` | `/api/guestbook` | 提交留言 | `{ user, text, email?, color?, source? }` → 201 `pending` |
| `POST` | `/api/guestbook/:id/like` | 点赞/取消 | 按 IP 哈希去重 |
| `POST` | `/api/guestbook/:id/report` | 举报 | 累计 3 次回待审 |
| `GET` | `/api/files` | 公开文件列表 | 带 `url: /api/files/download-by-id/:id` |
| `GET` | `/api/files/download-by-id/:id` | 按 id 下载 | 私密文件需登录；支持 Range；计数 |
| `GET` | `/api/files/download/:token` | 分享短链下载 | 密码 `?password=`，过期/不存在统一 404 |
| `POST` | `/api/track` | 埋点 | `{ path, referrer?, sessionHash?, stayMs? }` → 202 |
| `POST` | `/api/client-errors` | 前端错误上报 | `{ message, stack?, url? }` → 202 |
| `POST` | `/api/ai/chat` | 助手问答 | `stream=true` 走 SSE；见下 |
| `POST` | `/api/ai/feedback` | 👍/👎 与失败原因 | 写 `ai.json`，保留最近 1000 条 |
| `GET` | `/api/ai/sessions/:id` | 会话恢复 | 返回历史消息与引用（按 sessionId 可见） |
| `GET` | `/api/og/:file` | 文章 OG 图 | 手写 SVG，零依赖 |
| `GET` | `/api/openapi.json` | OpenAPI 3.1 | 可直接喂 Swagger UI |

**`POST /api/ai/chat` 响应**

```text
# SSE（默认）：每行 data: <json>
{ "delta": "…" }                                   # 增量文本（可能多条）
{ "done": true, "source": "model|retrieval", "references": [...], "degraded": false, "sessionId": "s_…" }
{ "error": "模型暂时不可用", "code": "MODEL_UNAVAILABLE" }   # 流中失败

# JSON（传 stream:false）
{ "answer": "…", "source": "model|retrieval", "references": [{ "docId", "section", "path", "snippet" }], "degraded": false, "sessionId": "s_…" }
```

### 鉴权

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/auth/login` | `{ user, password }` → 会话 + Set-Cookie |
| `POST` | `/api/auth/logout` | 清 Cookie |
| `GET` | `/api/auth/session` | 当前会话（401 表示未登录） |
| `POST` | `/api/auth/refresh` | 续期信息 |
| `GET` | `/api/auth/csrf` | 返回当前防护方案（Origin 校验 + SameSite） |

### 后台写操作（需登录）

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/content` | 新建内容（`{ domain, id, payload }`，id 重复 409） |
| `PUT` | `/api/content/:domain/:id` | 更新（`If-Match` 版本；自动 `version+1`） |
| `POST` | `/api/content/:domain/:id/status` | 状态机迁移（draft/pending/published/hidden） |
| `DELETE` | `/api/content/:domain/:id` | 软下线（status=hidden） |
| `POST` | `/api/guestbook/:id/approve` \| `/reject` | 审核通过 / 拒绝 |
| `DELETE` | `/api/guestbook/:id` | 标记删除 |
| `POST` | `/api/files/sign` | 直传签名（扩展名/体积校验） |
| `PUT` | `/api/files/upload/:key` | 上传二进制（原始 body） |
| `POST` | `/api/files/:id/visibility` | `{ visibility: 'public'\|'private' }` |
| `DELETE` | `/api/files/:id` \| `POST /api/files/:id/restore` | 回收站 / 恢复 |
| `POST` | `/api/files/share` | `{ fileId, password?, expiresDays? }` → `{ token, url }` |
| `GET` | `/api/files/shares` \| `DELETE /api/files/share/:token` | 分享列表 / 撤销 |
| `GET` | `/api/analytics/summary` | `?window=7d\|30d`，5 分钟缓存 |
| `GET` | `/api/ai/usage` | 真实用量（日/月、模型、成本） |
| `GET/POST` | `/api/ai/models` · `PATCH /api/ai/models/:id` | 模型登记与启停（密钥不落库、不回传） |
| `GET/POST` | `/api/ai/prompts` · `PUT /api/ai/prompts/:id` · `POST /api/ai/prompts/:id/rollback` | Prompt 版本管理与回滚（admin / editor） |
| `POST` | `/api/ai/reindex` | 使索引失效并当场重建，返回块数/篇数/构建时间 |
| `GET` | `/api/ai/health` · `/api/ai/eval` | 网关健康（模型模式/索引） / 评测报告（未跑过则 404） |
| `POST` | `/api/resume/parse` | `{ text, fileName? }` → 202 任务 id（本地规则 + 置信度） |
| `GET` | `/api/jobs` · `/api/jobs/:id` | 任务列表 / 状态（running / completed / dead） |
| `POST` | `/api/admin/backup` · `GET /api/admin/backup` · `POST /api/admin/backup/:id/restore` | 备份与恢复 |
| `GET` | `/api/admin/metrics` | 进程/内存、数据目录、审计条数、任务（含死信）、模型配置 |
| `PUT` | `/api/admin/profile` | 更新个人资料（写 `settings.profile`） |
| `GET/PUT` | `/api/admin/settings` | 站点设置（SEO / 默认主题） |
| `GET` | `/api/admin/friend-requests` · `PATCH /api/admin/friend-requests/:id` | 待审友链 / 通过或拒绝 |
| `GET` | `/api/ai/feedback` | 助手 👍/👎 反馈列表（admin） |

### 调用示例

```bash
# 登录（保存 Cookie）—— 密码以你 .env 中的 ADMIN_PASS 为准
curl -i -c cookie.txt -X POST http://127.0.0.1:8787/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"admin","password":"<你的 ADMIN_PASS>"}'

# 流式问答
curl -N -X POST http://127.0.0.1:8787/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"RAG 切片怎么定？","stream":true,"context":{"articleId":"rag-engineering"}}'

# 带登录态改内容（乐观锁）
curl -b cookie.txt -X PUT http://127.0.0.1:8787/api/content/articles/rag-engineering \
  -H 'Content-Type: application/json' -H 'If-Match: "3"' \
  -d '{"payload":{"title":"RAG 工程化","status":"published"}}'
```

---

## 🧪 质量与验证

以下为 **2026-10-31 本机实测**（Node 22 / Windows 10）：

| 项 | 结果 |
|---|---|
| 类型检查 | `tsc -b` 通过（`strict: true`） |
| 生产构建 | `vite build` 通过，2006 modules；CSS 82.45 KB（gzip 15.05）、入口 JS 71.10 KB（gzip 33.06）、Home 43.72 KB（gzip 12.42） |
| 分包 | react 163.87 KB（gzip 53.44）/ motion 123.08（41.06）/ icons 51.24（10.19）/ admin 156.89（49.57） |
| 预渲染 | 9 个静态页 + 6 张文章 OG；`sitemap.xml` 20 条、`rss.xml` 6 篇 |
| 主题对比度 | `check:contrast` 5 套主题 × 5 条规则全通过；正文/底色 15.50–18.11:1，弱化小字 3.06–5.65:1 |
| 数据自洽 | `check:data` 全通过：索引与正文一致、分类计数为派生值、无 `href="#"`、localStorage 收敛、id 统一 `newId()` |
| 包体预算 | `check:budget`：入口 33.06 ≤ 45 kB ✓、CSS 15.05 ≤ 20 kB ✓、单页 chunk ✓ |
| 接口冒烟 | `check:api` 43 项全通过：RBAC、登录 Cookie、内容过滤、状态机与「状态不可绕过」、乐观锁 409、留言审核/点赞、文件签名→上传→公开→分享→密码下载、AI 缓存/上下文/注入、埋点看板契约（7d/30d 不串窗）、资料/设置/友链、异步任务、OpenAPI、OG、备份、登出 |
| AI 评测 | `eval:ai`：语料 6 篇 / 14 块；HitRate@5 **0.85**、MRR **0.654**、**上下文定位 1.00**、引用正确率 **1.00**、注入拦截 **100%**（40 问 + 12 条注入） |
| 离线能力 | SW 预缓存壳 + 访问过的导航回落 `offline.html`；`/api` 离线返回 503 `OFFLINE`，不伪造数据 |
| 无障碍 | 弹窗焦点陷阱（`lib/a11y.ts`）、`aria-expanded/selected` 完整、`prefers-reduced-motion` 全站降级 |
| 工程设施 | GitHub Actions `verify`（build → check → check:api → eval:ai）；缺 ESLint/Prettier/单测与视觉回归 | `.github/workflows/verify.yml` |

> 入口 chunk 已从 50.0 kB 降到 33.06 kB（Home 改为路由级 lazy，预渲染 HTML 先兜底）。下一步要把 Home 内部的重组件继续下沉，把首屏总预算控制在 45 kB 以内。

---

## 💡 已知边界与下一步

### 当前边界（不做美化表述）

- **单一真源仍是半成品**：`src/data` 仍是前台直接依赖；构建期脚本（gen-seo / prerender / eval）已优先读运行时 `server/data/content.json`，但页面渲染还没全量改读接口。
- **持久化是 JSON 文件**：原子写 + 串行队列能扛单机小流量，但不支持并发多实例、事务与复杂查询；换 PostgreSQL + Prisma 时只需替换 `server/lib/store.mjs`。
- **限流与配额是进程内存**：多实例部署需要 Redis；重启会重置计数（配额按天记账在 JSON 里，不受影响）。
- **AI 检索是 BM25**：中文 uni/bigram 分词 + 阅读位置加权 + 标题重排 + 去重，未做向量召回与 rerank；`rag.mjs` 的 `chunk / retrieve / verifyReferences` 接口保持不变即可换 pgvector。
- **真实媒体缺失**：无照片、无音频；OG 为 SVG（部分平台只接受 PNG）；PWA 图标仍是 SVG（已声明 192/512，但未出 PNG）。
- **未接入 ESLint / Prettier / 单元测试**：门禁有 5 个脚本 + GitHub Actions，但没有组件级单测与视觉回归。
- **编辑器不可视化**：后台内容编辑仍是表单级，未做 Markdown/块编辑器与草稿预览。

### 下一步（按优先级）

| 优先级 | 事项 | 价值 |
|---|---|---|
| P0 | 把前台剩余静态页的 `src/data` 直接 import 换成 `services/content.ts`（首页/关于/资源已完成一部分） | 真正实现「接口一换，全站生效」 |
| P0 | 生产环境配置真实 `AI_BASE_URL` 与图像/音频素材，补齐 `media.ts` 清单 | 站点从「骨架完整」变成「内容完整」 |
| P1 | 内容写入/状态变更后自动 `invalidate()` 索引（现需手动 reindex） | 后台改完文章，问答立刻用新语料 |
| P1 | `server/lib/store.mjs` 换 PostgreSQL + Prisma，补迁移与事务 | 支撑并发与多实例 |
| P1 | 检索升级：pgvector + tsvector 混合召回 + RRF + rerank，接口不变 | 问答质量与可解释性提升 |
| P1 | 对象存储驱动（OSS/S3 直传）与图片 CDN；OG 改 satori 出 PNG | 资源中心真正可用、分享卡稳定 |
| P2 | ESLint + Prettier + Vitest + Playwright（5 主题 × 关键页冒烟） | 防配色/形态/交互回归 |
| P2 | GitHub Actions 增加部署 job（verify 已就绪） | 把发布也自动化 |
| P3 | 内容块编辑器（拖拽排序 + 预览）与评论/友链真实闭环 | 后台从「管理」走向「创作」 |

---

## 📮 联系与许可

邮箱 `wyxcode@qq.com` · 微信 `wyx200265` · 站点 `WYX.SPACE`（西安 / 可远程，实习可 6 个月以上、每周 5 天）。

项目为个人作品集，代码手写为主，AI 仅用于辅助；如需转载或引用请保留出处。

<!-- badge links -->
[react-badge]: https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white&style=flat-square
[react-url]: https://react.dev
[ts-badge]: https://img.shields.io/badge/TypeScript-5.6-strict-3178C6?logo=typescript&logoColor=white&style=flat-square
[ts-url]: https://www.typescriptlang.org
[vite-badge]: https://img.shields.io/badge/Vite-5.4-31E29A?logo=vite&logoColor=white&style=flat-square
[vite-url]: https://vitejs.dev
[tw-badge]: https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square
[tw-url]: https://tailwindcss.com
[fm-badge]: https://img.shields.io/badge/Framer%20Motion-11.11-0055FF?logo=framer&logoColor=white&style=flat-square
[fm-url]: https://www.framer.com/motion/
[rr-badge]: https://img.shields.io/badge/React%20Router-6.28-C8362F?logo=reactrouter&logoColor=white&style=flat-square
[rr-url]: https://reactrouter.com
[lu-badge]: https://img.shields.io/badge/Lucide-0.462-F56E0F?logo=lucide&logoColor=white&style=flat-square
[lu-url]: https://lucide.dev
[node-badge]: https://img.shields.io/badge/Node-22-339933?logo=nodedotjs&logoColor=white&style=flat-square
[node-url]: https://nodejs.org
[docker-badge]: https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white&style=flat-square
[docker-url]: https://docs.docker.com
