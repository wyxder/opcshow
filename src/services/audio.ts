/**
 * 音频能力（fx.md F3）。
 *
 * 版权安全起见，站内不内置任何真实歌曲音频。这里提供的是「可插拔的音频源解析」：
 *   · 配了 VITE_AUDIO_BASE（例如 /audio 或 CDN 前缀）→ 按 manifest 提供试听片段，播放器走真实 play/pause/seek；
 *   · 没配 → resolveAudio() 返回 null，播放器明确标注「试听暂缺」，继续用模拟时钟，不报错也不白屏。
 *
 * 需要服务端/资源侧补齐：3–5 秒可循环的试听片段 + 一份 manifest.json。
 */

function env(key: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key]
  return (v ?? '').trim()
}

const base = env('VITE_AUDIO_BASE').replace(/\/$/, '')

export type AudioSource = {
  url: string
  /** preview = 3–5s 循环片段；full = 完整曲目（需要授权） */
  kind: 'preview' | 'full'
}

export type AudioManifest = Record<string, AudioSource>

let manifest: AudioManifest | null = null

/** 只有配置了音频前缀才去拉 manifest，避免未接资源时刷 404 日志 */
export async function loadAudioManifest(): Promise<AudioManifest | null> {
  if (!base) return null
  if (manifest) return manifest
  try {
    const res = await fetch(`${base}/manifest.json`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    manifest = (await res.json()) as AudioManifest
    return manifest
  } catch {
    manifest = {}
    return manifest
  }
}

export function audioEnabled() {
  return Boolean(base)
}

export function resolveAudio(trackId: string): AudioSource | null {
  if (!manifest) return null
  return manifest[trackId] ?? null
}

/** UI 文案的唯一来源，别在页面里再写一遍「没有声音」的解释 */
export const audioNotice = {
  configured: '试听片段来自本地静态资源',
  missing: '试听暂缺：音频资源未接入（需要 F3 的试听片段 + manifest）',
} as const
