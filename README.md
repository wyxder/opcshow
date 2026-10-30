# 🚀 WYX.SPACE · 魏云潇个人站

一个把「简历 + 作品集 + 博客 + 生活记录 + 管理后台」装进同一套界面的**纯前端单页应用**。
支持 5 套可切换主题（令牌化设计系统）、6 篇结构化长文阅读、⌘K 全局检索、浮屏 AI 助手与留言弹幕墙。

**技术栈：**
[![React][react-badge]][react-url] [![TypeScript][ts-badge]][ts-url] [![Vite][vite-badge]][vite-url] [![Tailwind CSS][tw-badge]][tw-url] [![Framer Motion][fm-badge]][fm-url] [![React Router][rr-badge]][rr-url] [![Lucide][lu-badge]][lu-url]

---

## 📋 项目简介

| 项目 | 说明 |
|---|---|
| **产品定位** | 求职作品集 + 个人博客 + 生活记录站，单域名多频道（首页 / 学习 / 工作 / 生活 / 我的 / 后台） |
| **架构形态** | SPA 单页应用，**无后端、无数据库**，全部内容来自 `src/data` 类型化数据模块 |
| **路由规模** | 前台 15 个页面 + 后台 8 大区块 23 个 Tab，5 类主导航 20 个子入口 |
| **主题系统** | 5 套主题 × 48 个语义令牌，`data-theme` 切换 + `localStorage` 持久化 + 首屏防闪烁 |
| **内容体量** | 7 个项目、6 篇长文（章节三级嵌套 + 6 种内容块）、16 项奖项、11 座城市、1240 天恋爱记录 |
| **交互能力** | 命令面板、拖拽轮播、数字滚动、3D 倾斜名片、弹幕墙、代码复制、目录跟随、打印简历、AI 浮屏助手 |
| **构建产物** | `dist/` 静态资源，CSS 76 KB（gzip 14 KB）、JS 682 KB（gzip 217 KB），三段手动分包 |
| **运行环境** | Node ≥ 18、任意静态托管（Nginx / OSS / Vercel / GitHub Pages），零环境变量依赖 |

> ⚠️ 诚实声明：仓库内**不存在服务端代码与真实模型调用**。AI 助手是关键词匹配的本地模拟（代码里明确写着「回答都是手写的」），后台数据均为 mock；下文「后端 / AI 服务 / API」章节区分了「已实现」与「规划契约」，未实现项已明确标注。

---

## 🛠️ 技术栈

### 前端（全部已实现）

| 分类 | 选型 | 版本 | 在本项目中的职责 |
|---|---|---|---|
| 框架 | React | 18.3 | UI 渲染，StrictMode 下开发，函数组件 + Hooks，无 class 组件 |
| 语言 | TypeScript | 5.6 | `strict: true`，全站类型化（数据模型 / Props / 路由参数），`tsc -b` 纳入构建门禁 |
| 构建 | Vite | 5.4 | 开发服务器（端口 5273）+ 生产构建，`manualChunks` 拆分 react / motion |
| 样式 | Tailwind CSS | 3.4 | 原子类 + `@layer components` 组件层；所有色值/圆角/描边/阴影/字族指向 CSS 变量 |
| 样式工具 | PostCSS / Autoprefixer | 8.4 / 10.4 | `@tailwind` 指令处理与浏览器前缀 |
| 动画 | Framer Motion | 11.11 | 页面转场（AnimatePresence）、滚动进度、拖拽轮播、数字滚动、弹窗弹簧、目录跟随 |
| 路由 | React Router DOM | 6.28 | 嵌套路由 + `Navigate` 重定向 + 哈希锚点定位，`future flags` 已开启 |
| 图标 | Lucide React | 0.462 | 全站图标，动态组件映射（导航 icon 字符串 → 组件表） |
| 类名合并 | 自实现 `cn()` | — | `src/lib/utils.ts`，零依赖 |
| 字体 | Bricolage Grotesque / Noto Sans SC / JetBrains Mono / Caveat | — | Google Fonts 预连接，主题令牌控制字族/字重/字距 |
| 状态 | React Context + Hooks | — | `ThemeProvider`（全局主题）；页面态用 `useState`；持久态用 `useLocalStorage` |

