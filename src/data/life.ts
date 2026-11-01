export type LoveRecord = {
  id: string
  date: string
  title: string
  desc: string
  type: '起点' | '日常' | '旅行' | '惊喜' | '成长'
  place: string
  color: string
  icon: 'heart' | 'coffee' | 'plane' | 'gift' | 'sun' | 'music'
  /** 每条记录的专属封面（public/images/love 下的本地图片，不依赖外链） */
  cover: string
}

export const loveMeta = {
  startDate: '2023-05-20',
  partner: '小羊',
  city: '西安 · 重庆',
  motto: '异地 1,100 公里，每次见面都算节庆。',
}

export const loveRecords: LoveRecord[] = [
  {
    id: 'l1',
    cover: '/images/love/l1.jpg',
    date: '2023-05-20',
    title: '图书馆四楼，借走同一本《深度学习》',
    desc: '她先伸手，我把书让了出去，然后要到了微信。那天西安 29 度，我在图书馆门口站了十分钟才敢发第一条消息。',
    type: '起点',
    place: '西安 · 未央',
    color: 'rgb(var(--c-rose))',
    icon: 'heart',
  },
  {
    id: 'l2',
    cover: '/images/love/l2.jpg',
    date: '2023-09-17',
    title: '第一次一起去吃重庆小面',
    desc: '她吃微辣，我吃特辣，然后她被辣到眼泪汪汪还硬说好吃。后来我才知道她其实不能吃辣。',
    type: '日常',
    place: '西安 · 万州面馆',
    color: 'rgb(var(--c-coral))',
    icon: 'coffee',
  },
  {
    id: 'l3',
    cover: '/images/love/l3.jpg',
    date: '2024-02-14',
    title: '异地第一年，寄了一箱「时间胶囊」',
    desc: '365 张纸条，每天抽一张。她抽到的第一张写着「今天可以要求我唱一首歌」。',
    type: '惊喜',
    place: '西安 ↔ 重庆',
    color: 'rgb(var(--c-lime))',
    icon: 'gift',
  },
  {
    id: 'l4',
    cover: '/images/love/l4.jpg',
    date: '2024-07-21',
    title: '成都 · 一起看了第一场演唱会',
    desc: '她在副歌的时候哭了，我在旁边偷偷录像，回来剪成了一支 3 分钟的片子。',
    type: '旅行',
    place: '成都 · 东安湖',
    color: 'rgb(var(--c-grape))',
    icon: 'music',
  },
  {
    id: 'l5',
    cover: '/images/love/l5.jpg',
    date: '2024-11-03',
    title: '因为「谁该先挂电话」吵了一架',
    desc: '吵完她发来一条消息：「我们不吵隔夜架，你先睡，我明天继续喜欢你。」',
    type: '成长',
    place: '异地',
    color: 'rgb(var(--c-sky))',
    icon: 'sun',
  },
  {
    id: 'l6',
    cover: '/images/love/l6.jpg',
    date: '2025-05-01',
    title: '重庆 · 带她回家吃外婆做的饭',
    desc: '外婆塞给她一大袋腊肉，她一路抱回西安，说这是「通关文牒」。',
    type: '旅行',
    place: '重庆 · 万州',
    color: 'rgb(var(--c-coral))',
    icon: 'plane',
  },
  {
    id: 'l7',
    cover: '/images/love/l7.jpg',
    date: '2025-09-10',
    title: '读研开学，她把我的工位贴满便签',
    desc: '每张便签一句「代码写不出来就先吃饭」。现在还在我显示器下面贴着。',
    type: '日常',
    place: '西安 · 陕科大',
    color: 'rgb(var(--c-lime))',
    icon: 'heart',
  },
  {
    id: 'l8',
    cover: '/images/love/l8.jpg',
    date: '2026-05-20',
    title: '三周年，用作品集当礼物',
    desc: '把这个网站做出来了。她说比花好，因为「这个能一直更新」。',
    type: '惊喜',
    place: '西安',
    color: 'rgb(var(--c-rose))',
    icon: 'gift',
  },
]

export const loveStats = [
  { label: '在一起', value: '1240', unit: '天' },
  { label: '见面次数', value: '86', unit: '次' },
  { label: '一起去过', value: '11', unit: '座城市' },
  { label: '合影', value: '2,403', unit: '张' },
]

export type Moment = {
  id: string
  time: string
  text: string
  place?: string
  likes: number
  comments: { user: string; text: string }[]
  accent: string
  media: { label: string; kind: 'photo' | 'note' | 'code' }[]
  tags: string[]
}

