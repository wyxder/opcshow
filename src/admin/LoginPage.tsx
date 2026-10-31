/**
 * 后台登录（F-02 / B-02）。
 * 只在真实模式（配置了 VITE_API_BASE）下出现；演示模式直接进后台并明确标注未鉴权。
 * 令牌由服务端写在 HttpOnly Cookie 里，这里不保存任何 token。
 */
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { cn } from '@/lib/utils'
import { login } from '@/services/auth'
import { ApiError } from '@/services/http'

type FieldErrors = { user?: string; password?: string }

const inputBase =
  'w-full rounded-xl border-1.5 border-ink/20 bg-paper px-3 py-2.5 text-[12.5px] text-ink outline-none transition placeholder:text-admin-muted focus:border-ink focus:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-60'

export default function LoginPage({ onDone }: { onDone: () => void }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return

    const nextErrors: FieldErrors = {}
    if (!user.trim()) nextErrors.user = '请输入账号'
    if (!password) nextErrors.password = '请输入密码'
    else if (password.length < 6) nextErrors.password = '密码至少 6 位'
    setFieldErrors(nextErrors)
    setError('')
    if (Object.keys(nextErrors).length) return

    setBusy(true)
    try {
      await login({ user: user.trim(), password })
      onDone()
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined
      if (status === 429) {
        setError('尝试次数过多，已触发登录限流：同一 IP 10 分钟内最多 8 次，请稍后再试。')
      } else if (status === 401) {
        setError('账号或密码不正确；连续失败会被限流（同一 IP 10 分钟内最多 8 次）。')
      } else if (status === 400 || status === 422) {
        setError('账号或密码格式不正确：账号 1–64 位，密码 6–128 位。')
      } else if (status === 403) {
        setError('当前来源不被允许，请检查服务端的 API_CORS_ORIGIN 配置。')
      } else {
        setError(`登录失败：${(err as Error).message || '服务端不可用，请稍后再试'}`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4 py-10 text-ink">
      {/* 背景点阵：只做质感，不拦截交互 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgb(var(--c-ink) / 0.16) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeSwitcher />
      </div>

      <div className="relative w-full max-w-[880px] overflow-hidden rounded-[26px] border-1.5 border-ink bg-cream shadow-hard">
        <div className="grid md:grid-cols-[1.02fr_1fr]">
          {/* 左侧品牌栏：桌面端展示，移动端隐藏 */}
          <aside className="hidden flex-col justify-between gap-8 border-r-1.5 border-ink bg-ink p-7 text-paper md:flex">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 -rotate-3 items-center justify-center rounded-[11px] border-1.5 border-lime/70 bg-lime text-[15px] font-extrabold text-ink shadow-hard-sm">
                  W
                </span>
                <span className="leading-none">
                  <span className="block font-display text-[14px] font-extrabold tracking-[0.02em]">WYX.ADMIN</span>
                  <span className="mt-1 block font-mono text-[8.5px] tracking-[0.22em] text-paper/55">CONTROL ROOM</span>
                </span>
              </div>

              <p className="mt-9 font-display text-[26px] font-extrabold leading-[1.15] tracking-tight">
                把后台做成一个
                <br />
                安静的控制室。
              </p>
              <p className="mt-3 max-w-[240px] text-[11.5px] leading-relaxed text-paper/60">
                内容、简历、文件与互动的真实数据都在这里。每一次写操作都以服务端响应为准。
              </p>
            </div>

            <ul className="space-y-2.5 text-[10.5px] text-paper/70">
              {[
                ['HttpOnly Cookie 会话', '浏览器不保存令牌'],
                ['服务端限流与审计', '失败尝试会被记录'],
                ['写操作真实落库', '失败不伪装成功'],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center gap-2">
                  <ShieldCheck size={12} className="shrink-0 text-lime" />
                  <span className="font-medium text-paper/85">{k}</span>
                  <span className="text-paper/40">·</span>
                  <span className="text-paper/50">{v}</span>
                </li>
              ))}
            </ul>

            <p className="font-mono text-[8.5px] tracking-[0.18em] text-paper/35">WYX.SPACE / SIGN IN</p>
          </aside>

          {/* 右侧表单 */}
          <form onSubmit={submit} noValidate className="p-5 sm:p-7">
            <div className="flex items-center gap-2.5 md:hidden">
              <span className="flex h-9 w-9 -rotate-3 items-center justify-center rounded-[10px] border-1.5 border-ink bg-ink text-[14px] font-extrabold text-lime">
                W
              </span>
              <div className="leading-none">
                <p className="font-display text-[13px] font-extrabold">WYX.ADMIN</p>
                <p className="mt-1 font-mono text-[8.5px] tracking-[0.2em] text-admin-muted">SIGN IN</p>
              </div>
            </div>

            <div className="mt-6 md:mt-1">
              <h1 className="font-display text-[24px] font-extrabold leading-none tracking-tight">登录后台</h1>
              <p className="mt-2 text-[11.5px] text-admin-muted">使用管理员账号进入控制室，未登录访问后台会回到这里。</p>
            </div>

            <div className="mt-6 space-y-3.5">
              <label className="block">
                <span className="flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.14em] text-admin-muted">
                  账号 <span className="text-[9px] normal-case tracking-normal">1–64 位</span>
                </span>
                <input
                  value={user}
                  onChange={(e) => {
                    setUser(e.target.value)
                    if (fieldErrors.user) setFieldErrors((f) => ({ ...f, user: undefined }))
                    if (error) setError('')
                  }}
                  autoFocus
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={busy}
                  aria-invalid={Boolean(fieldErrors.user)}
                  aria-describedby={fieldErrors.user ? 'login-user-error' : undefined}
                  className={cn(inputBase, 'mt-1.5', fieldErrors.user && 'border-danger/60 focus:border-danger')}
                  placeholder="admin"
                />
                {fieldErrors.user && (
                  <span id="login-user-error" className="mt-1 block text-[10.5px] text-admin-danger">
                    {fieldErrors.user}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.14em] text-admin-muted">
                  密码 <span className="text-[9px] normal-case tracking-normal">至少 6 位</span>
                </span>
                <span className="relative mt-1.5 block">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }))
                      if (error) setError('')
                    }}
                    onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                    onKeyDown={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                    autoComplete="current-password"
                    disabled={busy}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    className={cn(inputBase, 'pr-10', fieldErrors.password && 'border-danger/60 focus:border-danger')}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    title={showPassword ? '隐藏密码' : '显示密码'}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-admin-muted transition hover:bg-surface-hover hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </span>
                {fieldErrors.password ? (
                  <span id="login-password-error" className="mt-1 block text-[10.5px] text-admin-danger">
                    {fieldErrors.password}
                  </span>
                ) : (
                  capsLock && <span className="mt-1 block text-[10.5px] text-admin-amber">大写锁定已开启</span>
                )}
              </label>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-3.5 flex items-start gap-2 rounded-xl border-1.5 border-danger/35 bg-danger/10 px-3 py-2.5 text-[11px] leading-relaxed text-admin-danger"
              >
                <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-1.5 border-ink bg-lime px-3 py-2.5 text-[12.5px] font-semibold text-ink shadow-hard-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 active:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <LockKeyhole size={14} />}
              {busy ? '登录中…' : '登录后台'}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center font-mono text-[9px] leading-relaxed text-admin-muted">
              <ShieldCheck size={10} />
              会话写在 HttpOnly Cookie，浏览器不保存令牌
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-dashed border-ink/15 pt-3 text-[10.5px]">
              <Link to="/" className="flex items-center gap-1 text-admin-muted transition hover:text-ink">
                <ArrowLeft size={12} /> 返回前台
              </Link>
              <span className="font-mono text-[8.5px] tracking-[0.14em] text-admin-muted">NOINDEX · PRIVATE</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
