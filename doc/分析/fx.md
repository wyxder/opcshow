# 🔍 项目全面分析与功能完善建议

> 对象：WYX.SPACE · 晓叶个人站（`e:\Code\AI\Start\Web\Blog\resume1`）
> 结论口径：**只提「已有功能如何补完」与「必要的新增能力」**，所有问题均附代码证据（文件:行），不含无法验证的猜测。
>
> ⚠️ **本文件已在 2026-10-30 完成一轮代码落地。** 下面 1️⃣–7️⃣ 节保留分析时的原始措辞与证据链（不改动，便于追溯），
> **每一条建议的「已实现 / 部分实现 / 待排期」状态、实现方式与涉及文件统一见 §9，剩余风险与服务端待办见 §10。**

---

## 0️⃣ 评估方法与事实基线

| 手段 | 覆盖范围 | 产出 |
|---|---|---|
| 代码走查 | `src` 全部 41 个 ts/tsx + 3 个配置文件 + `index.html` + `.gitignore` | 证据 30+ 条 |
| 构建验证 | `npm run build`（`tsc -b` + vite 5.4） | 通过；app chunk 394.74 KB / gzip 122.4 KB，CSS 75.95 KB |
| 运行时实测 | 5 主题 × 15 前台页 = **75 组合**（同源隐藏 iframe，1440×900） | 控制台 error 0、旧色残留 0、横向溢出 0、对比度 15.5–18.1:1 |
| 静态检索 | `ErrorBoundary / lazy / Suspense / <img / <audio / download / focus() / aria-current / clipboard` 等模式扫描 | 命中/未命中即下表证据 |

**基线判断**：这是一个**完成度很高的纯前端展示层**（信息架构、动效、主题系统、后台界面骨架均到位），但**功能闭环缺口集中在「真实资源」与「服务端能力」**——所有内容都是代码里的常量，图片/音频/文件/下载/AI 推理都不存在，留言类交互只写进访客自己的浏览器。

---

## 1️⃣ 结论速览（打分卡）

| 维度 | 评分 | 依据 | 风险等级 |
|---|---|---|---|
| 信息架构与叙事 | ★★★★★ | 5 类导航 20 子项、15 页、后台 8 区块 23 Tab，叙事闭环完整 | 🟢 低 |
| 设计系统与主题 | ★★★★☆ | 48 令牌 × 5 主题、单一数据源、防闪烁、打印回落；缺语义状态令牌与对比度自动化 | 🟢 低 |
| 组件复用与类型安全 | ★★★★☆ | `primitives.tsx` + `admin/ui.tsx` 覆盖全站；`strict: true` 且 `tsc` 入构建门禁 | 🟢 低 |
| 真实内容资源 | ★☆☆☆☆ | **全站 0 张图片、0 段音频、0 个可下载文件**（`<img>/<audio>/download=` 在 `src/pages` 无命中） | 🔴 高 |
| 后端与数据持久化 | ☆☆☆☆☆ | 无服务端、无数据库、无鉴权；后台 100% mock（`src/admin/data.ts`） | 🔴 高 |
| AI 能力 | ★☆☆☆☆ | 关键词表匹配 + 打字机（`AIAssistant.tsx:10-34` 自陈「回答都是手写的」） | 🟠 中高 |
| 可访问性 | ★★☆☆☆ | 有 `prefers-reduced-motion`/`aria-modal`/`role=listbox`；**无焦点陷阱、无 skip link、无 `aria-current`** | 🟠 中高 |
| SEO 与可发现性 | ★☆☆☆☆ | 无 `public/`、无 robots/sitemap/RSS、OG 图指向不存在文件、全站单一 title | 🟠 中高 |
| 健壮性 | ★★☆☆☆ | **无 ErrorBoundary**；一处死链；剪贴板/存储已有 try-catch | 🟠 中高 |
| 工程化 | ★★☆☆☆ | 无 ESLint/Prettier/测试/CI；`.gitignore` 漏 `tsconfig.tsbuildinfo` 与根目录截图 | 🟡 中 |
| 性能 | ★★★☆☆ | 手动分包 react/motion 已做；无路由级懒加载，后台与首页同包 | 🟡 中 |

---

## 2️⃣ 🔹 前端：已有功能完善建议

> 📌 本节条目状态 → §9.1（F / A / P / R / S / T 系列）

### 2.1 功能闭环缺口（优先级最高）

| # | 模块 | 现状与证据 | 建议方案 | 涉及文件 | 优先级 | 工作量 |
|---|---|---|---|---|---|---|
| F1 | 旅拍相册 / 朋友圈 / 自媒体矩阵 | 视觉全为 CSS 图形，`src/pages` 内无 `<img>`；`life.ts` 的 `media` 字段只存文件名（`[{label:'opc-talk.jpg',kind:'photo'}]`） | 接入对象存储真实图：先做 `public/images/` 静态图 + `loading=lazy` + `width/height` 防抖动；后续走 OSS 直传；`Plate` 作为无图兜底 | `Travel/Moments/Media.tsx` · `data/life.ts` | P0 | 0.5–1 天 |
| F2 | 资源中心下载 | 无 `download=` / `window.open`，点击仅 UI 反馈 | 一期：真实静态文件 + `download` 属性；二期：后端签发临时 URL（见 B6） | `Files.tsx` · `data/work.ts` | P0 | 0.5 天 |
| F3 | 音乐盒 | 假进度条与频谱，无 `<audio>` | 放 3–5 秒循环片段或外链预览（版权安全），实现真实 `play/pause/seek` + `timeupdate`；保留现有 UI；无音频时明确标注「试听暂缺」 | `MusicBox.tsx` · `data/life.ts(playlist)` | P1 | 1 天 |
| F4 | 外链死链 | `Layout.tsx:472` 页脚 GitHub 为 `href="#"`；`Media.tsx:57` 平台入口同为 `href="#"` | 换成真实仓库/主页链接（新窗口 + `rel="noopener noreferrer"`）；把 `platforms` 的 handle 变成可点链接 | `components/Layout.tsx` · `pages/Media.tsx` · `data/me.ts` | P0 | 10 分钟 |
| F5 | 留言弹幕墙只留在本地 | `Guestbook.tsx:14-15` 读写 `localStorage`，仅本人可见；弹幕无真实来源合并 | 一期：保留本地但明示「仅你可见」；二期：POST 后端 + 审核态（后台 `ModerationPage` 已备好 UI），种子弹幕与真实留言按 `time` 归并 | `Guestbook.tsx` · `admin/pages/ModerationPage.tsx` | P1 | 依赖后端 |
| F6 | 项目详情/简历附件 | `ProjectModal` 完整，但简历「下载」只有打印 | 提供 PDF 版（构建产物或后端渲染），打印按钮旁加「下载 PDF」 | `Resume.tsx` | P0 | 0.5 天 |

### 2.2 可访问性与键盘操作

| # | 问题 | 证据 | 建议 | 优先级 |
|---|---|---|---|---|
| A1 | 弹窗无焦点管理 | `Modal.tsx:30-53` 仅 `aria-modal`；全项目 `.focus()` 仅命中 ⌘K 的 `autoFocus` | 打开时保存并聚焦首个可交互元素、Tab 循环约束在弹层内、关闭时归还焦点；`AdminModal` 同样处理 | P0 |
| A2 | 无跳转到主内容链接 | `Layout.tsx:504-510` main 无 skip 入口 | `<main id="main">` + 首个可聚焦 `.skip-link`（`sr-only focus:not-sr-only`） | P1 |
| A3 | 导航当前项无可读状态 | `Layout.tsx:161-178` 用自绘 pill，无 `aria-current` | 当前项加 `aria-current="page"`；`aria-label` 已有 ✓ | P1 |
| A4 | 移动端主题宫格按钮语义弱 | `ThemeSwitcher.tsx:132-155` 用 `aria-pressed` ✓，但选中态仅靠颜色+图标 | 补 `aria-label="主题 05 终端极客，当前已启用"`；后台主题卡已加 `role=radiogroup/radio` ✓ | P2 |
| A5 | 减少动画已处理但跑马灯仍可动 | `index.css` 全局 `prefers-reduced-motion` 已把动画压到 0.01ms | 为 `Marquee` 增加 `animation-play-state: paused` 的媒体查询分支（当前仅 hover 暂停），并给弹幕墙同样的开关 | P2 |
| A6 | 图表无可读替代 | `admin/ui.tsx` TrendChart/Donut 纯 SVG | 加 `<title>`/`aria-label` 与相邻数据表（后台可放「导出 CSV」） | P2 |

