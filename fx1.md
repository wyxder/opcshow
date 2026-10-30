# WYX.SPACE 二轮全面分析与功能完善建议（fx1）

> 对象：`e:\Code\AI\Start\Web\Blog\resume1` · 魏云潇个人站  
> 审计日期：2026-10-30  
> 与 `fx.md` 的关系：`fx.md` 是第一轮「补真实感 + 补契约」，本轮 `fx1` 做第二轮「接线与兑现」审计。**已在 fx.md 落地的条目不再重复表扬，只写仍未闭环、出现回归、或文案与实现不一致的部分。**
>
> 证据口径：全量走查 `src` 41 个 ts/tsx、`scripts` 8 个脚本、`public` 13 个静态文件；实际执行 `npm run build` 与 `npm run check`；静态检索服务端目录、测试、Lint、Service Worker、契约引用。未运行浏览器实测的项会标注「静态判断」。

---

## 0. 一页结论

### 0.1 三个判断

1. **展示层已经成熟，真实能力仍以「适配层 + 演示文案」为主。** 15 个前台路由、8 大后台区块 23 个 Tab、5 套主题、6 篇结构化长文都成立；但后台写操作、AI 回答、上传分享、埋点主数字、图片与音频仍不是真实闭环。
2. **当前最大的问题不是「缺功能」，而是「承诺与实现脱节」。** 后台页面写着「发布后会即时出现在前台」「改动会即刻影响线上会话」，实际只改组件内存；`services/content.ts` 已定义仓储，但页面没有消费；AI 助手注释说传「当前小节」，代码只传文章标题。
3. **下一步价值不在继续加页面，而在四件事：** 后台真实性/鉴权、内容入库、真实 AI 链路（网关 + RAG + 评测）、真实资源（图/音频/文件/审核）。

### 0.2 与 fx.md 记录的差异（回归 / 未接线）

| 项 | fx.md 记录 | 本轮实测 | 判断 |
|---|---|---|---|
| 首屏入口包 | 120.02 kB / gzip 43.82 kB | 137.20 kB / gzip 51.89 kB | 功能增加合理，但 gzip 增长约 18%，需要预算 |
| 内容仓储 | B1「契约就绪」 | `services/content.ts` 存在，但 `src` 内无页面 import 它 | 契约未接线，仍读 `src/data/*` |
| AI 上下文 | AI4「当前阅读小节」 | `Reader.tsx:142` 只传 `article.title` | 注释与实现不一致 |
| 后台文案 | 已加 DEMO 提示条 | 页面标题描述仍声称即时生效 | 提示条不等于页面文案诚实 |
| 死链治理 | F4「已消掉 `href="#"`」 | `data/work.ts:26-63` 仍有 15 条 `link: '#'` | 未渲染所以门禁没拦住，但数据层仍有死链 |
| 运行门禁 | 3 个零依赖脚本 | `check:data` 只覆盖前台，未覆盖 `admin/data.ts` | 门禁有盲区 |

### 0.3 评分卡

| 维度 | 评分 | 关键依据 | 风险 |
|---|---|---|---|
| 信息架构与叙事 | 5 / 5 | 5 类导航 20 子项、15 前台页、8 区块 23 Tab，叙事闭环完整 | 低 |
| 设计系统与主题 | 4.5 / 5 | 5 主题 × 48 令牌；对比度门禁 5×5 全过，最低 3.06:1 | 低 |
| 前端工程质量 | 4 / 5 | `strict: true`；路由级 lazy；ErrorBoundary；STORAGE_KEYS 版本化；`newId` 统一 | 低 |
| 可访问性 | 3.5 / 5 | 已有 focus trap、skip link、aria-current；缺桌面导航键盘、助手弹层焦点、Toast live region | 中 |
| 真实内容资源 | 1.5 / 5 | `mediaCatalog = {}`；音频 base 为空；9 个资源文件仅 5 个可下载 | 高 |
| 后端与持久化 | 0.5 / 5 | 仓库无服务端目录；`services/*` 全是浏览器适配层 | 高 |
| AI 真实能力 | 1.5 / 5 | 预置问答 + SSE 适配器；无网关、无 RAG、无评测、后台配置为 mock | 高 |
| SEO 与可发现性 | 3 / 5 | 动态 meta、JSON-LD、sitemap/rss、OG 已做；SPA 无预渲染，文章正文对爬虫仍弱 | 中 |
| 性能 | 3 / 5 | 路由拆分已做；入口 gzip 51.89 kB；Home 静态引入 57.7 KB 源码；4 个字族全量加载 | 中 |
| 工程化与测试 | 2 / 5 | 无 ESLint/Prettier/测试/CI；只有 build + 2 个数据门禁 | 中 |
| 真实性/一致性 | 2.5 / 5 | 多处 DEMO 标注是优点；但页面描述、后台静态数据仍过度承诺 | 中高 |

---

## 1. 当前能力基线

### 1.1 已经真实可用的部分

| 能力 | 现状 | 证据 |
|---|---|---|
| 路由与懒加载 | 15 个前台路由，Admin/Reader/生活频道全部按需加载 | `src/App.tsx:13-27` |
| 错误兜底 | root + route 双层 ErrorBoundary，404 版式复用 | `src/App.tsx:79-94`、`components/ErrorBoundary.tsx` |
| 主题系统 | 5 套主题、令牌化、防闪烁、切换过渡、系统偏好 | `index.html:50-82`、`src/theme/*` |
| 对比度门禁 | 5 主题 × 5 规则全部通过，最低 3.06:1 | `npm run check:contrast` |
| 数据口径门禁 | 6 篇文章、派生计数、无前台 `href="#"`、storage key、`newId` 全部通过 | `npm run check:data` |
| SEO 基础设施 | 动态 title/description/og/canonical/JSON-LD；sitemap 20 条、rss 6 篇 | `src/lib/seo.ts`、`scripts/gen-seo.mjs` |
| 下载能力 | 5 个真实文件可下载；简历 DOCX/打印版/Markdown | `public/files/*`、`src/data/work.ts:87-97` |
| 留言本机闭环 | 本地留言、点赞、审核队列、来源角标 | `services/guestbook.ts:73-131`、`pages/Guestbook.tsx` |
| 后台演示标注 | 顶部「DEMO · 未鉴权」提示条 + 看板「预置样本」Badge | `admin/AdminApp.tsx:77-87`、`pages/AnalyticsPage.tsx:55` |

### 1.2 仍为「演示 / 占位 / 未接线」的部分

