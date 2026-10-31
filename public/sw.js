/**
 * WYX.SPACE Service Worker（fx1 F-13）。
 *
 * 目标：断网仍能打开壳与访问过的页面；后台接口优先走网络，不返回假数据。
 * 策略：
 *   · app shell（/、offline.html 等）→ 安装期预缓存
 *   · 导航请求 → network-first，失败回落 URL 缓存 → 壳 → offline.html
 *   · /assets、/files、/og 等静态资源 → stale-while-revalidate
 *   · /api → network-first，离线时明确返回 503 + OFFLINE，不伪造成功
 * 更新：新 SW 不自动 skipWaiting，等页面上的「新版本可用」提示确认后切换。
 */
const VERSION = 'wyx-v3'
const SHELL_CACHE = `${VERSION}-shell`
const RUNTIME_CACHE = `${VERSION}-runtime`
const API_CACHE = `${VERSION}-api`
const KEEP = [SHELL_CACHE, RUNTIME_CACHE, API_CACHE]

const SHELL = ['/', '/offline.html', '/image/logo-192.png', '/site.webmanifest', '/og-cover.png', '/theme-boot.js']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // 单个资源缺失不应让整次安装失败
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)))),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

async function put(cacheName, request, response) {
  if (!response || !response.ok) return
  const cache = await caches.open(cacheName)
  await cache.put(request, response.clone()).catch(() => null)
}

/** 网络优先：成功写入缓存；失败回落缓存；都没有时给 fallback */
async function networkFirst(request, cacheName, fallback) {
  try {
    const response = await fetch(request)
    put(cacheName, request, response)
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (typeof fallback === 'function') return fallback()
    return fallback
  }
}

/** 先给缓存再更新：下次访问拿到新版本 */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request)
  const network = fetch(request)
    .then((response) => {
      put(cacheName, request, response)
      return response
    })
    .catch(() => null)
  return cached || (await network) || Response.error()
}

function offlineApiResponse() {
  return new Response(JSON.stringify({ code: 'OFFLINE', message: '当前处于离线状态，接口暂不可用' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function handleNavigate(request) {
  try {
    const response = await fetch(request)
    put(RUNTIME_CACHE, request, response)
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    const shell = await caches.match('/')
    if (shell) return shell
    return (await caches.match('/offline.html')) || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, offlineApiResponse))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request))
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/files/') || url.pathname.startsWith('/og/')) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
    return
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
})