### 后端（当前无 · 以下为规划）

| 分类 | 现状 | 规划选型 | 职责 |
|---|---|---|---|
| 运行时 | ❌ 未引入 | Node 20 + NestJS / Next.js API Routes | 提供 REST 接口与鉴权 |
| 数据库 | ❌ 未引入 | PostgreSQL + Prisma（或 SQLite 起步） | 文章 / 项目 / 留言 / 友链 / 资源元数据持久化 |
| 对象存储 | ⚠️ 假上传（进度条模拟） | 阿里云 OSS / S3 + 直传签名 | 简历、课件、数据集上传与分享短链 |
| 鉴权 | ⚠️ 后台无真实登录 | JWT + Refresh Token，令牌仅在 UI 层展示 | 后台写操作保护 |
| 缓存/CDN | ⚠️ 后台展示 mock 指标 | CDN + 构建指纹缓存 | 静态资源分发 |
| 数据层 | ✅ `src/data/*.ts` + `src/admin/data.ts` | 迁移为 Repository，接口签名保持不变 | 当前唯一「数据源」，全部 typed + 可被 API 替换 |

### AI 服务（当前本地模拟 · 以下为规划）

| 分类 | 现状 | 规划选型 | 说明 |
|---|---|---|---|
| 对话助手 | ✅ 关键词命中 + 预设答案 + 打字机流式输出（零网络请求） | 任意 OpenAI 兼容网关 | `src/components/AIAssistant.tsx`，`answers[]` 表驱动，命中不到走 `fallback` |
| 上下文感知 | ✅ 传入当前页面 `context`（如「正在阅读：xx 小节」） | RAG 检索站内文章后作答 | 已有 `open-assistant` 全局事件挂载点 |
| 简历解析 | ⚠️ 后台「解析」Tab 为进度与置信度 mock | 文档解析 + LLM 结构化抽取 | 对应 `ResumeAdminPage` |
| 模型配置 | ⚠️ 后台「AI 配置」为静态数据 | 模型/温度/Prompt 版本落库 + 用量统计 | 对应 `AiConfigPage` |
| 向量检索 | ❌ 无 | pgvector / Milvus + 分块流水线 | 站内语义搜索（现⌘K为字面匹配） |

---

## 📁 目录结构