### 2.3 性能

| # | 问题 | 证据 | 建议 | 预期收益 |
|---|---|---|---|---|
| P1 | 无路由级懒加载 | `App.tsx:4-20` 静态 import 15 页 + `Admin`；app chunk 394 KB / gzip 122 KB | `React.lazy` + `<Suspense>` 拆分 `/admin`、`/learn/:id`、生活频道；首屏只载首页 | 首屏 JS −30~45% |
| P2 | 长文正文打进主包 | `data/articles.ts` 468 行、6 篇全文 | 文章改 `import()` 分片或构建期生成 JSON 按需取；⌘K 只载标题索引 | 首页体积显著下降 |
| P3 | 字体全量加载 | `index.html:17-20` 4 个字族含 Noto Sans SC 全量 | `unicode-range` 子集化 / 仅首页字重（400/700/900 三档足够）；或 `font-display: optional` 兜底 | FCP 更稳 |
| P4 | 图片进场（承接 F1） | 当前无图 | `loading=lazy`、`decoding=async`、`srcset` 两档、LCP 图预加载 | 避免二次返工 |
| P5 | 动效实例较多 | 每页 `AnimatePresence` + `Reveal` + `Tilt` + `CountUp` | 统一 `viewport={{ once: true }}`（已普遍设置 ✓），滚动监听交给 IntersectionObserver（`Reader.tsx:142` ✓），避免高频 `setState`（`CountUp` 每帧 setState 可换 `useTransform`） | 长页面更顺滑 |

### 2.4 健壮性与代码卫生

| # | 问题 | 证据 | 建议 | 优先级 |
|---|---|---|---|---|
| R1 | 无错误边界，任一渲染异常整站白屏 | 全项目 `ErrorBoundary/componentDidCatch` 0 命中 | 顶层 + 路由级 `ErrorBoundary`（可复用 404 版式），开发期打印堆栈、生产期兜底文案与上报 | P0 |
| R2 | 死代码 | `lib/utils.ts:28 useMediaQuery` 无任何引用 | 删除，或在主题切换里真正用它（如自动暂停跑马灯） | P2 |
| R3 | 数据自洽无校验 | `articleCategories` 计数硬编码 `2/2/2`，`nav.ts:33` 却写「12 篇」 | 分类计数改为派生：`articles.filter(a=>a.category===k).length`；导航描述引用常量，杜绝口播数字漂移 | P1 |
| R4 | 本地数据结构无版本 | 9 个 localStorage  key 均无 schema 版本：`wyx:theme`、`wyx-guestbook(-likes)`、`wyx-moments-(extra|liked|comments)`、`wyx-toolbox-stars`、`wyx-file-stars`、`wyx-music-fav` | key 加版本 `@v1`，集中到一个 `STORAGE_KEYS` 常量表；读取时做形状校验（数组/字段类型），失败回落种子 | P2 |
| R5 | 提交可被连点 | `Guestbook.tsx:121-137` 有 `maxLength` ✓ 但无频率限制与去重 | 前端节流 + 内容去重（同文本 30s 内拒绝），后端再加限流（见 B5） | P2 |
| R6 | `id: Date.now()` 可撞 | 全站 10+ 处同样写法：`Guestbook.tsx:38`、`Moments.tsx:24`、`AIAssistant.tsx:72,89`、后台 `Content/Files/AiConfig/Profile/Settings` 等 | 统一换 `crypto.randomUUID()`（或抽 `newId()` 工具） | P3 |
| R7 | 仓库卫生 | `.gitignore` 未忽略 `tsconfig.tsbuildinfo`、根目录 `shot-*.png` 设计截图；`theme-preview/` 若随站点部署会暴露设计稿 | 补 ignore；把预览稿挪到 `docs/` 或部署前排除 | P2 |
| R8 | 剪贴板/存储已容错（正面） | `Reader.tsx:30-36` try-catch；`utils.ts:10-14` JSON.parse 兜底；`ThemeProvider` 隐私模式容错 | 保持现有写法，作为其它模块的样板 | — |

### 2.5 SEO 与可发现性

| # | 问题 | 证据 | 建议 | 优先级 |
|---|---|---|---|---|
| S1 | 无 `public/` 目录 | 构建检查 `NO_PUBLIC_DIR` | 建 `public/`：`favicon.svg`（现为内联 data URI）、`og-cover.png`（1200×630）、`robots.txt`、`sitemap.xml`、`manifest.webmanifest` | P0 |
| S2 | OG 图指向不存在资源 | `admin/data.ts:359 ogImage:'/og-cover.png'` | 与 S1 同步补齐；否则分享卡片空白 | P0 |
| S3 | 全站单一 title / description | `index.html:6-7` | 抽 `useSeo({title,desc,canonical})`，每页设置（首页/文章/简历各不同），并同步 `og:*`、`twitter:*`、`<link rel=canonical>` | P1 |
| S4 | 正文不可被爬虫索引 | SPA + 客户端路由，文章在 JS 常量里 | 一期：`vite-plugin-ssg`/prerender 生成 6 篇文章静态 HTML + JSON-LD `Article`；二期：直接上 SSR 框架 | P1 |
| S5 | 无订阅能力 | 无 rss | `/rss.xml`（构建期由 `articles.ts` 生成）+ 页脚入口 | P2 |

### 2.6 主题系统（本次刚落地，列出补完项）

| # | 建议 | 理由 | 优先级 |
|---|---|---|---|
| T1 | 无存储记录时参考 `prefers-color-scheme`（暗→05/02 系），仍保留显式选择优先 | 现在恒默认 paper | P2 |
| T2 | 加语义状态令牌 `--state-success/warning/danger/info` 与 `--surface-hover` | 后台 Badge/Toggle 目前混用 `lime/coral/amber`，新增主题需逐个试 | P1 |
| T3 | 主题切换加 200ms 色彩过渡（`transition: background-color,color,border-color`，仅切换时开启，避免污染 hover） | 现在切换是硬跳 | P3 |
| T4 | 对比度自动化校验脚本（遍历令牌算 WCAG 比值，纳入 CI） | 本次靠人工实测；新增第 6 套主题会回归 | P1 |
| T5 | 站点默认主题与访客本地选择分层（`site.defaultTheme` vs `wyx:theme`） | 后台「保存主题」当前只写本地，语义与 UI 不符（`SettingsPage.tsx` 提示「前台已生效」） | P2 |

---

## 3️⃣ 🔹 后端：从零补齐（当前无任何服务端）

> 📌 本节条目状态 → §9.2（B 系列：已交付接口契约 + 可插拔适配层 + 本地兜底；真实能力仍待服务端）

### 3.1 能力清单

