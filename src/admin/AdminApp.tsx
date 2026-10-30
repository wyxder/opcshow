import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminShell, { getSection, sections, type SectionKey } from '@/admin/AdminShell'
import { useAdminToast } from '@/admin/ui'
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
      {page}
      {node}
    </AdminShell>
  )
}
