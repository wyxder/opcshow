/**
 * 首屏主题引导（fx2 FE-15）。
 *
 * 之前这段逻辑内联在 index.html 里，静态托管无法开启 `script-src 'self'` 的 CSP。
 * 抽成同源小脚本后：CSP 可只允许 self；脚本仍在 head 中同步执行，主题在首次绘制前落好。
 * 常量与 src/theme/theme.ts 的 INLINE_BOOT_THEME / INLINE_STORAGE_KEY 成对维护。
 */
(function () {
  var IDS = ['paper', 'lab', 'swiss', 'terminal', 'pop']
  var t = 'paper'
  var dark = false
  try {
    dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    var v = localStorage.getItem('wyx:theme@v1') || localStorage.getItem('wyx:theme')
    if (v && IDS.indexOf(v) >= 0) {
      localStorage.setItem('wyx:theme@v1', v)
      try {
        localStorage.removeItem('wyx:theme')
      } catch (e) {}
      t = v
    } else if (dark) {
      t = 'terminal'
    }
  } catch (e) {
    t = dark ? 'terminal' : 'paper'
  }
  document.documentElement.setAttribute('data-theme', t)
})()