```text
resume1/
├─ index.html                  # 入口 HTML：字体预连接 + 主题防闪烁内联脚本
├─ vite.config.ts              # 别名 @→src、host 局域网、react/motion 手动分包
├─ tailwind.config.js          # 令牌映射层：颜色/字族/阴影/描边宽度/圆角 全部 var()
├─ postcss.config.js           # tailwind + autoprefixer
├─ tsconfig.json               # strict + noUnusedLocals=false，paths 映射 @/*
├─ package.json                # dev / build(tsc -b && vite build) / preview
├─ AI全栈开发-魏云潇-研2.docx   # 简历原稿（后台「解析」流程的输入素材）
├─ theme-preview/              # 🎨 8 款主题设计稿（同内容换皮对比页，含未上线的 04/07/08）
│  └─ index.html
├─ dist/                       # 构建产物（.gitignore 忽略）
└─ src/
   ├─ main.tsx                 # 挂载：ThemeProvider > BrowserRouter > App
   ├─ App.tsx                  # 路由分发：/admin/* 走后台，其余走 Layout + 动画出口
   ├─ index.css                # ⭐ 主题令牌唯一数据源（5 个 [data-theme] 块 + 组件层 + 形态收敛）
   ├─ theme/
   │  ├─ theme.ts              # 主题元信息（编号/名称/色板令牌）、读写与 applyTheme
   │  └─ ThemeProvider.tsx     # Context、localStorage('wyx:theme')、多标签页同步
   ├─ components/
   │  ├─ Layout.tsx            # 固定顶栏 + 悬停大下拉 + 移动全屏菜单 + ⌘K 命令面板 + 页脚跑马灯
   │  ├─ ThemeSwitcher.tsx     # 桌面下拉切换器 / 移动宫格 ThemePicker / 色板小样
   │  ├─ AIAssistant.tsx       # 浮屏助手：关键词命中 + 打字机 + 上下文事件
   │  ├─ ProjectModal.tsx      # 项目详情弹窗（里程碑/指标/技术栈）
   │  └─ ui/
   │     ├─ Modal.tsx          # Portal 弹窗基座（Esc、滚动锁、bare 模式）
   │     ├─ Toast.tsx          # 前台轻提示
   │     └─ primitives.tsx     # Reveal/Marquee/Tilt/CountUp/Sticker/Plate/SectionHead/PageIntro…
   ├─ data/                    # ✅ 前台唯一数据源（typed，无请求）
   │  ├─ site.ts               # profile / stats / skillGroups / awards / education / hobbies
   │  ├─ projects.ts           # 7 项目 + featuredProjects
   │  ├─ articles.ts           # 6 长文：Section→Sub→Block(6 种)
   │  ├─ life.ts               # loveRecords / moments / trips / playlist
   │  ├─ work.ts               # toolboxGroups / resourceFiles / resumeSnapshot
   │  ├─ me.ts                 # growthTimeline / platforms / friends / danmakuSeeds / aboutCards
   │  └─ nav.ts                # navItems(5×20) + adminNav
   ├─ pages/                   # 前台 15 页
   │  ├─ Home.tsx              # Hero+名片弹窗 / 数据条 / 拖拽轮播 / 技能 Bento / 荣誉 / 生活切片 / CTA
   │  ├─ Learn.tsx · Reader.tsx        # 知识库列表 · 三级目录长文阅读（代码复制、进度跟随）
   │  ├─ Resume.tsx            # 一页纸简历 + window.print() + 打印样式
   │  ├─ Toolbox.tsx · Files.tsx       # 工具/Prompt 收藏 · 资源中心（星标/筛选/网格列表切换）
   │  ├─ Love.tsx · Moments.tsx · Travel.tsx · MusicBox.tsx   # 恋爱手记 / 朋友圈 / 地图相册 / 音乐盒
   │  ├─ About.tsx · Media.tsx · Timeline.tsx                 # 自我介绍 / 自媒体矩阵 / 成长时间轴
   │  ├─ Guestbook.tsx         # 弹幕墙（留言 + 点赞，localStorage）
   │  └─ Friends.tsx · Admin.tsx       # 友链 · 后台入口（懒挂载 AdminApp）
   ├─ admin/                   # 后台控制台（共用同一套主题令牌）
   │  ├─ AdminApp.tsx          # URL→section/tab 解析与页面分发
   │  ├─ AdminShell.tsx        # 侧栏 8 区块 + Tab 头 + 移动端抽屉
   │  ├─ ui.tsx                # AButton/Panel/Badge/Tabs/Table/图表(TrendChart·Donut·Sparkline·Meter)/Input/AdminModal/Toast/EmptyState
   │  ├─ data.ts               # 后台 mock：traffic/source/device/region/funnel/aiUsage/backups/seo…
   │  └─ pages/                # Overview/Analytics/Profile/Content/ResumeAdmin/FilesAdmin/Moderation/AiConfig/Settings
   └─ lib/utils.ts             # cn / useLocalStorage / useMediaQuery / fmtDuration / readableInk
```

---

## ⚡ 核心功能模块和工作流程

### 模块地图

