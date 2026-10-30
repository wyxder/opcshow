import { motion } from 'framer-motion'
import { ArrowRight, Heart, ListMusic, Music2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageIntro, Plate, Sticker } from '@/components/ui/primitives'
import { playlist } from '@/data/life'
import { cn, fmtDuration, useLocalStorage } from '@/lib/utils'

export default function MusicBox() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(72)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(true)
  const [favorites, setFavorites] = useLocalStorage<string[]>('wyx-music-fav', ['p1', 'p4'])

  const track = playlist[index]
  const lyricLine = Math.min(track.lyric.length - 1, Math.floor((progress / track.duration) * track.lyric.length))

  useEffect(() => {
    if (!playing) return
    const t = window.setInterval(() => {
      setProgress((p) => {
        if (p + 1 >= track.duration) {
          if (repeat) return 0
          setIndex((i) => (shuffle ? Math.floor(Math.random() * playlist.length) : (i + 1) % playlist.length))
          return 0
        }
        return p + 1
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [playing, track.duration, repeat, shuffle])

  useEffect(() => {
    setProgress(0)
  }, [index])

  const jump = (dir: number) => {
    setIndex((i) => (i + dir + playlist.length) % playlist.length)
    setPlaying(true)
  }

  const totalDuration = useMemo(() => playlist.reduce((s, t) => s + t.duration, 0), [])

  return (
    <div className="shell">
      <PageIntro
        kicker="04 / LIFE · MUSIC BOX"
        title={
          <>
            写代码时
            <br />
            我在<span className="marker">听什么</span>
          </>
        }
        desc="六首歌，对应六种状态：写需求、跑评测、改 bug、想她、想家、夜骑。没有真实音频，但播放器是真的在走。"
        note="演示播放器：进度会走，声音不会响。"
        right={
          <div className="flex flex-wrap gap-2">
            <Sticker rotate={-4}>{playlist.length} 首</Sticker>
            <Sticker rotate={5} color="#BFD8FF">
              总时长 {Math.round(totalDuration / 60)} min
            </Sticker>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        {/* player */}
        <div className="relative overflow-hidden rounded-[26px] border-1.5 border-ink bg-ink p-5 text-paper shadow-hard sm:p-6">
          <div className="absolute inset-0 halftone opacity-[0.14]" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="font-mono text-[9px] tracking-[0.2em] text-lime">NOW PLAYING</p>
              <p className="mt-1 font-mono text-[9px] text-paper/35">WYX MUSIC BOX · SIDE A</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-paper/20 px-2 py-0.5 font-mono text-[9.5px] text-paper/50">
              <span className={cn('h-1.5 w-1.5 rounded-full', playing ? 'animate-blink bg-lime' : 'bg-paper/30')} />
              {playing ? 'PLAYING' : 'PAUSED'}
            </span>
          </div>

          <div className="relative mt-5 flex items-center gap-4">
            <div className="relative h-[112px] w-[112px] shrink-0 sm:h-[132px] sm:w-[132px]">
              <motion.div
                className="h-full w-full overflow-hidden rounded-full border-1.5 border-paper/40"
                animate={{ rotate: playing ? 360 : 0 }}
                transition={playing ? { duration: 12, repeat: Infinity, ease: 'linear' } : { duration: 0.8 }}
              >
                <Plate motif="rings" accent={track.color} className="h-full w-full" />
              </motion.div>
              <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-1.5 border-paper/40 bg-ink" />
              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] tracking-wide text-paper/40">{track.mood}</p>
              <h2 className="mt-1 truncate text-[24px] font-extrabold leading-tight">{track.title}</h2>
              <p className="truncate text-[12px] text-paper/50">
                {track.artist} · {track.album}
              </p>

              <div className="mt-3 flex h-8 items-end gap-[3px]">
                {track.bars.map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-full flex-1 rounded-sm"
                    style={{ background: i % 3 === 0 ? '#C9F158' : 'rgba(251,248,241,0.35)' }}
                    animate={playing ? { height: [`${h * 0.35}%`, `${h}%`, `${h * 0.55}%`] } : { height: `${h * 0.35}%` }}
                    transition={playing ? { duration: 0.8 + (i % 5) * 0.14, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* progress */}
          <div className="relative mt-5">
            <button
              className="group block w-full"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setProgress(Math.round(((e.clientX - rect.left) / rect.width) * track.duration))
              }}
              aria-label="跳转进度"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper/15">
                <div className="h-full rounded-full bg-lime transition-[width] duration-300" style={{ width: `${(progress / track.duration) * 100}%` }} />
              </div>
            </button>
            <div className="mt-1.5 flex justify-between font-mono text-[9px] text-paper/40">
              <span>{fmtDuration(progress)}</span>
              <span>{fmtDuration(track.duration)}</span>
            </div>
          </div>

          {/* lyrics */}
          <div className="relative mt-4 rounded-xl border border-paper/15 bg-paper/[0.04] px-3 py-2.5">
            <p className="font-mono text-[9px] tracking-[0.16em] text-paper/30">LYRICS · 滚动歌词</p>
            <div className="mt-1.5 space-y-1">
              {track.lyric.map((l, i) => (
                <p key={l} className={cn('text-[12px] leading-tight transition-all duration-500', i === lyricLine ? 'translate-x-1 font-semibold text-lime' : 'text-paper/30')}>
                  {l}
                </p>
              ))}
            </div>
          </div>

          {/* controls */}
          <div className="relative mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShuffle((v) => !v)}
                className={cn('flex h-8 w-8 items-center justify-center rounded-full transition', shuffle ? 'bg-lime/20 text-lime' : 'text-paper/40 hover:text-paper')}
                aria-label="随机播放"
              >
                <Shuffle size={13} />
              </button>
              <button
                onClick={() => setRepeat((v) => !v)}
                className={cn('flex h-8 w-8 items-center justify-center rounded-full transition', repeat ? 'bg-lime/20 text-lime' : 'text-paper/40 hover:text-paper')}
                aria-label="单曲循环"
              >
                <Repeat size={13} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => jump(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/25 transition hover:bg-paper/10" aria-label="上一首">
                <SkipBack size={14} />
              </button>
              <button
                onClick={() => setPlaying((v) => !v)}
                className="flex h-12 w-12 items-center justify-center rounded-full border-1.5 border-paper bg-lime text-ink transition hover:scale-105"
                aria-label={playing ? '暂停' : '播放'}
              >
                {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <button onClick={() => jump(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/25 transition hover:bg-paper/10" aria-label="下一首">
                <SkipForward size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => setVolume((v) => (v > 0 ? 0 : 72))} className="text-paper/50 hover:text-paper" aria-label="静音">
                {volume > 0 ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-paper/20 accent-lime"
                aria-label="音量"
              />
            </div>
          </div>
        </div>

        {/* playlist */}
        <div className="rounded-[26px] border-1.5 border-ink bg-cream p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-ink/12 pb-3">
            <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
              <ListMusic size={16} /> 播放列表
            </h2>
            <span className="font-mono text-[9px] text-ink/40">{playlist.length} TRACKS</span>
          </div>
          <div className="mt-1">
            {playlist.map((t, i) => {
              const isActive = i === index
              return (
                <div
                  key={t.id}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors',
                    isActive ? 'bg-lime/35' : 'hover:bg-paper',
                  )}
                >
                  <button
                    onClick={() => {
                      setIndex(i)
                      setPlaying(true)
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-1.5 border-ink bg-cream"
                    style={{ background: isActive ? t.color : undefined }}
                    aria-label={`播放 ${t.title}`}
                  >
                    {isActive && playing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setIndex(i)
                      setPlaying(true)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className={cn('truncate text-[12.5px]', isActive ? 'font-bold' : 'font-medium')}>{t.title}</p>
                    <p className="truncate text-[10px] text-ink/45">
                      {t.artist} · {t.mood}
                    </p>
                  </button>
                  <button
                    onClick={() => setFavorites((f) => (f.includes(t.id) ? f.filter((x) => x !== t.id) : [...f, t.id]))}
                    className="shrink-0 p-1"
                    aria-label="喜欢"
                  >
                    <Heart size={13} className={cn(favorites.includes(t.id) ? 'fill-coral text-coral' : 'text-ink/20 hover:text-ink/50')} />
                  </button>
                  <span className="w-9 shrink-0 text-right font-mono text-[9.5px] text-ink/35">{fmtDuration(t.duration)}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-paper px-3 py-2 font-mono text-[9px] text-ink/40">
            <span className="flex items-center gap-1.5">
              <Music2 size={11} /> 收藏 {favorites.length} 首
            </span>
            <span>共 {Math.round(totalDuration / 60)} 分钟</span>
          </div>

          <button
            onClick={() => {
              setIndex(Math.floor(Math.random() * playlist.length))
              setPlaying(true)
            }}
            className="mt-2 flex w-full items-center justify-between rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-[11px] transition hover:border-ink hover:bg-lime/40"
          >
            <span className="flex items-center gap-1.5">
              <Shuffle size={11} /> 随机播放全部
            </span>
            <ArrowRight size={11} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { title: '写需求', note: 'Lo-fi，不抢注意力', color: '#BFD8FF' },
          { title: '跑评测', note: '节拍稳定，适合盯日志', color: '#C9F158' },
          { title: '改 bug 到深夜', note: '只能听熟歌，不能听新歌', color: '#FFB3C7' },
        ].map((c, i) => (
          <div key={c.title} className="rounded-2xl border-1.5 border-ink bg-cream p-4" style={{ transform: `rotate(${i % 2 === 0 ? -0.6 : 0.6}deg)` }}>
            <span className="inline-block rounded-full px-2 py-0.5 font-mono text-[9.5px]" style={{ background: c.color }}>
              SCENE 0{i + 1}
            </span>
            <p className="mt-2 text-[13px] font-bold">{c.title}</p>
            <p className="mt-0.5 text-[10.5px] text-ink/50">{c.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
