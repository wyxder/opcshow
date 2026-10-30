import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, Send, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Marquee, PageIntro, Sticker } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { danmakuSeeds } from '@/data/me'
import { cn, readableInk, useLocalStorage } from '@/lib/utils'

type Msg = { id: string; user: string; text: string; color: string; time: string }

const colors = ['rgb(var(--c-lime))', 'rgb(var(--c-rose))', 'rgb(var(--c-sky))', 'rgb(var(--c-coral))', 'rgb(var(--c-grape))', 'rgb(var(--c-surface))']

export default function Guestbook() {
  const [mine, setMine] = useLocalStorage<Msg[]>('wyx-guestbook', [])
  const [likes, setLikes] = useLocalStorage<string[]>('wyx-guestbook-likes', [])
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [color, setColor] = useState(colors[0])
  const { show, node } = useToast()

  const all = useMemo<Msg[]>(
    () => [...mine, ...danmakuSeeds.map((d) => ({ id: d.id, user: d.user, text: d.text, color: d.color, time: '来访' }))],
    [mine],
  )

  const rows = useMemo(() => {
    const r: Msg[][] = [[], [], [], []]
    all.forEach((m, i) => r[i % 4].push(m))
    return r
  }, [all])

  const submit = () => {
    if (!name.trim() || !text.trim()) {
      show('名字和内容都写一点吧')
      return
    }
    const msg: Msg = {
      id: `m-${Date.now()}`,
      user: name.trim().slice(0, 12),
      text: text.trim().slice(0, 60),
      color,
      time: new Date().toLocaleDateString('zh-CN'),
    }
    setMine((l) => [msg, ...l])
    setText('')
    show('留言已飞上墙（存在本地）')
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
        note="演示站点：留言存在你自己的浏览器里。"
        right={
          <div className="flex flex-wrap gap-2">
            <Sticker rotate={-4} color="rgb(var(--c-lime))">
              {all.length} 条留言
            </Sticker>
            <Sticker rotate={5} color="rgb(var(--c-sky))">
              无需登录
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
          <p className="font-mono text-[9px] tracking-[0.22em] text-lime">DANMAKU WALL · LIVE</p>
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-paper/40">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-coral" /> 实时
          </span>
        </div>
        <div className="relative space-y-2.5">
          {rows.map((row, i) => (
            <Marquee
              key={i}
              speed={26 + i * 7}
              reverse={i % 2 === 1}
              separator=""
              items={row.map((m) => (
                <span
                  key={m.id}
                  className="whitespace-nowrap rounded-full border border-paper/25 px-3 py-1.5 text-[11.5px] text-ink"
                  style={{ background: m.color, color: readableInk(m.color) }}
                >
                  <span className="font-semibold">{m.user}</span>
                  <span className="mx-1.5 opacity-30">/</span>
                  {m.text}
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
          <p className="mt-1 text-[11px] text-ink/45">最多 60 字，够说一句话了。</p>

          <div className="mt-3 space-y-2.5">
            <div>
              <label className="font-mono text-[9px] tracking-[0.16em] text-ink/35">你的名字</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                placeholder="怎么称呼你？"
                className="mt-1 w-full rounded-xl border-1.5 border-ink/15 bg-paper px-3 py-2 text-[12px] outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] tracking-[0.16em] text-ink/35">留言内容</label>
              <textarea
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
              <label className="font-mono text-[9px] tracking-[0.16em] text-ink/35">弹幕颜色</label>
              <div className="mt-1.5 flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn('h-7 w-7 rounded-full border-1.5 transition', color === c ? 'scale-110 border-ink' : 'border-ink/20')}
                    style={{ background: c }}
                    aria-label={`选择颜色 ${c}`}
                  />
                ))}
              </div>
            </div>
            <button onClick={submit} className="btn-ink w-full !py-2.5 !text-[12.5px]">
              <Send size={13} /> 发到弹幕墙
            </button>
          </div>
        </div>

        {/* recent */}
        <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">最近的留言</h2>
            <span className="font-mono text-[9px] text-ink/35">{all.length} 条</span>
          </div>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence initial={false}>
              {all.map((m) => {
                const isMine = m.id.startsWith('m-')
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="group flex items-start gap-2.5 rounded-xl border border-ink/10 bg-paper px-3 py-2.5"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink/20 font-mono text-[9px] font-bold" style={{ background: m.color, color: readableInk(m.color) }}>
                      {m.user.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-1.5">
                        <span className="text-[11.5px] font-semibold">{m.user}</span>
                        <span className="font-mono text-[9.5px] text-ink/30">{m.time}</span>
                        {isMine && <span className="rounded bg-lime px-1 font-mono text-[9.5px]">NEW</span>}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/65">{m.text}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setLikes((l) => (l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id]))}
                        className={cn('font-mono text-[9px] transition', likes.includes(m.id) ? 'text-coral' : 'text-ink/30 hover:text-ink')}
                      >
                        ♥ {likes.includes(m.id) ? 1 : 0}
                      </button>
                      {isMine && (
                        <button onClick={() => setMine((l) => l.filter((x) => x.id !== m.id))} className="text-ink/20 hover:text-coral" aria-label="删除留言">
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
            <Sparkles size={10} /> 你的留言只存在本地，不会被上传
          </p>
        </div>
      </div>

      {node}
    </div>
  )
}
