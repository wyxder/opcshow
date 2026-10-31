# WYX.SPACE 三轮全面审计与功能完善建议（fx2）

> 对象：`e:\Code\AI\Start\Web\Blog\resume1` · 晓叶个人站
> 审计日期：2026-10-31
> 与 `fx.md` / `fx1.md` 的关系：`fx.md` 补「真实感 + 契约」，`fx1.md` 补「接线与兑现」。**fx2 只做一件事：验收 fx1 的「已实现」是否真的闭环，并找出新引入的回归、契约错位与安全债。** 已在 fx1 落地且确实可用的能力不重复表扬。
>
> 证据口径：全量静态走查 `src` 全部 ts/tsx、`server`（20 个 mjs）、`scripts`（12 个 mjs + 3 个 ts 入口）、`public`；实际执行 `npm run build`、`npm run check`、`node scripts/check-api.mjs`、`node scripts/eval-ai.mjs`。未做浏览器运行时实测的项标注「静态判断」。

---

## 0. 一页结论

### 0.1 五个判断

1. **当前主要矛盾从「没有能力」变成了「有接口、没接线」。** 后端 `/api/analytics/summary`、`/api/files/*`、`/api/admin/backup`、`/api/ai/prompts` 都已可跑，但前端对应页面要么没调用（备份、内容列表），要么调用了但字段对不上（数据看板），要么只写不读（文件、内容）。
2. **有三个确定性缺陷，影响的不只是体验，而是「数据是否可信」：** AI 缓存只读不写、数据看板 5 分钟缓存串窗、平均停留与 AI 会话两个口径恒为 0。
3. **安全债集中在 5 处：** 代码内置默认口令、`X-Forwarded-For` 无条件信任、会话 sid 明文落盘、AI 用量记录明文 IP、AI 会话接口无鉴权。
4. **「单一真源」仍未成立。** `src/data`（前台）、`server/seed`（种子）、`server/data/*.json`（运行时）、预渲染/SEO/评测（构建期各读一份）四条线并存，改一次内容要同步四个地方。
5. **门禁已经出现红灯与盲区：** `check:budget` 入口 50.00 kB > 50 kB 失败；`check:api` 只断言状态码不校验字段形状，因此数据看板契约错位能一路通过；无 lint / 单测 / CI / `.dockerignore`。

### 0.2 fx1「已实现」核验（只列需要修正的）

| fx1 条目 | fx1 结论 | fx2 实测证据 | 判定 |
|---|---|---|---|
| F-01 后台写操作接真实 API | 已实现 | 内容 `upsert` 可写；但个人中心 8 处、设置页备份/SEO、动态发布、弹幕 Tab 仍是假成功 | 部分兑现 |
| F-02 登录与守卫 | 已实现 | `AdminApp` 无会话渲染 `LoginPage`；退出调 `logout()` | 已兑现 |
| F-03 助手生命周期 | 已实现 | abort / Esc / 停止 / 重试 / focus trap / `aria-live` 均在 | 已兑现（头部仍误标 LIVE MODEL） |
| F-04 桌面导航键盘 | 已实现 | `onFocus` / `Escape` / `aria-expanded` 均在 | 已兑现 |
| F-06 阅读上下文 + 闭环 | 已实现 | 前端只发「字符串 + articleId」，服务端只解析 `context` 字符串并丢弃 `articleId` | 断线（上下文加权不生效） |
| F-07 留言/审核 | 已实现 | `/api/guestbook` 真链路可用；但「弹幕」Tab 仍是本地数组假成功 | 部分兑现 |
| F-10 文件上传/分享 | 本地替代 | 服务端链路可跑；列表接口只返回 public、前台资源中心不读服务端 | 未闭环 |
| F-12 包体预算 | 已实现（49.98 kB） | 本轮实测入口 **50.00 kB > 50 kB**，门禁红 | 回归 |
| F-13 PWA | 已实现 | SW + 更新横幅可用；manifest 仅一个 SVG 图标，无可安装 PNG | 部分兑现 |
| F-14 预渲染 | 已实现 | 9 页 + 6 张 OG 生成；但内容取自 `src/data`，与运行时 JSON 是两套 | 部分兑现 |
| B-03 状态机 + 乐观锁 | 已实现 | 服务端有 `/status` 与 `If-Match`；前端用 `PUT` 直改 status 且不传 version | 未接线 |
| B-06 埋点与聚合 | 已实现 | 前后端返回结构不一致；停留时长前端从不发送 | 回归 |
| A-03 RAG | 本地替代 | BM25 可跑；内容写入不触发 `invalidate()`；上下文权重从未生效 | 部分兑现 |
| A-05 评测 | 已实现 | 指标达标；语料读 `server/seed`，不反映线上内容；未进 CI | 部分兑现 |
| A-06 成本/配额/缓存 | 已实现 | 缓存 key 只读不写；月度预算只展示不执行；用量记录明文 IP | 部分兑现 |
| A-11 会话/反馈 | 已实现 | 服务端存会话；前端从不回传 `sessionId`、不恢复；反馈不进评测集 | 未闭环 |

### 0.3 评分卡（2026-10-31）

| 维度 | 评分 | 关键依据 | 风险 |
|---|---|---|---|
| 信息架构与叙事 | 5 / 5 | 5 类导航 20 子项、15 前台页、8 区块 23 Tab | 低 |
| 设计系统与主题 | 4.5 / 5 | 51 令牌 × 5 主题、对比度 5×5 全过、打印回落 | 低 |
| 前端工程质量 | 4 / 5 | `strict` + 路由 lazy + 三层 ErrorBoundary + storage 版本化 | 低 |
| 可访问性 | 4 / 5 | focus trap、skip link、Toast live region、reduced-motion；缺 `aria-busy`/停止态语义 | 低 |
| 前后端接线完整度 | 2 / 5 | 看板字段错位、文件列表只公、内容只写不读、设置/资料假成功 | **高** |
| 后端工程与安全 | 3 / 5 | RBAC/审计/限流/校验齐；默认口令、XFF 信任、sid 明文、无清理 | **高** |
| AI 真实能力 | 3.5 / 5 | 网关/SSE/BM25/引用校验/评测真跑；缓存死、模型配置不生效、上下文断线 | 中高 |
| 数据一致性 | 2.5 / 5 | 四条真源并存；`check:data` 不校验 seed/runtime | **高** |
| 性能与分发 | 3.5 / 5 | 路由拆分 + 预渲染 + SW；入口预算红、Home 静态引入、字体仍阻塞 2 族 | 中 |
| 工程化与测试 | 2 / 5 | 5 个门禁脚本；无 lint / 单测 / 契约测试 / CI / `.dockerignore` | 中高 |

---

## 1. 本轮实测基线

