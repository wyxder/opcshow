/**
 * 恋爱记录相册（生活 · 恋爱记录页）。
 *
 * 一期（当前）：图片在浏览器压缩后进 localStorage，界面如实标注「仅你可见」；
 * 二期（接服务端，对应 server/routes/files.mjs）：createPhoto 之后改走
 * requestUploadTicket + uploadToTicket，src 换成 /api/files/download-by-id/xxx 即可，
 * 页面代码不用改 —— 与 services/guestbook.ts 同一个 repository 思路。
 */
import { compressImage, type ProcessedImage } from '@/lib/image'
import { STORAGE_KEYS, QuotaFullError, arrayOf, readStored, writeStoredStrict } from '@/lib/storage'
import { newId } from '@/lib/utils'

export const ALBUM_TAGS = ['合影', '日常', '旅行', '惊喜', '信物'] as const
export type AlbumTag = (typeof ALBUM_TAGS)[number]

/** 张数与体积双上限：localStorage 约 5MB，留 1MB 给站点其它数据 */
export const MAX_PHOTOS = 40
export const ALBUM_BUDGET = 4 * 1024 * 1024

const CAPTION_MAX = 60
const PLACE_MAX = 20

export type LovePhoto = {
  id: string
  /** 本机模式是 data: URL；接服务端后换成下载路径 */
  src: string
  caption: string
  /** YYYY-MM-DD，用于时间轴与按年筛选 */
  date: string
  place: string
  tag: AlbumTag
  width: number
  height: number
  bytes: number
  /** 数据来源：本机 / 服务端，UI 要如实标注（fx.md 执行要求 2） */
  source: 'local' | 'remote'
  createdAt: number
  /** 置顶封面：全站最多一张 */
  cover?: boolean
}

const isPhotoArray = arrayOf<LovePhoto>((p) => typeof p.id === 'string' && typeof p.src === 'string' && typeof p.bytes === 'number')

const today = () => new Date().toISOString().slice(0, 10)

export function loadAlbum(): LovePhoto[] {
  return readStored<LovePhoto[]>(STORAGE_KEYS.loveAlbum, [], isPhotoArray)
}

/** 保存整册：写失败会抛 QuotaFullError，由调用方回滚界面状态 */
export function saveAlbum(list: LovePhoto[]) {
  writeStoredStrict(STORAGE_KEYS.loveAlbum, list)
}

export function albumBytes(list: LovePhoto[]) {
  return list.reduce((sum, p) => sum + (p.bytes || 0), 0)
}

/** 校验 + 压缩 + 组装记录；不写存储，写入时机由页面控制（便于批量上传时逐张落盘） */
export async function createPhoto(
  file: File,
  meta: { caption?: string; date?: string; place?: string; tag?: string } = {},
): Promise<LovePhoto> {
  const img: ProcessedImage = await compressImage(file)
  const tag = (ALBUM_TAGS as readonly string[]).includes(meta.tag ?? '') ? (meta.tag as AlbumTag) : '日常'
  return {
    id: newId('photo'),
    src: img.src,
    caption: (meta.caption ?? '').trim().slice(0, CAPTION_MAX),
    date: /^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '') ? meta.date! : today(),
    place: (meta.place ?? '').trim().slice(0, PLACE_MAX),
    tag,
    width: img.width,
    height: img.height,
    bytes: img.bytes,
    source: 'local',
    createdAt: Date.now(),
  }
}

/** 新上传的排在最前，封面永远第一 */
export function sortAlbum(list: LovePhoto[]) {
  return [...list].sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover)) || b.createdAt - a.createdAt)
}

export { QuotaFullError }