| 能力 | 现状 | 证据 |
|---|---|---|
| 后台内容发布 | 只改组件 state，刷新即失效 | `admin/pages/ContentPage.tsx:40-42,69-92` |
| 后台 AI 配置 | 模型、Prompt、用量均为种子数据，只改内存 | `admin/pages/AiConfigPage.tsx:29-35,51` |
| 简历解析/回滚 | `setTimeout` 模拟解析；回滚只改本地数组 | `admin/pages/ResumeAdminPage.tsx:68-74,378-379` |
| 文件上传/分享 | 上传假进度；分享 token 本地生成 | `admin/pages/FilesAdminPage.tsx:50-71` |
| 后台鉴权 | 无登录页、无 `RequireAuth`；`getSession` 只用于提示条 | `admin/AdminApp.tsx:28-34` |
| AI 对话 | 未配 `VITE_API_BASE` 时 100% 预置问答；配了也只是前端适配器 | `services/ai.ts:91-229` |
| 图片 | 全站真实照片为 0，全部走 Plate/CSS 兜底 | `data/media.ts:25` |
| 音频 | 未配 `VITE_AUDIO_BASE`，播放器走模拟时钟 | `services/audio.ts:16,29-30` |
| 全站埋点 | 仅本机 300 条样本；后台主 KPI 为预置 | `services/analytics.ts:44-96`、`admin/data.ts:19-70` |
| 服务端 | 无 server 目录、无数据库、无 API 实现 | 仓库根目录结构 |

---

## 2. 先修「真实性与契约」：跨层问题

> 这一节优先级高于任何新功能。它决定面试官问「这是真的吗」时，站点能不能自洽回答。

| ID | 问题 | 现状证据 | 完善建议 | 验收标准 | 优先级 |
|---|---|---|---|---|---|
| X-01 | 内容仓储定义了但没人用 | `services/content.ts:68-95` 定义 `localContent/remoteContent/contents`；全 `src` 无 `from '@/services/content'` 引用；页面直接 import `@/data/*` | 加 `useContent(domain)` Hook：内部调 `contents.list()`，带缓存、骨架屏、失败回落本地快照；先迁 `Learn`，再迁 `Resume/Files/Moments`。后台列表也改读同一仓储 | 接入服务端后，页面不改渲染即可从数据库取数；断网时回落本地不白屏 | P0 |
| X-02 | 后台文案承诺了不存在的能力 | `ContentPage.tsx:118`「发布后会即时出现在前台」；`AiConfigPage.tsx:51`「改动会即刻影响线上会话」；`ResumeAdminPage.tsx:81,368`「自动解析/回滚立即生效」；`FilesAdminPage.tsx:78`「公开文件会出现在前台」；`ProfilePage.tsx:85-86`「已同步至前台」 | 统一抽 `DemoCapability` 组件：未接服务端时所有写按钮改为 disabled + 原因 tooltip；页面描述改为「演示：仅修改本页状态，不会保存」。接服务端后再移除开关 | 未接服务端时点击任何写按钮不出现「已发布/已同步」成功提示；文案与能力一致 | P0 |
| X-03 | 鉴权只有「提示条」，没有守卫 | `AdminApp.tsx:28-34` 只 `getSession().then(setSession)`；之后无论 session 是否为 null 都渲染页面；`AdminShell.tsx:192-194` 退出登录无 `onClick` | 新增 `LoginPage` + `RequireAuth`：真实模式无 session 跳登录；401 统一跳转；admin/editor 角色控制写按钮；退出登录调用 `logout()` 并清 cookie | 真实模式下未登录访问 `/admin/*` 被拦截；退出后回到登录页 | P0 |
| X-04 | AI 助手弹层不是完整 dialog | `AIAssistant.tsx:110-118` 有 `role="dialog"`，但无 `aria-modal`、无焦点陷阱、无 Esc；`:56-57` 只在卸载时取消，关闭面板不取消流式回答 | 复用 `useFocusTrap` + `useScrollLock`；Esc 关闭；关闭时 `cancelRef.current?.()`；增加「停止生成 / 重试」；回答区 `aria-live="polite"` | 键盘可完整操作；关闭后不再有后台 token 输出；可停止与重试 | P0 |
| X-05 | 阅读上下文只传标题 | `Reader.tsx:141-144` 只 `setAssistantContext(article.title)`；`services/ai.ts:20` 注释写「当前阅读小节」 | 传 `{ articleId, articleTitle, activeSectionId, activeSectionTitle }`；随请求进 `body.context`；预置问答也能按小节匹配 | 助手头部显示「正在阅读：文章 · 小节」；RAG 可定位到小节锚点 | P1 |
| X-06 | 门禁有盲区 | `check:data` 只扫前台；`admin/data.ts:230` 仍写「全网 3.4w」，派生值已约 3.7w+；`AdminShell.tsx:81` 审核 badge 写死 `1` | 把 `admin/data.ts` 纳入口径检查；所有数字引用 `figures`/派生值；审核 badge 用 `listPending()` 计数 | `check:data` 覆盖后台数据；后台不再出现手写粉丝数；badge 与待审数一致 | P1 |

### 2.1 建议的「真实性分层」

| 层级 | 定义 | 允许的 UI 表达 | 当前例子 |
|---|---|---|---|
| L3 真实 | 服务端持久化 + 可验证 | 可以说「已发布 / 已同步 / 实时」 | 下载、主题、本机留言 |
| L2 本机 | localStorage / sessionStorage，仅本浏览器 | 必须标「本机 / 仅你可见」 | 留言墙、点赞、收藏、本机埋点 |
| L1 演示 | 组件内存 / 种子数据 | 必须标「演示 / 不会保存」 | 后台内容、AI 配置、简历解析、上传分享 |
| L0 占位 | 空清单 / 未接入资源 | 必须标「待接入 / 暂缺」 | 图片、音频、4 个待上传文件 |

**建议**：把 L1/L2/L0 的标注抽成统一组件（`SourceBadge` / `DemoNotice`），避免每个页面自己写一套，也避免新页面忘记标注。

---

## 3. 前端完善建议