| # | 模块 | 关键文件 | 已实现能力 |
|---|---|---|---|
| 1 | **主题引擎** | `index.css` · `theme/*` · `ThemeSwitcher.tsx` | 5 套主题（纸感极简 / 实验室科技 / 瑞士国际 / 终端极客 / 设计师青春）、48 个语义令牌、圆角·描边·阴影·字族·纹理随主题变化、`localStorage` 记忆、`meta[theme-color]` 同步、跨标签页同步、打印回落黑白 |
| 2 | **全局导航与检索** | `Layout.tsx` | 固定毛玻璃顶栏、悬停大下拉、移动全屏菜单、`⌘K/Ctrl+K` 命令面板（页面+文章+项目聚合，方向键与回车导航）、滚动进度条 |
| 3 | **首页作品集叙述** | `Home.tsx` | 标签化 Hero、3D 倾斜名片与详情弹窗、CountUp 数据条、可拖拽/自动播放项目轮播、技能 Bento（悬停联动右侧深色详情卡）、荣誉榜 + 全览弹窗、生活切片、CTA |
| 4 | **长文阅读** | `Reader.tsx` · `articles.ts` | 三级目录（Section→Sub）、`IntersectionObserver` 目录高亮、6 种内容块渲染（段落/代码/引言/列表/提示卡/表格）、代码一键复制、正文排版随主题（`.prose-read`） |
| 5 | **AI 浮屏助手** | `AIAssistant.tsx` | 悬浮入口 + `open-assistant` 事件唤起、关键词表驱动回答、打字机逐字输出、快捷提问、会话内滚动跟随、明确标注本地模拟 |
| 6 | **简历与打印** | `Resume.tsx` · `index.css` | 一页纸版式、`window.print()`、打印专用样式（隐藏导航/纹理/动画，强制白底黑字，防分页断裂） |
| 7 | **生活频道** | `Love/Moments/Travel/MusicBox.tsx` | 恋爱天数与手记、朋友圈（本地追加/点赞/评论）、旅拍地图散点 + 轨迹线 + 城市筛选、音乐盒（播放进度模拟 + 收藏 + 频谱条） |
| 8 | **资源与工具** | `Toolbox.tsx` · `Files.tsx` | 分组工具/Prompt 收藏、资源按类型色标 + 网格/列表视图切换 + 分类筛选 + 搜索 |
| 9 | **留言弹幕墙** | `Guestbook.tsx` | 弹幕滚动墙、留言与点赞本地持久化（`wyx-guestbook*`）、种子弹幕兜底 |
| 10 | **管理后台** | `admin/*` | 8 区块 23 Tab：总览/数据看板、个人中心、内容管理（文章·项目·动态）、简历管理（解析·模块·版本）、文件资源（上传·分享·清理）、审核（弹幕·留言·友链）、AI 配置（模型·Prompt·用量）、站点设置（主题·SEO·备份）；纯 SVG 图表、表格/表单/开关/弹窗/空态/Toast 齐备 |

### 工作流程

**① 渲染与数据流（当前，无网络）**

```text
src/data/*.ts（typed 常量）
   └─> pages/*.tsx 组合 primitives + components（只读消费）
        └─> Tailwind 语义类（bg-paper / text-ink / shadow-hard / rounded-2xl）
             └─> tailwind.config.js 把类名映射到 var(--c-*)
                  └─> index.css 按 html[data-theme] 注入具体令牌值
localStorage（wyx:theme、wyx-guestbook、wyx-toolbox-stars…）── 用户态持久化，不上传
```

**② 主题切换流程**

```text
浏览器解析 index.html
   └─ 内联脚本读 localStorage('wyx:theme') → 立即设置 <html data-theme>   ← 首屏无闪烁
React 挂载 ThemeProvider（初值同源，避免 hydrate 跳色）
   └─ 用户点击切换器 / 后台主题 Tab → setTheme(id)
        ├─ 写 localStorage          ├─ 更新 data-theme（全站令牌即时替换）
        └─ applyTheme() 同步 meta theme-color
```

**③ 构建与部署流程**

```text
npm run dev     → Vite 开发服务（5273，host: true 支持手机同网段调试）
npm run build   → tsc -b（类型门禁）→ vite build → dist/（react | motion | index 三 chunk）
npm run preview → 本地预览生产包
静态托管        → 上传 dist/ + SPA fallback 指向 index.html
```

**④ 访客关键交互路径**
`落地首页 → ⌘K 或导航 → 阅读长文（目录跟随/复制代码） → 唤起 AI 助手追问 → 简历打印 → 弹幕墙留言（本地保存）`

---

## ⚙️ 部署指南

### 1. 本地开发

```bash
git clone <repo-url> resume1
cd resume1
npm install          # 5 项运行时依赖 + 9 项开发依赖
npm run dev          # http://localhost:5273（host:true，可用局域网 IP 手机调试）
```

