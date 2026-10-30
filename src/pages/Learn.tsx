import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, BookOpen, Clock, Eye, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AIAssistant } from '@/components/AIAssistant'
import { Plate, Reveal, Sticker } from '@/components/ui/primitives'
import { articleCategories, articleMeta } from '@/data/articles.index'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'

const learningPath = [
  { step: '01', title: '先把 RAG 打通', desc: '切片、召回、溯源，做出第一个不胡说八道的问答。', color: 'rgb(var(--c-lime))' },
  { step: '02', title: '再给 Agent 上约束', desc: '工具、预算、越权、回归，让它稳定地重复成功。', color: 'rgb(var(--c-coral))' },
  { step: '03', title: '最后让评测驱动', desc: '指标、盲测、自进化，把优化变成可审计的闭环。', color: 'rgb(var(--c-grape))' },
]

export default function Learn() {
  const [params] = useSearchParams()
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')

  useSeo({
    title: '知识库 · 魏云潇',
    description: `${articleMeta.length} 篇长文：RAG 工程化、Agent 评测、工程手记。`,
    path: '/learn',
  })

  useEffect(() => {
    if (params.get('assistant') === '1') window.dispatchEvent(new CustomEvent('open-assistant'))
  }, [params])

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    return articleMeta.filter((a) => {
      const catOk = cat === 'all' || a.category === cat || a.tags.includes(cat)
      const qOk = !key || (a.title + a.abstract + a.tags.join('')).toLowerCase().includes(key)
      return catOk && qOk
    })
  }, [cat, q])

  const totalRead = articleMeta.reduce((s, a) => s + a.readMin, 0)
  const totalViews = articleMeta.reduce((s, a) => s + a.views, 0)

  return (
    <div className="shell">
      <section className="relative mb-8 overflow-hidden rounded-[26px] border-1.5 border-ink bg-cream p-6 shadow-hard sm:p-9">
        <div className="pointer-events-none absolute inset-0 grid-paper opacity-60" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-1.5 border-ink/10 bg-lime/30" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="kicker">02 / LEARN · KNOWLEDGE BASE</p>
            <h1 className="mt-3 text-[clamp(30px,5.2vw,52px)] font-extrabold leading-[0.98]">
              把踩过的坑，
              <br />
              写成<span className="marker">能复用</span>的路。
            </h1>
            <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-ink-soft">
              这里是我做项目时的真实决策记录：为什么这样切片、为什么这个指标不能用 Judge、为什么自进化必须有三层刹车。不写「什么是 RAG」，只写我在什么时候选了哪条路。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Sticker rotate={-4}>三级目录阅读</Sticker>
              <Sticker rotate={3} color="rgb(var(--c-sky))">浮屏 AI 助手</Sticker>
              <Sticker rotate={-2} color="rgb(var(--c-rose))">全部非虚构</Sticker>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 self-end lg:self-center">
            {[
              { label: '文章', value: articleMeta.length, unit: '篇' },
              { label: '总阅读', value: `${(totalViews / 1000).toFixed(1)}k`, unit: '' },
              { label: '读完需', value: totalRead, unit: 'min' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border-1.5 border-ink bg-paper px-3 py-3">
                <p className="font-display text-[24px] font-extrabold leading-none">
                  {s.value}
                  <span className="ml-0.5 text-[11px] text-ink/40">{s.unit}</span>
                </p>
                <p className="mt-1.5 font-mono text-[9px] tracking-widest text-ink/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {articleCategories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                'rounded-full border-1.5 px-3.5 py-1.5 text-[11.5px] transition',
                cat === c.key ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-cream text-ink/60 hover:border-ink/50',
              )}
            >
              {c.label}
              <span className={cn('ml-1.5 font-mono text-[9px]', cat === c.key ? 'text-lime' : 'text-ink/35')}>
                {c.key === 'all' ? articleMeta.length : articleMeta.filter((a) => a.category === c.key || a.tags.includes(c.key)).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full border-1.5 border-ink/15 bg-cream px-3 py-1.5 focus-within:border-ink">
          <Search size={13} className="text-ink/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索文章 / 标签"
            className="w-40 bg-transparent text-[11.5px] outline-none placeholder:text-ink/35"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="清空">
              <X size={12} className="text-ink/40" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* featured */}
        <div className="lg:col-span-8">
          {list.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-1.5 border-dashed border-ink/25 bg-cream/60">
              <p className="font-hand text-2xl text-ink/40">没找到，换个关键词？</p>
              <button onClick={() => { setQ(''); setCat('all') }} className="btn mt-4 !py-2 !text-[12px]">
                重置筛选
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((a, i) => (
                <Reveal key={a.id} delay={i * 0.05} className={i === 0 ? 'sm:col-span-2' : ''}>
                  <Link
                    to={`/learn/${a.id}`}
                    className={cn(
                      'group relative flex h-full flex-col overflow-hidden rounded-2xl border-1.5 border-ink bg-cream transition-all duration-300 hover:-translate-y-1 hover:shadow-hard',
                    )}
                  >
                    {i === 0 ? (
                      <div className="grid sm:grid-cols-[0.9fr_1.1fr]">
                        <div className="relative min-h-[170px] border-b border-ink/12 sm:border-b-0 sm:border-r">
                          <Plate motif="orbit" accent={a.accent} label={a.category} index={`0${i + 1}`} className="absolute inset-0" />
                        </div>
                        <div className="p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-ink/20 bg-lime/40 px-2 py-0.5 font-mono text-[9px]">置顶</span>
                            <span className="font-mono text-[9px] text-ink/40">{a.date}</span>
                          </div>
                          <h2 className="mt-2.5 text-[20px] font-extrabold leading-tight group-hover:underline">{a.title}</h2>
                          <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-ink/55">{a.abstract}</p>
                          <div className="mt-3 flex items-center justify-between font-mono text-[9.5px] text-ink/40">
                            <span className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {a.readMin} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye size={10} /> {a.views}
                              </span>
                            </span>
                            <span className="flex items-center gap-1 text-ink/70">
                              阅读 <ArrowRight size={11} />
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
                          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-ink/45">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.accent }} />
                            {a.category}
                          </span>
                          <span className="font-mono text-[9px] text-ink/30">0{i + 1}</span>
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="text-[15px] font-extrabold leading-snug group-hover:underline">{a.title}</h3>
                          <p className="mt-2 line-clamp-3 flex-1 text-[11.5px] leading-relaxed text-ink/50">{a.abstract}</p>
                          <div className="mt-3 flex items-center justify-between font-mono text-[9px] text-ink/35">
                            <span>{a.date}</span>
                            <span className="flex items-center gap-2">
                              <Clock size={10} /> {a.readMin} min
                              <ArrowUpRight size={12} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>

        {/* sidebar */}
        <div className="space-y-3 lg:col-span-4">
          <div className="rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-lime" />
              <p className="font-mono text-[9px] tracking-[0.2em] text-lime">LEARNING PATH</p>
            </div>
            <h3 className="mt-2 text-[17px] font-extrabold">我的学习路线</h3>
            <div className="mt-4 space-y-3">
              {learningPath.map((p) => (
                <div key={p.step} className="flex gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[9px] font-bold text-ink"
                    style={{ background: p.color }}
                  >
                    {p.step}
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold">{p.title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-paper/45">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-paper/15 pt-3 font-hand text-[17px] text-paper/40">顺序可以打乱，但别跳过评测。</p>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
            <p className="font-mono text-[9px] tracking-[0.2em] text-ink/35">TAGS</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from(new Set(articleMeta.flatMap((a) => a.tags))).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setCat(t)
                    setQ('')
                  }}
                  className="rounded-full border border-ink/15 bg-paper px-2.5 py-1 text-[10.5px] text-ink/55 transition hover:border-ink hover:bg-lime/40 hover:text-ink"
                >
                  # {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-assistant'))}
            className="group flex w-full items-center gap-3 rounded-2xl border-1.5 border-ink bg-lime p-4 text-left transition hover:-translate-y-0.5 hover:shadow-hard"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-1.5 border-ink bg-cream">
              <BookOpen size={16} />
            </span>
            <span className="flex-1">
              <span className="block text-[12.5px] font-bold">不想读？直接问 AI 助手</span>
              <span className="mt-0.5 block text-[10.5px] text-ink/55">浮屏问答，不打断阅读</span>
            </span>
            <ArrowUpRight size={15} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border-1.5 border-ink bg-cream">
        <motion.div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 font-mono text-[9.5px] tracking-wide text-ink/40">
          <span>知识库持续更新</span>
          <span className="h-1 w-1 rounded-full bg-ink/20" />
          <span>最近一次：2026.09.18</span>
          <span className="h-1 w-1 rounded-full bg-ink/20" />
          <span>引用请注明来源</span>
          <span className="ml-auto flex items-center gap-1.5">
            <Sparkles size={11} /> 有想看的主题？去留言墙告诉我
          </span>
        </motion.div>
      </div>

      <AIAssistant defaultOpen={params.get('assistant') === '1'} />
    </div>
  )
}