| 项目 | 结果 | 证据 |
|---|---|---|
| `npm run build` | 通过；2005 modules；预渲染 9 页 + 6 张 OG | 构建日志 |
| 入口 JS | 124.84 kB / **gzip 50.00 kB** | `dist/assets/index-d9xV5tVU.js` |
| 分包 | react 163.87/53.44 · motion 123.08/41.06 · icons 51.24/10.19 · Admin 154.59/48.48 | `dist/assets/*` |
| CSS | 82.45 kB / gzip 15.02 kB | `dist/assets/index-oPeeDakC.css` |
| `check:data` | 全通过（6 篇一致、后台派生、无死链、storage key、newId） | `npm run check:data` |
| `check:contrast` | 5 主题 × 5 规则全过；正文 15.50–18.11:1，弱化小字 3.06–5.65:1 | `npm run check:contrast` |
| `check:budget` | **失败**：入口 gzip 50.00 kB > 50 kB；CSS 与单页 chunk 通过 | `npm run check:budget` |
| `check:api` | 26 项全通过（RBAC、状态机、乐观锁、留言审核、AI 检索回答、注入、埋点、任务、OpenAPI、OG、备份、登出） | `node scripts/check-api.mjs` |
| `eval:ai` | HitRate@5 0.85 · MRR 0.652 · 引用正确率 1.00 · 注入拦截 100% | `node scripts/eval-ai.mjs` |
| 工程设施 | 无 ESLint/Prettier/Vitest/Playwright、无 `.github/workflows`、无 `.dockerignore` | 全仓检索 |

> 结论：**构建、主题、AI 评测三条线是健康的；坏在「接口→页面」这一段，以及包体预算与安全默认值。**

### 1.1 能力现状速览

**项目形态**：`src/` React 18 + TS 5.6 + Vite 5 SPA（15 前台页 + 后台 9 页）；`server/` 零 npm 依赖 Node API（20 个模块、JSON 持久化、OpenAPI 3.1）；构建期出 SEO / 预渲染 / SW / Docker。

| 层级 | 代表能力 |
|---|---|
| 真实可用 | 主题与对比度、路由懒加载、错误边界、打印简历、⌘K 搜索、6 篇长文阅读、留言提交/审核/点赞、内容与文件服务端 API、AI 网关 + SSE + BM25 + 引用校验、评测脚本、SW 离线壳、预渲染 9 页、Docker 镜像 |
| 半真实（本机替代 / 需配置） | 对象存储（本地磁盘驱动）、AI（无密钥时只做检索摘录）、埋点（需前端补 stayMs）、后台 AI 配置（模型不生效）、PWA（缺 PNG 图标）、邮件/通知（无） |
| 仍是演示 | 个人中心全部写操作、设置页备份/SEO、动态发布、弹幕审核、看板主数字与按钮、图片（`mediaCatalog` 空）、音频、朋友圈远端同步 |

---

## 2. 跨层：先修「接线与契约」（优先级高于任何新功能）

| ID | 问题 | 现状证据 | 建议 | 验收标准 | 优先级 |
|---|---|---|---|---|---|
| X-01 | 数据看板前后端字段错位 | 服务端返回 `{ totalPv, totalUv, avgStaySec, topPages:[{path,pv}] }`（`server/routes/analytics.mjs:82-92`）；前端按 `{ pv, uv, topPages:[{path,views}] }` 消费（`src/services/analytics.ts:90-96`、`src/admin/pages/AnalyticsPage.tsx:87-105`） | 统一一份 `AnalyticsSummary`：服务端直接输出前端类型，或前端加 `mapServerSummary()`；`getSummary(window)` 带上窗口参数 | 服务端模式下 PV/UV/热门页数字正常、非 `undefined`，切换 7d/30d 数字变化 | P0 |
| X-02 | 内容管理「只写不读」且绕过状态机 | 初始列表用 mock（`ContentPage.tsx:44-46`）；全仓无 `contents.listAdmin/list` 调用；保存只调 `upsert` 且不带 version（`:96`）；动态发布纯本地（`:113-130`） | 页面挂载读 `contents.listAdmin('articles')`；状态改用 `setStatus()`；编辑带 `If-Match`；动态接 `POST /api/content` | 刷新后列表来自服务端；非法状态迁移返回 422 并在 UI 提示；并发编辑出现 409 | P0 |
| X-03 | 文件链路两端都断 | 上传默认 private（`server/routes/files.mjs:92`）；列表只回 public（`:105-111`）；前端后台用 `GET /api/files`（`src/services/files.ts:115-118`）；前台只读 `src/data`（`src/pages/Files.tsx:6,86`） | 服务端加 `?scope=admin`（含 private/trashed）；前台资源中心合并「静态清单 + 服务端公开文件」 | 后台上传后刷新仍可见；前台能看到公开文件并下载；回收站有独立筛选 | P1 |
| X-04 | 仍有 6 类「假成功」 | 个人中心保存/改密/两步验证（`ProfilePage.tsx:77,146,258-259,277,301,361,393`）；设置页「备份完成 129 MB」「SEO 已保存」（`SettingsPage.tsx:77,322`）；动态发布（`ContentPage.tsx:129`）；弹幕审核（`ModerationPage.tsx:130,145,161`）；看板「重跑聚合/导出 CSV」（`AnalyticsPage.tsx:64-69`）；朋友圈提交（`Moments.tsx:56`） | 二选一：接真实接口，或统一 `disabled + 「未接入」` 并删掉成功 Toast；按 fx1 的 `L1/L2` 标注组件化 | 真实模式下不存在无后端支撑的「已保存/已发布/已完成」 | P0 |
| X-05 | 单一真源分裂成四条线 | 前台读 `src/data`；种子由 `gen:content` 生成（`scripts/gen-content-snapshot.mjs:73-78`）；运行时只在新库时读种子（`server/lib/store.mjs:26-40`）；预渲染/SEO/评测分别读 `src/data`/`seed`（`scripts/gen-seo.mjs:34`、`scripts/prerender.mjs:41`、`scripts/eval-ai.mjs:17`） | 明确「运行时为唯一真源」，构建期脚本改为读 `server/data/content.json`（或 API）；新增 `npm run sync:content` 把运行时导出回种子 | 后台改一篇文章 → 预渲染页、sitemap、评测语料三处一致 | P1 |
| X-06 | 内容写入不触发索引 | `indexer.invalidate()` 仅被 `POST /api/ai/reindex` 调用（`server/routes/ai.mjs:381-387`）；content 路由无调用；`indexer.mjs:3` 注释声称会调用 | content 的 `PUT/POST/status/DELETE` 成功后 `invalidate()`；或改为「内容版本号 + 懒重建」 | 改完文章不手动 reindex，下一问即可引用新内容 | P0 |
| X-07 | 标注与文档漂移 | 助手头部 `LIVE MODEL` 只看 `VITE_API_BASE`（`AIAssistant.tsx:185`），未看服务端是否有模型；看板永远挂「预置样本」徽标（`AnalyticsPage.tsx:55`）；README 写「6 小时缓存 / 月度预算」但代码不成立 | 能力探测：`GET /api/ai/health` 返回 `mode`，前端据此显示「模型 / 检索 / 预置」；徽标按 `source` 切换；README 同步修正 | UI 文案与 `/api/ai/health` 一致；README 与代码逐条可对 | P0 |
| X-08 | 门禁覆盖不到「契约」 | `check:api` 只断言 `Array.isArray(days)`（`scripts/check-api.mjs:146-148`）；`npm run check` 不含 `check:api`/`eval:ai`（`package.json:19`）；`noUnusedLocals:false`（`tsconfig.json:16`）导致 `safeHtml/httpUrl` 死代码无感知 | 新增共享 schema（zod 或手写 assert）+ 契约用例；`check` 聚合 build/api/eval；打开 `noUnusedLocals` | 字段改名或类型漂移时 CI 直接失败 | P0 |

---