要求：**Node ≥ 18**（Vite 5）、npm ≥ 9。无需任何环境变量。

### 2. 生产构建

```bash
npm run build        # = tsc -b && vite build，类型错误会阻断构建
npm run preview      # 端口 4173，验证 dist/
```

### 3. Nginx（自建服务器）

```nginx
server {
  listen 80;
  server_name wyx.space;
  root /var/www/wyx-space/dist;
  index index.html;

  location / { try_files $uri $uri/ /index.html; }   # SPA 前端路由必须
  location ~* \.(js|css|woff2|png|svg|webp)$ {
    expires 1y; add_header Cache-Control "public, immutable";
  }
  gzip on; gzip_types text/css application/javascript application/json image/svg+xml;
}
```

### 4. Vercel / Netlify（零配置）

| 项 | 值 |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| SPA 重写 | Vercel 自动识别 `index.html`；Netlify 需 `_redirects`：`/* /index.html 200` |

### 5. GitHub Pages（子路径部署）

```bash
npm run build
npx gh-pages -d dist
```

若站点位于 `https://<user>.github.io/resume1/`，需在 `vite.config.ts` 增加 `base: '/resume1/'`，并把 `main.tsx` 的 `<BrowserRouter>` 改为 `<BrowserRouter basename="/resume1">`。

### 6. 对象存储（OSS / S3 / COS）

上传 `dist/*` → 开启「静态网站托管」并把 **404 页面设为 `index.html`**（等效 SPA fallback）→ 挂 CDN；建议对 `assets/*`（含内容哈希）设置一年强缓存，对 `index.html` 设 `no-cache`。

### 7. 上线检查清单

- [ ] `npm run build` 通过（含 `tsc -b`）
- [ ] 5 套主题逐页肉眼复核，尤其 03/05 无阴影与直角形态
- [ ] 移动端（≤1024）菜单内主题宫格可用、无横向滚动条
- [ ] 简历页打印预览正常（黑白、不截断）
- [ ] 直连子路由（如 `/learn/rag-engineering`、`/admin/settings/theme`）不 404
- [ ] 若接入真实后端：补齐 `.env`、鉴权与上传直传签名，并把 `src/data` 换成接口层

---

## 📦 API 接口

> 项目当前**没有 HTTP 后端**，因此不存在可调用的线上接口。下面分两张表：A 是**已实现的前端数据接口**（模块级导出，页面直接 import）；B 是**为接入后端而预留的 REST 契约**（尚未实现，路径/字段与现有数据结构一一对应，改造时可无痛替换）。

### A. 已实现 · 前端数据接口（`src/data` / `src/admin/data`）

| 模块 | 主要导出 | 类型 | 消费方 | 说明 |
|---|---|---|---|---|
| `site.ts` | `profile` `stats` `skillGroups` `awards` `education` `hobbies` | 对象/数组 | Home · Layout · About · 后台 Profile | 身份、联系方式、统计数字、技能分组（含 level 与 color 令牌） |
| `projects.ts` | `projects` `featuredProjects` `Project` | `Project[]` | Home 轮播 · 后台 Content · ⌘K | 含 metrics / stack / award / motif 视觉母题 |
| `articles.ts` | `articles` `articleCategories` `articleById(id)` | `Article[]` | Learn · Reader · 后台 Content · ⌘K | `Section→Sub→Block`，Block 支持 `p/code/quote/list/note/table` |
| `life.ts` | `loveMeta` `loveRecords` `loveStats` `moments` `trips` `playlist` | 数组 | Love · Moments · Travel · MusicBox | 旅拍含经纬度（投影函数 `projectLonLat` 绘制地图散点） |
| `work.ts` | `toolboxGroups` `resourceFiles` `resumeSnapshot` | 数组/对象 | Toolbox · Files · Resume · 后台 | 资源含 `ext` 用于色标与图标 |
| `me.ts` | `growthTimeline` `platforms` `mediaStats` `friends` `danmakuSeeds` `aboutCards` | 数组 | Timeline · Media · Friends · Guestbook · About | 弹幕种子数据 |
| `nav.ts` | `navItems` `adminNav` | 数组 | Layout · ThemeSwitcher · 后台侧栏 | 主导航 5 类 20 子项 |
| `admin/data.ts` | `traffic('7d'|'30d')` `sourceShare` `deviceShare` `regionShare` `readDepth` `funnels` `aiSessions` `hourly` `topArticles` `adminArticles/Projects/Posts` `contentStats` `realtime` `pageRank` `backups` `seoDefaults` `systemInfo` | mock | 后台 9 个页面 | **均为静态假数据**，形状与未来接口响应对齐 |
| `theme/theme.ts` | `THEMES` `DEFAULT_THEME` `THEME_STORAGE_KEY` `SWATCH_TOKENS` `applyTheme()` `readTokens()` | 函数/常量 | ThemeProvider · 前台切换器 · 后台设置 | 主题目录与令牌读写 |
| `lib/utils.ts` | `cn()` `useLocalStorage(key, initial)` `useMediaQuery()` `fmtDuration()` `readableInk()` `projectLonLat()` `daysBetween()` | Hooks/纯函数 | 全站 | 用户态持久化入口 |

