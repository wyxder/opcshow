import { articles } from '@/data/articles'
import { projects } from '@/data/projects'
import { growthTimeline } from '@/data/me'
import { resourceFiles } from '@/data/work'

/* --------------------------------- traffic -------------------------------- */

export type TrafficWindow = {
  key: '7d' | '30d'
  label: string
  range: string
  labels: string[]
  pv: number[]
  uv: number[]
  ai: number[]
  kpis: { label: string; value: string; delta: string; note: string }[]
}

export const traffic: Record<'7d' | '30d', TrafficWindow> = {
  '7d': {
    key: '7d',
    label: '近 7 天',
    range: '2026.10.23 — 2026.10.29',
    labels: ['10-23', '10-24', '10-25', '10-26', '10-27', '10-28', '10-29'],
    pv: [186, 248, 236, 152, 158, 398, 96],
    uv: [110, 140, 133, 84, 88, 272, 60],
    ai: [0, 18, 0, 0, 0, 26, 0],
    kpis: [
      { label: '访问量 PV', value: '1.5k', delta: '4.8%', note: '环比' },
      { label: '独立访客 UV', value: '930', delta: '19.2%', note: '环比' },
      { label: 'AI 会话', value: '239', delta: '0.4%', note: '环比' },
      { label: '弹幕', value: '37', delta: '0%', note: '环比' },
      { label: '深度阅读', value: '503', delta: '0%', note: '环比' },
      { label: '文件下载', value: '20', delta: '0%', note: '环比' },
    ],
  },
  '30d': {
    key: '30d',
    label: '近 30 天',
    range: '2026.09.30 — 2026.10.29',
    labels: [
      '09-30', '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07', '10-08', '10-09',
      '10-10', '10-11', '10-12', '10-13', '10-14', '10-15', '10-16', '10-17', '10-18', '10-19',
      '10-20', '10-21', '10-22', '10-23', '10-24', '10-25', '10-26', '10-27', '10-28', '10-29',
    ],
    pv: [
      132, 168, 154, 121, 96, 142, 188, 176, 204, 198,
      167, 152, 178, 224, 236, 248, 212, 196, 184, 206,
      232, 218, 244, 186, 248, 236, 152, 158, 398, 96,
    ],
    uv: [
      84, 102, 96, 74, 60, 88, 112, 108, 124, 118,
      101, 92, 108, 136, 140, 146, 128, 118, 110, 122,
      138, 130, 148, 110, 140, 133, 84, 88, 272, 60,
    ],
    ai: [
      0, 4, 8, 0, 0, 3, 12, 0, 16, 6,
      0, 0, 9, 14, 11, 18, 7, 0, 5, 13,
      20, 6, 15, 0, 18, 0, 0, 0, 26, 0,
    ],
    kpis: [
      { label: '访问量 PV', value: '5.6k', delta: '12.6%', note: '环比' },
      { label: '独立访客 UV', value: '3.2k', delta: '8.4%', note: '环比' },
      { label: 'AI 会话', value: '212', delta: '6.9%', note: '环比' },
      { label: '弹幕', value: '148', delta: '2.1%', note: '环比' },
      { label: '深度阅读', value: '1.9k', delta: '11.3%', note: '环比' },
      { label: '文件下载', value: '86', delta: '3.4%', note: '环比' },
    ],
  },
}

export const sourceShare = [
  { label: '直接访问', value: 42, color: '#FF5A2B' },
  { label: '公众号', value: 23, color: '#E6A23C' },
  { label: '小红书', value: 16, color: '#3C5BFF' },
  { label: 'GitHub', value: 11, color: '#7C5CFF' },
  { label: '其他', value: 8, color: '#E8859F' },
]

export const topArticles = articles
  .slice()
  .sort((a, b) => b.views - a.views)
  .slice(0, 4)
  .map((a, i) => ({
    id: a.id,
    rank: String(i + 1).padStart(2, '0'),
    title: a.title,
    tags: a.tags.slice(0, 3),
    views: a.views,
    ratio: [100, 85, 58, 36][i] ?? 30,
  }))

export const realtime = {
  online: 0,
  pv: 75,
  uv: 75,
  ai: 0,
  uptime: '2.7h',
  totalPv: '8.4k',
}

/* -------------------------------- analytics ------------------------------- */