| # | 能力 | 现状 | 建议实现 | 对应前端（已就绪） | 优先级 |
|---|---|---|---|---|---|
| B1 | 内容存储与读接口 | ❌ 常量 | PostgreSQL + Prisma；`Article/Project/Moment/Trip/Track/FriendLink/Award/SkillGroup/ResourceFile` 九表；`GET /api/*` 返回与现有类型同构 | `src/data/*.ts` 已是 typed 契约，改 fetch 即可 | P0 |
| B2 | 后台鉴权 | ❌ 无守卫（`App.tsx:75-80` 任何人可进 `/admin`） | `POST /api/auth/login` + HttpOnly Refresh Cookie + Access Token；路由守卫 `RequireAuth`；操作审计日志 | 后台安全 UI 已在 `ProfilePage`（令牌列表） | P0 |
| B3 | 写接口（CRUD + 草稿/预览） | ❌ 按钮只弹 Toast | 内容 upsert、状态机（草稿/待审/已发布/已隐藏）、乐观锁（`version`） | `ContentPage` 表格与弹窗结构已具备 | P1 |
| B4 | 留言/弹幕/友链 审核闭环 | ⚠️ 仅前端本地 | `POST /api/guestbook`→`待审核`→后台通过后才出现在墙上；`friend` 申请单 | `ModerationPage` 三 Tab 与 `statusTone` 已就绪 | P1 |
| B5 | 反滥用 | ❌ | IP 哈希（不落明文）+ 滑窗限流（如 3 次/分钟）+ 内容长度与重复检测 + 可选 LLM 预筛（见 AI6） | 前端已有 `maxLength` | P1 |
| B6 | 文件与分享 | ⚠️ 假上传（进度模拟） | OSS/S3 **直传签名**（服务端只发签名）、扩展名+体积白名单、秒传 hash、分享短链表（`token/expire_at/pwd`）、下载计数 | `FilesAdminPage` 上传/分享/清理三 Tab | P1 |
| B7 | 真实站点指标 | ❌ mock（`admin/data.ts:19-160`） | 无 Cookie 埋点：`POST /api/track`（path, referrer, 会话哈希, 停留）；聚合 PV/UV/热门页/跳出/阅读深度 → 替换 mock | 后台 Analytics 图表组件可直接消费 | P2 |
| B8 | SEO 端点 | ❌ | 服务端生成 `sitemap.xml`/`robots.txt`/文章 OG 图（`satori`+`@resvg`）| `seoDefaults` 表单已有 | P2 |
| B9 | 备份与恢复 | ⚠️ UI 模拟 | `pg_dump` 定时 + 对象存储归档 + 保留策略；恢复走「只读模式」提示 | `SettingsPage` 备份 Tab | P3 |
| B10 | 部署形态 | — | 单体 Node（NestJS）或 Next.js API Routes（前后端同仓，简化部署）；容器化 + 托管 PG + CDN；`/api` 与静态分离便于回滚 | — | P0（选型） |

### 3.2 安全基线（接入后端必须同时做）

| 项 | 要求 |
|---|---|
| 传输 | 全站 HTTPS + HSTS；Cookie `Secure/SameSite=Lax` |
| 头 | CSP（限制 `script-src`，字体白名单 fonts.gstatic.com）、`X-Content-Type-Options`、`Referrer-Policy` |
| 输入 | zod/class-validator 全量校验；长度上限；富文本白名单标签 |
| 越权 | 后台写接口 RBAC（`admin/editor` 两角色足够） |
| 密钥 | 模型与对象存储密钥**只在服务端**，前端零密钥 |
| 限速 | 公共写接口按 IP 令牌桶；AI 接口按用户/日额度 |
| 可观测 | 结构化日志 + 错误上报（Sentry），P95 延迟与 5xx 告警 |

---

## 4️⃣ 🔹 AI 服务：把「模拟亮点」变成「真能力」

> 📌 本节条目状态 → §9.3（AI 系列：降级链与来源标注已落地，真实模型待服务端）

> 现状（证据）：`AIAssistant.tsx` 用 `answers[]` 关键词命中 + `setInterval` 打字机；`AiConfigPage` 的模型/Prompt/用量、`ResumeAdminPage` 的解析均为静态。**这是全站最容易被面试官追问、也最能体现岗位方向的模块。**

| # | 能力 | 现状 | 建议 | 复用点 | 优先级 |
|---|---|---|---|---|---|
| AI1 | 真实模型对话 | ❌ 本地表 | 服务端代理（OpenAI 兼容网关），前端只调自建 `/api/ai/chat`；密钥不落前端 | 现有 UI/滚动/打字机不动 | P0 |
| AI2 | 流式输出 | ⚠️ 假流式 | 后端 SSE 转发 token 流，前端把 `setInterval` 换成消费流（保留同一视觉节奏） | `AIAssistant.tsx:66-84` | P0 |
| AI3 | 站内 RAG | ❌ | 6 篇文章按 `Section→Sub` 分块（**优先结构切分，而非定长**）→ 向量库（pgvector）→ 检索带 `references[]`（含 `doc_id/path/section`），答复附可点引用 | `articles.ts` 的块结构天然适配；⌘K 已建索引形态 | P1 |
| AI4 | 上下文注入 | ✅ 已有雏形 | `context` prop（当前阅读小节）直接进 system prompt；把「正在阅读」升级为可引用锚点 | `AIAssistant.tsx:36-58` | P1 |
| AI5 | 语义搜索（⌘K） | ⚠️ 字面 `includes`（`Layout.tsx:357`） | 混合检索：BM25/字面 + 向量召回 + RRF 融合；无网时回落字面匹配 | `Layout.tsx:352-358` | P2 |
| AI6 | 评测与回归（差异化重点） | ❌ | 建 20–40 条问答回归集：检索层 HitRate@K/MRR、生成层 Faithfulness/引用正确率、行为层 Task Completion；确定性指标优先，CI 跑门禁 | 与作者简历中「22 指标 + 42 用例」叙事一致 | P1 |
| AI7 | Prompt 版本化与用量 | ⚠️ 假数据 | 表 `prompt(id,version,body,active)` + `ai_usage(day,model,tokens,cost)`；后台三 Tab 直连 | `AiConfigPage` UI 已具备 | P2 |
| AI8 | 成本与稳定性 | ❌ | 热门问答缓存（语义哈希 key）、按 IP/日额度限流、超时熔断、供应商故障切换、流中断可续 | — | P2 |
| AI9 | 安全与合规 | ❌ | 系统提示与用户内容隔离（防注入）、工具白名单（只读检索，禁执行/禁写）、输出敏感词与 PII 过滤、日志脱敏、页面明示「内容由模型生成」 | 现有文案「无真实模型调用」→ 改为「由模型生成，可能不准确」 | P1 |
| AI10 | 降级链 | ✅ 设计好 | **保留现有关键词 `answers` 作为兜底**（离线/超额度/故障时使用），并在 UI 区分「实时模型」与「预置问答」 | `AIAssistant.tsx:10-34` | P0 |
| AI11 | 简历解析真实化 | ⚠️ mock | 上传 DOCX/PDF → 解析（`mammoth`/`pdfjs`）→ LLM 结构化抽取 → 字段级 `confidence` → 人工确认后入库 | 仓库已有 `AI全栈开发-晓叶-研2.docx` 可作首个用例 | P2 |
| AI12 | 无障碍增值（可选） | ❌ | Reader「朗读本页」TTS、长文 AI 摘要卡、文章问答（「这一节我没看懂」→ 定位到小节） | 三级目录结构可直接定位 | P3 |

---

## 5️⃣ 📐 数据与内容一致性（必须修，成本最低、影响信任）

> 📌 D1–D5 **已全部落地**：口径常量集中在 `src/data/site.ts`（`figures` / `siteMeta` / `links`）与 `src/data/me.ts`（派生粉丝/发帖合计），并由 `npm run check:data` 拦截回归 → §9.4

