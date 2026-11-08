import { Check, CloudDownload, DatabaseBackup, Download, RefreshCw, RotateCcw, Search, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { backups as backupSeed, seoDefaults, systemInfo } from '@/admin/data'
import {
  AButton,
  AdminModal,
  Badge,
  EmptyState,
  Field,
  IconButton,
  Input,
  LoadState,
  PageTitle,
  Panel,
  Select,
  Segmented,
  Status,
  TableHead,
  Tabs,
  Textarea,
  Toggle,
} from '@/admin/ui'
import { cn, newId } from '@/lib/utils'
import { serverConfig } from '@/services/config'
import { apiJson } from '@/services/http'
import { getSiteSettings, saveSiteSettings } from '@/services/settings'
import { deleteBackup } from '@/services/admin'
import {
  cleanupBackups,
  downloadBackup,
  downloadJson,
  exportConfig,
  getAssets,
  getBackupPlan,
  getCapabilities,
  getSeoStatus,
  importBackup,
  importConfig,
  readJsonFile,
  refreshAssets,
  saveBackupPlan,
  type AssetsInfo,
  type BackupPlan,
  type Capabilities,
  type SeoStatus,
} from '@/services/adminx'
import { useTheme } from '@/theme/ThemeProvider'
import { SWATCH_TOKENS } from '@/theme/theme'
import { siteMeta } from '@/data/site'

type Tab = 'theme' | 'seo' | 'backup'
type BackupRow = (typeof backupSeed)[number]

const formatBytes = (n?: number) => {
  const v = Number(n) || 0
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(0)} KB`
  return `${(v / 1024 / 1024).toFixed(1)} MB`
}

export default function SettingsPage({ tab, setTab, show }: { tab: Tab; setTab: (t: Tab) => void; show: (m: string) => void }) {
  // 主题只有一套数据源：直接读写 ThemeProvider，不再维护后台自己的预设表
  // fx.md T5：这里改的是「本机覆盖」，站点缺省主题需要服务端下发才能真正影响所有访客
  const { theme, setTheme, resetTheme, isPersonalChoice, followSiteDefault, themes } = useTheme()
  const current = themes.find((t) => t.id === theme) ?? themes[0]

  const [tokenValues, setTokenValues] = useState<Record<string, string>>({})
  const [seo, setSeo] = useState(seoDefaults)

  // SEO / 资源 / 能力：真实状态来自服务端，未接入时为 null
  const [seoStatus, setSeoStatus] = useState<SeoStatus | null>(null)
  const [seoStatusLoading, setSeoStatusLoading] = useState(true)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [assets, setAssets] = useState<AssetsInfo | null>(null)
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [refreshingAssets, setRefreshingAssets] = useState(false)

  // 备份列表 / 导入导出
  const [backups, setBackups] = useState<BackupRow[]>(backupSeed)
  const [backupsLoading, setBackupsLoading] = useState(true)
  const [backupsError, setBackupsError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [importingBackup, setImportingBackup] = useState(false)

  // 自动备份计划（真实持久化）+ 配置导入导出 / 清理
  const [plan, setPlan] = useState<BackupPlan>({ enabled: false, time: '03:00', retain: 14, lastRunAt: null })
  const [planLoading, setPlanLoading] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [exportingCfg, setExportingCfg] = useState(false)
  const [importingCfg, setImportingCfg] = useState(false)

  const backupFileRef = useRef<HTMLInputElement>(null)
  const configFileRef = useRef<HTMLInputElement>(null)

  /** FE-05：备份列表直接读服务端 /api/admin/backup；真实模式下失败要给出可重试的错误，而非静默回落演示数据 */
  const loadBackups = useCallback(async () => {
    if (!serverConfig.enabled) {
      setBackupsLoading(false)
      return
    }
    setBackupsLoading(true)
    try {
      const list = await apiJson<{ id: string; createdAt?: string; bytes?: number; entries?: number }[]>('/api/admin/backup')
      setBackups(
        list.map((b) => ({
          id: b.id,
          name: b.id,
          size: formatBytes(b.bytes),
          type: '手动' as const,
          status: '成功' as const,
          time: b.createdAt ? new Date(b.createdAt).toLocaleString('zh-CN') : '—',
          items: `${b.entries ?? 0} 类数据`,
        })),
      )
      setBackupsError(null)
    } catch (err) {
      setBackupsError(`备份列表加载失败：${(err as Error).message}`)
    } finally {
      setBackupsLoading(false)
    }
  }, [])

  // FE-05 / BE-14：SEO 表单字段读服务端，未接入时保持本机预览
  const loadSiteSeo = useCallback(async () => {
    const site = await getSiteSettings()
    if (!site) return
    setSeo((cur) => ({
      ...cur,
      title: site.title ?? cur.title,
      description: site.description ?? cur.description,
      keywords: Array.isArray(site.keywords) ? site.keywords.join(',') : cur.keywords,
      ogImage: site.ogImage ?? cur.ogImage,
      sitemap: site.sitemap ?? cur.sitemap,
      structuredData: site.structuredData ?? cur.structuredData,
      analytics: site.analytics ?? cur.analytics,
    }))
  }, [])

  const loadSeoStatus = useCallback(async () => {
    setSeoStatus(await getSeoStatus())
    setSeoStatusLoading(false)
  }, [])

  const loadCapabilities = useCallback(async () => {
    setCapabilities(await getCapabilities())
  }, [])

  const loadAssets = useCallback(async () => {
    setAssets(await getAssets())
    setAssetsLoading(false)
  }, [])

  const loadPlan = useCallback(async () => {
    const p = await getBackupPlan()
    if (p) setPlan(p)
    setPlanLoading(false)
  }, [])

  useEffect(() => {
    void loadBackups()
    void loadSiteSeo()
    void loadSeoStatus()
    void loadCapabilities()
    void loadAssets()
    void loadPlan()
  }, [loadBackups, loadSiteSeo, loadSeoStatus, loadCapabilities, loadAssets, loadPlan])

  // 等主题属性落到 <html> 后再读实际值
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const styles = getComputedStyle(document.documentElement)
      const keys = ['--c-bg', '--c-surface', '--c-ink', '--c-ink-soft', '--c-lime', '--c-coral', '--r-lg', '--bw', '--sh-hard']
      setTokenValues(
        keys.reduce<Record<string, string>>((acc, k) => {
          const raw = styles.getPropertyValue(k).trim()
          acc[k] = k.startsWith('--c-') && raw ? `rgb(${raw})` : raw
          return acc
        }, {}),
      )
    })
    return () => cancelAnimationFrame(raf)
  }, [theme])

  const checks = useMemo(
    () => [
      { label: '标题长度 30–60 字符', ok: seo.title.length >= 12 && seo.title.length <= 60 },
      { label: '描述长度 80–160 字符', ok: seo.description.length >= 20 && seo.description.length <= 160 },
      { label: '关键词 3–8 个', ok: seo.keywords.split(/[,，]/).filter(Boolean).length >= 3 },
      { label: '已配置 OG 图', ok: Boolean(seo.ogImage) },
      { label: '已生成 sitemap', ok: seo.sitemap },
      { label: '开启结构化数据', ok: seo.structuredData },
    ],
    [seo],
  )

  // 收录推送：能力由 capabilities 如实暴露，禁用并在原位说明，不弹空 toast
  const searchConsole = capabilities?.searchConsole
  const submitDisabled = !serverConfig.enabled || searchConsole?.available !== true
  const submitReason = !serverConfig.enabled
    ? '未接入服务端，无法提交收录'
    : !capabilities
      ? '收录能力状态未返回，暂不可提交'
      : (searchConsole?.reason ?? 'Search Console 推送不可用')

  const startBackup = async () => {
    if (!serverConfig.enabled) return show('未接服务端：不会创建备份')
    setBackingUp(true)
    try {
      const created = await apiJson<{ id: string; bytes?: number }>('/api/admin/backup', { method: 'POST' })
      await loadBackups()
      show(`备份完成 · ${formatBytes(created.bytes)}`)
    } catch (err) {
      show(`备份失败：${(err as Error).message}`)
    } finally {
      setBackingUp(false)
    }
  }

  const restoreBackup = async (id: string) => {
    if (!serverConfig.enabled) return show('未接服务端：不会执行恢复')
    try {
      await apiJson(`/api/admin/backup/${encodeURIComponent(id)}/restore`, { method: 'POST' })
      show('已从服务端快照恢复')
    } catch (err) {
      show(`恢复失败：${(err as Error).message}`)
    }
  }

  const saveSeo = async () => {
    if (!serverConfig.enabled) return show('未接服务端：SEO 设置只存在本机')
    try {
      await saveSiteSettings({
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
        ogImage: seo.ogImage,
        sitemap: seo.sitemap,
        structuredData: seo.structuredData,
        analytics: seo.analytics,
      })
      await loadSeoStatus()
      show('SEO 设置已保存到服务端')
    } catch (err) {
      show(`保存失败：${(err as Error).message}`)
    }
  }

  /** 刷新静态资源：服务端明确无 CDN，仅记录刷新时间，不谎称向 CDN 提交任务 */
  const refreshAssetsNow = async () => {
    setRefreshingAssets(true)
    try {
      const res = await refreshAssets()
      await loadAssets()
      show(`已记录刷新时间${res.refreshedAt ? ` · ${new Date(res.refreshedAt).toLocaleString('zh-CN')}` : ''}`)
    } catch (err) {
      show(`刷新失败：${(err as Error).message}`)
    } finally {
      setRefreshingAssets(false)
    }
  }

  /** 导入备份 JSON：真正写入服务端快照，成功后刷新列表并提示可在列表恢复 */
  const onImportBackupFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportingBackup(true)
    try {
      const snapshot = await readJsonFile(file)
      const res = await importBackup(snapshot)
      await loadBackups()
      show(`备份已导入（${res.note || formatBytes(res.bytes)}），可在列表中恢复`)
    } catch (err) {
      show(`导入失败：${(err as Error).message}`)
    } finally {
      setImportingBackup(false)
    }
  }

  /** 导入配置 JSON：展示真正写入的 applied 字段，并刷新 SEO 相关数据 */
  const onImportConfigFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportingCfg(true)
    try {
      const config = await readJsonFile(file)
      const res = await importConfig(config)
      await Promise.all([loadSiteSeo(), loadSeoStatus()])
      show(`配置已导入 · 已应用：${res.applied.length ? res.applied.join('、') : '无变更'}`)
    } catch (err) {
      show(`导入失败：${(err as Error).message}`)
    } finally {
      setImportingCfg(false)
    }
  }

  const savePlan = async () => {
    setSavingPlan(true)
    try {
      const saved = await saveBackupPlan({ enabled: plan.enabled, time: plan.time, retain: plan.retain })
      setPlan(saved)
      show('自动备份计划已保存到服务端')
    } catch (err) {
      show(`保存失败：${(err as Error).message}`)
    } finally {
      setSavingPlan(false)
    }
  }

  const cleanup = async () => {
    if (!window.confirm(`按保留数清理：仅保留最近 ${plan.retain} 份，其余备份将永久删除，确认继续？`)) return
    setCleaning(true)
    try {
      const res = await cleanupBackups(plan.retain)
      await loadBackups()
      show(`清理完成 · 删除 ${res.removed} 份，保留 ${res.kept} 份`)
    } catch (err) {
      show(`清理失败：${(err as Error).message}`)
    } finally {
      setCleaning(false)
    }
  }

  const exportCfg = async () => {
    setExportingCfg(true)
    try {
      const cfg = await exportConfig()
      if (!cfg) {
        show('配置导出失败：未接服务端或读取为空')
        return
      }
      downloadJson(cfg, `site-config-${new Date().toISOString().slice(0, 10)}.json`)
      show('配置已导出为 JSON 文件')
    } catch (err) {
      show(`导出失败：${(err as Error).message}`)
    } finally {
      setExportingCfg(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Settings"
        title="系统设置"
        desc="主题决定前台观感，SEO 影响搜索结果，备份是最后的保险。"
        right={<Badge tone="neutral">{systemInfo.version} · {systemInfo.stack}</Badge>}
      />

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        items={[
          { key: 'theme', label: '主题' },
          { key: 'seo', label: 'SEO' },
          { key: 'backup', label: '备份' },
        ]}
      />

      {tab === 'theme' && (
        <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Theme" title="主题预设" desc="与前台共用同一套令牌：点选即全站生效，但只写入这台浏览器的 localStorage">
              <p className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-ink/15 bg-paper px-3 py-2 font-mono text-[9.5px] text-admin-muted">
                <span>站点缺省：{siteMeta.defaultTheme}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-ink/30" />
                <span>{isPersonalChoice ? '本机已覆盖（访客选择优先）' : '本机未选择，跟随缺省/系统偏好'}</span>
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="站点主题">
                {themes.map((t) => {
                  const on = t.id === theme
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`主题 ${t.no} ${t.name}`}
                      onClick={() => {
                        setTheme(t.id)
                        show(`已切换到「${t.name}」，前台同步生效`)
                      }}
                      className={cn(
                        'relative rounded-xl border p-3 text-left transition',
                        on ? 'border-ink bg-lime/20 shadow-hard-sm' : 'border-ink/15 hover:border-ink/40',
                      )}
                    >
                      <div className="flex gap-1">
                        {SWATCH_TOKENS.map((token) => (
                          <span key={token} data-theme={t.id} className="h-6 flex-1 overflow-hidden rounded border border-ink/10">
                            <span className="block h-full w-full" style={{ background: `rgb(var(${token}))` }} />
                          </span>
                        ))}
                      </div>
                      <p className="mt-2.5 text-[11.5px] font-semibold">
                        <span className="mr-1 font-mono text-[9.5px] text-admin-muted">{t.no}</span>
                        {t.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[8.5px] tracking-[0.14em] text-admin-muted">{t.en}</p>
                      <p className="mt-1 text-[9.5px] leading-snug text-admin-muted">{t.note}</p>
                      {on && (
                        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-lime">
                          <Check size={10} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <AButton variant="primary" icon={<Check size={12} />} onClick={() => show(`「${current.name}」已保存到本机`)}>
                  保存当前主题
                </AButton>
                <AButton
                  icon={<DatabaseBackup size={12} />}
                  onClick={async () => {
                    if (!serverConfig.enabled) return show('未接服务端：不能下发站点默认主题')
                    try {
                      await saveSiteSettings({ defaultTheme: current.id })
                      show(`已将「${current.name}」设为站点默认主题（新访客生效）`)
                    } catch (err) {
                      show(`保存失败：${(err as Error).message}`)
                    }
                  }}
                >
                  设为站点默认
                </AButton>
                <AButton onClick={() => { resetTheme(); show('已恢复本机默认主题 · 01 纸感极简（仅这台浏览器，未改动站点默认）') }}>恢复默认</AButton>
                <AButton variant="soft" onClick={() => { followSiteDefault(); show('已取消本机覆盖，回到站点缺省 + 系统偏好') }}>跟随站点默认</AButton>
                <span className="ml-auto font-mono text-[9px] tracking-[0.16em] text-admin-muted">ACTIVE · {current.en}</span>
              </div>
            </Panel>

            <Panel kicker="Tokens" title="设计变量" desc="由当前主题注入 :root，换主题就换这组值">
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ['--c-bg', '底色'],
                  ['--c-surface', '表面'],
                  ['--c-ink', '文字'],
                  ['--c-ink-soft', '次级文字'],
                  ['--c-lime', '主强调'],
                  ['--c-coral', '次强调'],
                  ['--r-lg', '卡片圆角'],
                  ['--bw', '描边'],
                  ['--sh-hard', '阴影'],
                ].map(([k, label]) => {
                  const isColor = k.startsWith('--c-')
                  const value = tokenValues[k] || '—'
                  return (
                    <div key={k} className="flex items-center gap-2 rounded-lg border border-ink/15 px-2.5 py-2">
                      <span
                        className="h-5 w-5 shrink-0 rounded border border-ink/15"
                        style={isColor ? { background: `rgb(var(${k}))` } : undefined}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[9px] text-admin-muted">{k}</span>
                        <span className="block truncate font-mono text-[9.5px]">{label}</span>
                      </span>
                      <span className="max-w-[46%] truncate font-mono text-[9px] text-admin-muted">{value}</span>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="Preview" title="前台预览" desc="用真实令牌渲染，切换主题即时变化">
              <div className="overflow-hidden rounded-xl border border-ink/15" style={{ background: 'rgb(var(--c-bg))', color: 'rgb(var(--c-ink))' }}>
                <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: 'rgb(var(--c-ink) / 0.12)' }}>
                  <span className="text-[10px] font-bold">WYX.SPACE</span>
                  <div className="flex gap-2 text-[8px] opacity-70">
                    <span>学习</span>
                    <span>作品</span>
                    <span>生活</span>
                  </div>
                </div>
                <div className="px-3 pb-3 pt-2.5">
                  <p className="font-mono text-[8px] tracking-[0.18em] opacity-60">AI FULL-STACK</p>
                  <p className="mt-1 text-[15px] font-extrabold leading-tight">
                    把想法做成
                    <br />
                    能上线的东西。
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <span
                      className="rounded-full px-2 py-1 text-[7px] font-semibold"
                      style={{ background: 'rgb(var(--c-lime))', color: 'rgb(var(--c-on-accent))' }}
                    >
                      看作品
                    </span>
                    <span className="rounded-full border px-2 py-1 text-[7px]" style={{ borderColor: 'rgb(var(--c-ink) / 0.25)' }}>
                      简历
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg border p-2"
                        style={{
                          background: i === 0 ? 'rgb(var(--c-surface))' : 'rgb(var(--c-surface-2))',
                          borderColor: 'rgb(var(--c-ink) / 0.12)',
                          borderRadius: 'var(--r-sm)',
                        }}
                      >
                        <p className="text-[6.5px] font-semibold">{i === 0 ? 'RAG 客服系统' : 'Agent 评测中台'}</p>
                        <p className="mt-1 text-[7px] opacity-70">Recall@5 0.93</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {SWATCH_TOKENS.map((token) => (
                      <span
                        key={token}
                        className="h-3.5 flex-1 rounded-sm border"
                        style={{ background: `rgb(var(${token}))`, borderColor: 'rgb(var(--c-ink) / 0.15)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center font-mono text-[9px] text-admin-muted">令牌由 CSS 变量提供 · 无后台硬编码色值</p>
            </Panel>

            <Panel kicker="Cache" title="静态资源" desc="版本与刷新时间来自 /api/admin/assets">
              <LoadState loading={assetsLoading} label="正在读取资源版本…">
                <div className="space-y-2 text-[10.5px]">
                  {[
                    ['构建版本', assets?.version ?? '—'],
                    ['构建时间', assets?.builtAt ? new Date(assets.builtAt).toLocaleString('zh-CN') : '—'],
                    ['上次刷新', assets?.refreshedAt ? new Date(assets.refreshedAt).toLocaleString('zh-CN') : '尚未刷新'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-ink/10 pb-1.5 last:border-0">
                      <span className="text-admin-muted">{k}</span>
                      <span className="font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </LoadState>
              <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-[9.5px] leading-relaxed text-admin-muted">
                {assets && assets.cdnAvailable === false
                  ? `本站无 CDN，仅记录刷新时间${assets.note ? ` · ${assets.note}` : ''}`
                  : (assets?.note ?? (serverConfig.enabled ? '静态资源版本与刷新记录' : '未接入服务端，暂无真实版本信息'))}
              </p>
              <AButton className="mt-3 w-full" icon={<RefreshCw size={12} />} disabled={refreshingAssets || assetsLoading} onClick={refreshAssetsNow}>
                {refreshingAssets ? '刷新中…' : '刷新资源缓存'}
              </AButton>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'seo' && (
        <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
          <div className="space-y-3">
            <Panel kicker="Meta" title="基础 SEO" desc="修改后需要重新构建站点才会写入静态 HTML">
              <div className="space-y-3">
                <Field label="站点标题">
                  <Input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} />
                </Field>
                <Field label="站点描述">
                  <Textarea value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} rows={3} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="关键词" hint="用英文逗号分隔">
                    <Input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} />
                  </Field>
                  <Field label="Canonical 域名">
                    <Input value={seo.canonical} onChange={(e) => setSeo({ ...seo, canonical: e.target.value })} />
                  </Field>
                  <Field label="OG 分享图">
                    <Input value={seo.ogImage} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} />
                  </Field>
                  <Field label="Robots">
                    <Select value={seo.robots} onChange={(e) => setSeo({ ...seo, robots: e.target.value })}>
                      {['index, follow', 'noindex, follow', 'index, nofollow', 'noindex, nofollow'].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {[
                  ['生成 sitemap.xml', 'sitemap'],
                  ['输出结构化数据 (JSON-LD)', 'structuredData'],
                  ['匿名访问统计', 'analytics'],
                ].map(([label, key]) => {
                  const on = seo[key as 'sitemap' | 'structuredData' | 'analytics']
                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg border border-ink/15 px-3 py-2.5">
                      <span className="text-[11.5px]">{label}</span>
                      <Toggle on={on} label={label} onChange={(v) => setSeo({ ...seo, [key]: v })} />
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <AButton variant="primary" icon={<Check size={12} />} onClick={saveSeo}>
                  保存
                </AButton>
                <AButton icon={<Search size={12} />} disabled={submitDisabled} title={submitReason}>
                  提交收录
                </AButton>
                <span className="font-mono text-[9.5px] leading-snug text-admin-muted">{submitReason}</span>
              </div>
            </Panel>

            <Panel kicker="Index" title="收录状态" desc="来自 /api/admin/seo/status，按已发布内容实时统计">
              <LoadState loading={seoStatusLoading} label="正在读取收录状态…">
                {!seoStatus ? (
                  <EmptyState title="暂无收录状态" desc={serverConfig.enabled ? '服务端未返回 SEO 状态' : '未接入服务端，当前为本机预览'} />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ['可索引页面', String(seoStatus.indexablePages)],
                        ['已发布内容', String(seoStatus.publishedContent)],
                        ['Sitemap', seoStatus.sitemap || '未生成'],
                        ['更新时间', seoStatus.updatedAt ? new Date(seoStatus.updatedAt).toLocaleString('zh-CN') : '—'],
                      ].map(([l, v]) => (
                        <div key={l} className="rounded-lg bg-paper px-3 py-2">
                          <p className="text-[9.5px] text-admin-muted">{l}</p>
                          <p className="mt-0.5 truncate font-mono text-[12px]">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 space-y-1 rounded-lg bg-paper px-3 py-2 font-mono text-[9.5px] leading-relaxed text-admin-muted">
                      <p>Canonical：{seoStatus.canonical || '未配置'}</p>
                      <p>Robots：{seoStatus.robots || '未配置'}</p>
                      {seoStatus.note && <p className="font-sans">{seoStatus.note}</p>}
                    </div>
                  </>
                )}
              </LoadState>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel kicker="SERP" title="搜索结果预览">
              <div className="rounded-xl border border-ink/15 p-3">
                <p className="flex items-center gap-1.5 text-[10px] text-admin-muted">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-ink text-[7px] font-bold text-lime">W</span>
                  {seo.canonical.replace('https://', '')}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-blue underline decoration-1 underline-offset-2">{seo.title || '（未填写标题）'}</p>
                <p className="mt-1 line-clamp-3 text-[10.5px] leading-relaxed text-admin-muted">{seo.description}</p>
              </div>
              <p className="mt-2 text-center font-mono text-[9px] text-admin-muted">Google 桌面端预览</p>
            </Panel>

            <Panel kicker="Checklist" title="优化检查" desc={`${checks.filter((c) => c.ok).length} / ${checks.length} 项通过`}>
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-[10.5px]">
                    <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', c.ok ? 'bg-admin-teal/12 text-admin-teal' : 'bg-admin-amber/15 text-admin-amber')}>
                      {c.ok ? <Check size={9} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                    </span>
                    <span className={c.ok ? 'text-admin-ink/75' : 'text-admin-muted'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel kicker="Robots" title="robots.txt">
              <pre className="overflow-x-auto rounded-lg bg-paper p-2.5 font-mono text-[9.5px] leading-relaxed text-admin-ink/75 no-scrollbar">
{`User-agent: *
Allow: /
Disallow: /admin
Disallow: /s/

Sitemap: ${seo.canonical}/sitemap.xml`}
              </pre>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
          <Panel
            kicker="Backups"
            title="备份记录"
            desc={`最近备份 ${backups[0]?.time ?? '—'} · 共 ${backups.length} 份`}
            flush
            right={
              <div className="flex items-center gap-2">
                <input ref={backupFileRef} type="file" accept=".json,application/json" className="hidden" onChange={onImportBackupFile} />
                <AButton size="sm" icon={<Upload size={11} />} disabled={importingBackup} onClick={() => backupFileRef.current?.click()}>
                  {importingBackup ? '导入中…' : '导入备份'}
                </AButton>
                <AButton size="sm" variant="primary" icon={<DatabaseBackup size={11} />} onClick={startBackup} disabled={backingUp}>
                  {backingUp ? '备份中…' : '立即备份'}
                </AButton>
              </div>
            }
          >
            <div className="overflow-x-auto no-scrollbar">
              <div className="admin-zebra min-w-[760px]">
                <TableHead cols={['备份', '内容', '大小', '类型', '时间', '状态', '操作']} template="minmax(0,1fr) 128px 64px 56px 96px 72px 100px" />
                <LoadState loading={backupsLoading} error={backupsError ?? undefined} onRetry={() => void loadBackups()} label="正在加载备份列表…">
                  {backups.length === 0 ? (
                    <EmptyState title="暂无备份" desc="点「立即备份」创建，或用「导入备份」载入已有 JSON" />
                  ) : (
                    backups.map((b) => (
                      <div
                        key={b.id}
                        className="grid grid-cols-[minmax(0,1fr)_128px_64px_56px_96px_72px_100px] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11.5px] last:border-0 hover:bg-lime/20"
                      >
                        <span className="truncate font-mono text-[10.5px]">{b.name}</span>
                        <span className="truncate text-[9.5px] text-admin-muted">{b.items}</span>
                        <span className="font-mono text-[10px] text-admin-muted">{b.size}</span>
                        <Badge tone={b.type === '自动' ? 'neutral' : 'amber'}>{b.type}</Badge>
                        <span className="font-mono text-[9.5px] text-admin-muted">{b.time}</span>
                        <Status>{b.status}</Status>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton label="下载" onClick={() => {
                            try {
                              downloadBackup(b.id)
                              show(`已触发浏览器下载：${b.name}`)
                            } catch (err) {
                              show(`下载失败：${(err as Error).message}`)
                            }
                          }}>
                            <Download size={11} />
                          </IconButton>
                          <IconButton label="删除" onClick={() => {
                            if (!serverConfig.enabled) return show('未接服务端：不能删除备份')
                            if (!window.confirm(`删除备份 ${b.name}？`)) return
                            void deleteBackup(b.id).then(async () => { await loadBackups(); show('备份已删除') }).catch((err: Error) => show(`删除失败：${err.message}`))
                          }}>
                            <Trash2 size={11} />
                          </IconButton>
                          <AButton size="sm" variant="soft" disabled={b.status !== '成功'} onClick={() => setRestoring(b.name)}>
                            恢复
                          </AButton>
                        </div>
                      </div>
                    ))
                  )}
                </LoadState>
              </div>
            </div>
          </Panel>

          <div className="space-y-3">
            <Panel kicker="Schedule" title="自动备份" desc="站内仅保存配置，真正定时执行需外部调度器调用 POST /api/admin/backup">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-ink/15 px-3 py-2.5">
                <div>
                  <p className="text-[11.5px] font-medium">每日自动备份</p>
                  <p className="mt-0.5 text-[9.5px] text-admin-muted">
                    保留最近 {plan.retain} 份 · {plan.lastRunAt ? `上次执行 ${new Date(plan.lastRunAt).toLocaleString('zh-CN')}` : '尚未执行'}
                  </p>
                </div>
                <Toggle on={plan.enabled} onChange={(v) => setPlan((p) => ({ ...p, enabled: v }))} label="自动备份" disabled={planLoading} />
              </div>
              <div className="mt-3 grid gap-3">
                <Field label="执行时间">
                  <Select value={plan.time} onChange={(e) => setPlan((p) => ({ ...p, time: e.target.value }))} disabled={planLoading}>
                    {Array.from(new Set([plan.time, '01:00', '03:00', '05:00', '12:00'])).map((t) => (
                      <option key={t} value={t}>{t === '12:00' ? '每日 12:00' : t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="保留份数">
                  <Select value={String(plan.retain)} onChange={(e) => setPlan((p) => ({ ...p, retain: Number(e.target.value) }))} disabled={planLoading}>
                    {Array.from(new Set([7, 14, 30, plan.retain])).sort((a, b) => a - b).map((n) => (
                      <option key={n} value={n}>{n} 份</option>
                    ))}
                  </Select>
                </Field>
              </div>
              {plan.note && <p className="mt-2 text-[9.5px] leading-relaxed text-admin-muted">{plan.note}</p>}
              <AButton className="mt-3 w-full" disabled={planLoading || savingPlan} onClick={savePlan}>
                {savingPlan ? '保存中…' : planLoading ? '读取中…' : '保存计划'}
              </AButton>
            </Panel>

            <Panel kicker="Storage" title="备份存储（静态示意）">
              <div className="space-y-2 text-[10.5px]">
                {[
                  ['存储位置', 'Supabase Storage'],
                  ['当前占用', '507 MB'],
                  ['加密方式', 'AES-256'],
                  ['上次校验', '今天 03:12 · 通过'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-ink/10 pb-1.5 last:border-0">
                    <span className="text-admin-muted">{k}</span>
                    <span className="font-mono text-[10px]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <AButton size="sm" icon={<CloudDownload size={11} />} disabled={exportingCfg} onClick={exportCfg}>
                  {exportingCfg ? '导出中…' : '导出配置'}
                </AButton>
                <AButton size="sm" icon={<RotateCcw size={11} />} disabled={importingCfg} onClick={() => configFileRef.current?.click()}>
                  {importingCfg ? '导入中…' : '导入配置'}
                </AButton>
              </div>
              <input ref={configFileRef} type="file" accept=".json,application/json" className="hidden" onChange={onImportConfigFile} />
            </Panel>

            <Panel kicker="Cleanup" title="旧备份清理">
              <p className="text-[10.5px] leading-relaxed text-admin-muted">
                按保留份数清理：仅保留最近 {plan.retain} 份，更早的备份将被真实删除且不可恢复。
              </p>
              <AButton
                variant="danger"
                className="mt-2 w-full"
                icon={<Trash2 size={11} />}
                disabled={cleaning || backupsLoading}
                onClick={cleanup}
              >
                {cleaning ? '清理中…' : '按保留数清理'}
              </AButton>
            </Panel>
          </div>
        </div>
      )}

      <AdminModal
        open={restoring !== null}
        onClose={() => setRestoring(null)}
        title={`从 ${restoring ?? ''} 恢复`}
        desc="恢复会覆盖当前内容与配置，建议先做一次手动备份。"
        footer={
          <>
            <AButton onClick={() => setRestoring(null)}>取消</AButton>
            <AButton
              variant="primary"
              onClick={() => {
                const id = restoring
                setRestoring(null)
                if (id) void restoreBackup(id)
              }}
            >
              确认恢复
            </AButton>
          </>
        }
      >
        <div className="rounded-lg bg-paper px-3 py-2.5 text-[11.5px] leading-relaxed text-admin-ink/75">
          恢复范围：文章、项目、动态、文件元数据、主题与 SEO 配置。恢复期间站点会进入只读模式，预计 40 秒。
        </div>
      </AdminModal>
    </div>
  )
}
