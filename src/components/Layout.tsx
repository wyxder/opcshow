import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Bot,
  Box,
  Check,
  ChevronDown,
  Command,
  Compass,
  FileText,
  Folder,
  Gauge,
  Github,
  GitBranch,
  Heart,
  Home,
  Layers,
  Link2,
  Mail,
  Map,
  MessageCircle,
  Mic,
  Music,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  User,
  Users,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { navItems, type NavChild } from '@/data/nav'
import { projects } from '@/data/projects'
import { articleSearchIndex } from '@/data/articles.index'
import { links, profile, siteMeta } from '@/data/site'
import { cn, usePrefersReducedMotion } from '@/lib/utils'
import { openAssistant, setAssistantContext } from '@/lib/assistant'
import { highlightParts, matchScore, pushRecentSearch, readRecentSearches } from '@/lib/search'
import { Marquee } from '@/components/ui/primitives'
import { ErrorBoundary, RouteFallback, lazyWithRetry } from '@/components/ErrorBoundary'
import { Modal } from '@/components/ui/Modal'
import { ConnectModal } from '@/components/ConnectModal'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

// 右下角 AI 助手：所有页面都要有，但组件本体懒加载，不进首屏包
const AIAssistant = lazyWithRetry(() => import('@/components/AIAssistant').then((m) => ({ default: m.AIAssistant })))

const icons: Record<string, LucideIcon> = {
  home: Home,
  sparkles: Sparkles,
  layers: Layers,
  trophy: Trophy,
  book: BookOpen,
  search: Search,
  gauge: Gauge,
  bot: Bot,
  file: FileText,
  box: Box,
  folder: Folder,
  heart: Heart,
  chat: MessageCircle,
  map: Map,
  music: Music,
  user: User,
  share: Share2,
  timeline: GitBranch,
  send: Send,
  link: Link2,
  mic: Mic,
  wand: Wand2,
}

/* ------------------------------ wechat icon -------------------------------- */
/* 微信官方图标（双气泡 + 四眼），与 lucide 的通用聊天气泡区分开；颜色走品牌绿令牌 */
function WeChatIcon({ size = 12, className }: { size?: number; className?: string }) {
  const maskId = 'wechat-bubble-mask'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true" focusable="false">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="#fff" />
          <circle cx="6" cy="9.1" r="1.05" fill="#000" />
          <circle cx="10.3" cy="9.1" r="1.05" fill="#000" />
          <circle cx="14.7" cy="15.2" r="0.88" fill="#000" />
          <circle cx="17.7" cy="15.2" r="0.88" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        {/* 大气泡在上，小气泡叠加在右下：遮挡关系与官方标识一致 */}
        <ellipse cx="8.4" cy="9.4" rx="7" ry="6" />
        <path d="M4.2 14.1 L2.4 17.8 L6.8 15.8 Z" />
        <ellipse cx="16.6" cy="15.7" rx="5.5" ry="4.8" />
        <path d="M19.9 19.4 L21.9 22.2 L17.3 20.7 Z" />
      </g>
    </svg>
  )
}

/* ------------------------------ scroll helpers ----------------------------- */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const firstRun = useRef(true)
  useEffect(() => {
    // 首次挂载（刷新 / 直接带 #锚点 进入）用瞬间定位：原来延迟 80ms 再 smooth
    // scrollIntoView，在移动端就是「加载一会儿页面自动上滑 / 下滑」。
    // 站内主动点锚点仍保留平滑过渡。
    const initial = firstRun.current
    firstRun.current = false
    if (hash) {
      const id = hash.replace('#', '')
      let tries = 0
      const run = () => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: (initial ? 'instant' : 'smooth') as ScrollBehavior, block: 'start' })
        } else if (tries++ < 20) {
          requestAnimationFrame(run)
        }
      }
      run()
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 })
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[80] h-[3px] origin-left bg-gradient-to-r from-lime via-coral to-blue"
    />
  )
}