### B. 预留契约 · 后端 REST 接口（🚧 未实现）

| 方法 | 路径 | 用途 | 请求要点 | 响应要点（对齐现有类型） | 状态 |
|---|---|---|---|---|---|
| `GET` | `/api/site` | 站点与个人信息 | — | `profile / stats / skillGroups / awards` | 🚧 |
| `GET` | `/api/projects` | 项目列表 | `?featured=true` | `Project[]` | 🚧 |
| `GET` | `/api/articles` | 文章列表 | `?category=&q=&page=` | `{ items: Article[]; total }` | 🚧 |
| `GET` | `/api/articles/:id` | 文章详情 | — | `Article`（含 sections/blocks） | 🚧 |
| `GET` | `/api/love` `/api/moments` `/api/trips` `/api/music` | 生活频道数据 | — | 对应数组 | 🚧 |
| `POST` | `/api/guestbook` | 提交留言 | `{ user, text }` | `Msg` + 审核状态 `待审核` | 🚧 |
| `POST` | `/api/guestbook/:id/like` | 点赞 | — | `{ likes: number }` | 🚧 |
| `GET` | `/api/friends` | 友链 | — | `FriendLink[]`（仅已审核） | 🚧 |
| `GET` | `/api/files` | 资源列表 | `?category=&ext=&q=` | `ResourceFile[]`（含临时下载 URL） | 🚧 |
| `POST` | `/api/files/upload-token` | 申请直传签名 | `{ name, size, mime }` | `{ uploadUrl, key, expiresAt }` | 🚧 |
| `POST` | `/api/share-links` | 生成分享短链 | `{ key, expireDays, pwd? }` | `{ url, token }` | 🚧 |
| `POST` | `/api/auth/login` | 后台登录 | `{ account, password }` | `{ accessToken, refreshToken }` | 🚧 |
| `PUT` | `/api/admin/articles/:id` | 内容上下架/精选 | `{ status, featured }` | 更新后 `Article` | 🚧 |
| `GET/POST` | `/api/admin/moderation` | 弹幕/留言/友链审核 | `?type=&status=` / `{ id, action }` | 分页列表 / 结果 | 🚧 |
| `POST` | `/api/admin/resume/parse` | 简历文件解析 | `multipart(file)` | 结构化模块 + `confidence` | 🚧 |
| `GET` | `/api/admin/analytics` | 数据看板 | `?range=7d|30d` | `traffic / source / device / region / funnels` | 🚧 |
| `GET/PUT` | `/api/admin/settings/theme` | 读写站点默认主题 | `PUT { theme: 'paper'|'lab'|'swiss'|'terminal'|'pop' }` | 当前主题 id | 🚧（前端本地已可用） |
| `GET/PUT` | `/api/admin/settings/seo` | SEO 配置 | `{ title, description, keywords, ogImage, sitemap }` | 同构 | 🚧 |
| `GET/POST` | `/api/admin/backups` | 备份与恢复 | `POST { note }` | `Backup[]` | 🚧 |
| `GET` | `/api/ai/answer` | 助手问答 | `{ question, context }` | `{ text, references[] }`（SSE 流式） | 🚧（现为本地关键词模拟） |

