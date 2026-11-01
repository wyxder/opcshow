import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  ChevronRight,
  CircleUserRound,
  FileText,
  FolderOpen,
  LayoutGrid,
  LogOut,
  Menu,
  MessagesSquare,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { serverConfig } from '@/services/config'
import { cn } from '@/lib/utils'

export type TabDef = { key: string; label: string }

export const sections = [
  {
    key: 'overview',
    label: '首页总览',
    sub: '数据看板',
    icon: LayoutGrid,
    tabs: [
      { key: 'overview', label: '总览' },
      { key: 'analytics', label: '数据看板' },
    ],
  },
  {
    key: 'profile',
    label: '个人中心',
    sub: '资料 / 账号 / 安全',
    icon: CircleUserRound,
    tabs: [
      { key: 'profile', label: '资料' },
      { key: 'account', label: '账号' },
      { key: 'security', label: '安全' },
    ],
  },
  {
    key: 'content',
    label: '内容管理',
    sub: '文章 / 项目 / 动态',
    icon: FileText,
    tabs: [
      { key: 'articles', label: '文章' },
      { key: 'projects', label: '项目' },
      { key: 'moments', label: '动态' },
    ],
  },
  {
    key: 'resume',
    label: '简历管理',
    sub: '解析 / 模块 / 版本',
    icon: FileText,
    tabs: [
      { key: 'parse', label: '解析' },
      { key: 'modules', label: '模块' },
      { key: 'versions', label: '版本' },
    ],
  },
  {
    key: 'files',
    label: '文件资源',
    sub: '上传 / 分享 / 清理',
    icon: FolderOpen,
    tabs: [
      { key: 'upload', label: '上传' },
      { key: 'share', label: '分享' },
      { key: 'clean', label: '清理' },
    ],
  },
  {
    key: 'review',
    label: '互动审核',
    sub: '弹幕 / 留言 / 友链',
    icon: MessagesSquare,
    tabs: [
      { key: 'danmaku', label: '弹幕' },
      { key: 'guestbook', label: '留言' },
      { key: 'friends', label: '友链' },
    ],
  },
  {
    key: 'ai',
    label: 'AI 配置',
    sub: '模型 / 提示词 / 用量',
    icon: Sparkles,
    tabs: [
      { key: 'models', label: '模型' },
      { key: 'prompts', label: '提示词' },
      { key: 'usage', label: '用量' },
    ],
  },
  {
    key: 'settings',
    label: '系统设置',
    sub: '主题 / SEO / 备份',
    icon: Settings,
    tabs: [
      { key: 'theme', label: '主题' },
      { key: 'seo', label: 'SEO' },
      { key: 'backup', label: '备份' },
    ],
  },
] as const

export type SectionKey = (typeof sections)[number]['key']

export function getSection(key: string) {
  return sections.find((s) => s.key === key) ?? sections[0]
}

