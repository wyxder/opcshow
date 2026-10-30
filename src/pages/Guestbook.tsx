import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, Send, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Marquee, PageIntro, Sticker } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { cn, readableInk, useLocalStorage } from '@/lib/utils'
import { STORAGE_KEYS, isStringArray } from '@/lib/storage'
import { useSeo } from '@/lib/seo'
import { AbuseBlockedError, guestbook, type GuestMessage } from '@/services/guestbook'
import { serverConfig } from '@/services/config'

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
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [color, setColor] = useState(colors[0])
  const [sending, setSending] = useState(false)
  const { show, node } = useToast()

  useSeo({
    title: '留言弹幕墙 · 魏云潇',
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

  const rows = useMemo(() => {
    const r: GuestMessage[][] = [[], [], [], []]
    items.forEach((m, i) => r[i % 4].push(m))
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

  return (
    <div className="shell">
      <PageIntro
        kicker="05 / ME · GUESTBOOK"
        title={
          <>
            留言，
            <br />
            会<span className="marker">飞过去</span>
          </>
        }
        desc="不用登录，不用邮箱。写一句话，它会成为墙上飘过去的一条弹幕。想聊正事可以留邮箱，我会回。"
        note={serverConfig.enabled ? '留言进入审核队列，通过后才会上公共墙。' : '当前没有服务端：你的留言只存在自己的浏览器里。'}
        right={
          <div className="flex flex-wrap gap-2">
            <Sticker rotate={-4} color="rgb(var(--c-lime))">
              {items.length} 条留言
            </Sticker>
            <Sticker rotate={5} color="rgb(var(--c-sky))">
              {guestbook.origin === 'local' ? '本机存储' : '服务端存储'}
            </Sticker>
          </div>
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
          {rows.map((row, i) => (
            <Marquee
              key={i}
              speed={26 + i * 7}
              reverse={i % 2 === 1}
              separator=""
              items={row.map((m) => (
                <span
                  key={m.id}
                  className="whitespace-nowrap rounded-full border border-paper/25 px-3 py-1.5 text-[11.5px]"
                  style={{ background: m.color, color: readableInk(m.color) }}
                >
                  <span className="font-semibold">{m.user}</span>
                  <span className="mx-1.5 opacity-30">/</span>
                  {m.text}
                  <span className="ml-2 rounded bg-ink/10 px-1 font-mono text-[9px] opacity-60">{sourceLabel[m.source]}</span>
                </span>
              ))}
            />
          ))}
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
            <span className="font-mono text-[9px] text-ink/35">{items.length} 条</span>
          </div>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence initial={false}>
              {items.map((m) => {
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
                        onClick={() => setLikes((l) => (l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id]))}
                        className={cn('font-mono text-[9px] transition', likes.includes(m.id) ? 'text-coral' : 'text-ink/30 hover:text-ink')}
                        aria-label="点赞"
                      >
                        ♥ {likes.includes(m.id) ? 1 : 0}
                      </button>
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
