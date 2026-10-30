import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { siteMeta } from '@/data/site'

/**
 * 页面级 SEO（fx.md S3）。
 * 每个前台页调用一次，动态写 title / description / og / twitter / canonical，
 * 需要结构化数据时再传 jsonLd（文章页传 Article，其余传 WebPage）。
 *
 * 说明：这是纯前端的 meta 管理，爬虫能否索引仍受 SPA 限制 ——
 * 预渲染 / SSR 属于 fx.md S4，接入点在 vite.config.ts（已预留 prerender 钩子注释）。
 */
type SeoInput = {
  title: string
  description?: string
  /** 覆盖 canonical 路径；默认用当前 pathname */
  path?: string
  ogImage?: string
  ogType?: 'website' | 'article'
  /** 默认 index, follow；后台页传 noindex */
  robots?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const DEFAULT_OG_IMAGE = '/og-cover.png'

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
}

export function useSeo({ title, description, path, ogImage = DEFAULT_OG_IMAGE, ogType = 'website', robots = 'index, follow', jsonLd }: SeoInput) {
  const { pathname } = useLocation()
  const json = jsonLd ? JSON.stringify(jsonLd) : ''

  useEffect(() => {
    const base = siteMeta.url.replace(/\/$/, '')
    const desc = description ?? siteMeta.description
    const canonical = `${base}${path ?? pathname.split('#')[0]}`
    const image = `${base}${ogImage}`

    document.title = title
    upsertMeta('meta[name="description"]', { name: 'description', content: desc })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: desc })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: ogType })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: desc })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = canonical

    // 结构化数据：同一时刻只保留一份，避免 SPA 里堆历史脚本
    const prev = document.getElementById('page-jsonld')
    if (prev) prev.remove()
    if (json) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = 'page-jsonld'
      script.textContent = json
      document.head.appendChild(script)
    }
  }, [title, description, path, ogImage, ogType, robots, pathname, json])
}

/** 文章页的 JSON-LD（fx.md S4 一期：先给爬虫可解析的结构化数据） */
export function articleJsonLd(input: { id: string; title: string; abstract: string; date: string; sectionTitle?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.abstract,
    datePublished: input.date,
    inLanguage: 'zh-CN',
    author: { '@type': 'Person', name: siteMeta.author },
    publisher: { '@type': 'Organization', name: siteMeta.name, url: siteMeta.url },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteMeta.url}/learn/${input.id}` },
    ...(input.sectionTitle ? { about: input.sectionTitle } : {}),
  }
}

/** 首页 / 简历页的人物画像数据 */
export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteMeta.author,
    url: siteMeta.url,
    jobTitle: 'AI 全栈 / 智能体开发',
    knowsAbout: ['RAG', 'AI Agent', 'LLM 评测', '全栈开发'],
  }
}
