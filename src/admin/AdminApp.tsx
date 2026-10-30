import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminShell, { getSection, sections, type SectionKey } from '@/admin/AdminShell'
import { useAdminToast } from '@/admin/ui'
import { useSeo } from '@/lib/seo'
import { getSession, type AdminSession } from '@/services/auth'
import { serverConfig } from '@/services/config'
import AiConfigPage from '@/admin/pages/AiConfigPage'
import AnalyticsPage from '@/admin/pages/AnalyticsPage'
import ContentPage from '@/admin/pages/ContentPage'
import FilesAdminPage from '@/admin/pages/FilesAdminPage'
import ModerationPage from '@/admin/pages/ModerationPage'
import OverviewPage from '@/admin/pages/OverviewPage'
import ProfilePage from '@/admin/pages/ProfilePage'
import ResumeAdminPage from '@/admin/pages/ResumeAdminPage'
import SettingsPage from '@/admin/pages/SettingsPage'

export default function AdminApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { show, node } = useAdminToast()
  const [session, setSession] = useState<AdminSession | null>(null)

  // fx.md S3：后台不参与索引
  useSeo({ title: '后台管理 · WYX.SPACE', description: '站点后台（演示）。', path: '/admin', robots: 'noindex, nofollow' })

  // fx.md B2：会话适配层。未配服务端 = 演示会话（不拦人，但界面必须说清楚）
  useEffect(() => {
    let alive = true
    getSession().then((s) => alive && setSession(s))
    return () => {
      alive = false
    }
  }, [])

  const parts = location.pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  const known = sections.some((s) => s.key === parts[0])
  const section = getSection(known ? parts[0] : 'overview')
  const key = section.key as SectionKey
  const tab = section.tabs.some((t) => t.key === parts[1]) ? parts[1] : section.tabs[0].key

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const go = (target: SectionKey, t?: string) => {
    const next = getSection(target)
    navigate(`/admin/${target}/${t ?? next.tabs[0].key}`)
  }
  const setTab = (t: string) => navigate(`/admin/${key}/${t}`)

  const page = (() => {
    switch (key) {
      case 'overview':
        return tab === 'analytics' ? <AnalyticsPage show={show} /> : <OverviewPage show={show} go={go} />
      case 'profile':
        return <ProfilePage tab={tab as 'profile' | 'account' | 'security'} setTab={setTab} show={show} />
      case 'content':
        return <ContentPage tab={tab as 'articles' | 'projects' | 'moments'} setTab={setTab} show={show} />
      case 'resume':
        return <ResumeAdminPage tab={tab as 'parse' | 'modules' | 'versions'} setTab={setTab} show={show} />
      case 'files':
        return <FilesAdminPage tab={tab as 'upload' | 'share' | 'clean'} setTab={setTab} show={show} />
      case 'review':
        return <ModerationPage tab={tab as 'danmaku' | 'guestbook' | 'friends'} setTab={setTab} show={show} />
      case 'ai':
        return <AiConfigPage tab={tab as 'models' | 'prompts' | 'usage'} setTab={setTab} show={show} />
      case 'settings':
        return <SettingsPage tab={tab as 'theme' | 'seo' | 'backup'} setTab={setTab} show={show} />
      default:
        return null
    }
  })()

  return (
    <AdminShell section={key} onNavigate={(k) => go(k)}>
      {session?.mode === 'demo' && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border-1.5 border-dashed border-warning/60 bg-warning/10 px-3 py-2 text-[11.5px] text-ink">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-admin-warning">DEMO · 未鉴权</span>
          <span>
            当前没有服务端，任何访客都能打开这个后台；所有写操作只改内存，刷新就没了。
          </span>
          <span className="font-mono text-[9.5px] text-ink/45">
            接入点：VITE_API_BASE + services/auth.ts（{serverConfig.authLoginPath}）
          </span>
        </div>
      )}
      {page}
      {node}
    </AdminShell>
  )
}
