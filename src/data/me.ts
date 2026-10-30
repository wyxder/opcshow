export type TimelineNode = {
  id: string
  date: string
  year: string
  title: string
  org: string
  desc: string
  tag: '学习' | '项目' | '竞赛' | '内容' | '生活'
  highlight?: boolean
}

export const growthTimeline: TimelineNode[] = [
  {
    id: 'g1',
    date: '2018.09',
    year: '2018',
    title: '高中毕业，第一次自己装机',
    org: '重庆万州',
    desc: '为了打游戏装了第一台电脑，结果把主板装坏了两次。从那时起开始折腾硬件和脚本。',
    tag: '生活',
  },
  {
    id: 'g2',
    date: '2021.09',
    year: '2021',
    title: '进入西安科技大学通信工程',
    org: '国家特色专业',
    desc: '大一写 C 语言作业写到凌晨，第一次体会到「跑通」的快乐。',
    tag: '学习',
  },
  {
    id: 'g3',
    date: '2022.11',
    year: '2022',
    title: '第一段实习，写 Java 后端',
    org: '西安 · 校招前的试炼',
    desc: '第一次接触真实需求与线上问题，学会了看日志、复现 bug、写清楚提交信息。',
    tag: '学习',
  },
  {
    id: 'g4',
    date: '2023.05',
    year: '2023',
    title: '遇到小羊',
    org: '图书馆四楼',
    desc: '借走同一本《深度学习》，然后被要求「必须看完」。',
    tag: '生活',
    highlight: true,
  },
  {
    id: 'g5',
    date: '2024.05',
    year: '2024',
    title: 'Coder 零代码 AI 应用平台上线',
    org: '西安粤嵌信息科技',
    desc: 'LangGraph4j + 微服务 + 一键部署，第一次把 AI 能力做成别人能用的产品。',
    tag: '项目',
  },
  {
    id: 'g6',
    date: '2024.12',
    year: '2024',
    title: '开始做 AI 自媒体',
    org: '小红书 / B站 / 公众号',
    desc: '第一篇 FDE 教程只有 200 播放，第 20 篇破了 10w。现在累计 2.3w 粉。',
    tag: '内容',
  },
  {
    id: 'g7',
    date: '2025.06',
    year: '2025',
    title: '字节跳动 · 电商 RAG 客服',
    org: '北京字跳网络技术',
    desc: '把 Recall@5 从 0.72 推到 0.93，第一次理解「评测驱动」是什么意思。',
    tag: '项目',
    highlight: true,
  },
  {
    id: 'g8',
    date: '2025.09',
    year: '2025',
    title: '保研陕西科技大学，转向多模态',
    org: '信息与通信工程 · 硕士',
    desc: '微表情识别课题投 ICCV 2027，UF1 90.25%，开始做「能发论文也能落地」的研究。',
    tag: '学习',
    highlight: true,
  },
  {
    id: 'g9',
    date: '2026.05',
    year: '2026',
    title: '7 场黑客松，6 次决赛',
    org: '上海 / 长沙 / 南京 / 西安 / 杭州',
    desc: '星火 OPC 国赛一等奖、西安交大站第一名、CSDN 决赛第二名。作品开始有人愿意付费。',
    tag: '竞赛',
    highlight: true,
  },
  {
    id: 'g10',
    date: '2026.10',
    year: '2026',
    title: '在准备下一段实习',
    org: 'AI 全栈 / 智能体开发',
    desc: '作品集更新到这一页。希望下一站，能把 Agent 做到真正被日常使用。',
    tag: '项目',
  },
]

export type Platform = {
  id: string
  name: string
  handle: string
  followers: string
  posts: number
  focus: string
  color: string
  growth: string
  note: string
}

export const platforms: Platform[] = [
  { id: 'xhs', name: '小红书', handle: '@云潇的实验室', followers: '2.3w', posts: 168, focus: 'AI 工具 / 教程图文', color: 'rgb(var(--c-coral))', growth: '+38% / 90d', note: '主阵地，FDE 教程合集 89 篇' },
  { id: 'bili', name: 'B 站', handle: '@wyx_ai', followers: '6,200', posts: 42, focus: '项目复盘 / 长视频', color: 'rgb(var(--c-blue))', growth: '+21% / 90d', note: '《手搓 Agent 评测中台》播放 7.9w' },
  { id: 'douyin', name: '抖音', handle: '@云潇AI', followers: '4,800', posts: 63, focus: '60s 工具测评', color: 'rgb(var(--c-ink))', growth: '+46% / 90d', note: '最短的一条爆了 120w 曝光' },
  { id: 'wechat', name: '公众号', handle: '云潇的 AI 手记', followers: '3,100', posts: 37, focus: '深度长文', color: 'rgb(var(--c-lime))', growth: '+12% / 90d', note: 'RAG 工程化系列收藏率最高' },
  { id: 'github', name: 'GitHub', handle: '@wyx-code', followers: '980', posts: 26, focus: '开源项目 / Demo', color: 'rgb(var(--c-grape))', growth: '+31% / 90d', note: '20+ 原创开源仓库' },
  { id: 'zhihu', name: '知乎', handle: '魏云潇', followers: '2,400', posts: 19, focus: '技术问答', color: 'rgb(var(--c-sky))', growth: '+9% / 90d', note: '「Agent 评测怎么做」高赞回答' },
]

