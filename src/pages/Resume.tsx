import { ArrowUpRight, Download, FileText, Mail, MapPin, Phone, Printer, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { ProjectModal } from '@/components/ProjectModal'
import { PageHead } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/Toast'
import { awards, education, figures, profile, research, skillGroups, stats } from '@/data/site'
import { projects, type Project } from '@/data/projects'
import { resumeSnapshot } from '@/data/work'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'
import { resumeAssets } from '@/services/files'

const SectionTitle = ({ no, title, en }: { no: string; title: string; en: string }) => (
  <div className="mb-4 flex items-end gap-3 border-b-2 border-ink pb-2">
    <span className="font-mono text-[10px] font-bold text-coral">{no}</span>
    <h2 className="text-[19px] font-extrabold leading-none">{title}</h2>
    <span className="ml-auto font-mono text-[9px] tracking-[0.2em] text-ink/35">{en}</span>
  </div>
)

export default function Resume() {
  const [active, setActive] = useState<Project | null>(null)
  const { node } = useToast()

  useSeo({
    title: '简历 · 魏云潇',
    description: `${figures.products} 个项目、2 段实习、3 段科研、${figures.awards} 项竞赛。可打印成 A4，也可直接下载简历原件。`,
    path: '/work/resume',
  })

  return (
    <div className="shell">
      <PageHead
        kicker="03 / WORK · RESUME"
        title="一页纸的完整履历"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => window.print()} className="btn-ink !py-2 !text-[12px]">
              <Printer size={13} /> 打印 / PDF
            </button>
            {/* fx.md F6：真附件下载。服务端 PDF 渲染（B8）接入后 resumeAssets.pdf 会自动变成可用链接 */}
            <a href={resumeAssets.print.href} download className="btn !py-2 !text-[12px]" title="单文件 HTML，打开后即可另存为 PDF">
              <FileText size={13} /> 下载打印版
            </a>
            <a href={resumeAssets.docx.href} download={resumeAssets.docx.name} className="btn !py-2 !text-[12px]">
              <Download size={13} /> 简历原件
            </a>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-12">
        {/* left rail */}
        <aside className="space-y-3 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border-1.5 border-ink bg-cream p-5 shadow-hard">
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-1.5 border-ink bg-lime">
                <div className="absolute inset-0 halftone opacity-25" />
                <span className="relative font-display text-xl font-extrabold">魏</span>
              </div>
              <div>
                <h1 className="text-[22px] font-extrabold leading-none">魏云潇</h1>
                <p className="mt-1 font-mono text-[9px] tracking-[0.18em] text-ink/40">AI FULLSTACK · 2028 届</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink/60">
              AI 全栈 / 智能体开发实习 · 6 个月以上 · 5 天/周 · 随时到岗
            </p>
            <div className="mt-4 space-y-2 border-t border-dashed border-ink/20 pt-3.5 text-[11.5px]">
              {[
                { icon: Mail, v: profile.email },
                { icon: Phone, v: profile.phone },
                { icon: MapPin, v: '西安 · 可接受远程 / 出差' },
              ].map((c) => (
                <p key={c.v} className="flex items-center gap-2 text-ink/65">
                  <c.icon size={12} className="text-ink/35" /> {c.v}
                </p>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {stats.slice(0, 4).map((s) => (
                <div key={s.label} className="rounded-lg bg-paper px-2.5 py-2">
                  <p className="font-display text-[17px] font-extrabold leading-none">
                    {s.value}
                    <span className="text-[10px] text-coral">{s.suffix}</span>
                  </p>
                  <p className="mt-1 text-[9.5px] text-ink/45">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-1.5 border-ink bg-cream p-5">
            <SectionTitle no="A" title="技能" en="SKILLS" />
            <div className="space-y-2.5">
              {skillGroups.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium">{s.title}</span>
                    <span className="font-mono text-[9px] text-ink/35">{s.level}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${s.level}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {['Python', 'Java', 'React', 'Vue', 'FastAPI', 'Spring Boot', 'Redis', 'LangGraph', 'MCP', 'Three.js'].map((t) => (
                <span key={t} className="rounded border border-ink/15 bg-paper px-1.5 py-0.5 font-mono text-[9px] text-ink/55">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* main */}
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-2xl border-1.5 border-ink bg-lime/40 p-5">
            <p className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.18em] text-ink/50">
              <Sparkles size={11} /> HIGHLIGHTS · 一句话版
            </p>
            <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {resumeSnapshot.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-[11.5px] leading-relaxed text-ink/70">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rotate-45 bg-ink" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <section className="rounded-2xl border-1.5 border-ink bg-cream p-5 sm:p-6">
            <SectionTitle no="01" title="教育经历" en="EDUCATION" />
            <div className="space-y-4">
              {education.map((e) => (
                <div key={e.school} className="border-b border-dashed border-ink/12 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-[15px] font-bold">{e.school}</h3>
                      <span className="text-[12px] text-ink/55">{e.degree}</span>
                    </div>
                    <span className="font-mono text-[10px] text-ink/40">{e.period}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-lime/60 px-2 py-0.5 font-medium">{e.direction}</span>
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-ink/55">{e.badge}</span>
                  </p>
                  <ul className="mt-2 space-y-1">
                    {e.points.map((p) => (
                      <li key={p} className="flex gap-2 text-[11.5px] leading-relaxed text-ink/60">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/30" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border-1.5 border-ink bg-cream p-5 sm:p-6">
            <SectionTitle no="02" title="项目与实习" en="PROJECTS" />
            <div className="space-y-3">
              {projects.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActive(p)}
                  className="group block w-full rounded-xl border border-ink/12 bg-paper/60 p-3.5 text-left transition hover:border-ink hover:bg-paper"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[9px] text-ink/30">{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="text-[13.5px] font-bold leading-snug group-hover:underline">{p.title}</h3>
                    </div>
                    <span className="font-mono text-[9.5px] text-ink/40">{p.period}</span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-ink/45">
                    <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[9.5px] text-lime">{p.role}</span>
                    <span>{p.stack.slice(0, 5).join(' · ')}</span>
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink/55">{p.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.metrics.slice(0, 3).map((m) => (
                      <span key={m.label} className="rounded border border-ink/12 bg-cream px-1.5 py-0.5 text-[9.5px]">
                        {m.label} <span className="font-semibold">{m.value}</span>
                      </span>
                    ))}
                    <span className="ml-auto flex items-center gap-1 text-[9.5px] text-ink/40 group-hover:text-ink">
                      详情 <ArrowUpRight size={10} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border-1.5 border-ink bg-cream p-5 sm:p-6">
            <SectionTitle no="03" title="科研与内容" en="RESEARCH" />
            <div className="space-y-3">
              {research.map((r) => (
                <div key={r.title} className="rounded-xl border border-ink/12 p-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[12.5px] font-bold leading-snug">{r.title}</h3>
                    <span className="font-mono text-[9px] text-coral">{r.role}</span>
                  </div>
                  <p className="mt-1 text-[10.5px] text-ink/45">{r.venue}</p>
                  <ul className="mt-1.5 space-y-1">
                    {r.points.map((p) => (
                      <li key={p} className="flex gap-2 text-[11px] leading-relaxed text-ink/55">
                        <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-ink/25" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border-1.5 border-ink bg-cream p-5 sm:p-6">
            <SectionTitle no="04" title="竞赛荣誉" en="AWARDS" />
            <div className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
              {awards.map((a) => (
                <div key={a.name} className="flex items-baseline gap-2 border-b border-dotted border-ink/12 py-1">
                  <span className="font-mono text-[9px] text-ink/30">{a.year}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px]">{a.name}</span>
                  <span className={cn('shrink-0 text-[9.5px]', a.rank.includes('一等') || a.rank.includes('第一') ? 'font-semibold text-coral' : 'text-ink/45')}>
                    {a.rank}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-1.5 border-ink bg-ink p-5 text-paper">
            <p className="max-w-sm text-[12px] leading-relaxed text-paper/70">
              对前沿 AI 技术很感兴趣，研二在校西安准备实习中，可实习 6 个月及以上。接受加班，希望为企业创造自己的价值。
            </p>
            <a href={`mailto:${profile.email}`} className="btn-lime !py-2 !text-[12px]">
              联系我 <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>

      <ProjectModal project={active} onClose={() => setActive(null)} />
      {node}
    </div>
  )
}
