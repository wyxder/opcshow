import { CalendarDays, Compass, Images, MapPin, Maximize2, Plane, Route, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, Plate, Reveal } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { SmartImage } from '@/components/SmartImage'
import { trips, type Trip } from '@/data/life'
import { lookupMedia } from '@/data/media'
import { cn, projectLonLat } from '@/lib/utils'
import { useSeo } from '@/lib/seo'

const box = { lon: [73, 135] as [number, number], lat: [16, 54] as [number, number] }

/** A deliberately abstract, hand-drawn China silhouette — a design element, not a precise map. */
const outline: [number, number][] = [
  [74, 39], [76.5, 41], [80, 45], [85, 47.2], [89, 48], [95, 49], [99, 51.5], [104, 52],
  [108, 50], [112, 50], [116, 49.5], [119.5, 50.2], [122, 53.3], [126, 53.4], [128.5, 50],
  [130.5, 48], [134.8, 48.3], [134.2, 45], [131, 45], [130, 42.5], [127, 41.5], [124, 41],
  [122.2, 39.2], [121.3, 37.5], [119.2, 37], [121, 34.5], [120.2, 32.5], [122, 31],
  [121.2, 29], [119.5, 26], [117, 23.8], [113.5, 22.4], [110.3, 21.3], [108.5, 21.5],
  [106, 22.6], [103, 22.5], [100.5, 21.5], [99, 24], [97.5, 28], [94, 28], [91, 27.6],
  [88, 27.8], [85, 28.6], [81.5, 30.4], [78.5, 34.8], [75.5, 37], [73.6, 39],
]

function toXY(lon: number, lat: number) {
  return {
    x: ((lon - box.lon[0]) / (box.lon[1] - box.lon[0])) * 1000,
    y: ((box.lat[1] - lat) / (box.lat[1] - box.lat[0])) * 620,
  }
}

