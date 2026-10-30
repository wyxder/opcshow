export type ToolboxItem = {
  id: string
  title: string
  desc: string
  tag: string
  link: string
  stars: number
  hot?: boolean
}

export type ToolboxGroup = {
  key: string
  title: string
  desc: string
  color: string
  items: ToolboxItem[]
}

export const toolboxGroups: ToolboxGroup[] = [
  {
    key: 'prompt',
    title: 'Prompt 仓库',
    desc: '反复用、改了十几次的提示词，直接抄。',
    color: 'rgb(var(--c-lime))',
    items: [
      { id: 'p1', title: 'RAG 引用约束 Prompt', desc: '强制每句结论绑定 chunk_id，不允许无源回答。', tag: 'RAG', link: '#', stars: 42, hot: true },
      { id: 'p2', title: 'Judge 评分模板 v3', desc: '带 rubric 与反例的 6 维评分，附 ±0.05 校准方法。', tag: '评测', link: '#', stars: 37 },
      { id: 'p3', title: 'Agent 交接文档生成器', desc: '把需求变成「目标/约束/验收」三段式。', tag: '协作', link: '#', stars: 28 },
      { id: 'p4', title: '多智能体主席合议 Prompt', desc: '5 类专家 + 主席汇总，输出可问责结论。', tag: 'Agent', link: '#', stars: 31 },
    ],
  },
  {
    key: 'code',
    title: '代码片段',
    desc: '复制就能跑的小组件，都是线上磨过的。',
    color: 'rgb(var(--c-sky))',
    items: [
      { id: 'c1', title: 'RRF 融合实现（Python）', desc: '双路召回排名融合，k 可配，30 行搞定。', tag: 'RAG', link: '#', stars: 56, hot: true },
      { id: 'c2', title: 'SSE 流式对话 Hook', desc: '断线重连、节流、卸载清理一次处理完。', tag: 'React', link: '#', stars: 48 },
      { id: 'c3', title: 'Zod 校验的 API Route', desc: 'Next.js 统一异常处理 + 类型守卫。', tag: 'Node', link: '#', stars: 26 },
      { id: 'c4', title: '无限画布视口变换', desc: '坐标转换 + 虚拟化，200 节点不掉帧。', tag: 'Canvas', link: '#', stars: 33 },
    ],
  },
  {
    key: 'design',
    title: '设计资产',
    desc: '配色、字体、组件规范，做作品集直接拿。',
    color: 'rgb(var(--c-rose))',
    items: [
      { id: 'd1', title: 'Paper Brutal 色板', desc: '米白纸感 + 墨黑硬边 + 酸性绿点缀。', tag: '配色', link: '#', stars: 64 },
      { id: 'd2', title: '卡片硬阴影规范', desc: '2/4/8px 三档硬阴影，hover 位移 3px。', tag: 'UI', link: '#', stars: 22 },
      { id: 'd3', title: '杂志式版式栅格', desc: '12 列非对称栅格，适合信息密度高的首页。', tag: '版式', link: '#', stars: 19 },
    ],
  },
  {
    key: 'reading',
    title: '在读 / 在听',
    desc: '最近喂养大脑的东西。',
    color: 'rgb(var(--c-grape))',
    items: [
      { id: 'r1', title: '《Building LLM Apps》', desc: '工程视角讲评测与可观测性，第三章反复读。', tag: '书', link: '#', stars: 15 },
      { id: 'r2', title: 'Anthropic: Building effective agents', desc: '少即是多，能不用框架就不用框架。', tag: '论文', link: '#', stars: 41 },
      { id: 'r3', title: 'Latent Space 播客', desc: '通勤路上听，采访比教程真实。', tag: '播客', link: '#', stars: 12 },
    ],
  },
]