export const pageRank = [
  { path: '/', title: '首页', pv: 1842, uv: 1210, stay: '1m 42s', bounce: '38%' },
  { path: '/learn', title: '学习手记', pv: 986, uv: 704, stay: '3m 08s', bounce: '42%' },
  { path: '/work/resume', title: '简历', pv: 764, uv: 612, stay: '2m 21s', bounce: '31%' },
  { path: '/work/files', title: '文件资源', pv: 512, uv: 388, stay: '1m 56s', bounce: '47%' },
  { path: '/me/guestbook', title: '留言板', pv: 402, uv: 331, stay: '2m 40s', bounce: '52%' },
  { path: '/life/moments', title: '动态', pv: 388, uv: 296, stay: '1m 18s', bounce: '44%' },
]

export const deviceShare = [
  { label: '桌面端', value: 61, color: '#3C5BFF' },
  { label: 'iOS', value: 22, color: '#FF5A2B' },
  { label: 'Android', value: 14, color: '#E6A23C' },
  { label: '其他', value: 3, color: '#7C5CFF' },
]

export const regionShare = [
  { label: '陕西', value: 28 },
  { label: '北京', value: 21 },
  { label: '广东', value: 16 },
  { label: '浙江', value: 12 },
  { label: '重庆', value: 9 },
  { label: '海外', value: 5 },
]

export const readDepth = [
  { label: '< 30s', value: 46 },
  { label: '30s–2min', value: 31 },
  { label: '2–5min', value: 15 },
  { label: '> 5min', value: 8 },
]

export const funnels = [
  { label: '访问首页', value: 5600, ratio: 100 },
  { label: '进入文章', value: 3120, ratio: 56 },
  { label: '阅读过半', value: 1480, ratio: 26 },
  { label: '留言 / 互动', value: 320, ratio: 6 },
  { label: '下载文件', value: 86, ratio: 2 },
]

export const aiSessions = [
  { label: '简历问答', value: 96, color: '#FF5A2B' },
  { label: '项目咨询', value: 68, color: '#3C5BFF' },
  { label: '学习手记', value: 47, color: '#E6A23C' },
  { label: '闲聊', value: 28, color: '#7C5CFF' },
]

export const hourly = [
  2, 1, 0, 0, 1, 3, 8, 14, 22, 31, 38, 42, 36, 33, 46, 58, 64, 72, 68, 54, 41, 28, 14, 6,
]

/* --------------------------------- content -------------------------------- */

const statusPool = ['已发布', '已发布', '已发布', '草稿', '待审核'] as const

export const adminArticles = articles.map((a, i) => ({
  id: a.id,
  title: a.title,
  category: a.category,
  status: statusPool[i % statusPool.length],
  views: a.views,
  comments: [12, 8, 5, 3, 21, 7][i % 6],
  date: a.date,
  words: [4210, 3860, 3120, 2980, 5240, 2760][i % 6],
}))

export const adminProjects = projects.map((p, i) => ({
  id: p.id,
  title: p.title,
  category: p.category,
  status: i === projects.length - 1 ? '草稿' : '已发布',
  featured: Boolean(p.featured),
  views: [1240, 986, 642, 1180, 875, 430, 268][i % 7],
  stars: [86, 74, 52, 68, 41, 23, 19][i % 7],
  updated: ['2 小时前', '昨天', '3 天前', '5 天前', '1 周前', '2 周前', '3 周前'][i % 7],
  stack: p.stack.slice(0, 4),
  accent: p.accent,
}))

export const adminPosts = growthTimeline
  .slice(-6)
  .reverse()
  .map((t, i) => ({
    id: t.id,
    date: t.date.replace('.', '-'),
    text: `${t.title}｜${t.desc}`,
    tag: t.tag,
    visibility: i === 2 ? '仅自己' : '公开',
    likes: [26, 18, 12, 31, 9, 22][i],
    comments: [5, 3, 2, 7, 1, 4][i],
    pinned: i === 0,
  }))

export const contentStats = [
  { label: '文章', value: adminArticles.length, note: `${adminArticles.filter((a) => a.status === '草稿').length} 篇草稿` },
  { label: '项目', value: adminProjects.length, note: `${adminProjects.filter((p) => p.featured).length} 个首页推荐` },
  { label: '动态', value: adminPosts.length, note: '近 30 天更新' },
  { label: '总浏览', value: '24.6k', note: '+8.2% 环比' },
]

/* --------------------------------- resume --------------------------------- */

