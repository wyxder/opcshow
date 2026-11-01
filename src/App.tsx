import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from '@/components/Layout'
import { ErrorBoundary, NotFound, RouteErrorBoundary, RouteFallback } from '@/components/ErrorBoundary'
import { flushStay, trackPageview } from '@/services/analytics'

/* ---------------------------------------------------------------------------
 * 路由级懒加载（fx.md P1 / fx2 FE-01）：首屏只装框架，Home 也拆成独立 chunk。
 * 预渲染 HTML 已包含首页正文，chunk 到达前不会白屏。
 * ------------------------------------------------------------------------- */
const Home = lazy(() => import('@/pages/Home'))
const Learn = lazy(() => import('@/pages/Learn'))
const Reader = lazy(() => import('@/pages/Reader'))
const Resume = lazy(() => import('@/pages/Resume'))
const Toolbox = lazy(() => import('@/pages/Toolbox'))
const Files = lazy(() => import('@/pages/Files'))
const Love = lazy(() => import('@/pages/Love'))
const Moments = lazy(() => import('@/pages/Moments'))
const Travel = lazy(() => import('@/pages/Travel'))
const MusicBox = lazy(() => import('@/pages/MusicBox'))
const About = lazy(() => import('@/pages/About'))
const Media = lazy(() => import('@/pages/Media'))
const Guestbook = lazy(() => import('@/pages/Guestbook'))
const Friends = lazy(() => import('@/pages/Friends'))
const Admin = lazy(() => import('@/pages/Admin'))

function AnimatedOutlet() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="learn" element={<Learn />} />
              <Route path="learn/:id" element={<Reader />} />
              <Route path="work" element={<Navigate to="/work/resume" replace />} />
              <Route path="work/resume" element={<Resume />} />
              <Route path="work/toolbox" element={<Toolbox />} />
              <Route path="work/files" element={<Files />} />
              <Route path="life" element={<Navigate to="/life/moments" replace />} />
              <Route path="life/love" element={<Love />} />
              <Route path="life/moments" element={<Moments />} />
              <Route path="life/travel" element={<Travel />} />
              <Route path="life/music" element={<MusicBox />} />
              <Route path="me" element={<About />} />
              <Route path="me/media" element={<Media />} />
              <Route path="me/guestbook" element={<Guestbook />} />
              <Route path="me/friends" element={<Friends />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const location = useLocation()

  // B7 降级实现：无 Cookie 的本机浏览样本，接服务端后自动改走 /api/track
  useEffect(() => {
    trackPageview(location.pathname)
  }, [location.pathname])

  // BE-09：页面隐藏/关闭时补发真实停留时长，平均停留不再恒为 0
  useEffect(() => {
    const onHide = () => flushStay()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushStay()
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  if (location.pathname.startsWith('/admin')) {
    return (
      <ErrorBoundary boundary="route:/admin">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/admin/*" element={<Admin />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary boundary="app">
      <RouteErrorBoundary>
        <AnimatedOutlet />
      </RouteErrorBoundary>
    </ErrorBoundary>
  )
}
