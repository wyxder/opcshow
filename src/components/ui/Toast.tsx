import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const show = useCallback((msg: string) => {
    setMessage(msg)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(null), 2200)
  }, [])

  const node = (
    <AnimatePresence>
      {message && (
        <motion.div
          /* 居中靠 motion 自己的 x：motion 会写内联 transform，
             挂 Tailwind 的 -translate-x-1/2 会被覆盖导致右偏半个身位 */
          initial={{ opacity: 0, x: '-50%', y: 24, scale: 0.96 }}
          animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
          exit={{ opacity: 0, x: '-50%', y: 12, scale: 0.98 }}
          className="fixed bottom-6 left-1/2 z-[95] flex items-center gap-2 rounded-full border-1.5 border-ink bg-ink px-4 py-2.5 text-[12px] text-paper shadow-hard"
        >
          <CheckCircle2 size={14} className="text-lime" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return { show, node }
}