/* ---------------------------------- header -------------------------------- */
function Header() {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname, search } = useLocation()
  const reduce = usePrefersReducedMotion()
  // 首页只走底部 6 个主菜单栏，顶部那排分栏菜单在首页不显示
  const isHome = pathname === '/'
  const closeTimer = useRef<number | null>(null)

  // hover 意图：进入即刻展开，离开延时 180ms 再收起（期间重新进入则取消）
  const openNow = (key: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpenKey(key)
  }
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenKey(null), 180)
  }
  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current) }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpenKey(null)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 二级子项命中判定：只高亮与当前 pathname 精确对应的子页
  // （带 query/hash 的入口如「AI 学习助手」「首页锥点」不参与子项高亮，选中态交给一级）
  const isChildActive = (child: NavChild) => {
    if (/[?#]/.test(child.to)) return false
    const base = child.to.split(/[?#]/)[0]
    if (base === '/') return false
    return pathname === base
  }
  // 一级高亮只认自身路径前缀。子菜单已允许跨分组挂载（如「百宝箱/资源中心」上移到
  // AI知识库），若再用 children.some(isChildActive) 会让两个一级项同时高亮。
  // 各分组子项路径本就以自身 key 开头，纯前缀判断即可精准命中。
  const isActive = (item: (typeof navItems)[number]) =>
    item.to === '/'
      ? pathname === '/'
      : pathname.startsWith('/' + item.key)
  // 当前所在的 01—06 分组：移动端顶栏只展开这一组的子菜单
  const currentSection = navItems.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith('/' + item.key)))
  // 「交朋友 / 后台」胶囊在移动端顶栏只挂「我的」；桌面端右上角 CTA 则全站常驻
  const isMeSection = currentSection?.key === 'me'

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[70]">
        <div className="shell">
          <div
            className={cn(
              'mt-3 flex items-center justify-between gap-3 rounded-[18px] border-1.5 border-ink bg-cream/90 px-3 py-2 backdrop-blur-xl transition-all duration-300',
              scrolled ? 'shadow-hard-sm' : 'shadow-none',
            )}
          >
            {/* logo：非首页的移动端让位给顶部分栏菜单；首页隐藏了顶部菜单后显示 logo，
                避免顶栏变成一条只有主题按钮的空壳 */}
            <Link
              to="/"
              className={cn('group items-center gap-2.5', isHome ? 'flex' : 'hidden lg:flex')}
              onMouseEnter={() => setOpenKey(null)}
            >
              <span className="relative block h-9 w-9 shrink-0 -rotate-3 overflow-hidden rounded-[11px] border-1.5 border-ink bg-cream shadow-hard-sm transition-transform duration-300 group-hover:rotate-0">
                <img
                  src="/image/logo-144.png"
                  alt="晓叶 · WYX.SPACE 标志"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="leading-none">
                <span className="block text-[15px] font-extrabold tracking-tight">晓叶</span>
                <span className="mt-1 block font-mono text-[9px] tracking-[0.18em] text-ink/45">WYX.SPACE / 2026</span>
              </span>
            </Link>

            {/* 移动端顶部分栏：只展示「当前所在分组」的子菜单，不重复铺 6 个一级大菜单
                —— 一级入口由常驻的底部菜单栏承担。子项放不下时左右滑动选择。
                首页不显示顶部菜单，导航完全交给底部 6 个主菜单栏。 */}
            <nav
              aria-label="分栏导航"
              className={cn(
                'flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain py-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden',
                isHome && 'hidden',
              )}
            >
              {currentSection && (
                <span aria-hidden className="mr-1 shrink-0 whitespace-nowrap font-mono text-[9px] tracking-[0.12em] text-ink/40">
                  {currentSection.index} {currentSection.en}
                </span>
              )}
              {currentSection && !currentSection.noDropdown && currentSection.children.map((c) => {
                const Icon = icons[c.icon ?? 'sparkles'] ?? Sparkles
                // /ai?tab=voice 这类同路径不同 query 的子项必须按 tab 精确高亮，
                // 否则 3 个 AI 子项会同时亮；无 query 的页面按 pathname 命中即可。
                const [pathAndHash, query = ''] = c.to.split('?')
                const base = pathAndHash.split('#')[0]
                const tabParam = new URLSearchParams(query).get('tab')
                const activeTab = new URLSearchParams(search).get('tab') ?? 'chat'
                const active = base !== '/' && pathname === base &&
                  (tabParam ? activeTab === tabParam : !new URLSearchParams(search).get('tab'))
                return (
                  <Link
                    key={c.to}
                    to={c.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10.5px] transition-colors',
                      active ? 'border-ink bg-lime text-ink' : 'border-ink/15 bg-paper text-ink/60',
                    )}
                  >
                    <Icon size={10.5} className="shrink-0 opacity-60" />
                    {c.label}
                  </Link>
                )
              })}
              {isMeSection && (
                <>
                  <button
                    onClick={() => setConnectOpen(true)}
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border-1.5 border-ink bg-ink px-2 py-1 text-[10.5px] text-paper"
                  >
                    <MessageCircle size={10.5} className="shrink-0" />
                    交朋友
                  </button>
                  <Link
                    to="/admin"
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-ink/15 bg-paper px-2 py-1 text-[10.5px] text-ink/60"
                  >
                    <Settings size={10.5} className="shrink-0" />
                    后台
                  </Link>
                </>
              )}
            </nav>

            {/* desktop nav：一级项间距拉开（gap 5 / xl 7），下拉面板仍对准各自项 */}
            <nav
              className="hidden shrink-0 items-center gap-x-3 px-1 lg:flex xl:gap-x-7"
              onMouseLeave={scheduleClose}
              onBlur={(e) => {
                // 焦点离开整个导航容器才收起；在一级/二级之间移动不会关
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleClose()
              }}
              aria-label="主导航"
            >
              {navItems.filter((item) => !item.hideInTopNav).map((item, i, arr) => {
                // 首页是「直达型」一级项：hover / 聚焦 / 点击都不展开下拉，也不显示箭头
                const plain = item.noDropdown === true
                return (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={() => (plain ? setOpenKey(null) : openNow(item.key))}
                  onFocus={() => (plain ? setOpenKey(null) : openNow(item.key))}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setOpenKey(null)
                      ;(e.currentTarget.querySelector('a') as HTMLElement | null)?.focus()
                    }
                  }}
                >
                  <Link
                    to={item.to}
                    aria-current={isActive(item) ? 'page' : undefined}
                    aria-haspopup={plain ? undefined : 'true'}
                    aria-expanded={plain ? undefined : openKey === item.key}
                    onClick={() => setOpenKey(plain ? null : openKey === item.key ? null : item.key)}
                    className={cn(
                      // whitespace-nowrap：6 个菜单项后导航变挤，禁止「首页」被折成两行
                      'relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 text-[12px] font-medium transition-colors xl:px-3.5 xl:text-[13px]',
                      isActive(item) ? 'text-ink' : 'text-ink/60 hover:text-ink',
                    )}
                  >
                    {isActive(item) && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full border-1.5 border-ink bg-lime"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="hidden font-mono text-[9px] opacity-40 xl:inline">{item.index}</span>
                    {item.label}
                    {!plain && <ChevronDown size={11} className={cn('transition-transform', openKey === item.key && 'rotate-180')} />}
                  </Link>

                  {/* 紧凑下拉：挂在当前导航项文字正下方，单列、不遮满屏。
                      定位放在外层：framer-motion 会写内联 transform，
                      直接给 motion 元素挂 -translate-x-1/2 会被覆盖。 */}
                  {!plain && (
                  <div
                    className={cn(
                      // -mt-1.5 + pt-1.5 补一段透明桥接热区，消除一级与面板之间因间隙导致的 mouseleave 闪烁；
                      // 展开项的 wrapper 抬到 z-[95]，避免相邻一级项的桥接热区盖在其之上抢走 hover
                      'absolute top-full -mt-1.5 hidden w-[244px] pt-1.5 lg:block',
                      openKey === item.key ? 'z-[95]' : 'z-[80]',
                      i === 0 ? 'left-0' : i === arr.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                    )}
                  >
                    <AnimatePresence>
                      {openKey === item.key && (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, y: reduce ? 0 : -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: reduce ? 0 : -4 }}
                          transition={{ duration: 0.14, ease: 'easeOut' }}
                        >
                          <div className="overflow-hidden rounded-[14px] border-1.5 border-ink bg-cream shadow-hard-sm">
                            {item.children.map((child) => {
                              const Icon = icons[child.icon ?? 'sparkles'] ?? Sparkles
                              const childActive = isChildActive(child)
                              return (
                                <Link
                                  key={child.to}
                                  to={child.to}
                                  onClick={() => setOpenKey(null)}
                                  aria-current={childActive ? 'page' : undefined}
                                  className={cn(
                                    'group flex items-center gap-2.5 border-b border-ink/8 px-2.5 py-1.5 transition-colors last:border-0 hover:bg-lime/25',
                                    childActive && 'bg-lime/25',
                                  )}
                                >
                                  <Icon size={13} className="shrink-0 text-ink/40 transition group-hover:text-ink" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12px] font-medium leading-tight">{child.label}</span>
                                    <span className="mt-0.5 block truncate text-[10px] leading-tight text-ink/40">{child.desc}</span>
                                  </span>
                                  <ArrowUpRight size={11} className="shrink-0 text-ink/20 opacity-0 transition group-hover:opacity-100" />
                                </Link>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  )}
                </div>
                )
              })}

            </nav>

            {/* actions：搜索 + 主题钮紧靠成组（小间距），主题钮已缩短为纯图标胶囊 */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPaletteOpen(true)}
                  className="hidden items-center gap-2 rounded-full border-1.5 border-ink/15 bg-paper px-2.5 py-1.5 font-mono text-[10px] text-ink/50 transition hover:border-ink/40 hover:text-ink sm:flex"
                  aria-label="搜索"
                >
                  <Search size={13} />
                  <span>搜索</span>
                  <kbd className="rounded border border-ink/20 bg-cream px-1 py-0.5 text-[9px]">⌘K</kbd>
                </button>
                <ThemeSwitcher className="hidden lg:block" />
              </div>
              {/* 桌面端：01 首页 — 06 我的 全站常驻，主题钮旁边与「我的」界面完全一致；
                  移动端顶栏的「交朋友 / 后台」胶囊仍只挂在「我的」分组。 */}
              <Link
                to="/admin"
                className="hidden h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink/15 bg-paper text-ink/55 transition hover:border-ink hover:text-ink sm:flex"
                aria-label="后台管理"
              >
                <Settings size={14} />
              </Link>
              <button
                onClick={() => setConnectOpen(true)}
                className="hidden shrink-0 items-center gap-1.5 rounded-full border-1.5 border-ink bg-ink px-3.5 py-1.5 text-[12px] font-medium text-paper transition hover:-translate-y-0.5 hover:shadow-hard-sm sm:flex"
              >
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" />
                交个朋友
              </button>
              {/* 移动端右上角：主题切换（展开按钮已下线，导航由顶栏分栏 + 底部菜单栏接管） */}
              <ThemeSwitcher variant="dot" className="lg:hidden" />
            </div>
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  )
}

