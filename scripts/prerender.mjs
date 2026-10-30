/**
 * 构建期预渲染（fx1 F-14）。
 *
 * 产物写在 dist/ 下，与 SPA 产物同源：
 *   · dist/index.html                 首页静态正文
 *   · dist/learn/index.html           文章列表
 *   · dist/learn/<id>/index.html      6 篇文章全文（爬虫与分享卡可直接读到）
 *   · dist/work/resume/index.html     简历摘要
 *   · dist/og/<id>.svg                每篇文章专属 OG 图
 *
 * 说明：这是「静态壳 + 正文」方案，不是 SSR。浏览器加载后 React 仍按 SPA 接管，
 * 预渲染内容只是给爬虫和禁用 JS 的访客兜底；正文与 src/data/* 同源，不会漂移。
 * 每篇 OG 用 SVG（零依赖），部分社交平台只接受 PNG，后续可在 B-05 接 satori 出 PNG。
 *
 * 用法：npm run prerender（在 vite build 之后执行）
 */
import esbuild from 'esbuild'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { build } = esbuild
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')
const tmp = join(root, 'node_modules', '.prerender')

/* ------------------------------- 读取数据 -------------------------------- */

async function loadData() {
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  await build({
    entryPoints: [join(root, 'scripts', 'prerender-entry.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: join(tmp, 'entry.mjs'),
    alias: { '@': join(root, 'src') },
    logLevel: 'silent',
  })
  return import(pathToFileURL(join(tmp, 'entry.mjs')).href)
}

/* -------------------------------- 工具函数 -------------------------------- */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function renderBlock(b) {
  if (b.t === 'p') return `<p>${esc(b.v)}</p>`
  if (b.t === 'quote') return `<blockquote>${esc(b.v)}</blockquote>`
  if (b.t === 'code') return `<pre><code data-lang="${esc(b.lang)}">${esc(b.v)}</code></pre>`
  if (b.t === 'list') return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
  if (b.t === 'note') return `<aside class="pr-note"><strong>${esc(b.title)}</strong><p>${esc(b.v)}</p></aside>`
  if (b.t === 'table')
    return `<table><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`
  return ''
}

/** 静态正文用最小样式：不依赖 dist 的 hash 化 CSS 类名 */
const HEAD_STYLE = `<style>
  .pr-wrap{max-width:760px;margin:0 auto;padding:48px 20px 72px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#14140f;line-height:1.75}
  .pr-wrap h1{font-size:34px;line-height:1.3;margin:0 0 12px}
  .pr-wrap h2{font-size:22px;margin:36px 0 10px;padding-top:12px;border-top:1.5px solid #14140f}
  .pr-wrap h3{font-size:17px;margin:22px 0 8px}
  .pr-wrap p{margin:0 0 14px}
  .pr-wrap a{color:#14140f}
  .pr-kicker{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6a60;margin-bottom:10px}
  .pr-lead{font-size:16px;color:#6b6a60}
  .pr-abstract{font-size:16px;background:#fbf8f1;border-left:4px solid #c9f158;padding:12px 16px}
  .pr-tags span{display:inline-block;margin-right:8px;font-size:12px;color:#6b6a60}
  .pr-wrap ul,.pr-wrap ol{padding-left:22px;margin:0 0 14px}
  .pr-wrap li{margin:4px 0}
  .pr-wrap pre{background:#14140f;color:#fbf8f1;padding:14px 16px;overflow:auto;font-size:13px;line-height:1.6;margin:0 0 14px}
  .pr-wrap code{font-family:'JetBrains Mono',ui-monospace,monospace}
  .pr-wrap blockquote{margin:0 0 14px;padding:8px 16px;border-left:3px solid #14140f;color:#6b6a60}
  .pr-note{border:1.5px solid #14140f;background:#fbf8f1;padding:12px 16px;margin:0 0 14px;box-shadow:4px 4px 0 #14140f}
  .pr-note p{margin:6px 0 0}
  .pr-wrap table{border-collapse:collapse;width:100%;margin:0 0 16px;font-size:14px}
  .pr-wrap th,.pr-wrap td{border:1px solid #14140f;padding:8px 10px;text-align:left}
  .pr-card{border:1.5px solid #14140f;background:#fbf8f1;padding:16px 18px;margin:0 0 16px;box-shadow:4px 4px 0 #14140f}
  .pr-card h3{margin:0 0 8px;font-size:18px}
  .pr-meta{font-size:12px;color:#6b6a60}
  .pr-nav{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}
  .pr-nav a{border:1.5px solid #14140f;padding:6px 14px;text-decoration:none}
  .pr-hero{border-bottom:2px solid #14140f;padding-bottom:20px;margin-bottom:26px}
  .pr-footer{margin-top:36px;padding-top:16px;border-top:1.5px solid #14140f;font-size:13px;color:#6b6a60}
</style>`

function buildPage(template, { title, description, canonical, ogImage, ogType = 'website', jsonLd, body }) {
  let html = template
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = html.replace(/<meta[^>]*name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)

  const swap = (pattern, tag) => {
    html = html.replace(pattern, tag)
  }
  swap(/<meta[^>]*property="og:type"[^>]*>/, `<meta property="og:type" content="${ogType}" />`)
  swap(/<meta[^>]*property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`)
  swap(/<meta[^>]*property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`)
  swap(/<meta[^>]*property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`)
  swap(/<meta[^>]*property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImage}" />`)
  swap(/<meta[^>]*name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`)
  swap(/<meta[^>]*name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}" />`)
  swap(/<meta[^>]*name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${ogImage}" />`)

  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${canonical}" />\n    <script type="application/ld+json">${jsonLd}</script>\n    ${HEAD_STYLE}\n  </head>`,
  )
  html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${body}</div>`)
  return html
}

/* -------------------------------- OG 图 --------------------------------- */

const escapeXml = (s) =>
  String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])

function wrapTitle(title, perLine = 16) {
  const lines = []
  let rest = String(title ?? '')
  while (rest.length > perLine && lines.length < 3) {
    lines.push(rest.slice(0, perLine))
    rest = rest.slice(perLine)
  }
  if (rest) lines.push(rest)
  return lines
}

/** 与 server/routes/system.mjs 的 articleOgSvg 保持同一版式（服务端 /api/og/:id.svg 复用） */
function articleOgSvg(article) {
  const lines = wrapTitle(article.title)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fffdf5"/>
  <rect x="0" y="0" width="1200" height="630" fill="none" stroke="#101010" stroke-width="10"/>
  <rect x="64" y="64" width="168" height="44" rx="22" fill="#c9f56b" stroke="#101010" stroke-width="3"/>
  <text x="148" y="94" font-family="monospace" font-size="20" text-anchor="middle" fill="#101010">${escapeXml(article.category)}</text>
  ${lines
    .map(
      (l, i) =>
        `<text x="64" y="${210 + i * 86}" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="72" font-weight="800" fill="#101010">${escapeXml(l)}</text>`,
    )
    .join('\n  ')}
  <text x="64" y="520" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="26" fill="#555">${escapeXml(article.abstract ?? '').slice(0, 46)}</text>
  <text x="64" y="580" font-family="monospace" font-size="20" fill="#888">WYX.SPACE · ${escapeXml(article.date ?? '')} · ${escapeXml(article.readMin ?? 0)} min</text>
  <rect x="980" y="470" width="156" height="96" rx="18" fill="#101010"/>
  <text x="1058" y="532" font-family="monospace" font-size="30" text-anchor="middle" fill="#c9f56b">WYX</text>
</svg>`
}

/* ------------------------------- 正文渲染 -------------------------------- */

function renderArticleBody(a) {
  return `<div class="pr-wrap">
  <nav class="pr-nav"><a href="/">首页</a><a href="/learn">学习笔记</a></nav>
  <article>
    <header>
      <p class="pr-kicker">${esc(a.category)} · ${esc(a.date)} · ${a.readMin} min</p>
      <h1>${esc(a.title)}</h1>
      <p class="pr-abstract">${esc(a.abstract)}</p>
      <p class="pr-tags">${a.tags.map((t) => `<span>#${esc(t)}</span>`).join('')}</p>
    </header>
    ${a.sections
      .map(
        (s) => `<section id="${esc(s.id)}">
      <h2>${esc(s.title)}</h2>
      ${s.lead ? `<p class="pr-lead">${esc(s.lead)}</p>` : ''}
      ${s.subs
        .map(
          (sub) => `<div id="${esc(sub.id)}">
        <h3>${esc(sub.title)}</h3>
        ${sub.blocks.map(renderBlock).join('\n        ')}
      </div>`,
        )
        .join('\n      ')}
    </section>`,
      )
      .join('\n    ')}
    <footer class="pr-footer">本文来自 WYX.SPACE · <a href="/learn/${esc(a.id)}">原文链接</a></footer>
  </article>
</div>`
}

function articleCard(a) {
  return `<article class="pr-card">
    <h3><a href="/learn/${esc(a.id)}">${esc(a.title)}</a></h3>
    <p>${esc(a.abstract)}</p>
    <p class="pr-meta">${esc(a.category)} · ${esc(a.date)} · ${a.readMin} min</p>
  </article>`
}

function homeBody({ siteMeta, profile, figures, articles }) {
  const latest = articles.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3)
  return `<div class="pr-wrap">
  <header class="pr-hero">
    <p class="pr-kicker">${esc(siteMeta.name)} · ${esc(profile.role)}</p>
    <h1>${esc(profile.name)}</h1>
    <p class="pr-lead">${esc(profile.tagline)}</p>
    <p>${esc(profile.bio[0])}</p>
    <p>${esc(profile.bio[1])}</p>
    <nav class="pr-nav">
      <a href="/work/resume">简历</a><a href="/learn">学习笔记</a><a href="/work/toolbox">百宝箱</a><a href="/work/files">资源中心</a><a href="/life/moments">生活碎片</a><a href="/me/guestbook">留言墙</a>
    </nav>
  </header>
  <section>
    <h2>最新文章</h2>
    ${latest.map(articleCard).join('\n    ')}
  </section>
  <section>
    <h2>关键数字</h2>
    <ul>
      <li>已上线 AI 付费产品 ${figures.products} 款</li>
      <li>竞赛获奖 ${figures.awards} 项</li>
      <li>2026 年 ${figures.hackathonOnsite2026} 场黑客松现场，${figures.finals2026} 场进决赛</li>
      <li>开源项目 ${figures.openSourceRepos} 个，原创内容 ${figures.originalContents} 篇</li>
    </ul>
  </section>
</div>`
}

function learnBody(articles) {
  return `<div class="pr-wrap">
  <header class="pr-hero">
    <p class="pr-kicker">学习笔记</p>
    <h1>把踩过的坑写成可复用的方法</h1>
    <p>${articles.length} 篇长文，覆盖 RAG 工程化、Agent 评测与工程手记。</p>
  </header>
  ${articles.map(articleCard).join('\n  ')}
</div>`
}

function resumeBody({ profile, figures, education, skillGroups, resumeSnapshot }) {
  return `<div class="pr-wrap">
  <header class="pr-hero">
    <p class="pr-kicker">${esc(profile.name)} · ${esc(profile.latin)}</p>
    <h1>${esc(profile.role)}</h1>
    <p class="pr-lead">${esc(resumeSnapshot.target)} · ${esc(resumeSnapshot.availability)}</p>
  </header>
  <section>
    <h2>核心亮点</h2>
    <ul>${resumeSnapshot.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
  </section>
  <section>
    <h2>技能栈</h2>
    <ul>${skillGroups.map((g) => `<li><strong>${esc(g.title)}</strong>：${esc(g.summary)}</li>`).join('')}</ul>
  </section>
  <section>
    <h2>教育经历</h2>
    ${education
      .map(
        (e) => `<article class="pr-card">
      <h3>${esc(e.school)} · ${esc(e.degree)}</h3>
      <p class="pr-meta">${esc(e.period)} · ${esc(e.direction)}</p>
      <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    </article>`,
      )
      .join('')}
  </section>
  <section>
    <h2>数据口径</h2>
    <ul><li>付费产品 ${figures.products} 款</li><li>竞赛获奖 ${figures.awards} 项</li><li>主阵地粉丝 ${esc(figures.mainPlatformFollowers)}</li></ul>
  </section>
  <p class="pr-footer">简历原件：<a href="/files/wyx-resume-2026.docx">DOCX</a></p>
</div>`
}

/* --------------------------------- 主流程 -------------------------------- */

const data = await loadData()
const { articles, siteMeta, profile, figures, education, skillGroups, resumeSnapshot } = data
const BASE = siteMeta.url.replace(/\/$/, '')
let template
try {
  template = readFileSync(join(dist, 'index.html'), 'utf8')
} catch {
  console.error('[prerender] 找不到 dist/index.html，请先运行 vite build')
  process.exit(1)
}

mkdirSync(join(dist, 'og'), { recursive: true })
mkdirSync(join(root, 'public', 'og'), { recursive: true })

const pages = []

pages.push({
  file: join(dist, 'index.html'),
  html: buildPage(template, {
    title: siteMeta.title,
    description: siteMeta.description,
    canonical: `${BASE}/`,
    ogImage: `${BASE}/og-cover.png`,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteMeta.name,
      url: `${BASE}/`,
      description: siteMeta.description,
      author: { '@type': 'Person', name: profile.name },
    }),
    body: homeBody(data),
  }),
})

pages.push({
  file: join(dist, 'learn', 'index.html'),
  html: buildPage(template, {
    title: `学习笔记 · ${siteMeta.name}`,
    description: `${articles.length} 篇 AI 工程长文：RAG 工程化、Agent 评测与工程手记。`,
    canonical: `${BASE}/learn`,
    ogImage: `${BASE}/og-cover.png`,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `学习笔记 · ${siteMeta.name}`,
      url: `${BASE}/learn`,
      hasPart: articles.map((a) => ({ '@type': 'Article', headline: a.title, url: `${BASE}/learn/${a.id}` })),
    }),
    body: learnBody(articles),
  }),
})

pages.push({
  file: join(dist, 'work', 'resume', 'index.html'),
  html: buildPage(template, {
    title: `简历 · ${profile.name} · ${siteMeta.name}`,
    description: `${profile.role}｜${resumeSnapshot.target}｜${resumeSnapshot.availability}`,
    canonical: `${BASE}/work/resume`,
    ogImage: `${BASE}/og-cover.png`,
    ogType: 'profile',
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: `简历 · ${profile.name}`,
      url: `${BASE}/work/resume`,
      mainEntity: { '@type': 'Person', name: profile.name, jobTitle: profile.role, email: profile.email },
    }),
    body: resumeBody(data),
  }),
})

for (const a of articles) {
  const og = `${BASE}/og/${a.id}.svg`
  const svg = articleOgSvg(a)
  writeFileSync(join(root, 'public', 'og', `${a.id}.svg`), svg, 'utf8')
  writeFileSync(join(dist, 'og', `${a.id}.svg`), svg, 'utf8')
  pages.push({
    file: join(dist, 'learn', a.id, 'index.html'),
    html: buildPage(template, {
      title: `${a.title} · ${siteMeta.name}`,
      description: a.abstract,
      canonical: `${BASE}/learn/${a.id}`,
      ogImage: og,
      ogType: 'article',
      jsonLd: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        description: a.abstract,
        datePublished: a.date,
        url: `${BASE}/learn/${a.id}`,
        image: og,
        author: { '@type': 'Person', name: profile.name },
        publisher: { '@type': 'Organization', name: siteMeta.name },
        keywords: a.tags.join(','),
      }),
      body: renderArticleBody(a),
    }),
  })
}

for (const page of pages) {
  mkdirSync(dirname(page.file), { recursive: true })
  writeFileSync(page.file, page.html, 'utf8')
}

rmSync(tmp, { recursive: true, force: true })
console.log(
  `[prerender] ${pages.length} 个静态页（首页 / 学习列表 / 简历 / ${articles.length} 篇文章）+ ${articles.length} 张文章 OG`,
)