| # | 冲突 | 出处 A | 出处 B | 建议口径 |
|---|---|---|---|---|
| D1 | 决赛场次 | `data/site.ts:32`「12 场黑客松现场 · 2026 年 6 场决赛」 | `Home.tsx` 区块描述「7 场黑客松，6 次进决赛」，同区块引言又写「7 场决赛」 | 统一为「6 场决赛」；数字全部来自 `stats` 常量 |
| D2 | 文章数量 | `data/articles.ts:26-31` 全部 6 篇、RAG 工程化 2 篇 | `data/nav.ts:33`「RAG 工程化 · 12 篇」 | 计数改为派生（R3），导航描述引用派生值 |
| D3 | 粉丝口径 | `site.ts:31` 23k、`Home.tsx`「2.3w 粉」 | `me.ts:131`「全网 3.4w+」、`nav.ts`「3.4w 六个平台」；`platforms` 求和 ≈ 3.75w | 明确两层：**主阵地小红书 2.3w** / **全网合计 X**（按 `platforms` 求和自动得出，别手写） |
| D4 | 变现金额 | `me.ts:134` 累计变现「1w+」 | `AIAssistant.tsx:25` 与项目文案「收益 1.2w」 | 统一为 `1.2w`，并集中到 `me.ts` 常量 |
| D5 | 平台色耦合 | `me.ts:124` 抖音用 `--c-ink` 作品牌色 | 03 瑞士/05 终端主题下会与其他色趋同 | 品牌色改用不受主题影响的独立令牌 `--c-brand-*`（新增 6 个固定色令牌） |

---

## 6️⃣ 🗺️ 分阶段路线图

| 阶段 | 目标 | 关键任务 | 验收标准 |
|---|---|---|---|
| **P0 · 补真实感**（3–5 天） | 让「展示」不再空转 | F1 图片、F2 文件下载、F4 死链、F6 简历 PDF、R1 ErrorBoundary、S1+S2 `public/`+OG、B2 后台鉴权、AI1+AI2+AI10 真模型流式与降级、T2 状态令牌、D1–D5 数字统一 | 站点有真图真文件；异常渲染不再白屏；分享卡有图；`/admin` 未登录不可进；助手回答来自模型且可降级；构建通过且首屏 JS 因懒加载下降 |
| **P1 · 补闭环**（2–3 周） | 内容可运营、互动可治理 | B1 内容存储与读接口、B3 CRUD+草稿、B4+B5 审核与反滥用、B6 直传与短链、A1 焦点陷阱、S3+S4 SEO/预渲染、AI3 RAG、AI6 评测集、T4 对比度门禁 | 后台能真正发布/下架；访客留言进入待审队列并可见；6 篇文章可被搜索引擎索引且带 JSON-LM；助手答案带可点引用；评测集在 CI 跑通并拦截回归 |
| **P2 · 补增长**（1–2 个月） | 数据驱动与体验增值 | B7 真实埋点、B8 sitemap/rss、AI5 语义搜索、AI7 prompt/用量、AI11 简历解析、F5 弹幕墙真实数据源、F3 音频、R2–R7 代码卫生与 CI | 后台看板数字来自真实流量；`/rss.xml` 可订阅；助手与⌘K 支持语义检索；上传 DOCX 能产出结构化简历；有 lint + typecheck + 主题冒烟测试的 CI 绿灯 |
| **P3 · 补体验边界** | 长期可维护 | 国际化、SSR 框架迁移评估、TTS 朗读、B9 备份自动化、设计令牌文档站（把 `theme-preview` 正式化为主题指南） | 双语言可切换；主题扩展有文档与脚本；备份可演练恢复 |

---

## 7️⃣ ✅ 低成本速赢清单（可当天合并）

> 📌 12 条中 11 条已落地，第 10 条（Playwright 冒烟）因不引入新依赖改为「门禁脚本 + 人工 60 组合实测」替代 → §9.5

1. `Layout.tsx:472` 与 `Media.tsx:57` 的 `href="#"` → 真实仓库/平台链接 + `rel="noopener noreferrer"`。
2. 建 `public/`：`favicon.svg`、`og-cover.png`、`robots.txt`、`sitemap.xml`（`articles.ts` 构建期生成）。
3. 加顶层 `ErrorBoundary`（复用 404 版式）。
4. `articleCategories` 计数改为从 `articles` 派生；删掉 `useMediaQuery` 死代码。
5. 统一 D1–D5 数字口径，把「粉丝/变现/决赛」集中成 `site.ts` 常量并被文案引用。
6. `App.tsx` 把 `Admin` 与 `Reader` 改 `React.lazy` + `Suspense`（首屏体积立刻下降）。
7. `Modal` 增加焦点陷阱与关闭后焦点归还（约 30 行）。
8. 平台品牌色改用固定 `--c-brand-*`，与主题调色板解耦。
9. `.gitignore` 补 `tsconfig.tsbuildinfo`、`*.tsbuildinfo`、根目录 `shot-*.png`；`theme-preview/` 移出部署产物。
10. 为 5 主题 × 关键页写一个 Playwright 冒烟测试（截图 + `scrollWidth` 断言 + 无 console error）。
11. `prefers-reduced-motion` 下暂停 `Marquee` 与弹幕墙。
12. 页面级 SEO Hook（`useSeo`）先只做 title/description 动态化，收益立竿见影。

---

## 8️⃣ 📌 一句话总评

**当前项目是「设计与工程表达 90 分、真实能力 30 分」**：视觉体系、主题令牌、动效与信息架构已达到可对外展示的成熟度；下一步的价值增量不在再画一套主题，而在**补上真实资源（图/文件/音频）、服务端闭环（鉴权/存储/审核/埋点）与真实 AI 链路（模型 + RAG + 评测）**——这三块恰好也是该项目作为「AI 全栈开发」求职作品时，面试官必然追问的部分。

---

## 9️⃣  落地状态回写（2026-10-30）

> 图例：✅ 已实现（当前代码可直接运行验收） · 🟡 部分实现（一期已落地，二期依赖服务端/真实资源） · ⏳ 待排期（本轮未动，已说明原因）
> 本轮约束：不引入新的 npm 依赖、不写入任何密钥、无网络环境下站点不报错也不白屏。

### 9.1 前端条目（F / A / P / R / S / T）