const outlinePath =
  outline
    .map(([lon, lat], i) => {
      const { x, y } = toXY(lon, lat)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ') + ' Z'

const ordered = [...trips].sort((a, b) => a.date.localeCompare(b.date))

/** 旅拍卡 / 放大弹窗共用的占位图形（未上传真实照片时的同色系兜底） */
function TripArt({ t }: { t: Trip }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${t.color}, rgb(var(--c-surface)) 85%)` }} />
      <div className="absolute inset-0 halftone opacity-25" />
      <svg viewBox="0 0 120 90" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="60" cy="42" r="26" fill="none" stroke="rgb(var(--c-ink))" strokeOpacity="0.15" />
        <circle cx="60" cy="42" r="14" fill="rgb(var(--c-ink))" fillOpacity="0.06" />
        <path d="M0 68 Q 30 52 60 66 T 120 58 L120 90 L0 90Z" fill="rgb(var(--c-ink))" fillOpacity="0.07" />
      </svg>
    </>
  )
}

export default function Travel() {
  const [activeId, setActiveId] = useState(trips[0].id)
  const [zoomId, setZoomId] = useState<string | null>(null)
  const active = trips.find((t) => t.id === activeId)!
  const zoomTrip = zoomId ? trips.find((t) => t.id === zoomId) ?? null : null

  useSeo({
    title: '旅拍相册 · 晓叶',
    description: `地图上的 ${trips.length} 个点：比赛、出差、带她回家、一个人看海。`,
    path: '/life/travel',
  })

  const photoCount = trips.filter((t) => lookupMedia(`trip:${t.id}`)).length
  const routePoints = useMemo(
    () =>
      ordered
        .map((t) => {
          const p = projectLonLat(t.lon, t.lat, box)
          return `${(p.x * 1000).toFixed(1)},${(p.y * 620).toFixed(1)}`
        })
        .join(' '),
    [],
  )

  return (
    <div className="shell">
      <PageHead
        kicker="04 / LIFE · TRAVEL ATLAS"
        title={`地图上的 ${trips.length} 个点`}
        right={
          <span className="font-mono text-[9.5px] text-ink/45">
            {trips.length} 座城市 · 2023 → 2026 · 真实照片 {photoCount}/{trips.length}
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { icon: MapPin, label: '打卡城市', value: '11', unit: '座' },
          { icon: Plane, label: '在外天数', value: '41', unit: '天' },
          { icon: Route, label: '累计里程', value: '18k', unit: 'km' },
          { icon: Images, label: '可用照片', value: '2.4k', unit: '张' },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05}>
            <div className="flex items-center gap-3 rounded-2xl border-1.5 border-ink bg-cream p-3.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/20 bg-paper">
                <s.icon size={14} />
              </span>
              <div>
                <p className="font-display text-[19px] font-extrabold leading-none">
                  {s.value}
                  <span className="ml-0.5 text-[10px] font-medium text-ink/40">{s.unit}</span>
                </p>
                <p className="mt-0.5 font-mono text-[9.5px] tracking-wide text-ink/40">{s.label}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* map */}
        <div className="relative overflow-hidden rounded-[24px] border-1.5 border-ink bg-sand shadow-hard">
          <div className="absolute inset-0 grid-paper opacity-70" />
          <svg viewBox="0 0 1000 620" preserveAspectRatio="none" className="relative block h-full w-full">
            {[...Array(9)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 77.5} x2="1000" y2={i * 77.5} stroke="rgb(var(--c-ink))" strokeOpacity="0.06" />
            ))}
            {[...Array(13)].map((_, i) => (
              <line key={`v${i}`} x1={i * 83.3} y1="0" x2={i * 83.3} y2="620" stroke="rgb(var(--c-ink))" strokeOpacity="0.06" />
            ))}
            <path d={outlinePath} fill="rgb(var(--c-surface))" fillOpacity="0.85" stroke="rgb(var(--c-ink))" strokeOpacity="0.55" strokeWidth="2.4" strokeLinejoin="round" />
            <path d={outlinePath} fill="none" stroke="rgb(var(--c-ink))" strokeOpacity="0.12" strokeWidth="10" strokeLinejoin="round" />
            <ellipse cx="774" cy="494" rx="10" ry="24" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-ink))" strokeOpacity="0.4" strokeWidth="1.6" />
            <ellipse cx="594" cy="568" rx="16" ry="13" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-ink))" strokeOpacity="0.4" strokeWidth="1.6" />
            <polyline points={routePoints} fill="none" stroke="rgb(var(--c-coral))" strokeOpacity="0.55" strokeWidth="1.8" strokeDasharray="5 7" strokeLinecap="round" />
            <text x="60" y="70" fill="rgb(var(--c-ink))" fillOpacity="0.25" fontSize="30" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif">
              CHINA
            </text>
            <text x="60" y="94" fill="rgb(var(--c-ink))" fillOpacity="0.2" fontSize="11" letterSpacing="4" fontFamily="JetBrains Mono, monospace">
              TRAVEL ATLAS / 2023—2026
            </text>
          </svg>

          {trips.map((t, idx) => {
            const p = projectLonLat(t.lon, t.lat, box)
            const isActive = t.id === activeId
            const size = t.size === 'lg' ? 18 : t.size === 'md' ? 14 : 11
            return (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                aria-label={`查看 ${t.city}`}
              >
                <span
                  className={cn('flex items-center justify-center rounded-full border-1.5 border-ink transition-all duration-300', isActive && 'scale-125')}
                  style={{ width: size, height: size, background: t.color, boxShadow: isActive ? '0 0 0 5px rgb(var(--c-ink) / 0.12)' : undefined }}
                />
                {isActive && <span className="absolute inset-0 -z-10 animate-ping rounded-full" style={{ background: t.color, opacity: 0.5 }} />}
                <span
                  className={cn(
                    'absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-ink/20 bg-cream/95 px-1.5 py-0.5 font-mono text-[9.5px] transition-opacity',
                    idx % 2 === 0 ? 'top-full mt-1' : 'bottom-full mb-1',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  {t.city}
                </span>
              </button>
            )
          })}

          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 font-mono text-[9.5px] text-ink/35">
            <Compass size={10} /> 手绘示意图 · 非真实比例
          </div>
        </div>

        {/* detail */}
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-[24px] border-1.5 border-ink bg-cream">
            <Plate motif="rings" accent={active.color} label={`${active.lat.toFixed(2)}°N / ${active.lon.toFixed(2)}°E`} className="h-28" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[9px] tracking-[0.16em] text-ink/40">{active.tag.toUpperCase()}</p>
                  <h2 className="mt-1 text-[22px] font-extrabold leading-tight">{active.city}</h2>
                  <p className="text-[11.5px] text-ink/50">{active.spot}</p>
                </div>
                <span className="rounded-full px-2 py-0.5 font-mono text-[9px]" style={{ background: `color-mix(in srgb, ${active.color} 40%, transparent)` }}>
                  {active.date}
                </span>
              </div>
              <p className="mt-3 border-t border-dashed border-ink/15 pt-3 font-hand text-[19px] leading-snug text-ink/70">{active.note}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                {[
                  { icon: CalendarDays, v: `${active.days} 天` },
                  { icon: Users, v: active.companion },
                  { icon: MapPin, v: active.tag },
                ].map((x, i) => (
                  <div key={i} className="flex items-center gap-1 rounded-lg bg-paper px-2 py-1.5 text-ink/55">
                    <x.icon size={10} /> <span className="truncate">{x.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border-1.5 border-ink bg-paper p-3">
            <p className="mb-2 font-mono text-[9px] tracking-[0.16em] text-ink/35">QUICK JUMP</p>
            <div className="flex flex-wrap gap-1.5">
              {trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    'rounded-full border px-2 py-1 text-[10px] transition',
                    t.id === activeId ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-cream text-ink/55 hover:border-ink/50',
                  )}
                >
                  {t.city}
                </button>
              ))}
            </div>
          </div>

          <Link to="/life/moments" className="flex items-center justify-between gap-2 rounded-[20px] border-1.5 border-ink bg-lime px-4 py-3 text-[12px] font-medium transition hover:-translate-y-0.5 hover:shadow-hard-sm">
            在朋友圈看这趟旅程的照片 <Plane size={14} />
          </Link>
        </div>
      </div>

      {/* photo wall */}
      <div className="mt-8">
        <div className="mb-4 flex items-end justify-between border-b border-ink/12 pb-3">
          <h2 className="text-[20px] font-extrabold">旅拍墙</h2>
          <span className="font-hand text-[17px] text-ink/45">点开任一张，地图会跳过去</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {trips.map((t: Trip) => (
            <div
              key={t.id}
              className={cn(
                'group relative rounded-md border border-ink/20 bg-cream p-2 pb-8 text-left shadow-soft transition-all duration-300 hover:z-10 hover:-translate-y-1.5 hover:rotate-0',
                t.id === activeId && 'ring-2 ring-ink',
              )}
              style={{ transform: `rotate(${(t.lon % 5) - 2.5}deg)` }}
            >
              <button onClick={() => setActiveId(t.id)} className="block w-full text-left" aria-label={`在地图查看 ${t.city}`}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-ink/10">
                  <SmartImage
                    asset={lookupMedia(`trip:${t.id}`)}
                    className="absolute inset-0"
                    eager={t.id === activeId}
                    fallback={<TripArt t={t} />}
                  />
                  <span className="absolute bottom-1.5 left-2 font-display text-[15px] font-extrabold text-ink/70">{t.city}</span>
                  <span className="absolute bottom-1.5 right-2 font-mono text-[9px] text-ink/40">{t.date.slice(0, 7)}</span>
                </div>
                <p className="mt-1.5 truncate px-0.5 font-hand text-[15px] leading-none text-ink/60">{t.spot.split('·')[0]}</p>
              </button>
              <button
                onClick={() => setZoomId(t.id)}
                aria-label={`放大 ${t.city} 的照片`}
                className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-ink/25 bg-cream/90 text-ink/60 opacity-0 transition hover:bg-lime hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Maximize2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 点击放大：将当前这张照片 / 占位图放大展示，附城市、地点与备注 */}
      <Modal open={!!zoomTrip} onClose={() => setZoomId(null)} bare className="max-w-3xl">
        {zoomTrip && (
          <div className="p-3 sm:p-4">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink/15 bg-sand">
              <SmartImage asset={lookupMedia(`trip:${zoomTrip.id}`)} className="absolute inset-0" eager fallback={<TripArt t={zoomTrip} />} />
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="font-mono text-[9px] tracking-[0.16em] text-ink/40">{zoomTrip.tag.toUpperCase()} · {zoomTrip.date}</p>
                <h3 className="mt-1 text-[20px] font-extrabold leading-tight">{zoomTrip.city} · {zoomTrip.spot}</h3>
                <p className="mt-1.5 font-hand text-[18px] leading-snug text-ink/70">{zoomTrip.note}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 font-mono text-[9.5px] text-ink/45">
                <span className="flex items-center gap-1 rounded-full border border-ink/15 px-2 py-0.5">{zoomTrip.days} 天</span>
                <span className="flex items-center gap-1 rounded-full border border-ink/15 px-2 py-0.5"><Users size={10} /> {zoomTrip.companion}</span>
              </div>
            </div>
            {lookupMedia(`trip:${zoomTrip.id}`) ? null : (
              <p className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-ink/35">
                <Images size={10} /> 真实照片待上传，当前为同色系占位图形（F1）
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
