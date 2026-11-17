# 项目长期笔记 · resume1（个人博客 / 朋友圈 / 后台）

## 运行环境
- `npm run dev` 启动 Vite（端口通常 5273），`vite.config.ts` 的 `apiServer()` 插件会
  自动 fork `server/index.mjs` 到 127.0.0.1:8787；`/api` 由 Vite 代理。
- `.env` 配了 `VITE_API_BASE=/api` 与 `ADMIN_PASS`，所以**后端真实生效**，不是 mock：
  后台的发布 / 编辑 / 状态变更会落库到 `server/data/content.json`。
- `server/lib/store.mjs` 有**内存缓存**：直接改 `server/data/*.json` 后必须重启 Vite
  （会连带重启后端），只刷新浏览器或只改前端不生效。
- 后台登录地址 `/admin`，路由形如 `/admin/content/moments`（tab 在 URL 里）。

## 内容与发布
- 前台公开接口 `GET /api/content/:domain` 只回 `status === 'published'`；
  `DELETE` 是软删除（置 `hidden`）；`PUT` 里的 `status` 会被忽略，状态必须走 `/status` 状态机。
- `contents.create` 只透传 payload，**不补默认字段**。发布动态要写全
  `text / tag / tags / place / time / date / visibility / pinned / likes / comments:[] / accent / media`。
- 动态媒体：`label` 为 http(s) 直链或站内 `/` 路径；`kind: photo | video | note | code`；
  视频可带 `poster`（封面）与 `caption`。mp4/webm 直链内嵌播放，其它视频页地址渲染成可点卡片。
- 前台 `Moments.tsx` 有 `normalizeMoment` / `normalizeMedia` 做脏数据兜底，
  渲染层仍有 `MediaFallback`（onError 占位），任何失效外链都不会出现破图或黑块。
- 页脚 `profile.socials` 会被 `/api/profile` 水合覆盖，改动需同步
  `src/data/site.ts`、`server/data/settings.json`、`server/data/content.json` 三处。

## 前端约定
- 定位元素（`position: relative` 且 z-index auto）默认绘制在非定位块**之上**；
  做「背景在下层 + 悬浮内容」时给背景 `z-0`、内容 `relative z-10`。
- 移动端底部 6 项菜单挂在 `App` 顶层、所有错误边界之外，CSS 有 `!important` 硬兜底，
  层级 85（低于弹窗 90，避免盖住 modal）。
- 懒加载路由统一走 `lazyWithRetry()`；AI 助手失败只静默隐藏自己，不能把整页打成错误卡片。
- 「这一块渲染出错了，别的页面不受影响」是 `ErrorBoundary` 的卡片文案。

## 验证方式
- 类型检查：`node node_modules/typescript/bin/tsc -b --pretty false`
- Playwright CLI：`playwright-cli open <url>` 后 `playwright-cli run-code --filename=/tmp/xxx.js`，
  脚本必须是**裸 `async page => { ... }`**；`run-code` 从 Windows temp 读文件。
  后台有轮询，`networkidle` 永不 settle，用 `domcontentloaded` + `waitForTimeout`。
- 控制台里 `/api/auth/session` 的 401 是未登录探测，属预期；chrome-extension 的 `indexOf`
  报错来自浏览器扩展，不是项目代码。