export const moments: Moment[] = [
  {
    id: 'm1',
    time: '今天 01:42',
    text: '把评测中台的第 42 个用例写完了。RSI 闭环终于能自己跑完一整轮，看着 pass_rate 从 0.71 爬到 0.93，比喝咖啡还提神。',
    place: '西安 · 实验室',
    likes: 128,
    accent: 'rgb(var(--c-grape))',
    media: [{ label: 'eval-report.png', kind: 'photo' }],
    comments: [
      { user: '老陈', text: '这个曲线可以发朋友圈了' },
      { user: '小羊', text: '又是凌晨一点，记得睡觉' },
    ],
    tags: ['深夜 coding'],
  },
  {
    id: 'm2',
    time: '昨天 19:20',
    text: '长沙决赛结束，第二名。评委问「你的自进化会不会自己乱改生产」，我说有三层刹车。他笑了，我也笑了。',
    place: '长沙 · 马栏山',
    likes: 342,
    accent: 'rgb(var(--c-coral))',
    media: [
      { label: 'csdn-final.jpg', kind: 'photo' },
      { label: 'score-card', kind: 'note' },
    ],
    comments: [{ user: '阿哲', text: '下次带我们一起飞' }],
    tags: ['黑客松', '长沙'],
  },
  {
    id: 'm3',
    time: '3 天前',
    text: '黑了一整天：多轨道时间轴的拖拽在 Safari 上位置差了 12px。最后发现是 transform-origin 和 rem 换算的问题。前端真的是一门玄学。',
    likes: 96,
    accent: 'rgb(var(--c-sky))',
    media: [{ label: 'timeline-bug.mov', kind: 'photo' }],
    comments: [
      { user: '前端群友', text: '12px 我可以作证，是 rem' },
      { user: '小羊', text: '注意眼睛' },
    ],
    tags: ['debug 日常'],
  },
  {
    id: 'm4',
    time: '2026.09.18',
    text: '第一次给线下 80 个人讲 Agent Harness。讲到「工具越权要返回 404」的时候，前排有个同学疯狂点头，那一刻觉得做内容是有意义的。',
    place: '杭州 · 初芯 OPC',
    likes: 512,
    accent: 'rgb(var(--c-lime))',
    media: [{ label: 'opc-talk.jpg', kind: 'photo' }],
    comments: [
      { user: '初芯小编', text: '回放已经剪好了，等你的教程' },
      { user: 'Lily', text: '求 PPT' },
    ],
    tags: ['分享', '杭州'],
  },
  {
    id: 'm5',
    time: '2026.09.02',
    text: '骑车 42 公里环了西安一圈，从大唐不夜城到浐灞，在河边坐着看落日。写代码之外，城市也需要被阅读。',
    place: '西安 · 浐灞',
    likes: 208,
    accent: 'rgb(var(--c-rose))',
    media: [
      { label: 'cycling-42km.jpg', kind: 'photo' },
      { label: 'sunset.heic', kind: 'photo' },
    ],
    comments: [{ user: '小羊', text: '下次带我，我骑得慢你等我' }],
    tags: ['骑行', '日落'],
  },
  {
    id: 'm6',
    time: '2026.08.11',
    text: '给开源项目补了 README 和 3 个 demo。凌晨收到第一个 star，比拿奖还开心一点。',
    likes: 174,
    accent: 'rgb(var(--c-blue))',
    media: [{ label: 'github-star.png', kind: 'note' }],
    comments: [{ user: '匿名网友', text: 'demo 直接能跑，赞' }],
    tags: ['开源'],
  },
]

export type Trip = {
  id: string
  city: string
  spot: string
  lon: number
  lat: number
  date: string
  days: number
  companion: string
  note: string
  tag: string
  color: string
  size: 'lg' | 'md' | 'sm'
}