| # | 状态 | 实现方式 | 涉及文件 |
|---|---|---|---|
| F1 图片 | 🟡 部分实现 | 建好图片管线：`SmartImage`（`loading=lazy` + `decoding=async` + `width/height` 防抖动 + `onError` 回落 Plate + `source==='preset'` 自动打「示意配图」角标）与 `mediaCatalog` 契约；旅拍墙与朋友圈按 `trip:<id>` / `media.label` 查表渲染，页面文案如实显示「真实照片已上传 N / M」。缺的只是真实照片本体 | `src/components/SmartImage.tsx`（新）· `src/data/media.ts`（新）· `pages/Travel.tsx` · `pages/Moments.tsx` |
| F2 下载 | ✅ 已实现（一期） | `public/files/` 放真实文件，`resolveDownload()` 统一判定：有 `url` 走 `<a download>`，没有则渲染不可点的「待上传」并写明原因。9 条中 5 条真下载（DOCX/MD/PY/CSV/ZIP），4 条如实标注待 B6。存储面板数字改为派生 | `public/files/*` · `src/services/files.ts`（新）· `src/data/work.ts` · `pages/Files.tsx` |
| F3 音频 | 🟡 部分实现 | `services/audio.ts` 定义 `AudioManifest` 契约：配了 `VITE_AUDIO_BASE` 才去拉 manifest（避免未接资源时刷 404），有片段就走真实 `<audio>` 的 play/pause/seek/volume/timeupdate；没配则保留模拟时钟并在标题区明示「试听暂缺」。版权安全的音频片段需作者提供 | `src/services/audio.ts`（新）· `pages/MusicBox.tsx` |
| F4 死链 | ✅ 已实现 | 外链唯一来源 `links`（`src/data/site.ts`）：GitHub 填真实地址，无公开主页的平台一律 `null` → 渲染成不可点卡片 + 「站内展示」，不再出现 `href="#"`；`check:data` 会把死链当错误拦下 | `src/data/site.ts` · `src/data/me.ts`（platforms/friends 加 `url`）· `components/Layout.tsx` · `pages/Media.tsx` · `pages/Friends.tsx` |
| F5 留言板 | 🟡 部分实现 | `GuestbookRepository` 契约 + `localGuestbook`（一期，UI 标「本机存储 / 仅你可见」）+ `remoteGuestbook`（二期 `POST /api/guestbook` 待审）。种子弹幕与真实留言统一成 `GuestMessage[]` 并带 `source` 角标（预置/本机/服务端）；后台审核页新增「本机真实留言」面板，可直接通过/删除 | `src/services/guestbook.ts`（新）· `pages/Guestbook.tsx` · `admin/pages/ModerationPage.tsx` |
| F6 简历附件 | 🟡 部分实现 | 真实可下载：DOCX 原件（仓库里那份，构建脚本搬进 `public/files/`）+ 单文件打印版 HTML（打开即可另存为 PDF）。`resumeAssets.pdf` 是预留位，服务端渲染上线后自动变成真链接 | `scripts/copy-assets.mjs`（新）· `public/files/wyx-resume*` · `src/services/files.ts` · `pages/Resume.tsx` |
| A1 焦点陷阱 | ✅ 已实现 | `useFocusTrap`：打开记住触发元素 → rAF 后聚焦首个可交互元素（支持 `data-autofocus`）→ Tab/Shift+Tab 在弹层内回环 → 关闭归还焦点；`Modal` 与后台 `AdminModal` 都接入，并统一 `useScrollLock` | `src/lib/a11y.ts`（新）· `components/ui/Modal.tsx` · `admin/ui.tsx` |
| A2 跳转主内容 | ✅ 已实现 | `.skip-link`（平时隐藏、`:focus` 出现）+ `<main id="main" tabIndex={-1}>`；后台 AdminShell 同样补了 landmark | `src/index.css` · `components/Layout.tsx` · `admin/AdminShell.tsx` |
| A3 导航当前项 | ✅ 已实现 | 桌面导航 `aria-current="page"`，`<nav aria-label="主导航">` | `components/Layout.tsx` |
| A4 主题按钮语义 | ✅ 已实现 | 桌面/移动端主题按钮 `aria-label="主题 05 终端极客，当前已启用"`，移动端不再靠 `applyTheme` 二次写 DOM | `components/ThemeSwitcher.tsx` |
| A5 减少动画 | ✅ 已实现 | `prefers-reduced-motion` 下显式 `.animate-marquee { animation: none }`（跑马灯与弹幕墙共用）；`usePrefersReducedMotion` 驱动 `CountUp`（直接落终值）与音乐盒频谱 | `src/index.css` · `src/lib/utils.ts` · `components/ui/primitives.tsx` · `pages/MusicBox.tsx` |
| A6 图表可读替代 | ✅ 已实现（一期） | `TrendChart` / `Donut` 加 `role="img"` + `aria-label` + `<title>`，内容为峰谷/占比摘要。「导出 CSV」仍是演示按钮（依赖 B1 数据源） | `admin/ui.tsx` |
| P1 路由级懒加载 | ✅ 已实现 | `React.lazy` + `Suspense`（首页保持静态引入避免多一次往返），Admin/Reader/生活频道全部拆 chunk。入口包 **394.74 → 120.02 kB（gzip 122.42 → 43.82 kB，−64%）**，Admin 独立 151 kB 按需加载 | `src/App.tsx` |
| P2 长文不进主包 | ✅ 已实现 | 新增标题级索引 `articles.index.ts`（⌘K / 导航 / 后台列表 / 首页用它），正文只进 Reader chunk（实测 `adaptive_chunk` 仅出现在 `Reader-*.js`） | `src/data/articles.index.ts`（新）· `components/Layout.tsx` · `pages/{Home,Learn}.tsx` · `admin/data.ts` |
| P3 字体子集化 | ⏳ 待排期 | 需要构建期子集化工具或改 `font-display: optional` 并实测 FOUT 观感，属于新增依赖/视觉验证范畴，本轮不动 | `index.html` |
| P4 图片进场 | ✅ 已实现 | `SmartImage` 内置 lazy/decoding/显式宽高/LCP 位 `eager`；`srcset` 两档待有多尺寸产物后启用（组件已留 `src` 扩展点） | `src/components/SmartImage.tsx` |
| P5 动效实例 | 🟡 部分实现 | `CountUp` 在减少动画偏好下不再跑逐帧 rAF；`viewport={{once:true}}` 原本已到位。改用 `useTransform` 彻底去掉 `CountUp` 的 setState 仍待排期（收益小、影响首页数字动画观感） | `components/ui/primitives.tsx` |
| R1 错误边界 | ✅ 已实现 | `ErrorBoundary`（root / route:/admin / 路由级 key 随 pathname 重置）+ 复用 404 版式的兜底 UI + 「重试这一块 / 回首页」；开发期打堆栈，生产期 `reportError` 去重上报（可配 `VITE_ERROR_REPORT_PATH`，未配则不发请求） | `src/components/ErrorBoundary.tsx`（新）· `src/services/observability.ts`（新）· `src/main.tsx` · `src/App.tsx` |
| R2 死代码 | ✅ 已实现 | `useMediaQuery` 不再闲置：派生出 `usePrefersReducedMotion`，被 `CountUp` 与音乐盒频谱消费 | `src/lib/utils.ts` |
| R3 派生计数 | ✅ 已实现 | `articleCategories` 改为从 `articles` 派生；索引侧同源派生；`check:data` 校验「索引 vs 正文」两份派生一致 | `src/data/articles.ts` · `src/data/articles.index.ts` · `scripts/check-data.mjs` |
| R4 存储版本化 | ✅ 已实现 | `STORAGE_KEYS`（全部 `wyx:<name>@v1`）+ 旧 key 自动迁移 + 读取形状校验失败回落种子；`useLocalStorage` 签名改为只接受 `STORAGE_KEYS`；门禁禁止页面里再写 `wyx*` 字面量 | `src/lib/storage.ts`（新）· `src/lib/utils.ts` · 各页面 |
| R5 提交防连点 | ✅ 已实现 | `sanitizeMessage`（长度/必填）+ 3 次/分钟滑窗 + 同文本 30s 去重，统一在 service 层抛 `AbuseBlockedError` 给 UI 提示 | `src/services/guestbook.ts` |
| R6 id 生成 | ✅ 已实现 | `newId(prefix)`（`crypto.randomUUID` + 非安全上下文降级），替换前台 2 处 + 后台 6 处；门禁拦 `id: \`${Date.now()}\`` | `src/lib/utils.ts` · `pages/{Guestbook,Moments}.tsx` · `components/AIAssistant.tsx` · `admin/pages/*` |
| R7 仓库卫生 | ✅ 已实现 | `.gitignore` 补 `*.tsbuildinfo` / `shot-*.png` / 构建期生成的 `sitemap.xml`、`rss.xml`；删掉 `write-test.txt`、`src/admin/.write-test`、`src/admin/write-test.txt`。`theme-preview/` 不在 `public/` 下，本就不进部署产物 | `.gitignore` · 删除 3 个文件 |
| R8 容错样板 | ✅ 保持 | 新增的 storage / 剪贴板 / 埋点 / AI 适配层都沿用「try-catch + 静默降级」写法 | `src/lib/storage.ts` · `src/services/*` |
| S1 public/ | ✅ 已实现 | `public/`：`favicon.svg`、`og-cover.png`、`robots.txt`、`site.webmanifest`、构建期生成的 `sitemap.xml` + `rss.xml`、`files/` 真实资料 | `public/*` · `scripts/gen-seo.mjs`（新）· `scripts/gen-og.mjs`（新）· `index.html` |
| S2 OG 图 | ✅ 已实现 | `og-cover.png`（1200×630）由纯 Node PNG 编码器构建期生成（零新依赖），`og:image` / `twitter:image` 指向真实绝对地址。带中文排版的**每篇文章一张**仍属 B8 | `scripts/gen-og.mjs` · `index.html` · `src/lib/seo.ts` |
| S3 页面级 SEO | ✅ 已实现 | `useSeo({title,description,path,ogImage,ogType,robots,jsonLd})` 动态写 title/description/og:*/twitter:*/canonical/JSON-LD；15 个前台页各自接入，后台 `noindex, nofollow` | `src/lib/seo.ts`（新）· `pages/*.tsx` · `admin/AdminApp.tsx` |
| S4 可被索引 | 🟡 部分实现 | 已注入 `Article` / `Person` JSON-LD（爬虫可解析结构化数据）。预渲染/SSR 需新增依赖（vite-plugin-ssg 或换框架），按约定标待排期，接入点写在 `src/lib/seo.ts` 顶部注释 | `src/lib/seo.ts` · `pages/Reader.tsx` |
| S5 订阅 | ✅ 已实现 | `rss.xml` 构建期由 `articles.index` 生成（含 guid/pubDate/CDATA），`<link rel=alternate type=application/rss+xml>` + 页脚 RSS/sitemap 入口 | `scripts/gen-seo.mjs` · `index.html` · `components/Layout.tsx` |
| T1 系统偏好 | ✅ 已实现 | 无本地记录时按 `prefers-color-scheme: dark` → 05 终端极客；`index.html` 内联脚本与 `theme.ts` 同一顺序（带版本 key → 旧 key 迁移 → 系统偏好 → 站点缺省），并用 `INLINE_*` 常量成对注释约束 | `src/theme/theme.ts` · `src/theme/ThemeProvider.tsx` · `index.html` |
| T2 状态令牌 | ✅ 已实现 | 每套主题新增 `--c-success/--c-warning/--c-surface-hover`（`--c-danger/--c-info` 原已有），Tailwind 暴露 `success/warning/danger/info/surface-hover` 与 `admin.*`；后台 Badge/AButton/Tabs 全部改用语义令牌，不再混用 lime/coral/amber | `src/index.css` · `tailwind.config.js` · `admin/ui.tsx` |
| T3 切换过渡 | ✅ 已实现 | `setTheme` 瞬间给 `<html>` 挂 `.theme-transition`（仅 color/background/border/fill 200ms），260ms 后摘除，不污染 hover | `src/index.css` · `src/theme/ThemeProvider.tsx` |
| T4 对比度门禁 | ✅ 已实现 | `scripts/contrast-check.mjs` 遍历 5 套主题 × 5 条 WCAG 规则（当前最低 3.06:1，全部达标），并入 `npm run check`；新增主题不达标直接红灯 | `scripts/contrast-check.mjs`（新）· `package.json` |
| T5 主题分层 | ✅ 已实现 | `siteMeta.defaultTheme`（站点缺省）与 `wyx:theme@v1`（本机覆盖）分层；Provider 暴露 `isPersonalChoice` / `followSiteDefault`；后台文案改为「只写入这台浏览器」，并新增「跟随站点默认」按钮 | `src/data/site.ts` · `src/theme/*` · `admin/pages/SettingsPage.tsx` |

