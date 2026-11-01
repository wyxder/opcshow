import { AnimatePresence, motion } from 'framer-motion'
import { Flag, MessageSquare, Send, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Marquee, PageHead } from '@/components/ui/primitives'
import { danmakuSeeds } from '@/data/me'
import { useToast } from '@/components/ui/Toast'
import { cn, readableInk, useLocalStorage } from '@/lib/utils'
import { STORAGE_KEYS, isStringArray } from '@/lib/storage'
import { useSeo } from '@/lib/seo'
import { AbuseBlockedError, guestbook, reportMessage, toggleLike, type GuestMessage } from '@/services/guestbook'

const colors = ['rgb(var(--c-lime))', 'rgb(var(--c-rose))', 'rgb(var(--c-sky))', 'rgb(var(--c-coral))', 'rgb(var(--c-grape))', 'rgb(var(--c-surface))']

/** 数据来源标注（执行要求 2：UI 上要看得出真实 / 预置） */
const sourceLabel: Record<GuestMessage['source'], string> = {
  preset: '预置',
  local: '本机',
  remote: '服务端',
}

export default function Guestbook() {
  const [items, setItems] = useState<GuestMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [likes, setLikes] = useLocalStorage<string[]>(STORAGE_KEYS.guestbookLikes, [], isStringArray)
  /** 服务端留言的真实点赞态；本机留言仍走 localStorage（来源不同，不混算） */
  const [remoteLikes, setRemoteLikes] = useState<Record<string, { likes: number; liked: boolean }>>({})
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [color, setColor] = useState(colors[0])
  const [sending, setSending] = useState(false)
  const { show, node } = useToast()

  useSeo({
    title: '留言弹幕墙 · 晓叶',
    description: '不用登录，写一句话，它会成为墙上飘过去的一条弹幕。',
    path: '/me/guestbook',
  })

  useEffect(() => {
    let alive = true
    guestbook
      .list()
      .then((list) => alive && (setItems(list), setLoading(false)))
      .catch(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  /** 真实（本机 / 服务端）留言：排在弹幕墙上层，带来源标签 */
  const real = useMemo(() => items.filter((m) => m.source !== 'preset'), [items])

  const rows = useMemo(() => {
    const r: GuestMessage[][] = [[], [], [], []]
    real.forEach((m, i) => r[i % 4].push(m))
    return r
  }, [real])

  /** 内置示例（preset）留言：垫在墙底层常驻飞行，让墙面永远不空；按内容 hash 稳定分四行。
   * 服务端模式下接口不返回种子，这里兜底直接读 danmakuSeeds */
  const presetRows = useMemo(() => {
    const presets: GuestMessage[] = items.filter((m) => m.source === 'preset')
    const seeds: GuestMessage[] = presets.length > 0 ? presets : danmakuSeeds.map((d) => ({ ...d, time: '来访', source: 'preset' }))
    const r: GuestMessage[][] = [[], [], [], []]
    seeds.forEach((m, i) => {
      const slot = [...m.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 4
      r[(slot + i % 4) % 4].push(m)
    })
    return r
  }, [items])

  const submit = async () => {
    if (sending) return
    setSending(true)
    try {
      const msg = await guestbook.create({ user: name, text, color })
      setItems((l) => [msg, ...l])
      setText('')
      show(guestbook.origin === 'local' ? '留言已飞上墙（仅存在本机浏览器）' : '已提交，等待审核后出现在公共墙')
    } catch (err) {
      show(err instanceof AbuseBlockedError ? err.message : '这一步没成功，稍后再试')
    } finally {
      setSending(false)
    }
  }

  const remove = async (id: string) => {
    await guestbook.remove(id)
    setItems((l) => l.filter((x) => x.id !== id))
  }

  /** F-07 点赞：服务端留言按 id 落库去重；本机留言仍只存本地 */
  const like = async (m: GuestMessage) => {
    if (m.source === 'remote') {
      const res = await toggleLike(m.id)
      if (res) setRemoteLikes((x) => ({ ...x, [m.id]: res }))
      else show('点赞没成功：服务端暂时不可用')
      return
    }
    setLikes((l) => (l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id]))
  }

  const likeState = (m: GuestMessage) => {
    if (m.source === 'remote') {
      const own = remoteLikes[m.id]
      return { liked: own?.liked ?? false, count: own?.likes ?? m.likes ?? 0 }
    }
    return { liked: likes.includes(m.id), count: likes.includes(m.id) ? 1 : 0 }
  }

  const report = async (m: GuestMessage) => {
    if (m.source !== 'remote') {
      show('本机留言不需要举报')
      return
    }
    const ok = await reportMessage(m.id)
    show(ok ? '已举报，累计 3 次会重新进入审核' : '举报失败：服务端暂时不可用')
  }

  /** 弹幕胶囊样式：真实 / 预置两层共用，仅尺寸与标签不同 */
  const chipClass = (preset: boolean) =>
    cn(
      'whitespace-nowrap rounded-full border',
      preset ? 'border-paper/15 px-2.5 py-1 text-[10.5px] opacity-70' : 'border-paper/25 px-3 py-1.5 text-[11.5px]',
    )
  const chipStyle = (m: GuestMessage) => ({ background: m.color, color: readableInk(m.color) })

  return (
    <div className="shell">
      <PageHead
        kicker="05 / ME · GUESTBOOK"
        title="留言，会飞过去"
        right={
          <span className="font-mono text-[9.5px] text-ink/45">
            {real.length} 条真实留言 · {guestbook.origin === 'local' ? '本机存储' : '服务端存储'}
          </span>
        }
      />

      {/* danmaku wall */}
      <div className="relative overflow-hidden rounded-[26px] border-1.5 border-ink bg-ink py-6 shadow-hard">
        <div className="absolute inset-0 halftone opacity-[0.14]" />
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-ink to-transparent" />
        <div className="relative flex items-center justify-between px-5 pb-3">
          <p className="font-mono text-[9px] tracking-[0.22em] text-lime">DANMAKU WALL · {guestbook.origin === 'local' ? 'LOCAL' : 'LIVE'}</p>
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-paper/40">
            <span className={cn('h-1.5 w-1.5 rounded-full', guestbook.origin === 'local' ? 'bg-paper/30' : 'animate-blink bg-coral')} />
            {guestbook.origin === 'local' ? '仅你可见' : '实时'}
          </span>
        </div>
        <div className="relative space-y-2.5">
          {loading && <p className="px-5 text-center font-mono text-[10px] text-paper/35">LOADING…</p>}
          {!loading && real.length === 0 && (
            <p className="px-5 py-3 text-center font-mono text-[10px] text-paper/40">
              还没有真实留言——写下第一句，它就会飞上这面墙。
            </p>
          )}
          {!loading &&
            real.length > 0 &&
            rows
              .filter((row) => row.length > 0)
              .map((row, i) => (
              <Marquee
                key={i}
                speed={26 + i * 7}
                reverse={i % 2 === 1}
                separator=""
                fill
                items={row.map((m) => (
                  <span key={m.id} className={chipClass(false)} style={chipStyle(m)}>
                    <span className="font-semibold">{m.user}</span>
                    <span className="mx-1.5 opacity-30">/</span>
                    {m.text}
                    <span className="ml-2 rounded bg-ink/10 px-1 font-mono text-[9px] opacity-60">{sourceLabel[m.source]}</span>
                  </span>
                ))}
              />
            ))}
          {/* 内置示例弹幕：垫在真实留言下方常驻飞行，铺满整屏，保证墙面不空、观感完整 */}
          {!loading &&
            presetRows.map((row, i) =>
              row.length > 0 ? (
                <Marquee
                  key={`p${i}`}
                  speed={34 + i * 8}
                  reverse={i % 2 === 0}
                  separator=""
                  fill
                  items={row.map((m) => (
                    <span key={m.id} className={chipClass(true)} style={chipStyle(m)}>
                      <span className="font-semibold">{m.user}</span>
                      <span className="mx-1 opacity-30">/</span>
                      {m.text}
                    </span>
                  ))}
                />
              ) : null,
            )}
        </div>
        <p className="relative mt-4 px-5 text-center font-hand text-[19px] text-paper/35">写点什么都行，我不会截图发群里。</p>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* form */}
        <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} />
            <h2 className="text-[15px] font-extrabold">写一条留言</h2>
          </div>
          <p className="mt-1 text-[11px] text-ink/45">最多 60 字，够说一句话了。同一句话 30 秒内不能连发。</p>

          <div className="mt-3 space-y-2.5">
            <div>
              <label className="font-mono text-[9px] tracking-[0.16em] text-ink/35" htmlFor="gb-name">
                你的名字
              </label>
              <input
                id="gb-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                placeholder="怎么称呼你？"
                className="mt-1 w-full rounded-xl border-1.5 border-ink/15 bg-paper px-3 py-2 text-[12px] outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] tracking-[0.16em] text-ink/35" htmlFor="gb-text">
                留言内容
              </label>
              <textarea
                id="gb-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={60}
                rows={3}
                placeholder="想说的、想问的、想吐槽的都可以。"
                className="mt-1 w-full resize-none rounded-xl border-1.5 border-ink/15 bg-paper px-3 py-2 text-[12px] outline-none focus:border-ink"
              />
              <p className="mt-1 text-right font-mono text-[9px] text-ink/30">{text.length} / 60</p>
            </div>
            <div>
              <span className="font-mono text-[9px] tracking-[0.16em] text-ink/35">弹幕颜色</span>
              <div className="mt-1.5 flex gap-2" role="group" aria-label="弹幕颜色">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn('h-7 w-7 rounded-full border-1.5 transition', color === c ? 'scale-110 border-ink' : 'border-ink/20')}
                    style={{ background: c }}
                    aria-label={`选择颜色 ${c}`}
                    aria-pressed={color === c}
                  />
                ))}
              </div>
            </div>
            <button onClick={submit} disabled={sending} className="btn-ink w-full !py-2.5 !text-[12.5px] disabled:opacity-50">
              <Send size={13} /> {sending ? '发送中…' : '发到弹幕墙'}
            </button>
          </div>
        </div>

        {/* recent */}
        <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">最近的留言</h2>
            <span className="font-mono text-[9px] text-ink/35">{real.length} 条</span>
          </div>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
            {!loading && real.length === 0 && (
              <p className="rounded-xl border border-dashed border-ink/20 px-3 py-6 text-center text-[11.5px] text-ink/40">
                这里还空着。左侧写一条，它就会出现在墙上与下方列表。
              </p>
            )}
            <AnimatePresence initial={false}>
              {real.map((m) => {
                const isMine = m.source === 'local'
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="group flex items-start gap-2.5 rounded-xl border border-ink/10 bg-paper px-3 py-2.5"
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink/20 font-mono text-[9px] font-bold"
                      style={{ background: m.color, color: readableInk(m.color) }}
                    >
                      {m.user.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-1.5">
                        <span className="text-[11.5px] font-semibold">{m.user}</span>
                        <span className="font-mono text-[9.5px] text-ink/30">{m.time}</span>
                        <span className="rounded bg-ink/5 px-1 font-mono text-[9px] text-ink/45">{sourceLabel[m.source]}</span>
                        {isMine && <span className="rounded bg-lime px-1 font-mono text-[9.5px]">NEW</span>}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/65">{m.text}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => void like(m)}
                        className={cn('font-mono text-[9px] transition', likeState(m).liked ? 'text-coral' : 'text-ink/30 hover:text-ink')}
                        aria-label="点赞"
                        aria-pressed={likeState(m).liked}
                      >
                        ♥ {likeState(m).count}
                      </button>
                      {m.source === 'remote' && (
                        <button onClick={() => void report(m)} className="text-ink/20 hover:text-coral" aria-label="举报留言">
                          <Flag size={11} />
                        </button>
                      )}
                      {isMine && (
                        <button onClick={() => remove(m.id)} className="text-ink/20 hover:text-coral" aria-label="删除留言">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
          <p className="mt-3 flex items-center gap-1.5 border-t border-dashed border-ink/15 pt-3 font-mono text-[9px] text-ink/35">
            <Sparkles size={10} /> {guestbook.origin === 'local' ? '你的留言只存在本地，不会被上传' : '留言会提交到服务端并进入审核队列'}
          </p>
        </div>
      </div>

      {node}
    </div>
  )
}