/* ------------------------------ command palette ---------------------------- */
type CmdItem = { id: string; label: string; hint: string; to: string; group: string; icon: LucideIcon }

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)

  const items: CmdItem[] = useMemo(() => {
    const navCmds = navItems.flatMap((n) => [
      { id: n.key, label: n.label + ' · 首页', hint: n.en, to: n.to, group: '页面', icon: Compass },
      ...n.children.map((c) => ({ id: n.key + c.to, label: c.label, hint: c.desc, to: c.to, group: n.label, icon: icons[c.icon ?? 'sparkles'] ?? Sparkles })),
    ])
    const projectCmds = projects.map((p) => ({ id: p.id, label: p.title, hint: p.category, to: '/#projects', group: '项目', icon: Sparkles }))
    // ⌘K 只用标题级索引（fx.md P2）：不把文章正文拉进入口包
    const articleCmds = articleSearchIndex.map((a) => ({ ...a, icon: BookOpen }))
    return [...navCmds, ...articleCmds, ...projectCmds]
  }, [])

  const filtered = useMemo(() => {
    const key = q.trim()
    if (!key) return items.slice(0, 10)
    return items
      .map((i) => ({ item: i, score: matchScore(i.label, i.hint + i.group, key) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.item)
  }, [items, q])

  const recent = useMemo(() => readRecentSearches(), [open])

  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
    }
  }, [open])

  const go = (item?: CmdItem) => {
    if (!item) return
    pushRecentSearch(q)
    navigate(item.to)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} bare className="max-w-xl self-start !bg-transparent !border-0 !shadow-none">
      <div className="overflow-hidden rounded-[22px] border-1.5 border-ink bg-cream shadow-hard-lg">
        <div className="flex items-center gap-3 border-b-1.5 border-ink/12 px-4 py-3.5">
          <Command size={16} className="text-ink/40" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setCursor(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(c + 1, filtered.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              }
              if (e.key === 'Enter') go(filtered[cursor])
            }}
            placeholder="搜索页面、文章、项目…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink/35"
          />
          <kbd className="rounded border border-ink/20 px-1.5 py-0.5 font-mono text-[9px] text-ink/40">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-2 no-scrollbar">
          {!q.trim() && recent.length > 0 && (
            <div className="px-4 pb-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink/35">最近搜索</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setQ(r)
                      setCursor(0)
                    }}
                    className="rounded-full border border-ink/20 bg-paper px-2 py-0.5 text-[10.5px] text-ink/60 transition hover:border-ink hover:text-ink"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-[13px] text-ink/40">
              没有找到「{q.trim()}」。
              <p className="mt-2 text-[11.5px] text-ink/35">
                试试「RAG 切片」「评测指标」「百宝箱」，或按 <kbd className="rounded border border-ink/20 px-1">Esc</kbd> 关掉后问 AI 助手。
              </p>
            </div>
          )}
          {filtered.map((item, i) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(item)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === cursor ? 'bg-lime/35' : 'hover:bg-paper',
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/20 bg-paper">
                  <Icon size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {highlightParts(item.label, q).map((p, k) =>
                      p.hit ? (
                        <mark key={k} className="rounded bg-lime/70 px-0.5 text-ink">
                          {p.text}
                        </mark>
                      ) : (
                        <span key={k}>{p.text}</span>
                      ),
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-ink/45">{item.hint}</span>
                </span>
                <span className="font-mono text-[9px] tracking-widest text-ink/30">{item.group}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------ mobile tab bar ----------------------------- */
/* 移动端底部菜单栏：首页 / AI分身 / AI知识库 / 百宝箱 / 生活 / 我的（lg 以下显示）。
   子菜单归顶栏，这里只保留 6 个主入口，避免底部堆两层。
   用 portal 挂到 body：即使页面切换动画给祖先加了 transform，fixed 也始终贴着视口底部。
   真机兜底在 index.css：body 用 overflow-x:clip 不形成滚动容器，并对本 nav 强制
   position:fixed + 独立合成层，避免地址栏收起 / 长列表滚动时底栏被移出可视区。 */
const tabIcons: Record<string, LucideIcon> = { home: Home, ai: Sparkles, learn: BookOpen, work: Box, life: Heart, me: User }

export function MobileTabBar() {
  const { pathname } = useLocation()
  // React 版底栏就绪后移除 index.html 的首帧静态骨架，避免两份底栏重叠。
  // 依赖为空：只挂载时执行一次；createPortal 已在本次 commit 把真底栏挂到 body，
  // 此时移除骨架不会出现「底栏消失」的空窗。
  useEffect(() => {
    document.getElementById('boot-tabbar')?.remove()
  }, [])
  if (typeof document === 'undefined') return null
  return createPortal(
    <nav
      aria-label="底部导航"
      className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[calc(10px_+_env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <div className="mx-auto max-w-md">
        <div className="flex items-stretch gap-0.5 rounded-[20px] border-1.5 border-ink bg-cream/95 p-1.5 shadow-hard">
          {navItems.filter((item) => !item.hideInBottomNav).map((item) => {
            const Icon = tabIcons[item.key] ?? Sparkles
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith('/' + item.key)
            return (
              <Link
                key={item.key}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-1 flex-col items-center gap-0.5 rounded-[14px] px-1 py-1.5 transition-colors',
                  active ? 'text-ink' : 'text-ink/45',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 -z-10 rounded-[14px] border-1.5 border-ink bg-lime"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[9.5px] font-bold leading-none">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>,
    document.body,
  )
}

/* ------------------------------- back to top ------------------------------- */
/* 首页滚到底才出现的「回到顶部」：右下角、避开 AI 助手，移动端也在底栏之上 */
function BackToTop() {
  const { pathname } = useLocation()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (pathname !== '/') {
      setShow(false)
      return
    }
    const check = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 96
      setShow(window.scrollY > 240 && nearBottom)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [pathname])

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="回到顶部"
          className="fixed bottom-[calc(150px_+_env(safe-area-inset-bottom))] right-4 z-[70] flex h-11 items-center gap-1.5 rounded-full border-1.5 border-ink bg-cream px-3 shadow-hard-sm transition-colors hover:bg-lime lg:bottom-24 lg:right-5"
        >
          <ArrowUp size={15} />
          <span className="font-mono text-[10px] tracking-[0.12em]">TOP</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/* ---------------------------------- footer -------------------------------- */
/** 剪贴板写入：优先 async API，非安全上下文 / 旧浏览器回退到 execCommand */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/**
 * 页脚联系标签：点击即复制邮箱 / 微信号，不再触发 mailto 跳转或渲染 href="#" 死链（F4）。
 * 后台资料里的 http(s) 外链仍按普通链接打开，只有 mailto 与无链接项走复制。
 */
function FooterSocialTags() {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async (key: string, value: string) => {
    if (!(await copyToClipboard(value))) return
    setCopied(key)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(null), 1600)
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {profile.socials.map((s, i) => {
        const key = `${s.label}-${i}`
        const Icon = s.icon === 'mail' ? Mail : s.icon === 'github' ? Github : s.icon === 'chat' ? WeChatIcon : s.icon === 'book' ? BookOpen : Link2
        const inner = <><Icon size={12} /> {s.value}</>
        const externalHref = typeof s.href === 'string' && /^https?:\/\//.test(s.href) ? s.href : null
        if (externalHref) {
          return (
            <a key={key} href={externalHref} target="_blank" rel="noopener noreferrer" className="tag hover:bg-lime" aria-label={s.label}>
              {inner}
            </a>
          )
        }
        const isCopied = copied === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => void copy(key, s.value)}
            className={cn('tag cursor-pointer hover:bg-lime', isCopied && 'bg-lime')}
            title={`点击复制${s.label}：${s.value}`}
            aria-label={`点击复制${s.label}：${s.value}`}
          >
            {isCopied ? <><Check size={12} /> 已复制</> : inner}
          </button>
        )
      })}
    </div>
  )
}

/**
 * 页脚二维码卡片：微信名片 / 交流群各一张。白底保证扫码对比度，
 * 图片缺失时回落到图形说明而不是破图（微信 / QQ 群码分别放在 public/image/微信.png、public/image/QQ群.jpg）。
 */
function FooterQrCard({ label, caption, src, hint, icon: Icon }: {
  label: string
  caption: string
  src: string
  hint: string
  icon: LucideIcon
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="w-[132px] rounded-2xl border-1.5 border-ink bg-cream p-2.5 shadow-hard-sm">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-ink/12 bg-white">
        {failed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[repeating-linear-gradient(45deg,rgb(var(--c-rose)/0.16)_0_8px,transparent_8px_16px)] px-2 text-center">
            <Icon size={18} />
            <p className="font-mono text-[8px] tracking-[0.16em] text-ink/40">QR CODE</p>
            <p className="text-[9px] leading-snug text-ink/45">{hint}</p>
          </div>
        ) : (
          <img
            src={src}
            alt={`${label}二维码`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain p-1"
          />
        )}
      </div>
      <p className="mt-2 text-center text-[11.5px] font-bold">{label}</p>
      <p className="mt-0.5 text-center font-mono text-[8.5px] leading-tight text-ink/40">{caption}</p>
    </div>
  )
}

/* 同一份 navItems 渲染两套：移动端=胶囊芯片（省空间、可点区域大），桌面=传统链接列表 */
function FooterNavSection({ item, compact }: { item: (typeof navItems)[number]; compact?: boolean }) {
  return (
    <div>
      <p className={cn('flex items-baseline gap-2 text-[13px] font-normal', compact ? 'mb-2' : 'mb-3')}>
        <span className="font-mono text-[9px] text-ink/35">{item.index}</span>
        {item.label}
      </p>
      {compact ? (
        <div className="flex flex-wrap gap-1.5">
          {item.children.map((c) => (
            <FooterChildLink key={c.to} child={c} className="rounded-full border border-ink/15 bg-paper px-2.5 py-1 text-[11px] active:bg-lime" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {item.children.map((c) => (
            <li key={c.to}>
              <FooterChildLink child={c} className="link-underline" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FooterChildLink({ child, className }: { child: NavChild; className?: string }) {
  // 页脚 6 组一律同样的字重与灰度，不做当前页高亮：
  // 首页 4 个子项都是 /#anchor，原先会被同时判为 active 染成深色 + 绿点，
  // 看起来像整组被「加粗」，与右侧各组不一致。
  return (
    <Link
      to={child.to}
      className={cn(
        'inline-flex max-w-full items-center gap-1 text-[12.5px] font-normal text-ink/55 hover:text-ink',
        className,
      )}
    >
      <span className="truncate">{child.label}</span>
    </Link>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 mt-20">
      <div className="border-y-1.5 border-ink bg-ink py-3 text-paper">
        <Marquee
          speed={38}
          items={[
            <span className="font-display text-[15px] tracking-wide">OPEN TO INTERNSHIP</span>,
            <span className="font-display text-[15px] tracking-wide">AI 全栈 / 智能体开发</span>,
            <span className="font-display text-[15px] tracking-wide text-lime">6 个月 · 5 天/周 · 随时到岗</span>,
            <span className="font-display text-[15px] tracking-wide">西安 · 可远程</span>,
            <span className="font-display text-[15px] tracking-wide text-lime">WYXCODE@QQ.COM</span>,
          ]}
          separator="✦"
        />
      </div>

      <div className="shell pb-40 pt-10 lg:pb-12">
        {/*
          顺序统一为 联系区 → 6 组导航 → 两张二维码：
          xl 起 flex-nowrap 排成一行（二维码紧接「06 我的」右侧）；
          窄屏 flex-wrap 自然换成三行，二维码落在导航下方并居中。
        */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-8 xl:flex-nowrap">
          {/* 内容宽度自适应，不被 1fr 拉伸 */}
          <div className="order-1 w-full shrink-0 xl:w-auto">
            <p className="kicker mb-3">LET'S BUILD SOMETHING</p>
            <a
              href={`mailto:${profile.email}`}
              className="group mt-1 block font-display text-[clamp(24px,4vw,40px)] font-extrabold leading-[1.06]"
            >
              一起做点
              <span className="marker ml-1">有用的东西</span>
            </a>
            {/* 联系标签点击即复制；数据由后台「个人中心 → 资料」维护并经 /api/profile 水合 */}
            <FooterSocialTags />
          </div>

          {/* 移动端：两列胶囊芯片，排在二维码之前 */}
          <div className="order-2 grid w-full grid-cols-2 gap-x-4 gap-y-6 lg:hidden">
            {navItems.filter((item) => !item.hideInFooter).map((item) => (
              <FooterNavSection key={item.key} item={item} compact />
            ))}
          </div>
          {/* lg：5 列（百宝箱组已下线）；xl：与联系区、二维码同一行，列间距由 16px 收紧到 6px */}
          <div className="order-2 hidden w-full grid-cols-5 gap-4 lg:grid xl:w-auto xl:min-w-0 xl:flex-1 xl:gap-x-1.5">
            {navItems.filter((item) => !item.hideInFooter).map((item) => (
              <FooterNavSection key={item.key} item={item} />
            ))}
          </div>

          {/* 两张二维码：窄屏居中排在导航下方；xl 起到最右侧 */}
          <div className="order-3 flex w-full shrink-0 flex-wrap justify-center gap-2.5 xl:w-auto xl:justify-start">
            <FooterQrCard
              label="微信"
              caption="扫码加我 · 备注来意"
              src="/image/微信.png"
              hint={`微信号 ${profile.wechat}`}
              icon={MessageCircle}
            />
            <FooterQrCard
              label="QQ群"
              caption="AI / Agent 交流群"
              src="/image/QQ群.jpg"
              hint="群码放到 public/image/QQ群.jpg"
              icon={Users}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-ink/12 pt-5 font-mono text-[10px] text-ink/40 sm:flex-row sm:items-center">
          <span>© 2026 晓叶 · 用 React 手搓，AI 只负责打下手</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>BUILD {siteMeta.build}</span>
            <a href={links.sitemap} className="hover:text-ink">sitemap</a>
            <a href={links.rss} className="hover:text-ink">RSS</a>
            <NavLink to="/admin" className="hover:text-ink">
              后台
            </NavLink>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ---------------------------- global AI assistant -------------------------- */
function GlobalAssistant() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    // 只有文章阅读页有「正在阅读」上下文，离开时清掉
    if (!/^\/learn\//.test(pathname)) setAssistantContext({})
    if (new URLSearchParams(search).get('assistant') === '1') openAssistant()
  }, [pathname, search])

  // AI 分身页本身就是一个完整对话界面，不再叠加右下角助手，避免功能与视觉重复
  if (pathname.startsWith('/ai')) return null

  // AI 助手只是附属能力：chunk 拉不到时静默隐藏它自己，
  // 不能让异常冒泡到路由级边界，把整页（顶栏 / 内容 / 底部菜单栏）一起换成错误卡片。
  return (
    <ErrorBoundary boundary="assistant" fallback={null}>
      <Suspense fallback={null}>
        <AIAssistant />
      </Suspense>
    </ErrorBoundary>
  )
}

/* --------------------------------- layout --------------------------------- */
export default function Layout() {
  const { pathname } = useLocation()
  // AI 分身是沉浸式全屏页面：不渲染页脚，页面自身占满顶栏以下的可用高度
  const isAvatarPage = pathname.startsWith('/ai')
  // 首页 loading 占位与首屏 hero 同高，chunk 到达替换内容区时不再上下推挤
  const isHome = pathname === '/'

  // 锁定页面级滚动：AI 分身页内容自行滚动，避免向下滑动时露出首页式页脚/底部区域。
  // 锁在 html 上而不是 body：给 body 写 overflow 会连带把 overflow-x 从 clip 折算成
  // hidden（又变成滚动容器），与 index.css 的固定底栏兜底冲突。
  useEffect(() => {
    if (!isAvatarPage) return
    const prev = document.documentElement.style.overflowY
    document.documentElement.style.overflowY = 'hidden'
    return () => {
      document.documentElement.style.overflowY = prev
    }
  }, [isAvatarPage])

  return (
    <div className="relative min-h-screen">
      {/* fx.md A2：键盘用户第一个可聚焦元素就是「跳到主内容」 */}
      <a href="#main" className="skip-link">
        跳到主内容
      </a>
      <ScrollProgress />
      <Header />
      <ScrollToTop />
      <main
        id="main"
        tabIndex={-1}
        className={cn(
          'relative z-10 outline-none',
          // AI 分身是沉浸式全屏页：不再预留顶栏高度，背景由页面自身铺满整屏
          isAvatarPage ? 'pt-0' : 'pt-[88px]',
        )}
      >
        {/* 只替换内容区：顶栏 / 页脚 / 底部菜单栏在 chunk 加载期间始终常驻 */}
        <Suspense fallback={<RouteFallback tall={isHome} />}>
          <Outlet />
        </Suspense>
      </main>
      {!isAvatarPage && <Footer />}
      {/* 底部菜单栏已上移到 App 顶层（所有错误边界之外），这里不再重复挂载 */}
      <BackToTop />
      <GlobalAssistant />
    </div>
  )
}