export const resumeParse = {
  file: '魏云潇-AI全栈开发-简历-v1.2.pdf',
  size: '1.2 MB',
  pages: 2,
  updated: '2026-10-12 21:40',
  state: '已解析',
  progress: 100,
  extracted: [
    { key: '基本信息', value: '魏云潇 · 24 岁 · 西安 · wyxcode@qq.com', confidence: 99 },
    { key: '求职意向', value: 'AI 全栈 / 智能体开发实习', confidence: 97 },
    { key: '教育经历', value: '陕西科技大学 · 信息与通信工程 · 硕士在读', confidence: 96 },
    { key: '技能标签', value: 'RAG、Multi-Agent、Harness、React、FastAPI', confidence: 94 },
    { key: '项目数量', value: '识别到 7 个项目、12 条量化指标', confidence: 91 },
    { key: '获奖记录', value: '识别到 16 项竞赛与荣誉', confidence: 88 },
  ],
}

export const resumeModules = [
  { id: 'basic', title: '基本信息', desc: '姓名、联系方式、求职意向', enabled: true, count: 5, icon: 'user' },
  { id: 'education', title: '教育经历', desc: '两段学历与主修课程', enabled: true, count: 2, icon: 'cap' },
  { id: 'skills', title: '技能矩阵', desc: '6 组能力与熟练度', enabled: true, count: 6, icon: 'spark' },
  { id: 'projects', title: '项目经历', desc: '7 个项目与量化指标', enabled: true, count: 7, icon: 'layers' },
  { id: 'awards', title: '竞赛荣誉', desc: '16 项国赛 / 省赛获奖', enabled: true, count: 16, icon: 'trophy' },
  { id: 'research', title: '科研成果', desc: 'ICCV 在投与软著专利', enabled: true, count: 3, icon: 'flask' },
  { id: 'media', title: '自媒体数据', desc: '全网 3.4w 粉丝与作品', enabled: false, count: 6, icon: 'megaphone' },
  { id: 'hobbies', title: '兴趣标签', desc: '生活化的补充信息', enabled: false, count: 6, icon: 'heart' },
]

export const resumeVersions = [
  { version: 'v1.2', date: '2026-10-12', author: '魏云潇', status: '当前版本', size: '1.2 MB', downloads: 386, note: '补充 Agent 评测中台与 RSI 闭环，调整项目排序' },
  { version: 'v1.1', date: '2026-09-20', author: '魏云潇', status: '已归档', size: '1.1 MB', downloads: 214, note: '新增星火 OPC 国赛一等奖与字节 RAG 项目指标' },
  { version: 'v1.0', date: '2026-08-02', author: '魏云潇', status: '已归档', size: '980 KB', downloads: 132, note: '首版对外投递版本，覆盖 6 个项目' },
]

/* ---------------------------------- files --------------------------------- */

export const adminFiles = resourceFiles.map((f, i) => ({
  id: f.id,
  name: f.name,
  ext: f.ext,
  size: f.size,
  category: f.category,
  downloads: f.downloads,
  date: f.date,
  visibility: i % 4 === 3 ? '私密' : '公开',
  shared: i % 3 === 0,
}))

export const uploadQueue = [
  { id: 'u1', name: '作品集 2026 · 项目长图.pdf', size: '8.4 MB', progress: 100, state: '完成' },
  { id: 'u2', name: 'RSI 评测集 v2.xlsx', size: '1.6 MB', progress: 64, state: '上传中' },
  { id: 'u3', name: 'Harness 架构图.fig', size: '24 MB', progress: 0, state: '等待中' },
]

export const shares = [
  { id: 's1', file: '魏云潇-AI全栈开发-简历.pdf', token: 'wyx-r1x2', password: '无', expires: '永久', visits: 128, created: '2026-10-12' },
  { id: 's2', file: 'RAG 工程化讲义（杭州 OPC）.pptx', token: 'rag-opc9', password: 'opc2026', expires: '2026-11-30', visits: 64, created: '2026-09-18' },
  { id: 's3', file: '电商客服评测集（脱敏 200 条）.xlsx', token: 'eval-x200', password: '无', expires: '2026-12-31', visits: 43, created: '2026-08-12' },
]