## 3. 前端完善建议

| ID | 模块 / 问题 | 现状证据 | 建议 | 验收标准 | 优先级 |
|---|---|---|---|---|---|
| FE-01 | 入口包回归，预算已红 | 入口 gzip 50.00 kB（`check:budget` 失败）；`Home` 仍静态引入（`src/App.tsx:5`） | 把 Home 内的轮播 / 荣誉弹窗 / 技能联动拆成 `lazy`；`primitives.tsx` 按需导出；导航 hover 预取 | 入口 ≤ 45 kB，`npm run check` 全绿 | P0 |
| FE-02 | 内容管理接服务端 | 同 X-02 | 加 `useContent('articles', { admin: true })`：`listAdmin` + loading/骨架 + 失败回落；保存后局部刷新 | 列表、状态、并发冲突三处与服务端一致 | P0 |
| FE-03 | 动态 / 朋友圈假成功 | `ContentPage.tsx:113-130`、`Moments.tsx:18,56` | 动态落 `POST /api/content`（domain=moments，status=pending）；未接线时改「仅本机预览」并去掉「已发布」 | 服务端模式刷新后仍在；演示模式不出现「已发布」 | P0 |
| FE-04 | 个人中心 8 处假操作 | `ProfilePage.tsx:77,146,258-259,277,301,361,393` | 资料/密码/令牌/两步验证要么接 `/api/admin/profile` 与 `/api/admin/security`，要么整块标「未接入」并禁用 | 无接口支撑的按钮不可点，或真实落库 | P0 |
| FE-05 | 设置页备份 / SEO | `SettingsPage.tsx:77,322,325`；服务端已有 `/api/admin/backup`（`server/routes/system.mjs:117-148`） | 备份列表/创建/恢复直接接接口；SEO 明确「仅本机偏好」或接 settings 表 | 备份条目来自 `GET /api/admin/backup`；恢复后数据变化 | P1 |
| FE-06 | 数据看板 | 同 X-01；徽标与「重跑/导出」仍假（`AnalyticsPage.tsx:55,64-69`） | 加 `mapServerSummary` + `window` 参数；徽标随 `source` 变化；导出改真 CSV（前端即可） | 7d/30d 切换数字变化；导出文件可打开 | P0 |
| FE-07 | 资源中心不读服务端 | `Files.tsx:6,86` 只用 `resourceFiles` | `services/files.listFiles()` 合并展示，带「本机 / 服务端」角标；下载走 `resolveDownload` | 后台上传的公开文件出现在前台并可下载 | P1 |
| FE-08 | 助手能力标注过强 | `AIAssistant.tsx:36,185` | 用 `/api/ai/health` 的 `mode` 渲染三态；`retrieval` 时头部显示「检索摘录」 | 三种模式头部文案与真实回答来源一致 | P0 |
| FE-09 | 阅读上下文只发了一半 | `Reader.tsx:149-154` 已采集 `sectionId/sectionTitle`；`services/ai.ts:154` 只发 `context` 字符串与 `articleId`；服务端 `parseContext` 只认 `context`（`server/routes/ai.mjs:45-57`） | 前端发 `context: { articleId, articleTitle, sectionId, sectionTitle }`；服务端保留字符串兼容 | 问「这一节」时首条引用落在当前小节 | P0 |
| FE-10 | 会话恢复未接 | 服务端返回 `sessionId` 并落库（`server/routes/ai.mjs:217-229`）；前端不保存、不回传 | `sessionStorage` 存 `sessionId`，面板打开时拉 `/api/ai/sessions/:id` 恢复；提供「新会话」 | 刷新后对话还在；可主动清空 | P2 |
| FE-11 | 搜索只覆盖标题 | `Layout.tsx:43,513` 用 `matchScore/highlightParts`；索引仅标题/描述 | 结果里带「命中片段」与所属小节；空结果给「去问 AI」；支持 `:` 前缀切分组（页面/文章/项目） | 搜正文关键词能命中并展示上下文片段 | P2 |
| FE-12 | PWA 可安装性 | `public/site.webmanifest:12-19` 仅 SVG 图标；`sw-register.ts:16` 无 `updateViaCache: 'none'` | 补 192/512 PNG（maskable 分两份）；注册加 `updateViaCache:'none'`；`sw.js` 的 `VERSION` 与构建号绑定 | Lighthouse PWA 可安装；发版后一次刷新即生效 | P2 |
| FE-13 | 首屏字体与 LCP | `index.html:47-58` 仍阻塞 Bricolage + Noto 两族；无字体子集化 | 子集化 + `preload` 关键 woff2；装饰字体保持异步；LCP 图 `eager` | 首屏字体请求 ≤ 2，LCP 不退化 | P1 |
| FE-14 | a11y 细节 | 助手流式无 `aria-busy`；停止后消息既无「已停止」标记也无来源（`AIAssistant.tsx:73-77,209`）；`useEffect` 无依赖重绑 keydown（`:84-90`） | 流式期间 `aria-busy="true"`；停止后标「已停止 · 可重试」；keydown 依赖 `[open]` | 读屏能感知生成中/已停止；无重复监听 | P2 |
| FE-15 | SEO 小债 | `public/robots.txt:11` 的 `Disallow: /read?` 指向不存在的路由；静态层无 CSP | 删死规则；在 Nginx/托管层加 CSP（`script-src` 需含内联主题脚本 hash） | robots 无失效规则；CSP 报告无违规 | P2 |

---

## 4. 后端完善建议