export type ResourceFile = {
  id: string
  name: string
  ext: 'pdf' | 'md' | 'zip' | 'fig' | 'py' | 'pptx' | 'xlsx' | 'docx' | 'csv'
  size: string
  date: string
  category: '简历与作品集' | '课程与讲义' | '数据集' | '模板' | '源码'
  desc: string
  downloads: number
  starred?: boolean
  /**
   * 真实可下载地址（fx.md F2）。文件放在 public/files/ 下，配合 download 属性直接用。
   * 没填 url = 还没上传到对象存储，UI 如实标注「待上传」而不是假装有文件。
   */
  url?: string
  /** 未上线时的诚实原因，UI 直接展示 */
  pending?: string
}

export const resourceFiles: ResourceFile[] = [
  { id: 'f1', name: '魏云潇-AI全栈开发-简历', ext: 'docx', size: '199 KB', date: '2026.10.12', category: '简历与作品集', desc: '最新版简历原件（含 7 个项目与技术栈索引）。', downloads: 386, starred: true, url: '/files/wyx-resume-2026.docx' },
  { id: 'f2', name: '作品集 2026 · 项目长图', ext: 'pdf', size: '8.4 MB', date: '2026.10.08', category: '简历与作品集', desc: '7 个项目的设计稿与指标图汇编。', downloads: 214, starred: true, pending: '需要真实设计导出件 + 对象存储（B6），先留位' },
  { id: 'f3', name: 'Agent 评测中台 · 架构图', ext: 'fig', size: '24 MB', date: '2026.09.21', category: '模板', desc: '评测流水线与 RSI 四张数据表的完整 ER 图。', downloads: 132, pending: 'Figma 源文件无法静态托管，需 B6 签名下载' },
  { id: 'f4', name: 'RAG 工程化讲义（杭州 OPC）', ext: 'pptx', size: '18 MB', date: '2026.09.18', category: '课程与讲义', desc: '线下 80 人分享的原始课件。', downloads: 468, starred: true, pending: '课件原件待上传；文字版可先看资源中心的教程合集' },
  { id: 'f5', name: 'FDE 教程合集 · 结构与写作规范', ext: 'md', size: '2.9 KB', date: '2026.09.05', category: '课程与讲义', desc: '89 篇教程的分类体系与单篇写作模板（可直接拿去套）。', downloads: 921, url: '/files/fde-tutorials-structure.md' },
  { id: 'f6', name: '微表情数据清洗脚本模板', ext: 'py', size: '7.1 KB', date: '2026.08.30', category: '源码', desc: '光流特征提取 + 标注校验 + 批量重采样的可跑骨架。', downloads: 176, url: '/files/micro-expression-clean.py' },
  { id: 'f7', name: '电商客服评测集（脱敏样例 24 条）', ext: 'csv', size: '4.5 KB', date: '2026.08.12', category: '数据集', desc: '含 reference_context_ids，可直接跑 RAGAS。', downloads: 305, starred: true, url: '/files/ecommerce-eval-sample.csv' },
  { id: 'f8', name: 'Harness 回归用例模板', ext: 'zip', size: '12.2 KB', date: '2026.07.28', category: '模板', desc: '12 条 CI 回归用例与 mock 工具服务。', downloads: 198, url: '/files/harness-regression-template.zip' },
  { id: 'f9', name: '无限画布最小实现', ext: 'zip', size: '5.7 MB', date: '2026.06.02', category: '源码', desc: 'React + Zustand 的视口/框选/小地图 demo。', downloads: 264, pending: '完整仓库未发布，先看 GitHub 上的开源仓库' },
]

export const resumeSnapshot = {
  target: 'AI 全栈 / 智能体开发实习',
  availability: '6 个月以上 · 5 天/周 · 随时到岗',
  highlights: [
    '7 款 AI 付费产品上线，完整跑通订阅 + 积分 + 裂变付费闭环',
    '字节电商 RAG 客服：Recall@5 0.72 → 0.93，试点商家接待量下降 45%',
    'Agent 评测与 RSI 自进化中台：22 个指标、16 个接口、42 个用例',
    '2026 星火 OPC 国赛一等奖、西安交大黑客松第一名、CSDN 决赛第二名',
    '2.3w 粉 AI 内容创作者，开源 20+ 项目，原创教程累计浏览 15w+',
  ],
}