export const storage = {
  used: 63.4,
  total: 128,
  trend: '近 30 天增长 4.2 GB',
  buckets: [
    { label: '简历与作品集', value: 12.6, color: '#FF5A2B' },
    { label: '课程与讲义', value: 24.8, color: '#E6A23C' },
    { label: '数据集', value: 14.2, color: '#3C5BFF' },
    { label: '源码与模板', value: 8.4, color: '#7C5CFF' },
    { label: '回收站', value: 3.4, color: '#E8859F' },
  ],
  trash: [
    { id: 'tr1', name: '旧版简历 v0.9.pdf', size: '860 KB', deleted: '2026-10-06' },
    { id: 'tr2', name: '临时导出-动态封面.zip', size: '46 MB', deleted: '2026-09-28' },
    { id: 'tr3', name: '未使用图片素材.zip', size: '128 MB', deleted: '2026-09-12' },
  ],
  duplicates: [
    { name: '作品集 2026 · 项目长图.pdf', copies: 3, size: '25.2 MB' },
    { name: 'RAG 工程化讲义（杭州 OPC）.pptx', copies: 2, size: '36 MB' },
  ],
}

/* ------------------------------- moderation ------------------------------- */

export const danmakuQueue = [
  { id: 'dm1', user: '路过的前端', text: '这个转场好丝滑，做了多久？', time: '12 分钟前', page: '/', status: '待审' },
  { id: 'dm2', user: '小羊', text: '记得吃饭。', time: '38 分钟前', page: '/me', status: '待审' },
  { id: 'dm3', user: 'Lily', text: '求 RAG 系列的完整代码～', time: '2 小时前', page: '/learn/rag-engineering', status: '已通过' },
  { id: 'dm4', user: '陈师兄', text: 'ICCV 加油，等你中稿。', time: '5 小时前', page: '/me/timeline', status: '已通过' },
  { id: 'dm5', user: '匿名网友', text: '第一次看到把评测讲这么清楚的博主。', time: '昨天', page: '/learn/agent-eval', status: '已通过' },
  { id: 'dm6', user: '西交学妹', text: '学长，本科怎么准备 AI 实习？', time: '昨天', page: '/work/resume', status: '待审' },
]

export const guestbookQueue = [
  { id: 'gb1', user: 'Kevin', email: 'kevin@studio.dev', text: '希望能合作一次 Agent 项目，我们这边有真实的电商场景。', time: '26 分钟前', status: '待审' },
  { id: 'gb2', user: '重庆老乡', email: 'wyx-fan@qq.com', text: '万州人报道，面馆在哪家？下次回去一起吃。', time: '3 小时前', status: '待审' },
  { id: 'gb3', user: 'OPC 小编', email: 'opc@hangzhou.ai', text: '杭州分享的回放剪好啦，方便的话帮忙转发一下～', time: '昨天', status: '已通过' },
  { id: 'gb4', user: '阿哲', email: 'zhe@hack.dev', text: '下一场黑客松还带你，题目先保密。', time: '2 天前', status: '已通过' },
]

export const friendRequests = [
  { id: 'fr1', name: '云栖 AI 笔记', url: 'yunqi-ai.dev', desc: '一个写 RAG 与 Agent 实践的技术博客，月更 4 篇。', email: 'hi@yunqi-ai.dev', time: '2 小时前', status: '待审' },
  { id: 'fr2', name: '半糖工作室', url: 'bantang.studio', desc: '独立设计工作室，做一些小而美的产品。', email: 'me@bantang.studio', time: '昨天', status: '待审' },
  { id: 'fr3', name: '老陈的炼丹炉', url: 'chen-lab.cn', desc: '多模态方向的研究笔记，同门师兄的站。', email: 'chen@lab.cn', time: '3 天前', status: '已通过' },
]

/* ---------------------------------- AI ------------------------------------ */

export const aiModels = [
  { id: 'm1', name: 'DeepSeek Chat', provider: 'DeepSeek', model: 'deepseek-chat', key: 'sk-••••••••7f2a', enabled: true, isDefault: true, latency: '820ms', cost: '¥0.001 / 1k', context: '64k', calls: 1862 },
  { id: 'm2', name: 'GPT-4o mini', provider: 'OpenAI', model: 'gpt-4o-mini', key: 'sk-••••••••a91c', enabled: true, isDefault: false, latency: '1.2s', cost: '¥0.003 / 1k', context: '128k', calls: 412 },
  { id: 'm3', name: 'Qwen Max', provider: '阿里云', model: 'qwen-max', key: 'sk-••••••••33bd', enabled: false, isDefault: false, latency: '960ms', cost: '¥0.004 / 1k', context: '32k', calls: 96 },
  { id: 'm4', name: 'GLM-4 Air', provider: '智谱', model: 'glm-4-air', key: 'sk-••••••••c17e', enabled: false, isDefault: false, latency: '—', cost: '¥0.002 / 1k', context: '128k', calls: 0 },
]

