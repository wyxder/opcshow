import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Heart, ImagePlus, MapPin, MessageCircle, Send, Share2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PageHead } from '@/components/ui/primitives'
import { SmartImage } from '@/components/SmartImage'
import { useToast } from '@/components/ui/Toast'
import { moments as seedMoments, type Moment } from '@/data/life'
import { lookupMedia } from '@/data/media'
import { cn, newId, readableInk, useLocalStorage } from '@/lib/utils'
import { STORAGE_KEYS, arrayOf, isRecordOf, isStringArray } from '@/lib/storage'
import { useSeo } from '@/lib/seo'
import { serverConfig } from '@/services/config'
import { contents } from '@/services/content'

const isMomentArray = arrayOf<Moment>((m) => typeof m.id === 'string' && typeof m.text === 'string')
const isCommentRecord = isRecordOf<string[]>((v) => isStringArray(v))

export default function Moments() {
  const [extra, setExtra] = useLocalStorage<Moment[]>(STORAGE_KEYS.momentsExtra, [], isMomentArray)
  const [liked, setLiked] = useLocalStorage<string[]>(STORAGE_KEYS.momentsLiked, [], isStringArray)
  const [comments, setComments] = useLocalStorage<Record<string, { user: string; text: string }[]>>(
    STORAGE_KEYS.momentsComments,
    {},
    isCommentRecord as never,
  )
  const [draft, setDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const [openComment, setOpenComment] = useState<string | null>(null)
  const { show, node } = useToast()

  useSeo({
    title: '朋友圈 · 晓叶',
    description: '项目的坑、比赛的现场、路上的风景，还有那些不适合放进简历的废话。',
    path: '/life/moments',
  })

  const feed = [...extra, ...seedMoments]
  const hotTags = ['深夜 coding', '黑客松', 'debug 日常', '骑行', '开源', '分享']
  /** 站内登记的真实图片数量（F1：图片没上传前一律走图形兜底） */
  const withPhoto = feed.filter((m) => m.media.some((x) => lookupMedia(x.label))).length

  const post = async () => {
    if (!draft.trim()) return
    const text = draft.trim()
    const m: Moment = {
      id: newId(serverConfig.enabled ? 'moment' : 'local'),
      time: '刚刚',
      text,
      place: '西安',
      likes: 0,
      accent: 'rgb(var(--c-lime))',
      media: [],
      comments: [],
      tags: ['新动态'],
    }
    // FE-03：接服务端时真实落库（pending），不再只写本机还报「已提交」
    if (serverConfig.enabled) {
      try {
        await contents.create('moments', m.id, { ...m, status: 'pending' })
        setDraft('')
        show('已提交到服务端，审核通过后公开')
      } catch (err) {
        show(`提交失败：${(err as Error).message}`)
      }
      return
    }
    setExtra((l) => [m, ...l])
    setDraft('')
    show('已经发到朋友圈了（只存在你的浏览器里）')
  }

  const share = async () => {
    const url = location.href
    try {
      await navigator.clipboard.writeText(url)
      show('链接已复制到剪贴板')
    } catch {
      // 非安全上下文 / 权限被拒：选中文本栏而不是报错
      show(`复制这个地址：${url}`)
    }
  }

  const addComment = (id: string) => {
    const text = commentDraft[id]?.trim()
    if (!text) return
    setComments((c) => ({ ...c, [id]: [...(c[id] ?? []), { user: '你', text }] }))
    setCommentDraft((d) => ({ ...d, [id]: '' }))
  }

  return (
    <div className="shell">
      <PageHead
        kicker="04 / LIFE · MOMENTS"
        title="碎碎念与深夜复盘"
        right={
          <div className="flex items-center gap-2 font-mono text-[9px] text-ink/40">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-coral" />
            {serverConfig.enabled ? 'LIVE' : '本机'} · {feed.length} 条 · {withPhoto} 条有真实配图
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {/* composer */}
          <div className="mb-4 rounded-2xl border-1.5 border-ink bg-cream p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-1.5 border-ink bg-lime font-display text-[15px] font-extrabold">魏</div>
              <div className="flex-1">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="说点什么…（比如：今天的 badcase 是怎么定位的）"
                  className="w-full resize-none rounded-xl border border-ink/12 bg-paper px-3 py-2 text-[12.5px] outline-none placeholder:text-ink/35 focus:border-ink"
                />
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-ink/35">
                    <button className="rounded-lg p-1.5 hover:bg-paper hover:text-ink" aria-label="添加图片">
                      <ImagePlus size={14} />
                    </button>
                    <button className="rounded-lg p-1.5 hover:bg-paper hover:text-ink" aria-label="拍照">
                      <Camera size={14} />
                    </button>
                    <span className="ml-1 font-mono text-[9px]">支持换行 · 配图需先上传到资源位（F1）</span>
                  </div>
                  <button onClick={post} disabled={!draft.trim()} className="btn-ink !py-1.5 !text-[11.5px] disabled:opacity-30">
                    <Send size={12} /> 发表
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {feed.map((m, i) => {
                const isLiked = liked.includes(m.id)
                const allComments = [...m.comments, ...(comments[m.id] ?? [])]
                return (
                  <motion.article
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="relative overflow-hidden rounded-2xl border-1.5 border-ink bg-cream p-4 sm:p-5"
                  >
                    <span className="absolute right-3 top-3 font-display text-[30px] font-extrabold leading-none text-ink/[0.06]">
                      {String(feed.length - i).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-ink font-display text-[13px] font-extrabold" style={{ background: m.accent, color: readableInk(m.accent) }}>
                        魏
                      </div>
                      <div className="leading-tight">
                        <p className="text-[12.5px] font-bold">晓叶</p>
                        <p className="flex items-center gap-1.5 font-mono text-[9px] text-ink/40">
                          {m.time}
                          {m.place && (
                            <>
                              <span className="h-0.5 w-0.5 rounded-full bg-ink/30" />
                              <MapPin size={8} /> {m.place}
                            </>
                          )}
                        </p>
                      </div>
                      <span className="ml-auto mr-8 rounded-full border border-ink/15 px-2 py-0.5 font-mono text-[9.5px] text-ink/40">
                        {m.tags[0]}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-[13px] leading-[1.85] text-ink/80">{m.text}</p>

                    {m.media.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.media.map((md, k) => {
                          const asset = lookupMedia(md.label)
                          return (
                            <SmartImage
                              key={k}
                              asset={asset}
                              className="h-[124px] w-[168px] rounded-xl border border-ink/15"
                              fallback={
                                <div
                                  className="relative flex h-[124px] w-[168px] items-end overflow-hidden rounded-xl border border-ink/15"
                                  style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${m.accent} 33%, transparent), rgb(var(--c-surface)) 70%)` }}
                                >
                                  <div className="absolute inset-0 halftone opacity-30" />
                                  <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border border-ink/20 bg-cream/80">
                                    {md.kind === 'photo' ? <Camera size={11} /> : <Sparkles size={11} />}
                                  </div>
                                  <span className="relative m-2 rounded border border-ink/15 bg-cream/90 px-1.5 py-0.5 font-mono text-[9.5px] text-ink/55">
                                    {md.label}
                                  </span>
                                  {md.kind === 'photo' && (
                                    <span className="absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[8.5px] text-paper/80">配图待传</span>
                                  )}
                                </div>
                              }
                            />
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 border-t border-dashed border-ink/12 pt-2.5">
                      <button
                        onClick={() => setLiked((l) => (l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id]))}
                        className={cn('flex items-center gap-1.5 text-[10.5px] transition', isLiked ? 'text-coral' : 'text-ink/40 hover:text-ink')}
                      >
                        <Heart size={13} className={isLiked ? 'fill-coral' : ''} /> {m.likes + (isLiked ? 1 : 0)}
                      </button>
                      <button
                        onClick={() => setOpenComment(openComment === m.id ? null : m.id)}
                        className="flex items-center gap-1.5 text-[10.5px] text-ink/40 transition hover:text-ink"
                      >
                        <MessageCircle size={13} /> {allComments.length || '评论'}
                      </button>
                      <button onClick={share} className="ml-auto text-ink/30 transition hover:text-ink" aria-label="复制本页链接">
                        <Share2 size={13} />
                      </button>
                    </div>

                    {allComments.length > 0 && (
                      <div className="mt-2.5 space-y-1 rounded-xl bg-paper px-3 py-2">
                        {allComments.map((c, k) => (
                          <p key={k} className="text-[11px] leading-relaxed">
                            <span className={cn('font-semibold', c.user === '你' ? 'text-blue' : 'text-ink/70')}>{c.user}</span>
                            <span className="text-ink/30">：</span>
                            <span className="text-ink/60">{c.text}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    <AnimatePresence>
                      {openComment === m.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={commentDraft[m.id] ?? ''}
                              onChange={(e) => setCommentDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addComment(m.id)}
                              placeholder="说点什么…"
                              className="flex-1 rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5 text-[11px] outline-none focus:border-ink"
                            />
                            <button onClick={() => addComment(m.id)} className="rounded-lg border-1.5 border-ink bg-lime px-2.5 py-1.5" aria-label="发送评论">
                              <Send size={11} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border-1.5 border-ink bg-cream">
            <div className="relative h-24 bg-gradient-to-br from-lime via-sky to-rose">
              <div className="absolute inset-0 halftone opacity-20" />
            </div>
            <div className="px-4 pb-4">
              <div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full border-1.5 border-ink bg-cream font-display text-lg font-extrabold">魏</div>
              <p className="mt-1.5 text-[13px] font-bold">晓叶</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink/45">白天写 Agent，晚上剪视频。朋友圈是我的公开笔记本。</p>
              <div className="mt-3 grid grid-cols-3 gap-1 border-t border-dashed border-ink/15 pt-3 text-center">
                {[
                  ['动态', feed.length],
                  ['照片', '2,403'],
                  ['好友', '86'],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <p className="font-display text-[14px] font-extrabold">{v}</p>
                    <p className="font-mono text-[9.5px] text-ink/35">{k}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-cream p-4">
            <p className="font-mono text-[9px] tracking-[0.16em] text-ink/35">HOT TAGS</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {hotTags.map((t) => (
                <span key={t} className="rounded-full border border-ink/15 bg-paper px-2 py-0.5 text-[10px] text-ink/55">
                  # {t}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-ink p-4 text-paper">
            <p className="font-mono text-[9px] tracking-[0.16em] text-lime">VISITORS</p>
            <div className="mt-2.5 flex -space-x-2">
              {['羊', '陈', '哲', 'L', 'K'].map((v, i) => (
                <div
                  key={v}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink text-[10px] font-bold text-ink"
                  style={{ background: ['rgb(var(--c-rose))', 'rgb(var(--c-sky))', 'rgb(var(--c-lime))', 'rgb(var(--c-surface-2))', 'rgb(var(--c-grape))'][i] }}
                >
                  {v}
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-paper/50">最近来过的朋友。留言墙那边也能看到他们。</p>
          </div>
        </aside>
      </div>

      {node}
    </div>
  )
}