### 9.2 后端条目（B1–B10）

| # | 状态 | 本轮交付（契约 + 适配层 + 兜底） | 还需要什么服务端能力 |
|---|---|---|---|
| B1 内容存储与读接口 | 🟡 契约就绪 | `ContentRepository.list(domain)` 返回与 `src/data/*` 完全同构的类型；`localContent` 走现有常量，`remoteContent` 走 `GET /api/content/:domain`，失败自动回落本地快照 | 九表 + `GET /api/content/*`；接好后把页面的 data import 换成 `contents.list()` |
| B2 后台鉴权 | 🟡 契约就绪 + 诚实标注 | `getSession()/login()/logout()/canWrite()`；未配服务端时返回 `DEMO_SESSION`，后台顶部挂「DEMO · 未鉴权」提示条（不锁人、不假装已守卫） | `POST /api/auth/login`（HttpOnly refresh + access token）、`GET /api/auth/session`、RBAC、审计日志 |
| B3 写接口 | 🟡 契约就绪 | `upsert()` / `setStatus()` 状态机（draft→pending→published→hidden）+ `version` 乐观锁参数；本地实现抛 `NotSupportedError`，UI 明确提示「演示模式不会真的保存」 | 内容 upsert、状态机持久化、并发冲突返回 409 |
| B4 审核闭环 | 🟡 一期落地 | 本机真实留言已进后台审核队列（可通过/删除，前台墙同步）；`remoteGuestbook` 已按「提交→待审→发布」写契约 | `POST /api/guestbook`、审核接口、通过后公共墙可见 |
| B5 反滥用 | 🟡 前端侧已做 | 长度/必填校验、3 次/分钟滑窗、同文本 30s 去重（`AbuseBlockedError`） | IP 哈希（不落明文）、令牌桶限流、可选 LLM 预筛 |
| B6 文件与分享 | 🟡 契约就绪 | `requestUploadTicket()` / `createShareLink()` 接口签名已定；未接服务端时前台上传区改为「访客端不开放上传 + 说明」 | OSS/S3 直传签名、扩展名与体积白名单、秒传 hash、分享短链、下载计数 |
| B7 真实站点指标 | 🟡 一期落地 | `services/analytics.ts`：无 Cookie 本机埋点（sessionStorage 会话 id + 上限 300 条样本），路由切换自动 `trackPageview`；后台看板新增「本机浏览样本」面板并标注口径，顶部加「看板数字为预置样本」Badge | `POST /api/track` + 日聚合 + `GET /api/analytics/summary`（PV/UV/热门页/跳出/阅读深度） |
| B8 SEO 端点 | ⏳ 待排期 | 构建期已能产出 sitemap/rss/默认 OG 图；服务端生成入口写在 `seoDefaults` 注释 | `sitemap.xml` 动态化、文章 OG 图（satori + @resvg） |
| B9 备份与恢复 | ⏳ 待排期 | 未动（后台仍是演示 UI），本轮把备份 id 生成换成 `newId`、日期改为真实日期 | `pg_dump` 定时 + 对象存储归档 + 只读恢复模式 |
| B10 部署形态 | ⏳ 待选型 | 前端侧已为「静态 + `/api` 分离」做好准备：所有服务端地址走 `VITE_API_BASE` 等环境变量，零密钥 | 选型（NestJS 单体 / Next.js API Routes）+ 容器化 + 托管 PG + CDN |

### 9.3 AI 条目（AI1–AI12）