| ID | 模块 / 问题 | 现状证据 | 建议 | 验收标准 | 优先级 |
|---|---|---|---|---|---|
| BE-01 | 代码内置默认口令 | `server/lib/env.mjs:46-48` 兜底 `wyx-admin-2026 / wyx-editor-2026`；`ensureUsers` 首次即写入（`auth.mjs:31-40`） | 无 `ADMIN_PASS` 时启动失败或生成随机密码打印一次；`.env.example` 保持 `change-me`；首次登录强制改密 | 未显式配置口令时服务拒绝启动，且日志不打印明文 | P0 |
| BE-02 | 无条件信任 `X-Forwarded-For` | `server/lib/http.mjs:116-120` | 加 `TRUST_PROXY=1`（默认关）：只有代理开启时才读 XFF，否则用 socket 地址；多级取最后一跳 | 直连伪造 XFF 无法绕过登录限流与 AI 配额 | P0 |
| BE-03 | 会话安全与清理 | sid 明文存 `sessions.json`（`auth.mjs:79-84`）；仅登录时清理过期（`:81-84`）；Cookie `SameSite=Lax` 无 `__Host-`（`:58-64`） | 存 `sha256(sid)`；定时/惰性清理；Cookie 名改 `__Host-wyx_session`（HTTPS）或加 `Secure/Partitioned`；登录轮换 sid | 数据文件泄露无法直接复用会话；过期会话不再累积 | P0 |
| BE-04 | 内容接口可绕过状态机 | `POST /api/content` 不校验 status（`server/routes/content.mjs:162-166`）；`PUT` 直接把 payload.status 合并（`:97-105`） | PUT 忽略 status 字段（只允许 `/status` 改）；POST 校验枚举；payload 走白名单或 JSON Schema | 用 PUT 传非法/越级状态返回 422；审计里只有状态机迁移 | P0 |
| BE-05 | 文件链路 4 个洞 | 签名 10 分钟有效期但上传不校验（`files.mjs:52-64` vs `:67-75`）；回收站文件仍出现在列表（`:108-111` vs `:250-256`）；上传不绑定签名持有者；错误密码只靠 30/分限流 | 上传统一校验 `expiresAt` 与 `key` 归属；列表按 `status + visibility + scope` 组合过滤；分享密码失败单独计数（5 次/10 分钟） | 过期签名被拒；回收站不出现在公开/后台默认列表；密码爆破被单独限流 | P1 |
| BE-06 | 备份把敏感数据一起打包 | `backupSnapshot()` 导出全部 store（`server/lib/store.mjs:104-110`），含 `sessions`（明文 sid）与 `users`（哈希）；恢复后不失效索引/聚合缓存（`system.mjs:140-148`） | 备份前剔除 `sessions`；备份文件加密或加 `0600`；恢复后 `invalidate()` + 清 analytics 缓存；`id` 用白名单正则 | 备份文件无会话令牌；恢复后问答立即可用 | P1 |
| BE-07 | 内存表只增不减 | 限流 `buckets`（`http.mjs:102-114`）、幂等 `idem`（`:158-171`）无清理；AI 用量上限 5000 会让配额被「挤出」而重置 | 定时清扫过期项；配额改为独立计数键（`quota:{day}:{ipHash}`），不依赖 usage 截断 | 长时间运行内存稳定；高流量下配额仍准确 | P1 |
| BE-08 | 「异步任务」其实是同步 | `pushJob` 在请求内 `await work()`（`server/routes/system.mjs:30-63,101-113`） | 立即返回 jobId，`setImmediate` 执行；任务状态落库；加并发上限与超时 | 提交即 202，接口耗时 < 50ms；任务超时进 dead | P1 |
| BE-09 | 聚合口径与缓存 | 5 分钟缓存不区分窗口（`analytics.mjs:51-55`），先查 7d 再查 30d 会拿到 7d；AI 会话按 `path.startsWith('/api/ai')` 统计（`:70`），而前端上报的是页面 pathname，恒为 0；`stayMs` 前端从不发送（`services/analytics.ts:67`），平均停留恒为 0 | 缓存键加 `window`；AI 轮次改为服务端在 `ai.chat` 内计数或前端显式 `kind:'ai'`；前端在路由离开/`visibilitychange` 时补发 `stayMs` | 7d/30d 各自正确；AI 会话数 > 0；平均停留 > 0 | P1 |
| BE-10 | 安全与日志缺口 | 注入拦截不写日志（`routes/ai.mjs:80-84`）；`logEvent` 无级别过滤，`LOG_LEVEL` 未生效（`http.mjs:133-137`）；AI 用量存明文 IP（`routes/ai.mjs:135,144,155`） | 注入/配额/密码失败统一结构化审计；实现 `LOG_LEVEL`；AI 用量只存 `ipHash` | 安全事件可检索；日志可分级；备份中无明文 IP | P1 |
| BE-11 | 契约与可观测细节 | OpenAPI 里 OG 路径写 `{id}.svg` 而实际是 `:file`（`system.mjs:265,203`）；CORS 未 `Expose-Headers`（前端读不到 `ETag/X-Content-Version`）；`sendSse` 缓存分支缺 `X-Accel-Buffering`（`routes/ai.mjs:211-215`） | 同步 OpenAPI；补 expose headers；SSE 统一走一个 `sseHeaders()` | Swagger 与实际路由一致；前端能读到版本头；Nginx 后不缓冲 | P2 |
| BE-12 | 存储层与并发 | JSON + 单进程（`store.mjs`），无跨进程锁；`update` 直接改缓存对象、读者可看到中间态；`rm` 后再 `rename` 存在崩溃窗口 | 迁移 SQLite（`better-sqlite3`）或 Postgres；短期改为「深拷贝改完再替换缓存」+ 直接 `rename` 覆盖；给 `content` 加 `updatedAt` 索引 | 两实例并发写不丢数据；查询 < 10ms；崩溃不丢已提交写 | P2 |
| BE-13 | 容器与运维 | 无 `.dockerignore`（构建上下文含 `node_modules/dist`）；compose 无 healthcheck；无日志轮转；`GET /readyz` 只读一次 store | 加 `.dockerignore`；compose 复用镜像 healthcheck；日志 JSON 行 + 轮转；`readyz` 检查目录可写 | 镜像构建 < 60s、体积 < 200MB；异常可自动重启 | P2 |
| BE-14 | 缺失的业务接口 | 无 `/api/profile`、站点设置、友链申请；`content` 域不含 `profile/siteMeta`（`content.mjs:18`） | 新增 `profile`、`settings`、`friend-requests` 三个域或独立路由；后台资料页接上 | 个人中心保存后刷新仍在；友链可提交待审 | P2 |

---

## 5. AI 服务完善建议

| ID | 模块 / 问题 | 现状证据 | 建议 | 验收标准 | 优先级 |
|---|---|---|---|---|---|
| AI-01 | 缓存只读不写（确定性 bug） | `routes/ai.mjs:86-91` 读 `aiData.cache[key]`；全仓无写入点；`store.mjs:97` 初始化 `cache: {}` | 模型回答成功后写 `data.cache[key] = { answer, source, references, at }`；加容量上限（如 500 条）与 LRU 淘汰 | 同一问题第二次请求 `cached:true` 且不消耗配额 | P0 |
| AI-02 | 阅读上下文加权失效 | 前端只发字符串 + 顶层 `articleId`（`services/ai.ts:154`）；服务端只解析 `context`（`routes/ai.mjs:45-57`），`articleId/sectionId` 丢弃 | 前端改发对象（见 FE-09）；服务端兼容 `body.articleId/body.sectionId` | 当前文章/小节的块排首位；评测加「本节问答」用例 | P0 |
| AI-03 | 索引不随内容更新 | 同 X-06 | content 路由写成功后 `invalidate()`；或在 `chat` 里比较内容版本号懒重建 | 后台改完文章，立即能引用新段落 | P0 |
| AI-04 | 后台模型配置不生效 | `streamModel(messages, {...})` 从不传 model（`routes/ai.mjs:119,180`）；`POST /api/ai/models` 只写记录（`:269-283`） | 取 `isDefault && enabled` 的模型传入网关；未启用则用 env；模型白名单校验 | 后台切换默认模型后，`/api/ai/health` 与用量里的 model 同步变化 | P1 |
| AI-05 | 配额/预算可绕过或不执行 | 配额按明文 IP（`usage.mjs:19-25`）+ XFF 可伪造（BE-02）；月度预算仅返回（`:77-78`），无任何拦截 | 用 `ipHash`；超月预算时直接走检索回答（不调模型）并在响应里带 `budgetExceeded`；后台展示剩余额度 | 伪造 XFF 无法刷新额度；超月预算不再产生模型调用 | P0 |
| AI-06 | 成本低估且不透明 | `priceOf(estimateTokens(answer))` 只算输出（`routes/ai.mjs:159`）；输入 token 用启发式估算（`rag.mjs:11-15`） | 分别计 `prompt/completion`；优先用上游 `usage` 字段；后台标注「估算值 ±20%」 | 用量页能区分输入/输出成本；与实际账单偏差 < 20% | P1 |
| AI-07 | 会话与反馈不闭环 | 服务端存 `sessions/feedback`，前端不恢复（FE-10）；反馈未进入评测集（`eval-ai.mjs` 只读固定金标） | 后台加「反馈审阅」视图；`👎` 样本一键转评测用例；`sessionId` 前端持久化 | 反馈可查看/标记；新增用例进入下一轮评测 | P2 |
| AI-08 | 提示词事实写死 | `SITE_FACTS` 手写「6 篇长文、7 个项目、收益 1.2w」（`prompts.mjs:52-58`） | 运行时从 `content.meta/stats` 生成事实块；或只注入 ID 与可检索路径 | 内容数量变化后提示词自动同步，无需改代码 | P1 |
| AI-09 | 安全策略偏薄 | 注入仅 13 条正则（`safety.mjs:11-25`）；命中直接拒答且不记录（`routes/ai.mjs:80-84`）；输出过滤仅 4 个词（`:44`） | 增加「角色越权/工具调用/提示词套取」样例集；拦截写审计并计数；输出加长度与话题边界 | 新注入样例拦截率 ≥ 95%；后台可见拦截趋势 | P1 |
| AI-10 | 评测与 CI 脱节 | 语料读 seed（`eval-ai.mjs:17`）；报告写 `server/eval-report.json` 且被 git 忽略；无分类指标；未进 CI | 评测改读运行时快照；输出按「检索/引用/安全」分项阈值；CI 跑 `eval:ai` + `check:api` | PR 上能看到四项指标与阈值判定 | P1 |
| AI-11 | 网关重试与 SSE 一致性 | 失败重试 1 次（`gateway.mjs:14-29`）；路由用 `sent` 长度切片（`routes/ai.mjs:119-127`），重试后若新全文比已发短会**静默截断** | 每次 attempt 前通知前端「重置」事件，或只在未产生 token 时重试；记录 `attempt` 字段 | 断流重试后回答完整、无重复/截断 | P2 |
| AI-12 | 检索升级路线 | 仅 BM25 + 阅读加权（`rag.mjs:103-143`）；切块上限 420 token（`:80`）；无 rerank | 混合召回（BM25 + 向量 + RRF）、按小节切块、引用去重；保持 `retrieve/verifyReferences` 签名 | HitRate@5 ≥ 0.9、MRR ≥ 0.75，答案引用 ≤ 3 条且不重复 | P2 |

