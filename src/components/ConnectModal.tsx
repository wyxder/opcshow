import { motion } from 'framer-motion'
import { ArrowUpRight, Check, Copy, Github, Heart, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { links, profile } from '@/data/site'
import { cn } from '@/lib/utils'

/** 「交个朋友」弹窗：竖版窄卡片，二维码居中，从上到下一眼看完 */
export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(profile.wechat)
      setCopied(true)
    } catch {
      // 非 HTTPS / 旧浏览器没有剪贴板权限：退化成选中文本，用户自己复制
      const input = document.createElement('input')
      input.value = profile.wechat
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
      setCopied(true)
    }
  }

  return (
    <Modal open={open} onClose={onClose} bare className="max-w-[404px]">
      <div className="relative overflow-hidden rounded-[24px]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose via-coral to-lime" />
        <span className="pointer-events-none absolute right-8 top-20 text-rose/40 animate-float" aria-hidden>
          <Heart size={15} className="fill-current" />
        </span>
        <span className="pointer-events-none absolute bottom-32 left-7 text-coral/30 animate-bob" aria-hidden>
          <Heart size={11} className="fill-current" />
        </span>

        <div className="relative px-6 pb-7 pt-9">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <p className="flex items-center justify-center gap-1.5 font-mono text-[9px] tracking-[0.24em] text-ink/45">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-coral" />
              SAY HI / WYX.SPACE
            </p>
            <h2 className="mt-2 font-display text-[30px] font-extrabold leading-none tracking-tight">
              交个朋友<span className="text-coral">。</span>
            </h2>
            <p className="mx-auto mt-2.5 max-w-[19em] text-[12px] leading-relaxed text-ink/55">
              AI 全栈 / 智能体开发。接技术合作，也想认识同频的人——
              备注「从 wyx.space 来」，我就知道是你。
            </p>
          </motion.div>

          {/* 二维码：竖版卡片的主角，居中放大 */}
          <motion.div
            initial={{ opacity: 0, y: 16, rotate: -1.4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.12, duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-5 w-[214px]"
          >
            <div className="relative rounded-2xl border-1.5 border-ink bg-cream p-3 shadow-hard-sm">
              <span className="absolute -top-2.5 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[-2deg] border border-ink/10 bg-rose/50" aria-hidden />
              <div className="relative aspect-square overflow-hidden rounded-xl border border-ink/12 bg-paper">
                {qrFailed ? (
                  <QrFallback />
                ) : (
                  <img
                    src="/wechat-qr.png"
                    alt={`微信二维码：${profile.wechat}`}
                    width={190}
                    height={190}
                    className="h-full w-full object-cover"
                    onError={() => setQrFailed(true)}
                  />
                )}
                <span className="pointer-events-none absolute inset-2" aria-hidden>
                  <i className="absolute left-0 top-0 h-4 w-4 rounded-tl border-l-2 border-t-2 border-coral" />
                  <i className="absolute right-0 top-0 h-4 w-4 rounded-tr border-r-2 border-t-2 border-coral" />
                  <i className="absolute bottom-0 left-0 h-4 w-4 rounded-bl border-b-2 border-l-2 border-coral" />
                  <i className="absolute bottom-0 right-0 h-4 w-4 rounded-br border-b-2 border-r-2 border-coral" />
                </span>
              </div>
              <p className="mt-2 text-center font-mono text-[9px] tracking-[0.1em] text-ink/45">
                <MessageCircle size={9} className="mr-1 inline" /> 微信扫码 · 或直接搜索
              </p>
            </div>
          </motion.div>

          <button
            onClick={copyId}
            className={cn(
              'mt-3.5 w-full rounded-full border-1.5 border-ink px-3 py-2.5 text-[12.5px] font-bold transition-all duration-200',
              copied ? 'border-coral bg-coral text-cream' : 'bg-lime text-ink hover:-translate-y-0.5 hover:shadow-hard-sm',
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '微信号已复制' : profile.wechat}
            </span>
          </button>

          <div className="mt-5 border-t border-dashed border-ink/15 pt-4">
            <ul className="space-y-2">
              {[
                { title: '技术合作', desc: 'Agent / RAG / 评测中台，从方案到上线。', color: 'bg-coral', icon: Sparkles },
                { title: '交流交友', desc: 'AI 全栈、Vibe Coding、开源，互相递点新东西。', color: 'bg-rose', icon: Heart },
                { title: '实习与项目', desc: '6 个月以上、5 天/周，随时到岗。', color: 'bg-lime', icon: MessageCircle },
              ].map((item, i) => (
                <motion.li
                  key={item.title}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 + i * 0.06, duration: 0.36 }}
                  className="flex items-start gap-2.5"
                >
                  <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink/25', item.color)}>
                    <item.icon size={11} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold leading-tight">{item.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-ink/50">{item.desc}</span>
                  </span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-4 flex items-center gap-2">
              <a href={links.email} className="btn-ink flex-1 justify-center !py-2 text-[11.5px]">
                <Mail size={12} /> 写封邮件
              </a>
              <a href={links.github} target="_blank" rel="noreferrer" className="btn flex-1 justify-center !py-2 text-[11.5px]">
                <Github size={12} /> GitHub <ArrowUpRight size={10} className="opacity-50" />
              </a>
            </div>
            <p className="mt-3 text-center font-hand text-[17px] text-ink/45">加推不亏，先聊两句。</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** 二维码资源缺失时的兜底：不用破图，直接把微信号摆出来 */
function QrFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[repeating-linear-gradient(45deg,rgb(var(--c-rose)/0.18)_0_8px,transparent_8px_16px)] px-4 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border-1.5 border-ink bg-cream">
        <MessageCircle size={17} />
      </span>
      <p className="mt-1 font-mono text-[9px] tracking-[0.18em] text-ink/40">WECHAT ID</p>
      <p className="font-display text-[16px] font-extrabold">{profile.wechat}</p>
      <p className="text-[10.5px] leading-snug text-ink/45">把微信名片二维码放到<br />public/wechat-qr.png</p>
    </div>
  )
}