| ID | 模块/问题 | 现状证据 | 完善建议 | 验收标准 | 优先级 |
|---|---|---|---|---|---|
| F-01 | 后台写操作全部是内存态 | `ContentPage.tsx:40-42,69-92`；`AiConfigPage.tsx:29-35`；`ResumeAdminPage.tsx:68-74,378-379`；`FilesAdminPage.tsx:50-71` | 写按钮统一走 `contents.upsert/setStatus`、`requestUploadTicket`、`createShareLink`；未配置服务端时 `disabled + 原因`；成功 Toast 只在真实返回后出现 | 刷新后不丢失（真实模式）；演示模式不伪装成功 | P0 |
| F-02 | 后台无登录页/守卫 | `AdminApp.tsx:28-34`；`AdminShell.tsx:192-194` | 新增 `LoginPage`、`RequireAuth`、401 拦截、退出登录；登录后写入 `sessionStorage` 仅存非敏感标记，令牌走 HttpOnly Cookie | 未登录不可进后台；退出即时失效 | P0 |
| F-03 | AI 助手关闭不取消、无停止/重试 | `AIAssistant.tsx:56-57,110-118,183-187` | 关闭/Esc 时 abort；加「停止 / 重试」；回答区 `aria-live`；错误态显示「模型不可用，已落回预置」 | 关闭后无残留 token；用户可中止；失败可重试 | P0 |
| F-04 | 桌面导航只能鼠标悬停展开 | `Layout.tsx:164-166` 仅 `onMouseEnter`；`:190-232` 面板由 `openKey` 控制，无 focus/click/Esc | 加 `onFocus`、`onClick` 切换、`onBlur` 延迟关闭、Esc 关闭、`aria-haspopup="true"` / `aria-expanded`；子项支持方向键 | 纯键盘可展开二级菜单并进入子项 | P1 |
| F-05 | 百宝箱 15 条数据仍是死链 + 无详情 | `data/work.ts:26-63` 全部 `link: '#'`；`Toolbox.tsx:41-49,140-147` 只复制标题+描述 | 每条补真实 URL 或标「站内未发布」；加详情弹窗展示完整 Prompt/代码；复制按钮改为复制正文；补 license/updated | 卡片点开有完整内容；无 `link:'#'`；复制内容可直接用 | P1 |
| F-06 | 阅读闭环不完整 | `Reader.tsx:141-144`；无上一篇/下一篇/相关文章/分享/收藏/阅读位置记忆 | 传当前小节；加 prev/next、按 tags 相关推荐、复制当前链接、阅读进度写入 storage、字号切换 | 读完可继续下一篇；刷新回到上次位置；助手知道小节 | P1 |
| F-07 | 留言/点赞/审核仍偏本地 | `services/guestbook.ts:73-93,136-142`；`Guestbook.tsx:23,218-223` 点赞只存本地 | 接远端后：提交→待审→公共墙；点赞按 message id 去重并落库；增加分页/举报/删除自己的留言；后台 badge 派生待审数 | 两个浏览器能看到同一留言；点赞数一致；审核后状态可见 | P1 |
| F-08 | 图片管线是空壳 | `data/media.ts:25` 空清单；`SmartImage.tsx:35-49` 只有 `src`，无 `srcset/sizes`；全站真实图 0 | 先放 12–20 张真实照片到 `public/images/` 或 CDN；生成 AVIF/WebP 两档 + `srcset/sizes` + LQIP；补 alt、EXIF 清理、版权说明 | 旅拍/朋友圈出现真实图；不抖布局；LCP 图 `eager` | P1 |
| F-09 | 音频播放器未配置真实源 | `services/audio.ts:16,29-30`；`MusicBox.tsx:26,107-124` 仅在有 `src` 时渲染 `<audio>` | 提供 3–5 秒循环试听片段 + `manifest.json`；接 MediaSession、播放位置持久化、加载失败提示；无源时禁用播放按钮 | 可真实播放/暂停/seek；无源时 UI 不假装在播 | P2 |
| F-10 | 文件下载/分享未闭环 | `data/work.ts:89-96` 4 条 `pending`；`FilesAdminPage.tsx:63-71` 分享本地生成 | 对象存储直传签名、下载短链（token/expire/password）、下载计数、Range 支持；前台「待上传」保留原因 | 9/9 可下载或明确原因；分享链接可跨设备访问 | P1 |
| F-11 | 搜索仍是字面 `includes` | `Layout.tsx:363-367`；索引只有标题级 | 先做归一化（大小写/全半角/拼音首字母/别名）+ 高亮 + 最近搜索；量大后换 MiniSearch/Fuse；再接向量混合检索 | 搜「rag 切片」「RAG切片」都能命中；空结果有引导 | P2 |
| F-12 | 首屏包与字体仍偏大 | `npm run build`：入口 137.20 kB / gzip 51.89；motion 123.08 / 41.06；react 163.87 / 53.44；CSS 80.36 / 14.71；`Home.tsx` 57.7 KB 源码静态引入；`index.html:47` 4 个字族全量 | 字体只预加载 2 个文件、其余 `font-display: optional` + 子集化；Home 按区块拆分或把重组件 lazy；导航 hover 预取目标 chunk；CI 加 bundle budget（入口 gzip ≤ 50 kB） | 入口 gzip 回到 45 kB 左右；首屏字体请求减少；LCP 不退化 | P1 |
| F-13 | PWA 只有 manifest，没有离线 | `public/site.webmanifest` 存在；全仓库无 `serviceWorker/registerSW` | 接 `vite-plugin-pwa` 或手写 SW：缓存 app shell、离线页、更新提示；静态资源 stale-while-revalidate；后台接口 network-first | 断网可打开壳与已访问页；有「新版本可用」提示 | P2 |
| F-14 | SPA 仍无预渲染 | `vite.config.ts` 只有 react 插件；`src/lib/seo.ts:10-12` 自述 SPA 限制；OG 只有单张 `og-cover.png` | 对 6 篇文章 + `/learn`、`/work/resume`、`/` 做构建期预渲染；每篇文章生成专属 OG（satori/resvg）；sitemap/rss 由内容源生成 | 查看源代码能看到文章正文；每篇文章分享卡有专属标题图 | P1 |
| F-15 | 数据口径与后台种子仍漂移 | `admin/data.ts:230` 3.4w vs 派生约 3.7w；`admin/data.ts:157` 状态池循环生成；`AdminShell.tsx:81` badge 写死 1 | 后台所有数字改为引用 `figures`/`platforms`/`listPending`；种子状态显式标注「演示」；`check:data` 扫 `admin/data.ts` | 后台与前台数字一致；badge 与待审数一致 | P2 |
| F-16 | Toast 无 live region | `components/ui/Toast.tsx:18-28` 普通 `motion.div`，无 `role/status/aria-live` | 加 `role="status"` + `aria-live="polite"`；错误用 `role="alert"`；不抢焦点；同消息去重 | 屏幕阅读器能播报；重复点击不堆叠 | P2 |

### 3.1 前端修改顺序建议