| # | 状态 | 本轮交付 | 还需要什么 |
|---|---|---|---|
| AI1 真实模型对话 | 🟡 契约就绪 | `remoteProvider` 只调自建 `POST {VITE_API_BASE}/api/ai/chat`，前端零密钥；未配置时不发起任何请求 | 模型网关 + 密钥托管 |
| AI2 流式输出 | 🟡 契约就绪 | `remoteProvider` 已按 SSE 逐 `data:` 块消费（`getReader` + 半包容错），与预置打字机共用同一 `onDelta` 视觉节奏 | 后端 SSE 转发 token 流 |
| AI3 站内 RAG | 🟡 UI 已就绪 | `ChatReference{docId,section,path,snippet}` 契约 + 助手内可点引用 chip（跳 `/learn/:id`）；预置答案已带引用（如「01 切片」） | 分块入库 + 向量检索（pgvector）+ 返回 references |
| AI4 上下文注入 | ✅ 已实现 | `context`（当前阅读小节）随请求进 `body.context`，离线时用于预置匹配 | — |
| AI5 语义搜索（⌘K） | ⏳ 待排期 | 未动（仍字面 `includes`），但索引已独立成 `articles.index.ts`，加向量召回时不用改数据结构 | 混合检索 BM25 + 向量 + RRF，离线回落字面 |
| AI6 评测与回归 | ⏳ 待排期 | 未动。已具备可复用底座：`check:data` / `check:contrast` 两个门禁脚本 + `npm run check` 聚合入口 | 20–40 条问答回归集与指标门禁 |
| AI7 Prompt 版本化与用量 | ⏳ 待排期 | 后台 UI 仍演示（id 生成已修） | `prompt(id,version,body,active)` + `ai_usage` 表 |
| AI8 成本与稳定性 | ⏳ 待排期 | 已有超时/取消（`AbortController`）与降级链 | 语义缓存、日额度限流、熔断、供应商切换、断流续传 |
| AI9 安全与合规 | 🟡 部分实现 | 助手文案改为如实标注来源（「预置问答 · 作者手写」/「模型生成，可能不准确」），头部标 `PRESET ANSWERS` / `LIVE MODEL`；错误不外抛、不泄漏内部信息 | 注入隔离、工具白名单、输出敏感词与 PII 过滤、日志脱敏 |
| AI10 降级链 | ✅ 已实现 | `askSite()`：未配置 → 预置；配置了但失败/超时 → 自动落预置并标 `degraded`；关键词 `answers` 表迁到 `services/ai.ts` 成为兜底 provider | — |
| AI11 简历解析 | ⏳ 待排期 | 未动（真实 DOCX 已可作为上传用例与下载附件） | 解析 + LLM 结构化抽取 + 字段级 confidence |
| AI12 无障碍增值 | ⏳ 待排期 | 未动 | TTS 朗读、长文摘要卡、小节问答 |

### 9.4 数据口径（D1–D5）

| # | 状态 | 实现方式 | 涉及文件 |
|---|---|---|---|
| D1 决赛场次 | ✅ | 统一为「2026 年 7 场现场 · 6 场进决赛」，文案由 `figures.hackathonOnsite2026 / finals2026` 拼；`stats` 里那句「12 场」也改成 7 场口径 | `src/data/site.ts` · `pages/Home.tsx` |
| D2 文章数量 | ✅ | 导航「RAG 工程化 · N 篇」引用派生值 `ragArticleCount`，不再写 12 | `src/data/nav.ts` · `src/data/articles.index.ts` |
| D3 粉丝口径 | ✅ | 两层：主阵地 `figures.mainPlatformFollowers`（2.3w）/ 全网 = `platforms` 求和自动得出（`totalFollowers` → `3.7w+`），页面与导航都引用它 | `src/data/me.ts` · `pages/Media.tsx` · `src/data/nav.ts` |
| D4 变现金额 | ✅ | 统一 `figures.monetization = '1.2w'`，`mediaStats` 直接引用；助手文案与项目数据一致 | `src/data/site.ts` · `src/data/me.ts` |
| D5 平台品牌色 | ✅ | 新增 6 个**不随主题变化**的 `--c-brand-*`（定义在主题块之外），`platforms[].color` 改为引用它们 + `brand` 字段；抖音不再用 `--c-ink` | `src/index.css` · `tailwind.config.js` · `src/data/me.ts` |

### 9.5 低成本速赢清单（7️⃣ 节 12 条）

| 条目 | 状态 | 备注 |
|---|---|---|
| 1 死链 → 真实链接 | ✅ | 见 F4；`check:data` 拦截回归 |
| 2 `public/` + favicon/og/robots/sitemap | ✅ | 另加 `rss.xml`、`site.webmanifest`、`files/` |
| 3 顶层 ErrorBoundary | ✅ | root + route 双层，复用 404 版式 |
| 4 派生计数 + 删死代码 | ✅ | `useMediaQuery` 改为被真正使用而非删除 |
| 5 统一 D1–D5 | ✅ | 常量集中在 `figures` |
| 6 Admin/Reader 懒加载 | ✅ | 实际全部路由都懒加载，入口 gzip −64% |
| 7 Modal 焦点陷阱 | ✅ | 含后台 `AdminModal` |
| 8 品牌色固定令牌 | ✅ | `--c-brand-*` |
| 9 `.gitignore` / 预览稿 | ✅ | 生成物与垃圾文件一并处理 |
| 10 Playwright 冒烟测试 | ⏳ 待排期 | 需要新增 devDependency 与浏览器下载，本轮「不加依赖」约束下改为：3 个门禁脚本（`check:data` / `check:contrast` / `build`）+ 5 主题 × 12 路由 × 2 视口人工实测 |
| 11 减少动画暂停跑马灯/弹幕 | ✅ | CSS 媒体查询 + JS 侧 `usePrefersReducedMotion` |
| 12 `useSeo` 动态 title/description | ✅ | 顺带把 og/canonical/JSON-LD/robots 一起做掉 |

### 9.6 验收结果（实测）

| 验收项 | 结果 | 证据 |
|---|---|---|
| `npm run build`（含 `tsc -b`） | ✅ 通过 | 2000 modules，4.85s；入口 `index-*.js` 120.02 kB / gzip 43.82 kB |
| 门禁 | ✅ 全绿 | `check:data` 5 项通过；`check:contrast` 5 主题 × 5 规则通过（最低 3.06:1） |
| 控制台 error | ✅ 0 | 5 主题 × 12 路由 = 60 次加载 + 后台 5 页 + 交互路径，`no console messages found` |
| 5 主题全站生效、无串色 | ✅ | 每主题冷加载后 `body` 背景色与令牌预期完全一致；`--c-brand-douyin` 在 paper 与 terminal 下同为 `42 42 46` |
| 移动端无横向溢出 | ✅ | 390×844 下 6 个页面 `scrollWidth === clientWidth === 380` |
| 静态资源 | ✅ 12/12 全 200 | favicon/robots/sitemap/rss/manifest/og-cover + 6 个 `files/` |
| 下载真实性 | ✅ | `/work/files` 5 个 `<a download>` + 4 条「待上传」；`/work/resume` 3 个动作无假按钮 |
| `/admin` 不回归 | ✅ | 看板/内容/审核/文件/设置 5 页均渲染，0 error；DEMO 提示条存在；主题卡片与「跟随站点默认」行为正确且持久化 |
| 焦点陷阱 / skip link / aria-current | ✅ | 连按 6 次 Tab 焦点始终在 dialog 内并可回环，Esc 后归还触发元素；skip-link 是首个可聚焦元素 |
| AI 助手来源标注 | ✅ | 显示「预置问答 · 作者手写」+ 引用 chip + 底部「本地预置问答 · 无真实模型调用」 |
| 错误边界 | ✅ | `/learn/not-exist-id` 走兜底版式，非白屏、0 error |

### 9.7 本轮新增 / 修改文件清单

**新增（共 39 个：src 18 + scripts 8 + public 13）**

```
src/lib/storage.ts        存储 key 集中 + 版本化 + 迁移 + 形状校验（R4）
src/lib/a11y.ts           useFocusTrap / useScrollLock（A1）
src/lib/seo.ts            useSeo + articleJsonLd / personJsonLd（S3/S4）
src/data/articles.index.ts  标题级索引 + 派生计数（R3/D2/P2）
src/data/media.ts         图片资源清单契约（F1）
src/components/ErrorBoundary.tsx   root/route/404 兜底（R1）
src/components/SmartImage.tsx     图片统一入口（F1/P4）
src/services/config.ts    服务端开关与接口路径（零密钥）
src/services/http.ts      apiJson / apiJsonSafe / NotSupportedError
src/services/ai.ts        provider 链 + SSE 消费 + 预置兜底（AI1/2/10）
src/services/guestbook.ts 留言仓储 + 反滥用 + 审核队列（F5/B4/B5）
src/services/files.ts     下载判定 + 上传签名契约（F2/F6/B6）
src/services/audio.ts     音频 manifest 契约（F3）
src/services/analytics.ts 无 Cookie 本机埋点（B7）
src/services/auth.ts      会话适配层 + DEMO 会话（B2）
src/services/content.ts   内容仓储契约（B1/B3）
src/services/observability.ts  错误上报（R1）
src/vite-env.d.ts         环境变量类型声明
scripts/{gen-seo,gen-og,gen-files,copy-assets,check-data,contrast-check,find-chunk}.mjs + scripts/seo-entry.ts
public/{favicon.svg,robots.txt,site.webmanifest,og-cover.png,sitemap.xml,rss.xml}
public/files/{wyx-resume-2026.docx,wyx-resume.md,wyx-resume-print.html,fde-tutorials-structure.md,micro-expression-clean.py,ecommerce-eval-sample.csv,harness-regression-template.zip}
```

