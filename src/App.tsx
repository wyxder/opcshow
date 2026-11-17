import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout, { MobileTabBar } from '@/components/Layout'
import { ErrorBoundary, NotFound, RouteErrorBoundary, RouteFallback, lazyWithRetry } from '@/components/ErrorBoundary'
import { flushStay, trackPageview } from '@/services/analytics'

/* ---------------------------------------------------------------------------
 * 路由级懒加载（fx.md P1 / fx2 FE-01）：首屏只装框架，Home 也拆成独立 chunk。
 * 预渲染 HTML 已包含首页正文，chunk 到达前不会白屏。
 * ------------------------------------------------------------------------- */
// 首页是默认路由：模块级就发起 chunk 请求，lazy 复用同一个 promise。
// 首次进入首页时 Suspense 几乎不再挂起，loading 占位不会把顶栏 / 首屏顶掉。
const homeChunk = import('@/pages/Home')
const Home = lazyWithRetry(() => homeChunk)
const Avatar = lazyWithRetry(() => import('@/features/ai-avatar/pages/AICharacter'))
const Learn = lazyWithRetry(() => import('@/pages/Learn'))
const Reader = lazyWithRetry(() => import('@/pages/Reader'))
const Toolbox = lazyWithRetry(() => import('@/pages/Toolbox'))
const Files = lazyWithRetry(() => import('@/pages/Files'))
const Love = lazyWithRetry(() => import('@/pages/Love'))
const Moments = lazyWithRetry(() => import('@/pages/Moments'))
const Travel = lazyWithRetry(() => import('@/pages/Travel'))
const MusicBox = lazyWithRetry(() => import('@/pages/MusicBox'))
const Media = lazyWithRetry(() => import('@/pages/Media'))
const Guestbook = lazyWithRetry(() => import('@/pages/Guestbook'))
const Friends = lazyWithRetry(() => import('@/pages/Friends'))
const Admin = lazyWithRetry(() => import('@/pages/Admin'))

function AnimatedOutlet() {
  const location = useLocation()
  // Suspense 边界下沉到 Layout 内部（包住 Outlet）：Header / 页脚 / 底部菜单栏始终常驻。
  // 原来边界在 Routes 外层，首页 chunk 未就绪时整个 Layout 会被 loading 占位替换，
  // 移动端表现为「顶栏先消失几秒、再连着整页内容一起冒出来」的上下跳动。
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="ai" element={<Avatar />} />
            <Route path="learn" element={<Learn />} />
            <Route path="learn/:id" element={<Reader />} />
            <Route path="work" element={<Navigate to="/work/toolbox" replace />} />
            <Route path="work/toolbox" element={<Toolbox />} />
            <Route path="work/files" element={<Files />} />
            <Route path="life" element={<Navigate to="/life/moments" replace />} />
            <Route path="life/love" element={<Love />} />
            <Route path="life/moments" element={<Moments />} />
            <Route path="life/travel" element={<Travel />} />
            <Route path="life/music" element={<MusicBox />} />
            <Route path="me" element={<Navigate to="/me/media" replace />} />
            <Route path="me/media" element={<Media />} />
            <Route path="me/guestbook" element={<Guestbook />} />
            <Route path="me/friends" element={<Friends />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
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
    <>
      <ErrorBoundary boundary="app">
        <RouteErrorBoundary>
          <AnimatedOutlet />
        </RouteErrorBoundary>
      </ErrorBoundary>
      {/* 底部菜单栏挂在所有错误边界之外：任何页面 / chunk 渲染出错都只会塌内容区，
          6 个主入口始终 portal 在 body 上、随视口固定，下滑也不会消失。 */}
      <MobileTabBar />
    </>
  )
}