1. **先改「说法」**：X-02 + F-01，把所有未接线的写操作改成 disabled/演示文案。成本最低，收益最大。
2. **再改「行为」**：F-02 登录守卫、F-03 助手生命周期、F-04 键盘导航。
3. **再改「内容」**：F-05 百宝箱、F-08 图片、F-10 文件、F-07 留言。
4. **最后改「性能与分发」**：F-12 字体/包体、F-14 预渲染、F-13 PWA。

---

## 4. 后端完善建议

> 当前仓库没有 server 目录、没有数据库、没有 API 实现。`src/services/*` 是**浏览器端适配层**：它们定义契约、做降级，但不提供任何持久化能力。后端需要从零补齐。

### 4.1 能力清单

| ID | 能力 | 现状 | 建议实现 | 对应前端 | 优先级 |
|---|---|---|---|---|---|
| B-01 | 内容持久化与读接口 | 全部常量在 `src/data/*`；`contents` 未被页面消费 | PostgreSQL + Prisma；九表（文章/项目/动态/旅拍/歌单/友链/奖项/技能/资源）；`GET /api/content/:domain` 返回与现有类型同构；ETag + CDN 缓存；失败回落本地快照 | `services/content.ts` | P0 |
| B-02 | 鉴权与会话 | 无登录页、无守卫；`auth.ts` 只有适配器 | `POST /api/auth/login`、`POST /logout`、`GET /session`、`POST /refresh`；Access Token 短时 + HttpOnly Refresh Cookie；RBAC `admin/editor`；登录审计 | `services/auth.ts`、`AdminApp` | P0 |
| B-03 | 内容写与发布 | 后台只改内存 | `PUT /api/content/:domain/:id` + `If-Match version` 乐观锁；状态机 draft→pending→published→hidden；定时发布；预览 token；修订历史 | `ContentPage` | P1 |
| B-04 | 互动审核 | 仅本机留言；后台队列读本机 | `POST /api/guestbook` 进 pending；`POST /:id/approve`；弹幕/友链同构；敏感词 + LLM 预筛；审核操作审计；通知作者 | `services/guestbook.ts`、`ModerationPage` | P1 |
| B-05 | 文件与对象存储 | 上传假进度；分享本地 token；4 个文件待上传 | S3/OSS 直传签名；MIME + 体积白名单；病毒扫描；图片转码；下载短链（token/expire/password）；Range；下载计数 | `services/files.ts`、`FilesAdminPage` | P1 |
| B-06 | 埋点与聚合 | 本机 300 条样本；后台主 KPI 预置 | `POST /api/track` 收 path/referrer/sessionHash/stayMs；IP 哈希不落明文；日聚合任务；`GET /api/analytics/summary`；保留期与清理 | `services/analytics.ts`、`AnalyticsPage` | P2 |
| B-07 | 异步任务 | 无队列 | Redis + BullMQ：简历解析、邮件通知、OG 图生成、图片转码、备份、RAG 重建索引；重试 + 死信 | `ResumeAdminPage`、`AiConfigPage` | P2 |
| B-08 | 安全基线 | 无服务端头、无限流 | HTTPS + HSTS；CSP；CORS 白名单；CSRF；zod 入参校验；富文本白名单；写接口 RBAC；公共接口令牌桶；密钥只在服务端 | 全站 | P0 |
| B-09 | 可观测性与发布 | 无日志/监控/CI | 结构化日志 + request id；Sentry；`/healthz` + `/readyz`；P95/5xx 告警；staging + 迁移回滚脚本 | 全站 | P1 |
| B-10 | 备份与恢复 | 后台备份 UI 为 mock | `pg_dump` 定时 + 对象存储版本化；保留策略；恢复演练；只读恢复模式 | `SettingsPage` | P2 |
| B-11 | API 契约 | 无 OpenAPI | OpenAPI 3.1；统一错误码 `{code,message,requestId}`；cursor 分页；幂等键；版本前缀 `/api/v1` | `services/http.ts` | P1 |
| B-12 | 部署形态 | 未选型 | 推荐「静态前端 + 独立 API」：NestJS 单体或 Next API Routes；容器化；托管 PostgreSQL；CDN；静态与 `/api` 分离便于回滚 | — | P0（选型） |

### 4.2 最小 API 面（建议先做这 15 个）

| 方法与路径 | 用途 | 鉴权 | 关键约束 |
|---|---|---|---|
| `POST /api/v1/auth/login` | 登录 | 公开 | 失败限流；不返回令牌到 body（Cookie） |
| `POST /api/v1/auth/logout` | 退出 | 会话 | 清 Refresh Cookie |
| `GET /api/v1/auth/session` | 当前会话 | 会话 | 未登录 401；返回 role |
| `GET /api/v1/content/:domain` | 读内容 | 公开 | ETag；分页；只返回 published |
| `PUT /api/v1/content/:domain/:id` | 更新内容 | admin/editor | `If-Match version`；冲突 409 |
| `POST /api/v1/content/:domain/:id/status` | 状态机 | admin/editor | 非法迁移 422；审计 |
| `GET /api/v1/guestbook?status=published` | 公共留言 | 公开 | 分页；只返回 published |
| `POST /api/v1/guestbook` | 提交留言 | 公开 | 长度/频率/重复校验；返回 pending |
| `POST /api/v1/guestbook/:id/approve` | 审核通过 | admin/editor | 幂等；审计 |
| `POST /api/v1/files/sign` | 直传签名 | admin | MIME/体积白名单；短有效期 |
| `POST /api/v1/files/share` | 分享短链 | admin | 密码/过期；token 不可枚举 |
| `GET /api/v1/files/download/:token` | 下载 | 公开（可带密码） | 校验过期；Range；计数 |
| `POST /api/v1/track` | 埋点 | 公开 | 限流；IP 哈希；不存明文 UA |
| `GET /api/v1/analytics/summary` | 聚合看板 | admin | 按日聚合；缓存 5 分钟 |
| `POST /api/v1/ai/chat` | AI 对话 | 公开（额度） | SSE；超时；注入隔离；返回 references |

> 简历解析、OG 图、RAG 重建索引建议走异步任务接口：`POST /api/v1/resume/parse`、`POST /api/v1/ai/reindex`、`GET /api/v1/jobs/:id`。

### 4.3 最小数据模型