export const trips: Trip[] = [
  { id: 't1', city: '西安', spot: '大雁塔 · 大唐不夜城', lon: 108.96, lat: 34.22, date: '2026.09.02', days: 1, companion: '自己', note: '骑行 42km 的终点，日落把塔身染成橘色。', tag: '城市漫游', color: 'rgb(var(--c-coral))', size: 'lg' },
  { id: 't2', city: '重庆', spot: '万州 · 长江边', lon: 108.4, lat: 30.8, date: '2025.05.01', days: 5, companion: '小羊', note: '带她回家吃外婆做的饭，江风把她的头发吹得很乱。', tag: '家乡', color: 'rgb(var(--c-lime))', size: 'lg' },
  { id: 't3', city: '成都', spot: '东安湖体育公园', lon: 104.07, lat: 30.57, date: '2024.07.21', days: 3, companion: '小羊', note: '第一场演唱会，副歌的时候她哭了。', tag: '演唱会', color: 'rgb(var(--c-grape))', size: 'md' },
  { id: 't4', city: '杭州', spot: '西湖 · 断桥', lon: 120.05, lat: 30.35, date: '2026.09.17', days: 4, companion: 'OPC 同行', note: '分享完第二天早起绕湖跑了一圈，雾很大。', tag: '出差', color: 'rgb(var(--c-sky))', size: 'md' },
  { id: 't5', city: '长沙', spot: '马栏山视频文创园', lon: 113.03, lat: 28.22, date: '2026.08.08', days: 3, companion: '队友', note: '决赛前夜在便利店改 PPT 到两点。', tag: '黑客松', color: 'rgb(var(--c-rose))', size: 'md' },
  { id: 't6', city: '北京', spot: '798 艺术区', lon: 116.49, lat: 39.98, date: '2026.01.01', days: 4, companion: '小羊', note: '跨年黑客松拿了最佳实践奖，奖金请她吃了顿好的。', tag: '跨年', color: 'rgb(var(--c-blue))', size: 'md' },
  { id: 't7', city: '南京', spot: '阿里中心 · 建邺', lon: 118.73, lat: 32.00, date: '2026.06.14', days: 3, companion: '队友', note: '路演完在秦淮河边走了很久。', tag: '黑客松', color: 'rgb(var(--c-lime))', size: 'sm' },
  { id: 't8', city: '上海', spot: '张江科学城', lon: 121.4, lat: 31.15, date: '2026.05.25', days: 4, companion: '团队', note: '星火 OPC 决赛，第一次在投资人面前讲收费模型。', tag: '决赛', color: 'rgb(var(--c-coral))', size: 'md' },
  { id: 't9', city: '深圳', spot: '南山区 · 深圳湾', lon: 113.93, lat: 22.53, date: '2025.12.12', days: 3, companion: '自己', note: '看海的时候想通了一个架构问题。', tag: '灵感', color: 'rgb(var(--c-sky))', size: 'sm' },
  { id: 't10', city: '厦门', spot: '鼓浪屿', lon: 117.95, lat: 24.5, date: '2024.08.02', days: 4, companion: '小羊', note: '岛上没有车，走了两万步，吃了三碗沙茶面。', tag: '旅行', color: 'rgb(var(--c-rose))', size: 'md' },
  { id: 't11', city: '乌鲁木齐', spot: '天山天池', lon: 88.13, lat: 43.88, date: '2023.08.10', days: 7, companion: '家人', note: '本科毕业旅行，海拔 1900 米的风很干净。', tag: '毕业旅行', color: 'rgb(var(--c-lime))', size: 'sm' },
]

export type Track = {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  mood: string
  color: string
  lyric: string[]
  bars: number[]
}

export const playlist: Track[] = [
  {
    id: 'p1',
    title: '橘色落日',
    artist: '房东的猫',
    album: '云烟成雨',
    duration: 245,
    mood: '写代码时的背景',
    color: 'rgb(var(--c-coral))',
    lyric: ['风把云吹成一条河', '我把今天写完一半', '剩下的留给明天', '留给落日和你说晚安'],
    bars: [18, 34, 52, 40, 66, 48, 72, 30, 58, 44, 68, 38],
  },
  {
    id: 'p2',
    title: 'Midnight Commit',
    artist: 'Lofi Dev',
    album: 'Deploy at 3am',
    duration: 198,
    mood: '凌晨跑评测',
    color: 'rgb(var(--c-grape))',
    lyric: ['build passed in the dark', 'the logs are singing low', 'one more test to go', 'then I let the server go'],
    bars: [24, 46, 30, 62, 38, 54, 26, 70, 34, 58, 42, 64],
  },
  {
    id: 'p3',
    title: '长安夜骑',
    artist: '陈鸿宇',
    album: '一如年少模样',
    duration: 262,
    mood: '夜骑 42km',
    color: 'rgb(var(--c-lime))',
    lyric: ['城墙的影子被灯拉长', '风从钟楼吹到浐灞', '我踩着 pedal 数着里程', '把这座城读了一遍'],
    bars: [52, 30, 68, 44, 60, 36, 74, 48, 56, 32, 66, 40],
  },
  {
    id: 'p4',
    title: '异地信号',
    artist: '落日飞车',
    album: 'Cassa Nova',
    duration: 231,
    mood: '想她的时候',
    color: 'rgb(var(--c-rose))',
    lyric: ['一千一百公里的距离', '被一句晚安折叠起来', '你的呼吸有点延迟', '但心跳没有'],
    bars: [36, 58, 44, 70, 28, 52, 40, 66, 46, 60, 34, 72],
  },
  {
    id: 'p5',
    title: 'Token 雨',
    artist: 'Yat Yat',
    album: 'Context Window',
    duration: 214,
    mood: '调 Harness',
    color: 'rgb(var(--c-blue))',
    lyric: ['上下文在下雨', '我把窗口开得很小', '只留下最重要的那一行', '然后让它自己跑'],
    bars: [64, 40, 56, 28, 72, 46, 62, 34, 68, 42, 58, 30],
  },
  {
    id: 'p6',
    title: '外婆的灶台',
    artist: '野孩子',
    album: '黄河谣',
    duration: 289,
    mood: '想家的时候',
    color: 'rgb(var(--c-surface-2))',
    lyric: ['灶上的水一直开着', '腊肉的味道穿过院子', '她说多吃一点', '回去就吃不到了'],
    bars: [30, 44, 58, 36, 52, 66, 40, 56, 48, 62, 34, 50],
  },
]
