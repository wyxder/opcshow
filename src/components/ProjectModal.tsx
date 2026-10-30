import { ArrowUpRight, CalendarDays, Sparkles } from 'lucide-react'
import type { Project } from '@/data/projects'
import { Modal } from '@/components/ui/Modal'
import { Plate } from '@/components/ui/primitives'

export function ProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  return (
    <Modal open={!!project} onClose={onClose} bare className="max-w-3xl">
      {project && (
        <div>
          <div className="relative">
            <Plate motif={project.motif} accent={project.accent} index={project.en} label={project.category} className="h-36 sm:h-44" />
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-cream via-cream/85 to-transparent px-6 pb-4 pt-10">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="tag bg-lime">{project.category}</span>
                <span className="tag">
                  <CalendarDays size={11} /> {project.period}
                </span>
              </div>
              <h3 className="text-[clamp(20px,3vw,28px)] font-extrabold leading-tight">{project.title}</h3>
              <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-ink/45">{project.en}</p>
            </div>
          </div>

          <div className="px-6 pb-8">
            {project.award && (
              <p className="mb-4 flex items-start gap-2 rounded-xl border border-ink/12 bg-lime/25 px-3 py-2 text-[12px] font-medium">
                <Sparkles size={14} className="mt-0.5 shrink-0" /> {project.award}
              </p>
            )}
            <p className="text-[13.5px] leading-relaxed text-ink-soft">{project.summary}</p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {project.metrics.map((m) => (
                <div key={m.label} className="rounded-xl border border-ink/12 bg-paper px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink/40">{m.label}</p>
                  <p className="mt-1 text-[13px] font-bold leading-tight">{m.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {project.bullets.map((b) => (
                <div key={b.k} className="flex gap-3 border-b border-dashed border-ink/10 pb-3 last:border-0">
                  <span className="mt-0.5 w-[62px] shrink-0 rounded-md bg-ink px-1.5 py-0.5 text-center font-mono text-[9px] leading-4 text-lime">
                    {b.k}
                  </span>
                  <p className="text-[13px] leading-relaxed text-ink-soft">{b.v}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {project.stack.map((s) => (
                <span key={s} className="rounded-md border border-ink/15 bg-cream px-2 py-1 font-mono text-[10px] text-ink/60">
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
              <p className="font-hand text-[18px] text-ink/55">项目细节可以当面聊，代码也能现场跑。</p>
              <a
                href="mailto:wyxcode@qq.com"
                className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-ink bg-ink px-4 py-2 text-[12px] text-paper transition hover:-translate-y-0.5 hover:shadow-hard-sm"
              >
                聊聊这个项目 <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