function NavList({
  active,
  onPick,
  compact,
  pending,
}: {
  active: SectionKey
  onPick: (key: SectionKey) => void
  compact?: boolean
  pending?: number | null
}) {
  return (
    <nav className={cn('space-y-0.5', compact && 'mt-5')}>
      {sections.map((s) => {
        const on = s.key === active
        const badge = s.key === 'review' ? (pending ?? 0) : 0
        return (
          <button
            key={s.key}
            onClick={() => onPick(s.key)}
            className={cn(
              'group relative flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition',
              on ? 'border-ink/15 bg-lime/55 shadow-hard-sm' : 'border-transparent hover:bg-lime/20',
            )}
          >
            <s.icon size={16} className={cn('shrink-0', on ? 'text-ink' : 'text-ink/55')} strokeWidth={1.8} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className={cn('block truncate text-[12.5px]', on ? 'font-semibold text-ink' : 'font-medium text-ink/75')}>
                {s.label}
              </span>
              <span className={cn('mt-0.5 block truncate text-[9.5px]', on ? 'text-ink/80' : 'text-admin-muted')}>{s.sub}</span>
            </span>
            {badge ? (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-admin-red px-1 font-mono text-[8.5px] text-paper">
                {badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

export default function AdminShell({
  section,
  onNavigate,
  onLogout,
  pending,
  children,
}: {
  section: SectionKey
  onNavigate: (key: SectionKey) => void
  onLogout?: () => void
  pending?: number | null
  children: ReactNode
}) {
  const [drawer, setDrawer] = useState(false)
  const current = getSection(section)

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* fx.md A2：后台同样给键盘用户一个直达主内容的入口 */}
      <a href="#main" className="skip-link">
        跳到主要内容
      </a>
      {/* sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col border-r-1.5 border-ink/15 bg-paper px-3 py-4 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-1.5">
          <span className="flex h-9 w-9 -rotate-3 items-center justify-center overflow-hidden rounded-[10px] border-1.5 border-ink bg-cream shadow-hard-sm">
            <img src="/image/logo.png" alt="WYX.ADMIN 标志" className="h-full w-full object-cover" />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[13px] font-extrabold tracking-[0.02em] text-ink">WYX.ADMIN</span>
            <span className="mt-1 block font-mono text-[8.5px] tracking-[0.2em] text-admin-muted">CONTROL ROOM</span>
          </span>
        </Link>

        <div className="mt-7 flex-1 overflow-y-auto no-scrollbar">
          <NavList active={section} onPick={onNavigate} pending={pending} />
        </div>

        <div className="mt-3 space-y-1 border-t border-ink/15 pt-3">
          <Link to="/" className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[11.5px] text-ink/80 transition hover:bg-lime/25 hover:text-ink">
            回到前台 <ArrowUpRight size={13} />
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[11.5px] text-ink/80 transition hover:bg-lime/25 hover:text-ink"
          >
            退出登录 <LogOut size={13} />
          </button>
          <p className="px-2.5 pt-2 font-mono text-[8.5px] tracking-[0.14em] text-admin-muted">
            {serverConfig.enabled ? 'V1.0 · SERVER MODE' : 'V1.0 · DEMO'}
          </p>
        </div>
      </aside>

      <div className="lg:pl-[228px]">
        {/* topbar */}
        <header className="sticky top-0 z-30 border-b-1.5 border-ink/15 bg-paper/92 backdrop-blur">
          <div className="flex h-[54px] items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setDrawer(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border-1.5 border-ink bg-cream text-ink shadow-hard-sm lg:hidden"
              aria-label="打开导航"
            >
              <Menu size={15} />
            </button>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
              <span className="text-admin-muted">ADMIN</span>
              <ChevronRight size={11} className="text-ink/30" />
              <span className="font-medium text-ink">{current.label}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border-1.5 border-ink/20 bg-cream px-2.5 py-1 text-[10.5px] text-ink/70 sm:flex">
                <span className={cn('h-1.5 w-1.5 rounded-full', serverConfig.enabled ? 'bg-admin-teal' : 'bg-admin-amber')} />
                {serverConfig.enabled ? '服务在线' : '演示模式'}
              </span>
              <span className="hidden items-center gap-1.5 rounded-full border-1.5 border-ink/20 bg-cream px-2.5 py-1 text-[10.5px] text-ink/70 sm:flex">
                owner <span className="h-3 w-px bg-ink/15" /> 晓叶
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-1.5 border-ink bg-lime text-[11px] font-semibold text-ink">魏</span>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1580px] px-4 py-5 outline-none sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/35" onClick={() => setDrawer(false)} />
            <motion.div
              className="absolute inset-y-0 left-0 flex w-[262px] flex-col border-r-1.5 border-ink/15 bg-paper p-3"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            >
              <div className="flex items-center justify-between px-1.5">
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 -rotate-3 items-center justify-center overflow-hidden rounded-lg border-1.5 border-ink bg-cream">
                    <img src="/image/logo.png" alt="WYX.ADMIN 标志" className="h-full w-full object-cover" />
                  </span>
                  <span className="font-display text-[12px] font-extrabold">WYX.ADMIN</span>
                </span>
                <button onClick={() => setDrawer(false)} aria-label="关闭导航" className="text-admin-muted">
                  <X size={17} />
                </button>
              </div>
              <div className="mt-4 flex-1 overflow-y-auto no-scrollbar">
                <NavList
                  active={section}
                  compact
                  pending={pending}
                  onPick={(k) => {
                    onNavigate(k)
                    setDrawer(false)
                  }}
                />
              </div>
              <Link to="/" className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[11.5px] text-ink/80">
                回到前台 <ArrowUpRight size={13} />
              </Link>
              <button
                onClick={onLogout}
                className="mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[11.5px] text-ink/80 transition hover:bg-lime/25 hover:text-ink"
              >
                退出登录 <LogOut size={13} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