export const prompts = [
  { id: 'p1', name: '站点 AI 助手 · 主提示词', scene: '全站对话', model: 'DeepSeek Chat', updated: '2 天前', enabled: true, tokens: 486, body: '你是魏云潇个人站点的 AI 助手。回答必须基于站内内容，不确定时直接说不知道，并引导用户去看对应文章或简历。' },
  { id: 'p2', name: '简历摘要生成', scene: '简历解析', model: 'GPT-4o mini', updated: '5 天前', enabled: true, tokens: 312, body: '根据解析出的结构化简历生成 120 字以内的摘要，突出量化指标，不要编造任何经历。' },
  { id: 'p3', name: '动态文案润色', scene: '内容管理', model: 'DeepSeek Chat', updated: '1 周前', enabled: false, tokens: 208, body: '把一段口语化的近况改写成 80 字内的动态，保留第一人称，不要使用夸张的形容词。' },
  { id: 'p4', name: '留言审核分类', scene: '互动审核', model: 'DeepSeek Chat', updated: '2 周前', enabled: true, tokens: 164, body: '判断留言属于：咨询 / 合作 / 闲聊 / 垃圾信息。仅输出类别与置信度。' },
]

export const aiUsage = {
  monthTokens: '1.24M',
  monthCost: '¥ 18.6',
  avgLatency: '860ms',
  successRate: '99.2%',
  limit: 3000000,
  usedTokens: 1240000,
  daily: [
    { date: '10-23', tokens: 38000, cost: 0.6 },
    { date: '10-24', tokens: 52000, cost: 0.8 },
    { date: '10-25', tokens: 46000, cost: 0.7 },
    { date: '10-26', tokens: 28000, cost: 0.4 },
    { date: '10-27', tokens: 31000, cost: 0.5 },
    { date: '10-28', tokens: 84000, cost: 1.3 },
    { date: '10-29', tokens: 26000, cost: 0.4 },
  ],
  byModel: [
    { label: 'DeepSeek Chat', value: 68, color: '#FF5A2B' },
    { label: 'GPT-4o mini', value: 21, color: '#3C5BFF' },
    { label: '其他', value: 11, color: '#E6A23C' },
  ],
}

/* -------------------------------- settings -------------------------------- */

export const themePresets = [
  { id: 'paper', name: 'Paper Brutal', note: '米白纸感 + 墨黑硬边', colors: ['#F4F0E6', '#14140F', '#C9F158', '#FF5A2B'] },
  { id: 'clay', name: 'Warm Clay', note: '奶油底 + 珊瑚点缀', colors: ['#FBF8F1', '#14140F', '#FF5A2B', '#E6A23C'] },
  { id: 'slate', name: 'Quiet Blue', note: '纸底 + 靛蓝强调', colors: ['#F4F0E6', '#14140F', '#3C5BFF', '#C9F158'] },
]

export const seoDefaults = {
  title: 'WYX.SPACE · 魏云潇的个人站',
  description: 'AI 全栈 / 智能体开发。RAG、Agent 评测、AIGC 工作台，把想法做成能上线的东西。',
  keywords: 'RAG, Agent, 评测, AI 全栈, 作品集, 魏云潇',
  ogImage: '/og-cover.png',
  canonical: 'https://wyx.space',
  robots: 'index, follow',
  sitemap: true,
  structuredData: true,
  analytics: true,
}

export const backups = [
  { id: 'b1', name: 'auto-2026-10-29-03', size: '128 MB', type: '自动', status: '成功', time: '今天 03:00', items: '内容 + 文件 + 配置' },
  { id: 'b2', name: 'manual-2026-10-24-release', size: '126 MB', type: '手动', status: '成功', time: '10-24 18:20', items: '内容 + 文件 + 配置' },
  { id: 'b3', name: 'auto-2026-10-22-03', size: '124 MB', type: '自动', status: '成功', time: '10-22 03:00', items: '内容 + 文件 + 配置' },
  { id: 'b4', name: 'auto-2026-10-15-03', size: '119 MB', type: '自动', status: '已过期', time: '10-15 03:00', items: '内容 + 文件' },
]

export const systemInfo = {
  version: 'v1.0',
  stack: 'DEMO · SQLite',
  build: '2026.10.29',
  uptime: '412 天',
  runtime: '2.7h',
}
