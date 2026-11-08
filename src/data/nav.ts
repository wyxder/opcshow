import { formatWan, platforms, totalFollowers } from '@/data/me'
import { figures } from '@/data/site'

export type NavChild = { label: string; desc: string; to: string; icon?: string; badge?: string }
export type NavItem = {
  key: string
  label: string
  en: string
  index: string
  to: string
  children: NavChild[]
  /** true = 该一级项不展开下拉（首页的锚点子项只在页脚 / ⌘K 里保留） */
  noDropdown?: boolean
}

export const navItems: NavItem[] = [
  {
    key: 'home',
    label: '首页',
    en: 'HOME',
    index: '01',
    to: '/',
    // 首页不挂下拉：点「首页」直接回首页，不再下滑 01 / 今日概览 / 精选项目 … 这一串子菜单
    noDropdown: true,
    children: [
      { label: '今日概览', desc: '一屏看完我的近况', to: '/#top', icon: 'home' },
      { label: '精选项目', desc: `${figures.products} 个上线过的作品`, to: '/#projects', icon: 'sparkles' },
      { label: '技能图谱', desc: 'RAG / Agent / 全栈', to: '/#skills', icon: 'layers' },
      { label: '竞赛荣誉', desc: `${figures.awards} 项奖项与决赛`, to: '/#awards', icon: 'trophy' },
    ],
  },
  {
    key: 'ai',
    label: 'AI分身',
    en: 'AVATAR',
    index: '02',
    to: '/ai',
    children: [
      { label: '声音克隆', desc: '30 秒复刻你的音色', to: '/ai?tab=voice', icon: 'mic' },
      { label: '形象复刻', desc: '一张照片生成数字形象', to: '/ai?tab=avatar', icon: 'wand' },
      { label: '数字人对话', desc: '和专属分身聊两句 · 默认入口', to: '/ai?tab=chat', icon: 'bot' },
    ],
  },
  {
    key: 'learn',
    label: '学习',
    en: 'LEARN',
    index: '03',
    to: '/learn',
    children: [
      { label: '知识库', desc: 'RAG / Agent / 工程手记', to: '/learn', icon: 'book' },
    ],
  },
  {
    key: 'work',
    label: '工作',
    en: 'WORK',
    index: '04',
    to: '/work/resume',
    children: [
      { label: '简历', desc: '一页纸的完整履历', to: '/work/resume', icon: 'file' },
      { label: '百宝箱', desc: '收藏的工具与 Prompt', to: '/work/toolbox', icon: 'box' },
      { label: '资源中心', desc: '简历 / 课件 / 数据集', to: '/work/files', icon: 'folder' },
    ],
  },
  {
    key: 'life',
    label: '生活',
    en: 'LIFE',
    index: '05',
    // 默认入口 = 朋友圈（菜单第一项），/life 会在 App 路由里重定向到这里
    to: '/life/moments',
    children: [
      { label: '朋友圈', desc: '碎碎念与深夜复盘 · 默认入口', to: '/life/moments', icon: 'chat' },
      { label: '旅拍相册', desc: '地图上的 11 座城市', to: '/life/travel', icon: 'map' },
      { label: '恋爱记录', desc: '1240 天的异地手记', to: '/life/love', icon: 'heart' },
      { label: '音乐盒', desc: '写代码时在听什么', to: '/life/music', icon: 'music' },
    ],
  },
  {
    key: 'me',
    label: '我的',
    en: 'ME',
    index: '06',
    to: '/me',
    children: [
      { label: '自我介绍', desc: '四张卡片认识我', to: '/me', icon: 'user' },
      { label: '自媒体矩阵', desc: `${formatWan(totalFollowers)} 粉丝的 ${platforms.length} 个平台`, to: '/me/media', icon: 'share' },
      { label: '留言弹幕墙', desc: '说点什么，它会飞过去', to: '/me/guestbook', icon: 'send' },
      { label: '友链', desc: '同频的人与站', to: '/me/friends', icon: 'link' },
    ],
  },
]

export const adminNav = [
  { key: 'dashboard', label: '仪表盘', icon: 'gauge' },
  { key: 'content', label: '内容管理', icon: 'layers' },
  { key: 'articles', label: '文章审核', icon: 'file' },
  { key: 'messages', label: '留言审核', icon: 'chat' },
  { key: 'files', label: '资源管理', icon: 'folder' },
  { key: 'settings', label: '站点设置', icon: 'settings' },
]
