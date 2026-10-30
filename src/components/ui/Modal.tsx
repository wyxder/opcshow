import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap, useScrollLock } from '@/lib/a11y'
import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  kicker?: string
  className?: string
  bare?: boolean
}

export function Modal({ open, onClose, children, title, kicker, className, bare }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // fx.md A1：焦点陷阱 + 关闭后归还焦点；fx.md A2 配套的滚动锁
  useFocusTrap(open, panelRef)
  useScrollLock(open)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? '弹窗'}
            tabIndex={-1}
            className={cn(
              'relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-[26px] border-1.5 border-ink bg-cream shadow-hard-lg outline-none no-scrollbar',
              className ?? 'max-w-2xl',
            )}
            initial={{ opacity: 0, y: 36, scale: 0.97, rotate: -0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {!bare && (
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink/12 bg-cream/95 px-6 py-4 backdrop-blur">
                <div>
                  {kicker && <div className="kicker mb-1">{kicker}</div>}
                  {title && <h3 className="text-xl font-extrabold leading-tight">{title}</h3>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="关闭"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-1.5 border-ink bg-paper transition hover:rotate-90 hover:bg-coral hover:text-cream"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {bare && (
              <button
                onClick={onClose}
                aria-label="关闭"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border-1.5 border-ink bg-cream/90 transition hover:rotate-90 hover:bg-coral hover:text-cream"
              >
                <X size={16} />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