---

## 6. 优先级与路线图

### 6.1 P0 速赢（预计 1–2 天，先让「数字与承诺」可信）

| # | 动作 | 位置 | 收益 |
|---|---|---|---|
| 1 | AI 缓存补写入 + 容量上限 | `server/routes/ai.mjs:86-91` | 立刻降本；缓存承诺兑现 |
| 2 | 看板映射（`totalPv→pv`、`pv→views`、带 window） | `services/analytics.ts` / `AnalyticsPage.tsx` | 后台数字不再 `undefined` |
| 3 | 内容写入触发 `invalidate()` | `server/routes/content.mjs` | 改完文章问答即刻生效 |
| 4 | 助手头部按 `/api/ai/health` 三态显示 | `AIAssistant.tsx:185` | 不再误标 LIVE MODEL |
| 5 | 去掉 6 处假成功（或禁用 + 原因） | Profile / Settings / Moments / Content 动态 / 弹幕 Tab / 看板按钮 | 消除「假已保存」 |
| 6 | 内容 PUT 忽略 status、POST 校验枚举 | `server/routes/content.mjs:97-105,162-166` | 状态机不可绕过 |
| 7 | 默认口令改为「未配置即拒绝启动」 | `server/lib/env.mjs:46-48` | 消除已知口令登录 |
| 8 | `TRUST_PROXY` 开关 | `server/lib/http.mjs:116-120` | 限流/配额不可伪造 |
| 9 | 前端发结构化 `context` | `services/ai.ts:154` | 小节加权真正生效 |
| 10 | 入口包拆到 ≤ 45 kB | `App.tsx` / `Home.tsx` / `primitives.tsx` | 预算重新变绿 |

### 6.2 阶段计划

| 阶段 | 目标 | 主要任务 | 退出标准 | 预计 |
|---|---|---|---|---|
| A：可信数据 | 「看板、状态、缓存」三件事为真 | P0 速赢 1–9；X-01/02/04/06/07；FE-02/03/04/06/08/09；AI-01/02/03/05 | 服务端模式下无 `undefined`、无假成功；问答能引用新内容；二次提问命中缓存 | 1–2 天 |
| B：链路闭环 | 文件、备份、设置、资料全通 | X-03/05；FE-05/07；BE-05/06；AI-04 | 上传→可见→分享→下载全通；备份列表真实；改内容四处一致 | 1 周 |
| C：安全与门禁 | 把「能跑」变成「敢上线」 | BE-01/02/03/04/07/09/10；X-08；G-01~G-10 | 默认安全项全绿；CI 跑 build+check+api+eval；契约测试可拦字段漂移 | 1–2 周 |
| D：体验与质量 | 性能、可安装、可观测 | FE-01/10/11/12/13/14/15；BE-11/12/13/14；AI-06/07/08/09/10/11 | 入口 ≤ 45 kB；PWA 可安装；评测分项达标并进 CI | 2–4 周 |
| E：能力升级 | 检索质量与多实例 | AI-12；BE-12（SQLite/Postgres）；对象存储驱动 | HitRate@5 ≥ 0.9；两实例并发写一致 | 后续 |

> **不建议现在做**：新增页面、新增主题、把展示型 mock 换成更多展示型 mock。当前缺的是「已有承诺的兑现」。

---

## 7. 建议补齐的回归门禁（G 系列）

| ID | 门禁 | 做法 | 拦截的问题 |
|---|---|---|---|
| G-01 | 前后端契约测试 | `scripts/check-contract.mjs`：对 `/api/analytics/summary`、`/api/content/:domain`、`/api/ai/chat` 断言必填字段与类型；前端类型抽到 `src/types` 共享 | X-01 这类字段错位 |
| G-02 | 文件链路 E2E | `check:api` 补：sign → upload → visibility → share → download（含 Range/密码/过期） | BE-05、X-03 |
| G-03 | AI 缓存与配额 | 同一问题连发两次断言 `cached:true`；伪造 XFF 断言额度不刷新；超限 429 | AI-01、AI-05 |
| G-04 | 索引新鲜度 | 改文章 → 提问 → 断言引用新小节；断言 `invalidate` 被调用 | X-06、AI-03 |
| G-05 | 状态机不可绕过 | `PUT` 带 `status` 断言 422；`POST` 非法 status 断言 422 | BE-04 |
| G-06 | 假成功扫描 | 静态扫描 `src/admin`：`show('已保存' / '已发布' / '已完成')` 附近若没有 `await apiJson/contents.` 则失败 | X-04 |
| G-07 | 真源一致性 | `check:data` 增加：`src/data` ↔ `server/seed/content.json` ↔ 运行时 `content.json` 的 id/标题/数量比对 | X-05 |
| G-08 | 预算与真 CI | `npm run check` 聚合 `build + data + contrast + budget + api + eval`；GitHub Actions 跑同一命令 | FE-01、X-08 |
| G-09 | Lint 与死代码 | ESLint + `noUnusedLocals: true`；先清 `safeHtml/httpUrl` 等未引用导出 | 代码卫生 |
| G-10 | 容器与安全基线 | CI 构建镜像（带 `.dockerignore`）；`npm audit`；启动时检查默认口令 | BE-01、BE-13 |

