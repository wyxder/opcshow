/// <reference types="vite/client" />

/**
 * 可选的环境变量（都不含密钥，只含接口地址）。
 * 不设置就是纯前端演示模式（fx.md B10）。
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_AI_CHAT_PATH?: string
  readonly VITE_GUESTBOOK_PATH?: string
  readonly VITE_UPLOAD_PATH?: string
  readonly VITE_TRACK_PATH?: string
  readonly VITE_AUTH_LOGIN_PATH?: string
  readonly VITE_ERROR_REPORT_PATH?: string
  /** 试听音频前缀（fx.md F3），不配则播放器标注「试听暂缺」 */
  readonly VITE_AUDIO_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
