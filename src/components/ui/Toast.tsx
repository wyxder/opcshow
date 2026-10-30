import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const timer = useRef<number | null>(null)

  /** F-16：默认 polite；失败类消息用 assertive 播报。同一消息不重复堆叠。 */
  const show = useCallback((msg: string, opts?: { error?: boolean }) => {
    const error = opts?.error ?? /失败|错误|不能|超时|不可用|不允许/.test(msg)
    setIsError(error)
    setMessage((prev) => (prev === msg ? prev : msg))
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
          role={isError ? 'alert' : 'status'}
          aria-live={isError ? 'assertive' : 'polite'}
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
