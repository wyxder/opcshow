export const profile = {
  name: '魏云潇',
  latin: 'WEI YUNXIAO',
  handle: 'wyx',
  role: 'AI 全栈 / 智能体开发',
  tagline: '把想法做成能上线的东西。',
  location: '西安 · 陕西科技大学',
  hometown: '重庆万州',
  age: 24,
  status: '在读研二 · 寻找 AI 全栈实习',
  availability: '6 个月以上 · 5 天/周 · 随时到岗',
  email: 'wyxcode@qq.com',
  wechat: 'wyx200265',
  phone: '18323765634',
  bio: [
    '信息与通信工程硕士在读，多模态 AI 方向。写代码之前先想清楚「谁会用、用完得到什么」，所以我的项目大多从一句真实需求开始，最后落到一个能付费、能被评测的线上产品。',
    '上过 7 款 AI 付费产品，打过 10+ 场线下黑客松，也是一个 2.3w 粉的 AI 内容创作者。白天写 Agent，晚上剪视频，剩下的时间在西安的巷子里找面吃。',
  ],
  keywords: ['RAG', 'Multi-Agent', 'Harness', '全栈', '多模态', '评测驱动'],
  socials: [
    { label: 'Email', value: 'wyxcode@qq.com', href: 'mailto:wyxcode@qq.com', icon: 'mail' },
    { label: 'GitHub', value: '@wyx', href: '#', icon: 'github' },
    { label: '小红书', value: '2.3w 粉', href: '#', icon: 'book' },
    { label: '微信', value: 'wyx200265', href: '#', icon: 'chat' },
  ],
}

export const stats = [
  { value: 7, suffix: '款', label: '已上线 AI 产品', note: '全部为付费闭环' },
  { value: 16, suffix: '项', label: '竞赛获奖', note: '国赛 6 项' },
  { value: 23, suffix: 'k', label: '自媒体粉丝', note: 'AI 教程 / 开源' },
  { value: 12, suffix: '场', label: '黑客松现场', note: '2026 年 6 场决赛' },
]

export const skillGroups = [
  {
    key: 'rag',
    title: 'RAG 技术',
    color: 'lime',
    level: 92,
    summary: '文档切片、分块策略、Embedding 向量库、Top-K 召回重排，具备来源追溯与问题排查能力。',
    points: ['切片/分块策略', '双路召回 + RRF 融合', '来源追溯与引用', 'RAGAS 四维评测'],
  },
  {
    key: 'agent',
    title: 'Agent 开发',
    color: 'coral',
    level: 94,
    summary: 'Harness、Multi-Agent、RSI 自进化、MCP/Skills 模块化、Coze 智能体的完整实践。',
    points: ['ReAct / Tool Calling', '多智能体合议', 'Skills 模块化沉淀', '自进化回归闭环'],
  },
  {
    key: 'fullstack',
    title: '全栈开发',
    color: 'blue',
    level: 88,
    summary: 'Python、Java、Vue、uni-app，拥有 H5 / Android / Harmony / 小程序跨端落地经验。',
    points: ['React / Vue 双栈', 'Spring Cloud + Dubbo3', 'FastAPI / LangGraph', '多端适配'],
  },
  {
    key: 'eval',
    title: '评测迭代',
    color: 'grape',
    level: 86,
    summary: '构建业务量化指标与数据集，用 badcase、人工校验和埋点反馈驱动产品迭代。',
    points: ['指标体系设计', 'LLM-as-a-Judge', '人工校准集', 'A/B 盲测'],
  },
  {
    key: 'llm',
    title: '大模型原理',
    color: 'rose',
    level: 82,
    summary: 'LLM、Transformer、MoE、GRPO、VLM、LoRA 微调与多模态，理解幻觉与能力边界。',
    points: ['Transformer / MoE', 'LoRA 微调', 'VLM 多模态', '上下文窗口管理'],
  },
  {
    key: 'vibe',
    title: 'AI 编程',
    color: 'sky',
    level: 96,
    summary: '深度使用 Codex、WorkBuddy 等工具，快速部署 Demo 并上线，保持良好代码风格。',
    points: ['快速原型到上线', '7 款付费产品', '开源 20+ 项目', 'Debug 与重构'],
  },
]

