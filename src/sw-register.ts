/**
 * Service Worker 注册与「新版本可用」提示（fx1 F-13）。
 * 被 main.tsx 以动态 import 引入，避免把这段运行时逻辑压进入口包（F-12 预算）。
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg)
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(reg)
        })
      })
    })
    .catch(() => {
      /* 注册失败不影响主流程 */
    })
}

/** 新 SW 不自动接管，等用户点「刷新」再 skipWaiting，避免旧页面被新缓存打断 */
function showUpdateBanner(reg: ServiceWorkerRegistration) {
  if (document.getElementById('sw-update-banner')) return

  const bar = document.createElement('div')
  bar.id = 'sw-update-banner'
  bar.setAttribute('role', 'status')
  bar.setAttribute('aria-live', 'polite')
  bar.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:24px',
    'transform:translateX(-50%)',
    'z-index:2147483000',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'max-width:calc(100vw - 32px)',
    'padding:10px 16px',
    'background:#fbf8f1',
    'color:#14140f',
    'border:1.5px solid #14140f',
    'box-shadow:4px 4px 0 #14140f',
    'font-size:14px',
    'font-family:inherit',
  ].join(';')

  const label = document.createElement('span')
  label.textContent = '站点有新版本，刷新后生效'

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '刷新'
  button.style.cssText = [
    'font:inherit',
    'padding:4px 14px',
    'background:#14140f',
    'color:#fbf8f1',
    'border:1.5px solid #14140f',
    'cursor:pointer',
  ].join(';')
  button.addEventListener('click', () => {
    button.disabled = true
    button.textContent = '更新中…'
    reg.waiting?.postMessage('SKIP_WAITING')
  })

  bar.append(label, button)
  document.body.append(bar)
}
