import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Learn from '@/pages/Learn'
import Reader from '@/pages/Reader'
import Resume from '@/pages/Resume'
import Toolbox from '@/pages/Toolbox'
import Files from '@/pages/Files'
import Love from '@/pages/Love'
import Moments from '@/pages/Moments'
import Travel from '@/pages/Travel'
import MusicBox from '@/pages/MusicBox'
import About from '@/pages/About'
import Media from '@/pages/Media'
import Timeline from '@/pages/Timeline'
import Guestbook from '@/pages/Guestbook'
import Friends from '@/pages/Friends'
import Admin from '@/pages/Admin'

function NotFound() {
  return (
    <div className="shell flex min-h-[52vh] flex-col items-center justify-center text-center">
      <p className="font-display text-[clamp(70px,16vw,150px)] font-extrabold leading-none text-ink/10">404</p>
      <p className="mt-2 font-hand text-2xl text-coral">这页还没写，或者被我不小心删了。</p>
      <p className="mt-2 text-[13px] text-ink/50">要不要回首页看看我的项目？</p>
      <Link to="/" className="btn-ink mt-6">
        <ArrowLeft size={14} /> 回首页
      </Link>
    </div>
  )
}

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
        <Routes location={location}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="learn" element={<Learn />} />
            <Route path="learn/:id" element={<Reader />} />
            <Route path="work" element={<Navigate to="/work/resume" replace />} />
            <Route path="work/resume" element={<Resume />} />
            <Route path="work/toolbox" element={<Toolbox />} />
            <Route path="work/files" element={<Files />} />
            <Route path="life" element={<Navigate to="/life/love" replace />} />
            <Route path="life/love" element={<Love />} />
            <Route path="life/moments" element={<Moments />} />
            <Route path="life/travel" element={<Travel />} />
            <Route path="life/music" element={<MusicBox />} />
            <Route path="me" element={<About />} />
            <Route path="me/media" element={<Media />} />
            <Route path="me/timeline" element={<Timeline />} />
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
  if (location.pathname.startsWith('/admin')) {
    return (
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    )
  }
  return <AnimatedOutlet />
}