---

## 8. 关键证据索引

| 证据 | 位置 |
|---|---|
| 看板字段错位 | `server/routes/analytics.mjs:82-92`；`src/services/analytics.ts:90-96`；`src/admin/pages/AnalyticsPage.tsx:87-105` |
| 聚合缓存串窗 / AI 计数恒 0 | `server/routes/analytics.mjs:51-55,70` |
| 停留时长从不发送 | `src/services/analytics.ts:67`；`server/routes/analytics.mjs:22` |
| 内容只写不读、绕过状态机 | `src/admin/pages/ContentPage.tsx:44-46,75-96`；服务端 `content.mjs:97-105,162-166` |
| 前台仍读静态数据 | `src/pages/{Files,Moments,About,Media,Timeline,Friends}.tsx` 的 `@/data` 引用 |
| 文件列表只回公开 | `server/routes/files.mjs:105-111`；`src/services/files.ts:115-118` |
| 文件签名不校验有效期 | `server/routes/files.mjs:52-64,67-75` |
| 假成功清单 | `ProfilePage.tsx:77,146,258-259,277,301,361,393`；`SettingsPage.tsx:77,322`；`ContentPage.tsx:129`；`ModerationPage.tsx:130,145,161`；`AnalyticsPage.tsx:64-69`；`Moments.tsx:56` |
| 助手能力误标 / 上下文断线 | `AIAssistant.tsx:36,185`；`services/ai.ts:154`；`routes/ai.mjs:45-57`；`lib/assistant.ts:11-16` |
| AI 缓存只读不写 | `routes/ai.mjs:86-91`；`lib/store.mjs:97` |
| 模型配置不生效 | `routes/ai.mjs:119,180,269-283` |
| 月预算不执行 / 明文 IP | `ai/usage.mjs:19-25,77-78`；`routes/ai.mjs:135,144,155` |
| 索引不随内容失效 | `ai/indexer.mjs:3,26-28`；`routes/content.mjs`（无 invalidate）；`routes/ai.mjs:381-387` |
| 默认口令 / XFF / sid 明文 | `lib/env.mjs:46-48`；`lib/http.mjs:116-120`；`lib/auth.mjs:79-84` |
| 备份含会话 | `lib/store.mjs:104-110`；`lib/auth.mjs:81-84` |
| 备份恢复不失效索引 | `routes/system.mjs:140-148` |
| 任务实为同步 | `routes/system.mjs:30-63,101-113` |
| 四条真源 | `src/data/*`；`scripts/gen-content-snapshot.mjs:73-78`；`lib/store.mjs:26-40`；`scripts/{gen-seo,prerender,eval-ai}.mjs` |
| 门禁盲区 | `scripts/check-api.mjs:146-148`；`package.json:19`；`tsconfig.json:16`；无 `.github/workflows`、`.dockerignore` |
| 入口预算失败 | `npm run check:budget`；`src/App.tsx:5` |
| PWA 图标 / SW | `public/site.webmanifest:12-19`；`src/sw-register.ts:16` |
| robots 死规则 | `public/robots.txt:11` |
| 开发端口与 CORS 默认不一致 | `vite.config.ts:13`；`.env.example:12` |

---

## 9. 一句话总评

**fx1 把「缺能力」补成了「有接口」，fx2 要解决的是「接口与页面之间的最后一公里」。**
这一轮不需要新功能：只要把看板字段对齐、把 6 处假成功关掉、把缓存写进去、把索引与上下文接上、把默认口令与代理信任收紧，站点就会从「演示得不错」变成「可以让人真的用」。

> 备注：`README.md` 中「6 小时缓存」「月度预算」两处描述与当前代码不符，建议随本轮 P0 一起修正；`fx2` 的验收以本文表格为准。

---

## 10. 落地状态回写（2026-10-31）

> 本轮按 fx2 第 3–5 章逐条实现，并同步修掉依赖的跨层问题（X-01~X-08）。
> 状态口径：✅ 已实现且可按验收标准复现；🟡 部分实现（写明剩余项与原因）；⏳ 未做（写明阻塞）。

### 10.1 验收命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | ✅ 通过（`tsc -b` → gen:seo → vite → prerender），2006 modules |
| `npm run check` | ✅ `check:data`（7 项，含 G-07 种子同源）、`check:contrast`（5×5）、`check:budget` 全过 |
| 入口包体 | ✅ 71.14 kB / **gzip 33.06 kB**（≤ 45 kB，fx2 目标；较上轮 50.00 kB 降 34%） |
| `node scripts/check-api.mjs` | ✅ **43 项**通过（含文件直传/分享、看板契约、7d/30d 不串窗、缓存命中、状态机不可绕过、备份不含会话） |
| `node scripts/eval-ai.mjs` | ✅ HitRate@5 0.85 / MRR 0.654 / 上下文定位 1.00 / 引用正确率 1.00 / 注入拦截 1.00（40 问 + 12 注入 + 5 上下文） |
| `npm run verify` | ✅ 新增聚合命令：上四项一次跑完（CI 同款） |

### 10.2 跨层 X-01 ~ X-08

| ID | 状态 | 落地方式 | 关键文件 |
|---|---|---|---|
| X-01 看板契约 | ✅ | 服务端同时输出 `pv/uv/topPages[].views` 与原始字段；前端 `mapServerSummary` + `getSummary(window)` | `server/routes/analytics.mjs:73-96`；`src/services/analytics.ts:130-160` |
| X-02 内容只写不读 | ✅ | `ContentPage` 挂载读 `listAdmin`；保存走 `upsert(version)`；状态走 `setStatus`；新建走 `create` | `src/admin/pages/ContentPage.tsx:53-120` |
| X-03 文件链路 | ✅ | 服务端 `?scope=admin` 返回 private/trashed；后台上传后按 admin 列表刷新；前台资源中心合并公开文件 | `server/routes/files.mjs:128-140`；`src/services/files.ts:115-120`；`src/admin/pages/FilesAdminPage.tsx:94,141`；`src/pages/Files.tsx:67-96` |
| X-04 假成功 | ✅ | 6 类全部改为「真实落库」或「明确未接入」：资料/备份/SEO 接真接口；动态/弹幕/看板按钮不再报假成功 | `ProfilePage.tsx`、`SettingsPage.tsx`、`ContentPage.tsx`、`ModerationPage.tsx`、`AnalyticsPage.tsx` |
| X-05 单一真源 | 🟡 | 构建期（gen-seo / prerender / eval）已优先读 `server/data/content.json`；前台页面仍直接 import `src/data`（全量迁移是下一阶段） | `scripts/gen-seo.mjs:39-55`；`scripts/prerender.mjs:276-292`；`scripts/eval-ai.mjs:17-19` |
| X-06 索引不失效 | ✅ | content 的 POST/PUT/status/DELETE 成功后调用 `invalidate()`；备份恢复也失效 | `server/routes/content.mjs:5,116,144,160,180`；`server/routes/system.mjs:148-152` |
| X-07 标注漂移 | ✅ | 助手头部按 `/api/ai/health` 三态（LIVE MODEL / SITE RETRIEVAL / PRESET）；看板徽标随 `source`；README 已按新实现校正 | `src/components/AIAssistant.tsx:66-78,262-268`；`src/admin/pages/AnalyticsPage.tsx:69` |
| X-08 门禁盲区 | 🟡 | 契约断言进 `check:api`；新增 `verify` + GitHub Actions；`noUnusedLocals` 仍为 false（需先清历史未用导出，单列 P2） | `scripts/check-api.mjs`；`package.json:19-20`；`.github/workflows/verify.yml` |