export const education = [
  {
    school: '陕西科技大学',
    degree: '信息与通信工程 · 硕士',
    direction: '多模态 AI 方向',
    period: '2025.09 — 2028.07',
    badge: '在读',
    points: [
      '主修 Python、机器学习、深度学习、计算机视觉、自然语言处理、智能语音处理、大数据分析与挖掘、软件体系结构',
      '参与线下黑客松 10+ 次，WAIC 世界人工智能大会企业路演、NVIDIA 中国开发者黑客松决赛、Eazo 全球社区大使',
    ],
  },
  {
    school: '西安科技大学',
    degree: '通信工程 · 本科',
    direction: '国家特色专业',
    period: '2021.09 — 2025.07',
    badge: '综测 1/193',
    points: [
      '综测 1/193：国奖 9 项、省奖 15 项、校奖 27 项，软著及发明专利 2 项',
      '连续 4 次国家励志奖学金、校级一等奖学金、年度科技创新奖',
      '字节跳动工程训练营、腾讯未来产品及 AI 全栈训练营优秀学员，华为开发者高级认证、工信部计算机视觉架构中级认证',
    ],
  },
]

export const awards = [
  { name: '2026 上海星火计划 OPC 超级个体', rank: '国赛一等奖', year: '2026', type: '国赛' },
  { name: '2026 高校 AI 黑客松 · 西安交通大学站', rank: '第一名', year: '2026', type: '黑客松' },
  { name: '2026 长沙 CSDN Agent 创新大赛', rank: '决赛第二名', year: '2026', type: '国赛' },
  { name: '第十届高校计算机大赛 AIGC 创新', rank: '国赛二等奖', year: '2026', type: '国赛' },
  { name: '第九届「远见者」杯创新就业大赛', rank: '国赛二等奖', year: '2026', type: '国赛' },
  { name: '第十五届蓝桥杯 人工智能设计+', rank: '国赛二等奖', year: '2026', type: '国赛' },
  { name: '第十二届数字媒体科技创意竞赛', rank: '省赛一等奖', year: '2025', type: '省赛' },
  { name: '第八届传智杯 AI 大模型创新应用赛', rank: '一等奖', year: '2025', type: '省赛' },
  { name: '2026 环球杭州 AI 黑客松', rank: '第三名', year: '2026', type: '黑客松' },
  { name: '2026 北京跨年黑客松', rank: '最佳实践奖', year: '2026', type: '黑客松' },
  { name: '2026 直通乌镇 OPC 全球互联网', rank: '决赛入围', year: '2026', type: '决赛' },
  { name: '2026 字节 TRAE AI 创造力大赛', rank: 'Top300 入围 (1.3%)', year: '2026', type: '决赛' },
  { name: '2026 南京 Flux 阿里中心 AI 黑客松', rank: '决赛入围', year: '2026', type: '决赛' },
  { name: '2026 WAIC 世界人工智能大会', rank: '企业路演', year: '2026', type: '实践' },
  { name: '第七届全国高校计算机能力挑战赛', rank: 'Python 省二等奖', year: '2025', type: '省赛' },
  { name: '2026 腾讯 PCG 校园 AI 产品创意大赛', rank: '优秀作品', year: '2026', type: '决赛' },
]

export const research = [
  {
    title: '基于光流特征与多智能体知识增强的微表情识别方法研究',
    venue: 'CCF-A · ICCV 2027 在投',
    role: '学生一作',
    points: [
      '提出 KAMER 方案，在识别、可解释、应用三个层面实现微表情闭环',
      'UF1 = 90.25%、ACC = 89.45%，领先当前 SOTA 指标',
    ],
  },
  {
    title: '基于多模态 AI 的数字医生心理健康检测与疗愈软硬件平台',
    venue: '计算机专利、软著 2 项',
    role: '高校 AI 黑客松西安交大站第一名',
    points: [
      'B 端 + C 端多模态情绪评估（文本 / 语音 / 微表情），联动手环生理数据',
      '个性化疗愈、健康报告，实现高效率初筛并对接医生',
    ],
  },
  {
    title: '面向科研场景的 AI 大模型与智能体原理与实践指南',
    venue: '杭州初芯 OPC 嘉宾分享 · 7.9w 播放',
    role: '原创 AI 开源教程',
    points: ['3 个案例项目，覆盖大模型与 Agent 基础原理与应用', 'Vibe coding 教学、GPU 环境配置、从选题到投稿的提效教程'],
  },
]

export const hobbies = [
  { title: '逛菜市场', note: '找当季的菜', emoji: '🥬', color: 'lime', rotate: -3 },
  { title: '城市骑行', note: '西安 42km 环线', emoji: '🚲', color: 'sky', rotate: 2 },
  { title: '手冲咖啡', note: '浅烘 · V60', emoji: '☕', color: 'sand', rotate: -1 },
  { title: '拍延时', note: '大雁塔的黄昏', emoji: '📷', color: 'coral', rotate: 3 },
  { title: '胶片相机', note: 'Contax T2', emoji: '🎞️', color: 'rose', rotate: -2 },
  { title: '看论文', note: '每天早上 30 min', emoji: '📄', color: 'cream', rotate: 1 },
]
