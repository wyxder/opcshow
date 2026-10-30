/**
 * 后台登录（F-02 / B-02）。
 * 只在真实模式（配置了 VITE_API_BASE）下出现；演示模式直接进后台并明确标注未鉴权。
 * 令牌由服务端写在 HttpOnly Cookie 里，这里不碰任何 token。
 */
import { LockKeyhole, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { login } from '@/services/auth'

export default function LoginPage({ onDone }: { onDone: () => void }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user.trim() || !password) {
      setError('请输入账号和密码')
      return
    }
    setBusy(true)
    setError('')
    try {
      await login({ user: user.trim(), password })
      onDone()
    } catch {
      setError('账号或密码不正确，连续失败会被限流')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 text-ink">
      <form onSubmit={submit} className="w-full max-w-[360px] rounded-[22px] border-1.5 border-ink bg-cream p-6 shadow-hard">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 -rotate-3 items-center justify-center rounded-[10px] border-1.5 border-ink bg-ink text-[14px] font-extrabold text-lime">
            W
          </span>
          <div className="leading-none">
            <p className="font-display text-[13px] font-extrabold">WYX.ADMIN</p>
            <p className="mt-1 font-mono text-[8.5px] tracking-[0.2em] text-admin-muted">SIGN IN</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-[11px] text-admin-muted">账号</span>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-xl border-1.5 border-ink/20 bg-paper px-3 py-2 text-[12px] outline-none focus:border-ink"
              placeholder="admin"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-admin-muted">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border-1.5 border-ink/20 bg-paper px-3 py-2 text-[12px] outline-none focus:border-ink"
              placeholder="••••••••"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[11px] text-admin-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-1.5 border-ink bg-lime px-3 py-2 text-[12px] font-semibold shadow-hard-sm transition disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <LockKeyhole size={13} />}
          {busy ? '登录中…' : '登录后台'}
        </button>
        <p className="mt-3 text-center font-mono text-[9px] leading-relaxed text-admin-muted">
          会话写在 HttpOnly Cookie，浏览器不保存令牌
        </p>
      </form>
    </div>
  )
}
