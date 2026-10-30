import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Box,
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
  Menu,
  MessageCircle,
  Music,
  Rss,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { navItems } from '@/data/nav'
import { projects } from '@/data/projects'
import { articleSearchIndex } from '@/data/articles.index'
import { links, profile, siteMeta } from '@/data/site'
import { cn } from '@/lib/utils'
import { openAssistant, setAssistantContext } from '@/lib/assistant'
import { Marquee } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { ThemePicker, ThemeSwitcher } from '@/components/ThemeSwitcher'

// 右下角 AI 助手：所有页面都要有，但组件本体懒加载，不进首屏包
const AIAssistant = lazy(() => import('@/components/AIAssistant').then((m) => ({ default: m.AIAssistant })))

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
}

/* ------------------------------ scroll helpers ----------------------------- */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      let tries = 0
      const run = () => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else if (tries++ < 20) {
          requestAnimationFrame(run)
        }
      }
      const timer = window.setTimeout(run, 80)
      return () => window.clearTimeout(timer)
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
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

  const isActive = (item: (typeof navItems)[number]) =>
    item.to === '/' ? pathname === '/' : pathname.startsWith('/' + item.key) || (item.key === 'me' && pathname === '/me')

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
            {/* logo */}
            <Link to="/" className="group flex items-center gap-2.5" onMouseEnter={() => setOpenKey(null)}>
              <span className="relative flex h-9 w-9 -rotate-6 items-center justify-center rounded-[11px] border-1.5 border-ink bg-ink text-[13px] font-extrabold text-lime transition-transform duration-300 group-hover:rotate-0">
                W
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-ink bg-lime" />
              </span>
              <span className="leading-none">
                <span className="block text-[15px] font-extrabold tracking-tight">魏云潇</span>
                <span className="mt-1 block font-mono text-[9px] tracking-[0.18em] text-ink/45">WYX.SPACE / 2026</span>
              </span>
            </Link>

            {/* desktop nav */}
            <nav className="hidden items-center gap-1 lg:flex" onMouseLeave={() => setOpenKey(null)} aria-label="主导航">
              {navItems.map((item, i) => (
                <div key={item.key} className="relative" onMouseEnter={() => setOpenKey(item.key)}>
                  <Link
                    to={item.to}
                    aria-current={isActive(item) ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors',
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
                    <span className="font-mono text-[9px] opacity-40">{item.index}</span>
                    {item.label}
                    <ChevronDown size={11} className={cn('transition-transform', openKey === item.key && 'rotate-180')} />
                  </Link>

                  {/* 紧凑下拉：挂在当前导航项文字正下方，单列、不遮满屏。
                      定位放在外层：framer-motion 会写内联 transform，
                      直接给 motion 元素挂 -translate-x-1/2 会被覆盖。 */}
                  <div
                    className={cn(
                      'absolute top-full z-[80] hidden w-[244px] pt-1.5 lg:block',
                      i === 0 ? 'left-0' : i === navItems.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                    )}
                  >
                    <AnimatePresence>
                      {openKey === item.key && (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.14, ease: 'easeOut' }}
                        >
                          <div className="overflow-hidden rounded-[14px] border-1.5 border-ink bg-cream shadow-hard-sm">
                            {item.children.map((child) => {
                              const Icon = icons[child.icon ?? 'sparkles'] ?? Sparkles
                              return (
                                <Link
                                  key={child.to}
                                  to={child.to}
                                  onClick={() => setOpenKey(null)}
                                  className="group flex items-center gap-2.5 border-b border-ink/8 px-2.5 py-1.5 transition-colors last:border-0 hover:bg-lime/25"
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
                </div>
              ))}
            </nav>

            {/* actions */}
            <div className="flex items-center gap-1.5">
              <ThemeSwitcher className="hidden lg:block" />
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden items-center gap-2 rounded-full border-1.5 border-ink/15 bg-paper px-2.5 py-1.5 font-mono text-[10px] text-ink/50 transition hover:border-ink/40 hover:text-ink sm:flex"
                aria-label="搜索"
              >
                <Search size={13} />
                <span>搜索</span>
                <kbd className="rounded border border-ink/20 bg-cream px-1 py-0.5 text-[9px]">⌘K</kbd>
              </button>
              <Link
                to="/admin"
                className="hidden h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink/15 bg-paper text-ink/55 transition hover:border-ink hover:text-ink sm:flex"
                aria-label="后台管理"
              >
                <Settings size={14} />
              </Link>
              <a
                href={`mailto:${profile.email}`}
                className="hidden items-center gap-1.5 rounded-full border-1.5 border-ink bg-ink px-3.5 py-2 text-[12px] font-medium text-paper transition hover:-translate-y-0.5 hover:shadow-hard-sm md:flex"
              >
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" />
                约个面试
              </a>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-ink bg-lime lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="打开菜单"
              >
                <Menu size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[85] bg-ink text-paper lg:hidden"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex h-full flex-col overflow-y-auto px-6 pb-10 pt-6 no-scrollbar">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.2em] text-lime">MENU / 2026</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-1.5 border-paper/40"
                  aria-label="关闭菜单"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-8 space-y-6">
                {navItems.map((item) => (
                  <div key={item.key}>
                    <Link to={item.to} className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] text-lime/70">{item.index}</span>
                      <span className="text-3xl font-extrabold">{item.label}</span>
                      <span className="font-mono text-[9px] tracking-[0.2em] text-paper/35">{item.en}</span>
                    </Link>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {item.children.map((c) => (
                        <Link
                          key={c.to}
                          to={c.to}
                          className="rounded-xl border border-paper/15 px-3 py-2.5 text-[12px] text-paper/75 active:bg-lime active:text-ink"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 移动端主题入口 */}
              <div className="mt-7 border-t border-paper/15 pt-6">
                <ThemePicker />
              </div>

              <div className="mt-auto pt-10">
                <Link to="/admin" className="flex items-center justify-between rounded-xl border border-lime/60 px-4 py-3 text-sm text-lime">
                  后台管理系统 <ArrowUpRight size={16} />
                </Link>
                <p className="mt-5 font-hand text-xl text-paper/50">随时到岗，欢迎随时找我聊聊。</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
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
    const key = q.trim().toLowerCase()
    if (!key) return items.slice(0, 10)
    return items.filter((i) => (i.label + i.hint + i.group).toLowerCase().includes(key)).slice(0, 12)
  }, [items, q])

  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
    }
  }, [open])

  const go = (item?: CmdItem) => {
    if (!item) return
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
          {filtered.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-ink/40">没有找到，换个词试试。</p>}
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
                  <span className="block truncate text-[13px] font-medium">{item.label}</span>
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

/* ---------------------------------- footer -------------------------------- */
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

      <div className="shell py-12">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <p className="kicker mb-3">LET'S BUILD SOMETHING</p>
            <a
              href={`mailto:${profile.email}`}
              className="group mt-1 block font-display text-[clamp(26px,4vw,40px)] font-extrabold leading-[1.06]"
            >
              一起做点
              <span className="marker ml-1">有用的东西</span>
              <ArrowUpRight className="mb-1.5 ml-1 inline-block transition group-hover:-translate-y-1 group-hover:translate-x-1" size={26} />
            </a>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ink-soft">
              如果这里有个项目让你觉得「这人可以聊一聊」，直接发邮件。我通常 12 小时内回复。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={`mailto:${profile.email}`} className="tag hover:bg-lime">
                <Mail size={12} /> {profile.email}
              </a>
              <span className="tag">
                <MessageCircle size={12} /> {profile.wechat}
              </span>
              {/* fx.md F4：真实外链 + rel="noopener noreferrer"，不再留 href="#" */}
              <a href={links.github} target="_blank" rel="noopener noreferrer" className="tag hover:bg-lime">
                <Github size={12} /> GitHub
              </a>
              <a href={links.rss} className="tag hover:bg-lime">
                <Rss size={12} /> 订阅 RSS
              </a>
            </div>
          </div>

          {navItems.map((item) => (
            <div key={item.key}>
              <p className="mb-3 flex items-baseline gap-2 text-[13px] font-bold">
                <span className="font-mono text-[9px] text-ink/35">{item.index}</span>
                {item.label}
              </p>
              <ul className="space-y-2">
                {item.children.map((c) => (
                  <li key={c.to}>
                    <Link to={c.to} className="link-underline text-[12.5px] text-ink/55 hover:text-ink">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-ink/12 pt-5 font-mono text-[10px] text-ink/40 sm:flex-row sm:items-center">
          <span>© 2026 魏云潇 · 用 React 手搓，AI 只负责打下手</span>
          <div className="flex items-center gap-4">
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
    if (!/^\/learn\//.test(pathname)) setAssistantContext('')
    if (new URLSearchParams(search).get('assistant') === '1') openAssistant()
  }, [pathname, search])

  return (
    <Suspense fallback={null}>
      <AIAssistant />
    </Suspense>
  )
}

/* --------------------------------- layout --------------------------------- */
export default function Layout() {
  return (
    <div className="relative min-h-screen">
      {/* fx.md A2：键盘用户第一个可聚焦元素就是「跳到主内容」 */}
      <a href="#main" className="skip-link">
        跳到主内容
      </a>
      <ScrollProgress />
      <Header />
      <ScrollToTop />
      <main id="main" tabIndex={-1} className="relative z-10 pt-[88px] outline-none">
        <Outlet />
      </main>
      <Footer />
      <GlobalAssistant />
    </div>
  )
}