### 10.3 前端 FE-01 ~ FE-15

| ID | 状态 | 落地方式 | 关键文件 |
|---|---|---|---|
| FE-01 入口预算 | ✅ | Home 改路由级 lazy（预渲染 HTML 兜底）；入口 gzip 33.06 kB，预算脚本收紧到 45 kB | `src/App.tsx:9-20`；`scripts/check-budget.mjs:5,45` |
| FE-02 内容接服务端 | ✅ | `loadArticles()` 拉 `/api/content/articles?scope=admin`，映射状态/version；保存后重新拉取 | `ContentPage.tsx:53-90,96-125` |
| FE-03 动态/朋友圈 | ✅ | 服务端模式 `contents.create('moments', …)` → pending；演示模式只写本机且文案不冒充已发布 | `Moments.tsx:41-72`；`ContentPage.tsx:126-150` |
| FE-04 个人中心 | ✅ | 资料读 `GET /api/profile`、保存走 `PUT /api/admin/profile`；头像/令牌/密码/2FA 等一律标注「未接入，不会保存」 | `ProfilePage.tsx:66-113,145-146,317,397,429`；`src/services/settings.ts:36-50` |
| FE-05 设置备份/SEO | ✅ | 备份列表/创建/恢复接 `/api/admin/backup`；SEO 读写 `/api/admin/settings`；调度/清理/下载如实标注未接入 | `SettingsPage.tsx:48-115,121-166,322,492-500,536,570` |
| FE-06 数据看板 | ✅ | `getSummary(win)` + 字段映射；徽标按 source；重跑真拉取；导出真 CSV；展示平均停留/AI 会话 | `AnalyticsPage.tsx:39-82,109-115` |
| FE-07 资源中心 | ✅ | 服务端公开文件合并进列表，下载走 `resolveDownload`（`/api` 自动补 baseUrl） | `Files.tsx:67-96,183-190` |
| FE-08 助手能力标注 | ✅ | `probeAiMode()` → 三态头部与 greeting；不再仅凭 `VITE_API_BASE` 标 LIVE MODEL | `services/ai.ts:170-181`；`AIAssistant.tsx:66-78,185` |
| FE-09 阅读上下文 | ✅ | 发结构化 `context:{articleId,articleTitle,sectionId,sectionTitle}`；服务端兼容字符串/顶层 articleId；评测上下文 100% | `services/ai.ts:198-208`；`server/routes/ai.mjs:100-104` |
| FE-10 会话恢复 | ✅ | `sessionStorage` 保存 sessionId；打开面板拉 `/api/ai/sessions/:id`（服务端按 IP 哈希绑定）；「新会话」清空 | `services/ai.ts:128-166`；`AIAssistant.tsx:80-100,121-128` |
| FE-11 搜索片段 | 🟡 | 归一化/同义词/高亮/最近搜索已可用；正文级「命中片段」尚未做（需全文索引，单列 P2） | `src/lib/search.ts`；`Layout.tsx:496-520` |
| FE-12 PWA 可安装 | 🟡 | manifest 已声明 192/512 与 maskable；仍是 SVG，未生成 PNG（无出图工具链，保持零依赖） | `public/site.webmanifest:12-30` |
| FE-13 字体/LCP | 🟡 | 仍阻塞 Bricolage + Noto 两族；子集化需字体文件与构建工具（本轮不引新依赖），装饰字体已异步 | `index.html:44-58` |
| FE-14 a11y 细节 | ✅ | `aria-busy`；停止后「已停止 · 可重试」；keydown 依赖 `[open]`；焦点陷阱保留 | `AIAssistant.tsx:111-120,265,279-281` |
| FE-15 SEO/CSP | ✅ | 删 `robots` 死规则；主题脚本抽成 `/theme-boot.js`；新增 `_headers` 与 Nginx CSP；静态层可 `script-src 'self'` | `public/robots.txt:10-12`；`public/theme-boot.js`；`public/_headers`；`README.md` Nginx 段 |

### 10.4 后端 BE-01 ~ BE-14

| ID | 状态 | 落地方式 | 关键文件 |
|---|---|---|---|
| BE-01 默认口令 | ✅ | 移除内置口令；`assertSecureConfig()` 缺口令/`change-me`/少于 8 位直接拒绝启动；compose 用 `${ADMIN_PASS:?}` | `server/lib/env.mjs:44-48,72-83`；`server/index.mjs:60-62`；`docker-compose.yml:15-23` |
| BE-02 XFF | ✅ | 默认只信 socket；`TRUST_PROXY=1` 才读 `X-Real-IP`/XFF；`.env.example` 已注明 | `server/lib/http.mjs:126-140`；`.env.example:14-15` |
| BE-03 会话安全 | ✅ | 只存 `sha256(sid)`；登录时清理过期并限 500 条；HTTPS 用 `__Host-` 前缀；登出清两种命名 | `server/lib/auth.mjs:58-135` |
| BE-04 状态机 | ✅ | PUT 忽略 `status`；POST 校验枚举；错误 400；check-api 覆盖两条 | `server/routes/content.mjs:97-105,162-180` |
| BE-05 文件洞 | ✅ | 签名登记 + 过期/大小校验；公开列表只 published+public；admin scope 含 private/trashed；密码错误单独 5 次/10 分钟 | `server/routes/files.mjs:25-38,63-100,128-140,295-300` |
| BE-06 备份敏感数据 | ✅ | 备份排除 `sessions`；恢复后 `invalidate()` + 清聚合缓存；备份 id 白名单正则 | `server/lib/store.mjs:112-122`；`server/routes/system.mjs:140-160` |
| BE-07 内存表 | ✅ | 限流桶每 500 次清扫；幂等表每 200 次清扫；配额独立 `quota[day|ipHash]` 计数 | `server/lib/http.mjs:102-140,175-198`；`server/ai/usage.mjs:19-60` |
| BE-08 异步任务 | ✅ | 建任务后 `setImmediate` 执行，接口立即 202 `running`；check-api 轮询校验完成 | `server/routes/system.mjs:30-70`；`scripts/check-api.mjs` |
| BE-09 聚合口径 | ✅ | 缓存按窗口分键；`kind=ai` 显式计数；前端路由切换/隐藏补发 `stayMs`；AI 每轮写一条 hit | `server/lib/hits.mjs`；`analytics.mjs:14-42,51-96`；`src/services/analytics.ts:47-100`；`src/App.tsx:74-90` |
| BE-10 日志/安全 | ✅ | `LOG_LEVEL` 生效；注入拦截写 warn 日志（含 ipHash）；AI 用量/会话只存 ipHash | `server/lib/http.mjs:133-142`；`server/routes/ai.mjs:120,135-165` |
| BE-11 契约细节 | ✅ | OpenAPI OG 路径改 `{file}.svg`；CORS 暴露 `ETag/X-Content-Version/X-Request-Id`；`sendSse` 统一 `X-Accel-Buffering` | `server/routes/system.mjs:274`；`server/lib/http.mjs:37-39`；`server/routes/ai.mjs:300-305` |
| BE-12 存储并发 | 🟡 | 已做深拷贝改后替换 + 优先原子 rename；仍为 JSON 单进程，迁移 SQLite/Postgres 需单独立项（会改动仓储边界） | `server/lib/store.mjs:44-63` |
| BE-13 容器运维 | 🟡 | 新增 `.dockerignore`、compose healthcheck、readyz 目录可写探针；日志轮转依赖外部 logging driver（未做） | `.dockerignore`；`docker-compose.yml:36-42`；`system.mjs:292-306` |
| BE-14 缺失业务接口 | ✅ | 新增 `/api/profile`、`/api/admin/settings`、`/api/friend-requests` + 审核；后台资料/设置/友链、前台友链表单全部接上 | `server/routes/settings.mjs`；`src/services/settings.ts`；`Friends.tsx:11-31,105-140`；`ProfilePage.tsx`；`SettingsPage.tsx`；`ModerationPage.tsx:48-86` |