| 表 | 关键字段 | 用途 |
|---|---|---|
| `articles` | id, slug, title, abstract, category, status, version, content_json, published_at | 6 篇长文 + 后续新增 |
| `projects` | id, title, category, stack_json, metrics_json, featured, status | 7 个项目与指标 |
| `moments` / `trips` / `tracks` | id, text, place, media_json, published_at | 生活频道 |
| `guestbook_messages` | id, user, text, color, source, status, ip_hash, created_at | 留言/弹幕审核 |
| `friends` | id, name, url, desc, status | 友链申请 |
| `resource_files` | id, name, ext, size, category, storage_key, downloads, visibility | 文件元数据 |
| `media_assets` | id, storage_key, width, height, kind, source, alt | 图片管线 |
| `admin_users` / `roles` | id, email, role, password_hash | 后台账号 |
| `ai_prompts` | id, scene, version, body, active, updated_at | Prompt 版本化 |
| `ai_usage` / `ai_feedback` | day, model, tokens, cost, latency, rating | 用量/反馈 |
| `pageviews` / `analytics_daily` | path, session_hash, referrer, ts, pv, uv | 埋点与聚合 |
| `audit_logs` | actor, action, target, before_json, after_json, ts | 后台操作审计 |

### 4.4 后端验收顺序

1. **B-02 + B-12 选型**：没有鉴权与部署形态，后台不能上线。
2. **B-01 + B-03**：内容入库与写接口；先把 `Learn` 页迁到 `contents.list()`。
3. **B-04 + B-05**：留言审核与文件直传，把 F-07/F-10 转正。
4. **B-06 + B-09**：真实埋点与可观测性。
5. **B-07 + B-10 + B-11**：异步任务、备份、OpenAPI。

---

## 5. AI 服务完善建议

> 现状：`services/ai.ts` 已做出「预置 provider + 远程 SSE provider + 自动降级」，这是很好的工程底子；但**没有模型网关、没有 RAG、没有评测、没有配额与安全过滤**。后台 `AiConfigPage` 的模型/Prompt/用量全部是种子数据。

### 5.1 能力清单

| ID | 能力 | 现状证据 | 建议 | 验收标准 | 优先级 |
|---|---|---|---|---|---|
| A-01 | 模型网关 | `services/ai.ts:121-182` 只调 `VITE_API_BASE/api/ai/chat`；无服务端 | 自建 OpenAI 兼容网关：密钥托管、供应商路由、超时/重试、模型白名单、请求审计；前端继续零密钥 | 前端无任何 model key；换供应商不改前端 | P0 |
| A-02 | SSE 流健壮性 | `services/ai.ts:151-177` 逐 `data:` 解析；无首 token 超时、无 error 事件、无断流重连、无 `[DONE]` 状态机 | 服务端发送 `event: delta/done/error`；前端加首 token 8s 超时、断流重试 1 次、明确错误态；`AbortController` 贯穿关闭/停止 | 弱网下 8s 内给出降级提示；断流可重试；关闭即停 | P0 |
| A-03 | 站内 RAG | 无向量库；`ChatReference` 只是 UI 契约 | 按文章结构切块（Section→Sub→段落，300–450 token）；元数据 `doc_id/section/path/effective_at`；pgvector + tsvector 混合检索；RRF 融合 + rerank top5 | 问「切片怎么定」返回 `rag-engineering#01` 引用；引用可点 | P1 |
| A-04 | 生成约束与引用校验 | 预置答案有引用；真实模型无约束 | system prompt 强制「无证据就拒答/指向文章」；输出 JSON `{answer, references[]}`；服务端校验引用覆盖率，低于阈值改判「无法确认」 | 无编造链接；引用与 chunk 可对上 | P1 |
| A-05 | 评测与回归 | 无评测集 | 建 40 条站内问答：检索层 HitRate@5/MRR；生成层 Faithfulness/引用正确率；行为层 Task Completion；确定性指标进 CI | CI 拦截回归；报告可复现 | P1 |
| A-06 | 成本/配额/缓存 | 无 token 计量；无额度 | `ai_usage` 按日/模型/tokens/cost 记账；按 IP/日额度限流；语义哈希缓存热门问答；超额度自动落预置 | 后台看真实用量；单用户不可刷爆 | P2 |
| A-07 | Prompt 版本化 | `AiConfigPage.tsx:29-35` 种子数据 | `ai_prompts(id,scene,version,body,active)`；后台可编辑/发布/回滚；A/B 按会话分流；操作审计 | 改 Prompt 可回滚；线上生效有版本号 | P2 |
| A-08 | 语义搜索 ⌘K | `Layout.tsx:363-367` 字面 `includes` | 标题+摘要+小节建索引；BM25 + 向量 + RRF；离线回落字面；结果高亮与分组 | 搜「评测指标」命中相关小节；无网仍可用 | P2 |
| A-09 | 简历解析 | `ResumeAdminPage.tsx:68-74` `setTimeout` | 上传 PDF/DOCX → `pdfjs/mammoth` 抽文本 → LLM 结构化 JSON（zod 校验）→ 字段级 confidence → 人工确认入库；原件存对象存储 | 上传真实简历产出结构化字段；低置信字段高亮 | P2 |
| A-10 | 安全与合规 | 仅 UI 标注来源；无注入/PII 处理 | 系统提示与用户内容隔离；工具白名单（只读检索）；输出 PII/敏感词过滤；日志脱敏；页面明示「模型生成，可能不准确」 | 注入样例不能越权；日志无 PII | P1 |
| A-11 | 会话持久化与反馈 | 刷新即丢；无点赞/踩 | 会话表 + 消息表；按 session 恢复；👍/👎 + 失败原因；反馈进评测集 | 刷新可恢复；反馈可统计 | P2 |
| A-12 | 多模态/语音（可选） | 无 | 文章 TTS 朗读、图片 alt 生成、长文摘要卡；作为加分项，不阻塞主线 | 阅读页可朗读；摘要可关闭 | P3 |

### 5.2 目标 RAG 链路

| 阶段 | 做法 | 产物/元数据 | 验收 |
|---|---|---|---|
| 解析 | 直接读 `articles.ts` 的结构化 Section→Sub→Block，不做 PDF 解析 | `doc_id`, `article_id`, `section_id`, `path` | 6 篇文章 100% 可切块 |
| 切块 | 标题层级优先，其次列表/句子边界，最后字符数；300–450 token | `chunk_id`, `text`, `token_count` | 块不跨小节；引用可定位 |
| 索引 | pgvector 存 embedding；tsvector 存关键词；同一事务更新 | `embedding`, `tsv`, `effective_at` | 增量重建 < 1 分钟 |
| 检索 | BM25 top20 + 向量 top20 → RRF → rerank top5 | `score`, `source` | HitRate@5 ≥ 0.85 |
| 生成 | system prompt 注入检索块；要求逐条引用；无证据拒答 | `answer`, `references[]` | 引用正确率 ≥ 0.9 |
| 校验 | 引用覆盖率、敏感词、PII、长度 | `passed`, `reasons` | 不合格自动降级预置 |
| 评测 | 40 条金标问答 + CI 门禁 | 报告 JSON | 回归不下降 |