**前端接口层改造建议**：把 `src/data` 的模块签名（如 `articleById(id)`）保留，内部从常量读取改为 `fetch`/React Query 读取，页面零改动。

---

## 🧪 质量与验证

| 项 | 结果 |
|---|---|
| 类型检查 | `tsc -b` 通过（`strict: true`） |
| 生产构建 | `vite build` 通过，1983 modules，CSS 75.95 KB / JS 682 KB |
| gzip | 总计约 232 KB（react 53.6 + motion 41.1 + app 122.4 + css 13.9 + html 1.3） |
| 主题回归 | 5 主题 × 15 页面 = 75 组合实测：控制台 error 0、旧色残留 0、横向溢出 0 |
| 对比度 | 正文文字/背景 WCAG 对比度 15.5–18.1:1 |
| 切换器 | 桌面 rect 与导航/CTA/搜索无重叠；选项恒 5 项；`aria-expanded/selected` 完整 |
| 令牌完整性 | paper 定义 48 项，其余 4 主题各重定义 47 项（仅共享全局 `--gutter`） |

---

## 💡 总结与展望

### 现在做到了什么

1. **一套令牌，八种气质中的五种上线**：主题不是「换个主色」，而是圆角、描边、阴影、字族、字距、纹理、大小写、暗面板强调色的整体切换；设计稿保留在 `theme-preview/` 便于回溯。
2. **内容与视图彻底分离**：全部文案与数据集中在 `src/data`，页面只做编排；后台 mock 的形状已经与未来接口对齐，替换成本低。
3. **交互密度高但不失控**：拖拽轮播、⌘K、打字机、弹幕墙、打印简历等均有明确降级（`prefers-reduced-motion`、打印样式、无网络依赖）。
4. **求职叙事完整**：从首页一句话定位 → 项目证据 → 技能图谱 → 竞赛荣誉 → 长文深度 → 一页纸简历，形成闭环。

### 已知边界

- 无后端、无鉴权、无持久化服务：留言/收藏/点赞只存在访客浏览器 `localStorage`。
- 搜索与 AI 助手为本地实现（字面匹配 / 关键词表），不具备语义检索与真实推理。
- 图片与资源未接入真实文件：仓库内无任何图片/音视频资产，`media` 字段仅以文件名形式存在于 mock 数据中，资源中心下载与后台上传均为模拟。
- 未接入 ESLint / Prettier / 单元测试与 CI；无 `robots.txt`、`sitemap.xml`、RSS。

### 下一步（按优先级）

| 优先级 | 事项 | 价值 |
|---|---|---|
| P0 | 抽出 `src/api` 层 + 接入最小后端（文章/留言/友链 CRUD + 登录） | 让后台真正写数据，留言不再只留本地 |
| P0 | 主题令牌补齐「语义别名」（`--surface-hover`、`--state-success/warning`）与对比度自动化校验 | 新增第 6 套主题时零试错 |
| P1 | 接入真实 AI 助手（SSE 流式 + 站内 RAG 检索），保留降级到本地问答 | 差异化亮点，且直接体现岗位方向 |
| P1 | 对象存储直传 + 分享短链 + 文件病毒/体积校验 | 资源中心可用化 |
| P2 | ESLint + Prettier + Stylelint + Playwright 主题冒烟测试（5 主题 × 关键页） | 防止配色/形态回归 |
| P2 | SEO 与分发：`sitemap.xml`、`robots.txt`、OG 动态图、RSS、JSON-LD、阅读时长统计 | 长文可被检索与订阅 |
| P2 | 性能：路由懒加载拆分 app chunk、图片 `next-image` 式优化、字体子集化（当前 app chunk 395 KB） | 首屏更轻 |
| P3 | 国际化（中/英双版）、访客可视化编辑（草稿箱 + 预览） | 扩展到对外作品集品牌站 |

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