export const mediaStats = [
  { label: '全网粉丝', value: '3.4w+' },
  { label: '原创内容', value: '355' },
  { label: '累计浏览', value: '15w+' },
  { label: '累计变现', value: '1w+' },
]

export type FriendLink = {
  id: string
  name: string
  desc: string
  url: string
  tag: string
  color: string
  avatar: string
}

export const friends: FriendLink[] = [
  { id: 'f1', name: '初芯 OPC', desc: '杭州的 AI 创业者社区，我在那里讲过 Harness。', url: '#', tag: '社区', color: 'rgb(var(--c-lime))', avatar: '初' },
  { id: 'f2', name: '老陈的炼丹炉', desc: '做多模态的师兄，微表情数据集的另一位贡献者。', url: '#', tag: '同门', color: 'rgb(var(--c-sky))', avatar: '陈' },
  { id: 'f3', name: '阿哲', desc: '黑客松固定队友，前端手速比我快一倍。', url: '#', tag: '队友', color: 'rgb(var(--c-rose))', avatar: '哲' },
  { id: 'f4', name: 'DeepEval 中文社区', desc: '评测工具的中文文档与案例，我的评测启蒙。', url: '#', tag: '开源', color: 'rgb(var(--c-grape))', avatar: 'DE' },
  { id: 'f5', name: '西交 AI 俱乐部', desc: '高校 AI 黑客松的组织方，认识了很多同频的人。', url: '#', tag: '社团', color: 'rgb(var(--c-coral))', avatar: 'XJ' },
  { id: 'f6', name: '小羊的相机', desc: '她的胶片日记，我的站内照片一半来自这里。', url: '#', tag: '生活', color: 'rgb(var(--c-surface-2))', avatar: '羊' },
]

export const danmakuSeeds = [
  { id: 'd1', user: '路过的前端', text: '这个转场好丝滑，做了多久？', color: 'rgb(var(--c-blue))' },
  { id: 'd2', user: '小羊', text: '记得吃饭。', color: 'rgb(var(--c-coral))' },
  { id: 'd3', user: 'Lily', text: '求 RAG 系列的完整代码～', color: 'rgb(var(--c-grape))' },
  { id: 'd4', user: '陈师兄', text: 'ICCV 加油，等你中稿。', color: 'rgb(var(--c-ink))' },
  { id: 'd5', user: '阿哲', text: '下一场黑客松还带你。', color: 'rgb(var(--c-lime))' },
  { id: 'd6', user: '匿名网友', text: '第一次看到把评测讲这么清楚的博主。', color: 'rgb(var(--c-blue))' },
  { id: 'd7', user: 'OPC 小编', text: '杭州分享的回放剪好啦！', color: 'rgb(var(--c-coral))' },
  { id: 'd8', user: '西交学妹', text: '学长，本科怎么准备 AI 实习？', color: 'rgb(var(--c-grape))' },
  { id: 'd9', user: 'Kevin', text: '希望能合作一次 Agent 项目。', color: 'rgb(var(--c-ink))' },
  { id: 'd10', user: '重庆老乡', text: '万州人报道，面馆在哪家？', color: 'rgb(var(--c-lime))' },
]

export const aboutCards = [
  { key: 'who', title: '我是谁', lines: ['魏云潇，24 岁，重庆万州人。', '陕西科技大学信息与通信工程（多模态 AI）研二在读。', '想找一份 AI 全栈 / 智能体开发的实习，做真正有人用的东西。'] },
  { key: 'what', title: '我在做什么', lines: ['白天：Agent 评测、RAG、多智能体协作、AIGC 工作台。', '晚上：写教程、剪视频、维护 20+ 开源项目。', '最近在把 RSI 自进化做成可审批、可回滚的闭环。'] },
  { key: 'how', title: '我怎么工作', lines: ['先写验收标准，再写代码。', '能算出来的指标不交给模型判断。', '所有涉及钱和并发的逻辑，自己写一遍再让 AI 找漏洞。'] },
  { key: 'fun', title: '一点私货', lines: ['手冲只喝浅烘，咖啡因过敏但照喝。', '胶片相机是 Contax T2，拍了 40 多卷。', '最想去的城市是冰岛，因为那里没有光污染。'] },
]