### 5.3 AI 指标基线（建议写入 CI）

| 指标 | 目标 | 说明 |
|---|---|---|
| 检索 HitRate@5 | ≥ 0.85 | 前 5 个块是否包含答案 |
| MRR | ≥ 0.65 | 正确块的平均排名 |
| Faithfulness | ≥ 0.90 | 回答是否只使用检索证据 |
| 引用正确率 | ≥ 0.90 | 引用路径与 chunk 是否匹配 |
| 首 token 延迟 P95 | ≤ 1.5s | 网关 + 模型 |
| 单会话成本 | ≤ ¥0.02 | 按 token 记账 |
| 降级率 | ≤ 5% | 模型不可用/超时落预置 |
| 注入攻击拦截率 | 100%（样例集） | 系统提示隔离 + 工具白名单 |

---

## 6. 分阶段路线图

| 阶段 | 目标 | 主要任务 | 退出标准 |
|---|---|---|---|
| 阶段 A：诚实与守卫 | 先让「说法」与「能力」一致 | X-02 文案/禁用、F-01 写操作、F-02 登录守卫、F-03 助手生命周期、F-04 键盘导航、F-15 口径 | 未接服务端时没有任何「已发布/已同步」假成功；`/admin` 有登录守卫；键盘可完整操作 |
| 阶段 B：真实 AI 与内容底座 | 把 AI 与内容从演示变真实 | A-01 网关、A-02 SSE、A-03 RAG、A-04 引用、A-05 评测；B-01 内容库、B-02 鉴权、B-03 写接口、B-08 安全 | 助手回答来自模型且带可点引用；后台发布能进数据库并在前台生效；评测集 CI 通过 |
| 阶段 C：互动与资源 | 让留言、文件、图片、音频闭环 | B-04 审核、B-05 对象存储、F-07 留言、F-08 图片、F-10 文件、F-09 音频、F-05 百宝箱 | 跨浏览器可见留言；9/9 文件可下载或明确原因；旅拍/朋友圈有真实图 |
| 阶段 D：增长与体验 | 数据、搜索、分发、离线 | B-06 埋点、B-07 异步、F-11 搜索、F-14 预渲染、F-13 PWA、A-08 语义搜索、A-09 简历解析 | 后台主数字来自真实流量；文章可被爬虫读到正文；⌘K 支持语义；DOCX 可解析 |
| 阶段 E：长期维护 | 可演练、可扩展 | B-10 备份恢复、B-11 OpenAPI、A-06 成本、A-07 Prompt 版本、A-11 会话反馈 | 恢复演练成功；API 文档可生成；Prompt 可回滚 |

> 不建议在阶段 A 之前继续加前台页面或新主题。当前缺的不是「更多展示」，而是「已有承诺的兑现」。

---

## 7. 当天可做的速赢清单

| # | 动作 | 位置 | 收益 |
|---|---|---|---|
| 1 | 后台未接线写按钮统一 `disabled` + 原因 | `ContentPage` / `AiConfigPage` / `ResumeAdminPage` / `FilesAdminPage` / `ProfilePage` | 立刻消除「假成功」 |
| 2 | 后台页面描述加「演示，不会保存」 | 同上 `PageTitle.desc` | 文案与能力一致 |
| 3 | `AdminShell` 退出登录接 `logout()` | `AdminShell.tsx:192-194` | 不再是无响应按钮 |
| 4 | AI 助手 Esc/关闭 abort/停止按钮 | `AIAssistant.tsx` | 关闭后不再后台输出 |
| 5 | 助手弹层接 `useFocusTrap` + `aria-modal` | `AIAssistant.tsx:110-118` | 键盘/读屏可用 |
| 6 | 桌面导航补 `focus/click/Esc` | `Layout.tsx:164-232` | 键盘可展开子菜单 |
| 7 | 阅读上下文传当前小节 | `Reader.tsx:141-144` | 助手回答更准 |
| 8 | 百宝箱 `link:'#'` 改为真实 URL 或删除字段 | `data/work.ts:26-63` | 数据层无死链 |
| 9 | 修 `admin/data.ts:230` 3.4w → 派生值 | `admin/data.ts` | 前后台口径一致 |
| 10 | Toast 加 `role="status" aria-live="polite"` | `Toast.tsx:18-28` | 读屏可播报 |
| 11 | 新增 `.env.example`（只写变量名与注释，不放密钥） | 根目录 | 服务端接入有清单 |
| 12 | `check:data` 扫描 `admin/data.ts` 与审核 badge | `scripts/check-data.mjs` | 门禁覆盖后台 |

---

## 8. 本次实测基线

| 项目 | 结果 | 证据 |
|---|---|---|
| `npm run build` | 通过 | 2001 modules，23.15s |
| 入口 JS | 137.20 kB / gzip 51.89 kB | `dist/assets/index-*.js` |
| React 分包 | 163.87 kB / gzip 53.44 kB | `dist/assets/react-*.js` |
| Motion 分包 | 123.08 kB / gzip 41.06 kB | `dist/assets/motion-*.js` |
| Admin 分包 | 151.19 kB / gzip 45.08 kB | `dist/assets/Admin-*.js` |
| CSS | 80.36 kB / gzip 14.71 kB | `dist/assets/index-*.css` |
| `npm run check:data` | 全部通过 | 6 篇文章、派生计数、前台无 `href="#"`、STORAGE_KEYS、`newId` |
| `npm run check:contrast` | 全部通过 | 5 主题 × 5 规则，最低 3.06:1（pop 弱化小字） |
| 服务端目录 | 不存在 | 根目录只有 `src/public/scripts/...` |
| 测试/Lint/CI | 不存在 | 无 `.test/.spec`、无 ESLint/Prettier、无 `.github/workflows` |
| Service Worker | 不存在 | 全仓库无 `serviceWorker/registerSW` |

> 说明：本轮完成了构建与门禁实测；浏览器运行时（控制台、响应式、主题切换）未重新跑，相关结论按静态代码判断，不冒充实测。

---

## 9. 关键证据索引