**修改（26）**：`index.html`、`package.json`、`tailwind.config.js`、`.gitignore`、`src/{main,App}.tsx`、`src/index.css`、
`src/theme/{theme,ThemeProvider}.tsx`、`src/data/{site,me,nav,work,articles}.ts`、
`src/components/{Layout,AIAssistant,ThemeSwitcher}.tsx`、`src/components/ui/{Modal,primitives}.tsx`、
`src/pages/{Home,Learn,Reader,Resume,Files,Toolbox,Moments,Travel,MusicBox,Media,Guestbook,Friends}.tsx`、
`src/admin/{data.ts,ui.tsx,AdminApp.tsx,AdminShell.tsx}`、`src/admin/pages/{Settings,Moderation,Analytics,Content,Files,AiConfig,Profile}Page.tsx`。

**删除（3）**：`write-test.txt`、`src/admin/.write-test`、`src/admin/write-test.txt`。

---

## 🔟 剩余风险与下一位接手人的接入点

### 10.1 仍未闭环的 8 项风险

| 风险 | 影响 | 说明 |
|---|---|---|
| 内容仍是写死在代码里的常量 | 后台「发布/下架」仍不影响前台真实数据 | 契约已在 `services/content.ts`，缺的是 B1 存储与读接口 |
| `/admin` 无真实鉴权 | 任何人可访问后台 | 已用「DEMO · 未鉴权」提示条把风险显式化，**上线前必须接 B2** |
| 真实照片/音频缺失 | F1/F3 只能展示图形兜底与模拟进度 | 需作者本人提供素材，登记进 `mediaCatalog` / 音频 manifest 即自动生效 |
| 无预渲染，文章正文对爬虫不可见 | S4 只做到了 JSON-LD | 需新增 `vite-plugin-ssg` 或迁 SSR 框架 |
| AI 回答仍是预置 | 面试追问「真的接了模型吗」时只能回答契约就绪 | 需 AI1/AI2 服务端网关；降级链已保证不白屏 |
| 埋点仅本机样本 | 后台看板主数字仍是预置 | 已用 Badge + 专属面板区分口径，不冒充真实流量 |
| 无 lint / 测试 / CI | 代码风格与回归仍依赖人工 | 本轮只补了 3 个零依赖门禁脚本 |
| 外链真实地址待确认 | `links.github` 用的是站内已有的 `@wyx-code`，若账号不符需修正 | 只需改 `src/data/site.ts` 的 `links` 一处 |

### 10.2 服务端接入清单（改一处开关即切换）

```bash
# .env.local（全部可选，不配就是纯前端演示模式）
VITE_API_BASE=https://api.wyx.space     # 一开：AI/留言/埋点/上传/会话全部改走真接口
VITE_AI_CHAT_PATH=/api/ai/chat          # AI1/AI2：服务端代理模型，返回 SSE data:{delta,references}
VITE_GUESTBOOK_PATH=/api/guestbook      # F5/B4：POST 进待审，GET ?status=published 出公共墙
VITE_UPLOAD_PATH=/api/files/sign        # B6：只发直传签名，密钥不落前端
VITE_TRACK_PATH=/api/track              # B7：无 Cookie 埋点上报
VITE_AUTH_LOGIN_PATH=/api/auth/login    # B2：HttpOnly refresh + access token
VITE_ERROR_REPORT_PATH=/api/errors      # R1：错误上报（或换 Sentry transport）
VITE_AUDIO_BASE=/audio                  # F3：需同时提供 /audio/manifest.json
```

安全基线（接入时同步做，见 §3.2）：全站 HTTPS + HSTS、CSP 白名单字体域、zod 入参校验、IP 哈希不落明文、
写接口 RBAC、模型与对象存储密钥只在服务端、结构化日志 + 5xx 告警。

### 10.3 建议的下一步顺序

1. **B2 + B10 选型**（不先做这个，后台就不能上线）；
2. **B1 + B3**：把 `src/data/*` 平移到数据库，页面改读 `contents.list()`；
3. **B4 + B5 + F5 二期**：留言/弹幕/友链进真实审核队列；
4. **AI1 + AI2 + AI9**：模型网关 + SSE，现有降级链直接复用；
5. **B6 + F1/F2/F3**：素材一次性入库，图片与音频契约自动转正；
6. **S4 + B8 + AI3/AI6**：预渲染 + 文章 OG 图 + RAG 与评测集。

---

## 1️⃣1️⃣ 追加一轮：导航/页头/浮标交互调整（2026-10-30 第二批）

| 改动 | 状态 | 实现 | 涉及文件 |
|---|---|---|---|
| 下拉菜单紧凑化 | ✅ | 面板从「整屏居中 680px 双列大卡片」改为**挂在当前导航项文字正下方**的 244px 单列面板（高度 128–214px）；首项左对齐、末项右对齐、中间项居中对齐到该导航项；去掉底部说明条 | `components/Layout.tsx` |
| 删除各页顶部介绍大卡片 | ✅ | 新增紧凑页头 `PageHead`（一行 kicker + 单行标题 + 右侧可选操作），替换 12 个页面的 `PageIntro` 与 `/learn` 的内联介绍 section；`desc/note/Sticker` 文案降为右侧一行小字统计，**下方内容区完全不变** | `components/ui/primitives.tsx` · `pages/{Learn,Resume,Toolbox,Files,Love,Moments,Travel,MusicBox,About,Media,Timeline,Guestbook,Friends}.tsx` |
| 简历页操作不丢失 | ✅ | 打印 / 下载打印版 / 简历原件 三个动作移入 `PageHead` 的 right 槽（F6 能力保留） | `pages/Resume.tsx` |
| AI 助手浮标全站显示 | ✅ | 浮标从 `/learn`、`/learn/:id` 两页上提到 `Layout` 全局挂载；组件本体仍 `React.lazy`，入口包未变大（119.93 kB / gzip 44.04 kB）；「正在阅读」上下文改用 `src/lib/assistant.ts` 外部 store，文章页写入、离开自动清除；`?assistant=1` 由 Layout 统一响应 | `src/lib/assistant.ts`（新）· `components/{Layout,AIAssistant}.tsx` · `pages/{Learn,Reader}.tsx` |
| 修掉的同类缺陷 | ✅ | framer-motion 写内联 `transform` 会覆盖 Tailwind 的 `-translate-x-1/2`，导致面板右偏半个身位；改为「外层定位 + 内层动画」，并同步修正 `Toast` 的同源问题 | `components/Layout.tsx` · `components/ui/Toast.tsx` |

**实测（1440×900）**：中间三项「面板中心 − 导航项中心」差值 0.00px，首/末项左右对齐逐位相等，无越界；14 个页面 h1 高度 27px、top ≈ 108px，h1 不再处于 `rounded-[26px]` 大卡内，下方内容子项数量无缺失；16 个 URL 均存在右下角「问问 AI 助手」浮标（fixed bottom-5 right-5，未被遮挡）；Toast 水平居中偏差 0.00px；全程 **控制台 0 error**；`npm run build` + `npm run check`（数据口径 + 对比度）全绿。

> 保留未改：文章阅读页 `/learn/:id` 顶部的 40px 大标题属于阅读版式的 hero（含标签/字数/进度），不是被删除的频道页介绍卡片。

