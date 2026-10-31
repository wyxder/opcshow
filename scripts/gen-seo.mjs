/**
 * 构建期生成 SEO 静态产物（fx.md S1 / S5）：
 *   - public/sitemap.xml （路由 + 文章）
 *   - public/rss.xml     （文章订阅）
 *
 * 用法：node scripts/gen-seo.mjs
 * 真正的服务端 sitemap / 文章 OG 图属于 B8，接入点在 src/data/site.ts 的 siteMeta.url
 * 与后台 SettingsPage 的 seo.sitemap / seo.structuredData 开关。
 */
import esbuild from 'esbuild'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { build } = esbuild

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const tmp = join(root, 'node_modules', '.gen-seo')

// 站点配置从 src/data/site.ts 读，避免脚本里再抄一份域名/文案
let siteMeta, articleMeta
try {
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  await build({
    entryPoints: [join(root, 'scripts', 'seo-entry.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: join(tmp, 'entry.mjs'),
    alias: { '@': join(root, 'src') },
    logLevel: 'silent',
  })
  ;({ siteMeta, articleMeta } = await import(pathToFileURL(join(tmp, 'entry.mjs')).href))
} catch (err) {
  console.error('[gen-seo] 读取 src/data 失败：', err.message)
  process.exit(1)
}

// X-05：若存在运行时快照，优先用它（后台改过的标题/摘要/状态才能进 sitemap 与 RSS）
try {
  const runtime = join(root, 'server', 'data', 'content.json')
  if (existsSync(runtime)) {
    const snap = JSON.parse(readFileSync(runtime, 'utf8'))
    if (Array.isArray(snap.articles) && snap.articles.length) {
      articleMeta = snap.articles
        .filter((a) => !a.status || a.status === 'published')
        .map((a) => ({ id: a.id, title: a.title, category: a.category ?? '工程手记', date: a.date ?? new Date().toISOString().slice(0, 10), abstract: a.abstract ?? '', readMin: a.readMin ?? 0 }))
    }
    if (snap.siteMeta) siteMeta = { ...siteMeta, ...snap.siteMeta }
    console.log('[gen-seo] 已使用 server/data/content.json 运行时快照')
  }
} catch (err) {
  console.warn('[gen-seo] 读取运行时快照失败，回落 src/data：', err.message)
}

const BASE = siteMeta.url.replace(/\/$/, '')
const now = new Date().toISOString().slice(0, 10)

const routes = [
  { path: '/', priority: '1.0', freq: 'weekly' },
  { path: '/learn', priority: '0.9', freq: 'weekly' },
  { path: '/work/resume', priority: '0.9', freq: 'monthly' },
  { path: '/work/toolbox', priority: '0.6', freq: 'monthly' },
  { path: '/work/files', priority: '0.7', freq: 'monthly' },
  { path: '/life/love', priority: '0.6', freq: 'monthly' },
  { path: '/life/moments', priority: '0.7', freq: 'weekly' },
  { path: '/life/travel', priority: '0.6', freq: 'monthly' },
  { path: '/life/music', priority: '0.5', freq: 'monthly' },
  { path: '/me', priority: '0.7', freq: 'monthly' },
  { path: '/me/media', priority: '0.6', freq: 'monthly' },
  { path: '/me/timeline', priority: '0.6', freq: 'monthly' },
  { path: '/me/guestbook', priority: '0.5', freq: 'weekly' },
  { path: '/me/friends', priority: '0.4', freq: 'monthly' },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${BASE}${r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.freq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('\n')}
${articleMeta
  .map(
    (a) => `  <url>
    <loc>${BASE}/learn/${a.id}</loc>
    <lastmod>${a.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

const cdata = (s) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(siteMeta.title)}</title>
    <link>${BASE}/</link>
    <description>${esc(siteMeta.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml" />
${articleMeta
  .slice()
  .sort((a, b) => b.date.localeCompare(a.date))
  .map(
    (a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${BASE}/learn/${a.id}</link>
      <guid isPermaLink="true">${BASE}/learn/${a.id}</guid>
      <category>${esc(a.category)}</category>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <description>${cdata(a.abstract)}</description>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>
`

writeFileSync(join(root, 'public', 'sitemap.xml'), sitemap, 'utf8')
writeFileSync(join(root, 'public', 'rss.xml'), rss, 'utf8')
rmSync(tmp, { recursive: true, force: true })
console.log(`[gen-seo] public/sitemap.xml（${routes.length + articleMeta.length} 条）+ public/rss.xml（${articleMeta.length} 篇）`)