| 证据 | 位置 |
|---|---|
| 后台内容只改内存 + 声称即时生效 | `admin/pages/ContentPage.tsx:40-42,69-92,118` |
| 后台 AI 配置为种子 + 声称即时生效 | `admin/pages/AiConfigPage.tsx:29-35,51` |
| 简历解析 setTimeout + 回滚本地 | `admin/pages/ResumeAdminPage.tsx:68-74,368,378-379` |
| 上传/分享本地模拟 | `admin/pages/FilesAdminPage.tsx:50-71,78` |
| 个人资料声称已同步 | `admin/pages/ProfilePage.tsx:85-86` |
| 退出登录无 handler / 服务在线写死 | `admin/AdminShell.tsx:192-194,217-220` |
| 无鉴权守卫 | `admin/AdminApp.tsx:28-34,75-88` |
| 内容仓储未被页面引用 | `services/content.ts:68-95`；全 `src` 无 `from '@/services/content'` |
| AI 上下文只传标题 | `pages/Reader.tsx:141-144`；`services/ai.ts:20` |
| AI 助手关闭不取消 | `components/AIAssistant.tsx:56-57,110-118` |
| 桌面导航仅 hover | `components/Layout.tsx:164-166,190-232` |
| 百宝箱死链 | `data/work.ts:26-63`；`pages/Toolbox.tsx:41-49,140-147` |
| 图片清单为空 | `data/media.ts:25` |
| 音频未配置 | `services/audio.ts:16,29-30` |
| 4 个文件待上传 | `data/work.ts:89-96` |
| 后台种子与派生口径漂移 | `admin/data.ts:230`；`AdminShell.tsx:81` |
| Toast 无 live region | `components/ui/Toast.tsx:18-28` |
| PWA 无 SW | `public/site.webmanifest`；全仓库无 `serviceWorker` |

---

## 10. 一句话总评

**这是一个「展示层接近成品、真实能力仍在施工」的作品站。** 主题、信息架构、动效、门禁与降级设计已经超过大多数个人站；下一步最该做的不是再加页面，而是把后台的「已发布」、助手的「已接入模型」、留言的「已上墙」这三句话变成真的——**先诚实，再真实，最后才是更强。**

---

## 11. 二轮实施状态（2026-10-30）

> 状态口径：**已实现** = 本仓库可运行、可验证；**本地替代** = 用零依赖本机方案顶替外部服务，UI 如实标注；**需外部资源** = 依赖账号/密钥/媒体文件/数据库/云服务，当前不做假实现。
> 本轮新增文件：`public/sw.js`、`public/offline.html`、`src/sw-register.ts`、`scripts/prerender.mjs`、`scripts/prerender-entry.ts`、`.env.example`、`server/Dockerfile`、`docker-compose.yml`。

### 11.1 前端（F-01 ~ F-16）

| ID | 状态 | 落地方式 / 原因 |
|---|---|---|
| F-01 | 已实现 | 后台写操作接本机 API：内容 `PUT/status`、AI 模型/Prompt、简历解析 `POST /api/resume/parse` + `GET /api/jobs/:id`、文件签名/分享；未配置 `VITE_API_BASE` 时按钮禁用并给出原因，不再出现假成功 |
| F-02 | 已实现 | `admin/LoginPage.tsx` + `AdminApp` 无会话直接渲染登录页；登录走 HttpOnly Cookie，`AdminShell` 退出调用 `logout()` |
| F-03 | 已实现 | `AIAssistant` 关闭/Esc/卸载 abort、停止与重试、`aria-modal`、`useFocusTrap`、回答区 `aria-live="polite"` |
| F-04 | 已实现 | 桌面导航补 `onFocus`、Esc 关闭、`aria-expanded`，子项可键盘进入 |
| F-05 | 已实现 | 百宝箱删除数据层 `link: '#'`；条目带 `body/license/updated`，详情弹窗展示完整正文，「取用」复制正文而非标题 |
| F-06 | 已实现 | 阅读页传当前小节上下文、上一篇/下一篇、按 tag 相关推荐、复制链接、字号三档、阅读进度按文章持久化 |
| F-07 | 已实现 | 留言走 `/api/guestbook`：提交 pending → 审核上墙；点赞按 id 去重落库；举报/删除自己的留言；后台 badge 取 `pending/count` |
| F-08 | 本地替代 | `SmartImage` 已支持 `srcSet/sizes/loading/decoding/宽高`；**真实照片为 0 张**，旅拍/朋友圈仍用 Plate/CSS 兜底——缺的是真实图片素材与转码服务，不是管线 |
| F-09 | 本地替代 | 播放器按 `resolveAudio()` 判断：无真实音频源时按钮禁用并标「试听暂缺」，不伪装播放；**缺 3–5 秒试听片段与 `manifest.json` 媒体文件** |
| F-10 | 本地替代 | 本机存储驱动已跑通签名直传、分享短链（token/过期/密码）、Range 下载与计数；对象存储/CDN/病毒扫描需外部服务。资源中心 5/9 可下载，4 个明确标注待上传原因 |
| F-11 | 已实现 | ⌘K 搜索归一化（大小写/全半角）、结果高亮、最近搜索；语义检索列在 A-08 |
| F-12 | 已实现 | 首屏只阻塞 Bricolage + Noto 两族；`manualChunks` 增 `icons`；`scripts/check-budget.mjs` 接入 `npm run check`，实测入口 49.98 kB gzip ≤ 50 kB |
| F-13 | 已实现 | `public/sw.js`：壳预缓存、导航 network-first→缓存→offline.html、静态资源 stale-while-revalidate、`/api` network-first 且离线返回 503 OFFLINE；`src/sw-register.ts` 生产环境懒加载注册 + 「新版本可用」提示，新增 `offline.html` |
| F-14 | 已实现 | `scripts/prerender.mjs` 在 `vite build` 后生成 9 个静态页（首页 / 学习列表 / 简历 / 6 篇全文），每页独立 title/description/canonical/JSON-LD；6 篇各有 `/og/<id>.svg`。**SVG 分享卡**；要兼容只认 PNG 的平台需 satori/resvg 或外部出图服务 |
| F-15 | 已实现 | `admin/data.ts` 粉丝数改 `formatWan(totalFollowers)`、状态池改名 `statusPoolDemo`、badge 由 `listPending()` 派生；`check:data` 已覆盖后台数据 |
| F-16 | 已实现 | `Toast` 增加 `role="status"` / `aria-live="polite"`，错误态 `role="alert"` / `assertive` |

### 11.2 后端（B-01 ~ B-12）