### 10.5 AI 服务 AI-01 ~ AI-12

| ID | 状态 | 落地方式 | 关键文件 |
|---|---|---|---|
| AI-01 缓存 | ✅ | 回答成功后写缓存（500 条上限 + 按时间淘汰）；check-api 断言第二次 `cached:true` | `server/routes/ai.mjs:67-88,150-175` |
| AI-02 上下文 | ✅ | 前端发对象；服务端 `context` 对象优先、顶层 `articleId` 兼容；检索加权 + 评测 5 条上下文用例 | `server/routes/ai.mjs:100-104`；`server/ai/rag.mjs:131-155`；`scripts/eval-ai.mjs:76-90` |
| AI-03 索引失效 | ✅ | content 写操作后 `invalidate()` | `server/routes/content.mjs:5,116,144,160,180` |
| AI-04 模型配置 | ✅ | `pickModel()` 取 `isDefault && enabled` 的自定义模型，否则 env；网关按传入 model 调用 | `server/routes/ai.mjs:59-65,117`；`server/ai/gateway.mjs:41` |
| AI-05 配额/预算 | ✅ | 限流与配额全用 `ipHash`；`checkBudget()` 月 token 超限直接检索并在响应带 `budgetExceeded` | `server/ai/usage.mjs:19-60`；`server/routes/ai.mjs:98-115,200-210` |
| AI-06 成本 | ✅ | 输入/输出分别计 token；优先用上游 `usage`；`costOf(prompt,completion)`；后台标注估算 | `server/ai/usage.mjs:88-113`；`server/routes/ai.mjs:90-97,175` |
| AI-07 会话/反馈 | 🟡 | 会话恢复 ✅、消息限 40 条 ✅、`GET /api/ai/feedback` ✅；后台「反馈审阅」面板未做（P2，接口已就绪） | `server/routes/ai.mjs:220-250,300-320`；`AIAssistant.tsx:80-100` |
| AI-08 提示词事实 | ✅ | `buildSiteFacts({articleCount,projectCount})` 从运行时内容统计注入 | `server/ai/prompts.mjs:52-70`；`server/routes/ai.mjs:72-80` |
| AI-09 安全策略 | ✅ | 注入规则 13→15 条；输出长度 4000 上限；拦截写 `ai.injection.blocked`；评测新增 4 条注入全拦截 | `server/ai/safety.mjs:11-50`；`server/routes/ai.mjs:120`；`scripts/eval-ai.mjs:63-79` |
| AI-10 评测/CI | ✅ | 优先读运行时快照；新增上下文指标与分项阈值；`verify` + Actions 执行 | `scripts/eval-ai.mjs:17-19,124-165`；`.github/workflows/verify.yml` |
| AI-11 重试一致性 | ✅ | 网关重试前回调 `onReset`；服务端发 `{reset:true}`；前端清空半截文本后再接收 | `server/ai/gateway.mjs:14-36`；`server/routes/ai.mjs:140-155`；`services/ai.ts:240-250` |
| AI-12 检索升级 | 🟡 | 已加「标题/小节词面 rerank + 同 path 去重」；向量 + RRF 未做（需 embedding 供应商与向量库，接口保持可替换） | `server/ai/rag.mjs:131-155` |

### 10.6 仍未完成 / 阻塞点

| 项 | 状态 | 原因与替代方案 |
|---|---|---|
| 前台页面全量改读 `services/content.ts` | 🟡 | 工作量集中在 15 个页面重写数据层；本轮先保证「后台写 → 服务端 → 构建期产物」一致，页面迁移列为下一阶段 P0 |
| 搜索正文片段 | 🟡 | 需全文索引（或预生成 section 摘要）；当前用标题/描述 + 同义词已可检索，不阻塞 |
| PWA PNG 图标 | 🟡 | 生成 PNG 需绘图/编码工具；manifest 已声明 192/512 + maskable，Chrome 可安装但 Lighthouse 可能提示格式 |
| 字体子集化 | 🟡 | 需字体文件与 pyftsubset/子集服务；本轮不引新依赖，保持 2 族阻塞 + 装饰字体异步 |
| JSON → SQLite/Postgres | 🟡 | 会改变仓储与部署边界，需单独迁移方案与回滚脚本；当前单机原子写已满足小流量 |
| 日志轮转 | 🟡 | 依赖外部 logging driver（Docker json-file 轮转 / Loki）；应用侧已输出结构化 JSON 行 |
| 反馈审阅 UI | 🟡 | 后端接口已就绪；后台面板排在 P2，避免本轮继续扩大 Admin 体积 |
| 向量检索 / RRF | 🟡 | 需 embedding 供应商与向量库（pgvector）；`retrieve` 签名不变，可无痛替换 |
| `noUnusedLocals` / ESLint | 🟡 | 打开后会暴露历史未用导出，需一次性清理；本轮先保构建与契约门禁全绿 |

### 10.7 本轮改动文件清单

**服务端（新增/修改）**：`server/lib/{env,http,auth,store}.mjs`、`server/lib/hits.mjs`（新）、`server/routes/{content,files,analytics,ai,system}.mjs`、`server/routes/settings.mjs`（新）、`server/ai/{usage,prompts,rag,gateway,safety}.mjs`、`server/index.mjs`

**前端（新增/修改）**：`src/App.tsx`、`src/services/{analytics,ai,content,files}.ts`、`src/services/settings.ts`（新）、`src/components/AIAssistant.tsx`、`src/admin/pages/{ContentPage,AnalyticsPage,ProfilePage,SettingsPage,ModerationPage,FilesAdminPage,AiConfigPage}.tsx`、`src/pages/{Files,Moments,Friends}.tsx`

**脚本/工程**：`scripts/{check-api,check-data,check-budget,eval-ai,gen-seo,prerender}.mjs`、`package.json`（`verify`）、`.github/workflows/verify.yml`（新）、`.dockerignore`（新）、`docker-compose.yml`、`.env.example`、`index.html`、`public/{theme-boot.js,_headers}`（新）、`public/{robots.txt,site.webmanifest}`、`README.md`

> 本轮未提交 Git（遵循协作规则与「未经要求不自动提交」）；工作区中 `fx1.md`、`src/components/Layout.tsx` 等历史变更不在本轮修改范围内。