| ID | 状态 | 落地方式 / 原因 |
|---|---|---|
| B-01 | 本地替代 | `server/lib/store.mjs` 用 JSON 文件持久化（`server/data/*.json`）+ 种子快照；`GET /api/content/:domain` 与前端类型同构、只返回 published、支持 ETag/分页。**未用 PostgreSQL/Prisma**（需外部数据库） |
| B-02 | 已实现 | `/api/auth/login|logout|session`；HttpOnly Cookie 会话、RBAC `admin/editor`、登录限流与审计。Access/Refresh 双令牌未拆（单会话 Cookie 足够本机） |
| B-03 | 已实现 | `PUT /api/content/:domain/:id` + `If-Match` 乐观锁（冲突 409）；状态机 draft→pending→published→hidden + 操作审计。定时发布/预览 token/修订历史未做（需任务队列与内容版本表） |
| B-04 | 已实现 | 留言 pending/approve/reject/like/report/delete + 敏感词预筛 + 审计；LLM 预筛需模型密钥（当前规则预筛） |
| B-05 | 本地替代 | 本机存储驱动：签名、直传、可见性、删除/恢复、分享短链、Range、下载计数。**未接 S3/OSS**，无病毒扫描与图片转码（需云服务） |
| B-06 | 已实现 | `POST /api/track` + IP 哈希（`IP_SALT`）、`/api/client-errors`、`GET /api/analytics/summary` 按日聚合；未做长期保留期清理任务 |
| B-07 | 本地替代 | `server/routes/system.mjs` 进程内任务队列（`pushJob`，2 次重试 + dead 状态 + `/api/jobs/:id`）。**未用 Redis/BullMQ**，多实例部署需外部队列 |
| B-08 | 已实现（需代理） | CORS 白名单 + Origin 校验、统一入参校验、RBAC、登录限流、HttpOnly/SameSite Cookie、请求 ID、安全响应头。HTTPS/HSTS 由反向代理终止，需证书 |
| B-09 | 已实现（需外部） | 结构化 JSON 日志 + request id、`/healthz`、`/readyz`、`/api/admin/metrics`、客户端错误上报。Sentry/P95 告警需外部平台 |
| B-10 | 已实现 | `POST/GET /api/admin/backup` + `POST /api/admin/backup/:id/restore`（JSON 全量快照），备份列表可查。`pg_dump`/对象存储版本化随数据库选型再补 |
| B-11 | 已实现 | `GET /api/openapi.json`（OpenAPI 3.1）、统一错误体 `{code,message,requestId}`、cursor 分页；版本前缀仍为 `/api`（未加 `/v1`，避免前端全量改动） |
| B-12 | 已实现（需托管） | 新增 `server/Dockerfile` + `docker-compose.yml` + `.env.example`：静态前端 + 独立 API、数据卷 `/data`、`/healthz` 健康检查。托管 PostgreSQL/CDN 需外部账号 |

### 11.3 AI（A-01 ~ A-12）

| ID | 状态 | 落地方式 / 原因 |
|---|---|---|
| A-01 | 已实现（需密钥） | `server/ai/gateway.mjs` OpenAI 兼容网关：密钥只在服务端、模型白名单、超时/重试、请求审计；前端零密钥。**未配 `AI_BASE_URL/AI_API_KEY` 时走站内检索回答**，不假装调模型 |
| A-02 | 已实现 | 服务端 SSE `delta/done/error` 事件 + 首 token 超时；前端 8s 首 token 超时、断流重试 1 次、`AbortController` 贯穿关闭/停止 |
| A-03 | 本地替代 | `server/ai/indexer.mjs + rag.mjs`：按 Section→Sub→段落切块、BM25/关键词混合召回 + RRF + 引用定位。**未用 pgvector**（需 PostgreSQL 扩展）；检索质量已达基线 |
| A-04 | 已实现 | 系统提示强制「无证据拒答 + 逐条引用」；输出含 `references[]`；服务端校验引用覆盖率，不合格降级 |
| A-05 | 已实现 | `scripts/eval-ai.mjs`：40 条站内问答 + 8 条注入样例，输出 `server/eval-report.json`；实测 HitRate@5 0.85 / MRR 0.652 / 引用正确率 1 / 注入拦截 1。CI 接入需外部流水线 |
| A-06 | 已实现 | `ai_usage` 按日/模型/tokens/cost 记账；IP 日额度 + 月度预算；6 小时语义哈希缓存；超额度落检索回答 |
| A-07 | 已实现 | `ai_prompts` 版本化 + 发布/回滚接口 + 审计；后台可编辑。A/B 按会话分流未做（需更多流量） |
| A-08 | 本地替代 | ⌘K 为归一化字面检索 + 高亮 + 最近搜索；**语义/BM25 混合检索依赖 A-03 索引与向量库**，当前离线可用但非语义 |
| A-09 | 本地替代 | `POST /api/resume/parse` 接收文本 → 本地规则抽字段 + 字段置信度 + 异步任务状态。**PDF/DOCX 二进制解析**（pdfjs/mammoth）与 LLM 结构化需外部库/密钥；前端 PDF/DOCX 入口如实标注未接 |
| A-10 | 已实现 | 注入检测与阻断、系统提示与用户内容隔离、工具白名单（只读检索）、PII 脱敏、敏感输出过滤、日志脱敏；页面明示「模型生成，可能不准确」 |
| A-11 | 已实现 | AI 会话落库 `sessions` + `GET /api/ai/sessions/:id` 恢复；`POST /api/ai/feedback` 👍/👎 与失败原因；反馈可供评测集回流 |
| A-12 | 需外部资源 | 未做（可选加分项）：文章 TTS、图片 alt 生成、长文摘要卡都依赖语音/视觉模型与媒体存储，不阻塞主线 |

### 11.4 本轮回归结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过；2005 modules；预渲染 9 页 + 6 张文章 OG |
| `npm run check` | `check:data`（6 篇一致 / 后台派生 / 无死链 / storage key / newId）、`check:contrast`（5×5 全过）、`check:budget`（入口 49.98 kB ≤ 50 kB、CSS 15.02 kB ≤ 20 kB）全部通过 |
| `node scripts/check-api.mjs` | 全部通过（RBAC、乐观锁、留言审核、AI 检索回答、埋点、简历解析、OpenAPI、文章 OG、备份恢复） |
| `node scripts/eval-ai.mjs` | HitRate@5 0.85、MRR 0.652、引用正确率 1、注入拦截 1，全部达标 |

> 仍未做真实现的只有：真实图片/音频素材、S3/OSS、PostgreSQL/pgvector、Redis/BullMQ、真实模型密钥、Sentry/CI、PDF/DOCX 二进制解析、PNG 版 OG。原因均为「需要外部资源或账号」，不是代码缺口；对应 UI 已按「演示 / 本机 / 待接入」如实标注。

