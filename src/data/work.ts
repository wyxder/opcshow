export type ToolboxItem = {
  id: string
  title: string
  desc: string
  tag: string
  /** 完整可复制内容（Prompt 正文 / 代码 / 规范）；详情弹窗与「取用」复制的都是它 */
  body: string
  /** 外部真实链接；没有就留空，绝不写 '#' 这种假链接 */
  link?: string
  license: string
  updated: string
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
      {
        id: 'p1',
        title: 'RAG 引用约束 Prompt',
        desc: '强制每句结论绑定 chunk_id，不允许无源回答。',
        tag: 'RAG',
        stars: 42,
        hot: true,
        updated: '2026.09.20',
        license: 'CC BY 4.0',
        body: `你是站内知识库助手，只依据【检索片段】回答。
规则：
1. 不得引入检索片段之外的知识，也不得凭印象补全；
2. 每个结论后用 [chunk_id] 标注来源，多个来源写成 [c1][c3]；
3. 片段不足以回答时，直接说「站内没有足够依据」，并推荐最接近的一篇文章；
4. 不猜测、不补全、不编造链接；不确定的地方明确说「不确定」。

用户问题：{{question}}
检索片段：{{chunks}}`,
      },
      {
        id: 'p2',
        title: 'Judge 评分模板 v3',
        desc: '带 rubric 与反例的 6 维评分，附 ±0.05 校准方法。',
        tag: '评测',
        stars: 37,
        updated: '2026.09.12',
        license: 'MIT',
        body: `你是严格但可解释的评审。按 6 个维度打 1-5 分，每条扣分都要给出原文证据：
相关性 / 完整性 / 事实准确 / 引用可溯源 / 表达清晰 / 安全性。

只输出 JSON：
{"scores":{"relevance":4,"completeness":3,"factuality":5,"traceability":4,"clarity":4,"safety":5},
 "total":25,
 "deduct":[{"dim":"completeness","reason":"缺少边界条件","quote":"原文第 2 段"}],
 "verdict":"pass"}

校准方法：同一输入 temperature=0 连跑 3 次取中位数；任意两维差值 > 0.05 判定不稳定，需重写 rubric 而不是调阈值。`,
      },
      {
        id: 'p3',
        title: 'Agent 交接文档生成器',
        desc: '把需求变成「目标/约束/验收」三段式。',
        tag: '协作',
        stars: 28,
        updated: '2026.08.30',
        license: 'CC BY 4.0',
        body: `把下面的需求整理成可执行的交接文档，必须包含三段：
【目标】一句话说明要达成的结果与衡量方式；
【约束】技术栈 / 时间 / 不可改动范围 / 依赖方；
【验收】3-5 条可观测的完成标准，每条都能被脚本或人眼验证。

信息不足时列在「待确认」里，不要替需求方做决定。

原始需求：{{requirement}}`,
      },
      {
        id: 'p4',
        title: '多智能体主席合议 Prompt',
        desc: '5 类专家 + 主席汇总，输出可问责结论。',
        tag: 'Agent',
        stars: 31,
        updated: '2026.08.18',
        license: 'CC BY 4.0',
        body: `角色：产品 / 工程 / 数据 / 安全 / 用户代表，各自独立给出结论与风险。
流程：
① 各角色独立作答，不得互看对方结论；
② 主席汇总分歧点；
③ 主席给出最终结论，并标注采纳了谁、否决了谁、为什么。

输出格式：
共识：……
分歧：……（每条附两方理由）
结论：……（可执行、可问责，写明谁在什么时候做什么）`,
      },
    ],
  },
  {
    key: 'code',
    title: '代码片段',
    desc: '复制就能跑的小组件，都是线上磨过的。',
    color: 'rgb(var(--c-sky))',
    items: [
      {
        id: 'c1',
        title: 'RRF 融合实现（Python）',
        desc: '双路召回排名融合，k 可配，30 行搞定。',
        tag: 'RAG',
        stars: 56,
        hot: true,
        updated: '2026.09.15',
        license: 'MIT',
        body: `def rrf(rankings, k=60, top_n=5):
    """rankings: 多路召回结果，每路是按相关性排序的 id 列表"""
    score = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            score[doc_id] = score.get(doc_id, 0.0) + 1.0 / (k + rank)
    return sorted(score.items(), key=lambda kv: kv[1], reverse=True)[:top_n]


# 用法
bm25_ids = ["rag-01", "eval-02", "agent-03"]
vector_ids = ["eval-02", "rag-01", "chunk-04"]
print(rrf([bm25_ids, vector_ids]))  # [('eval-02', ...), ('rag-01', ...), ...]`,
      },
      {
        id: 'c2',
        title: 'SSE 流式对话 Hook',
        desc: '断线重连、节流、卸载清理一次处理完。',
        tag: 'React',
        stars: 48,
        updated: '2026.09.08',
        license: 'MIT',
        body: `export function streamChat(url: string, body: unknown, onDelta: (s: string) => void) {
  const ctrl = new AbortController()
  const run = async () => {
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(body), signal: ctrl.signal })
    if (!res.body) throw new Error('stream not supported')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\\n\\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        const data = frame.replace(/^data:\\s*/, '')
        if (!data || data === '[DONE]') continue
        onDelta(JSON.parse(data).delta ?? '')
      }
    }
  }
  // 组件卸载 / 用户点「停止」时调用
  return { run, cancel: () => ctrl.abort() }
}`,
      },
      {
        id: 'c3',
        title: 'Zod 校验的 API Route',
        desc: 'Next.js 统一异常处理 + 类型守卫。',
        tag: 'Node',
        stars: 26,
        updated: '2026.08.26',
        license: 'MIT',
        body: `import { z } from 'zod'

const Body = z.object({
  name: z.string().trim().min(1).max(12),
  text: z.string().trim().min(1).max(60),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json(
      { code: 'INVALID_BODY', message: parsed.error.issues[0].message },
      { status: 422 },
    )
  }
  try {
    const created = await repo.create(parsed.data)
    return Response.json(created, { status: 201 })
  } catch {
    return Response.json({ code: 'INTERNAL', message: '服务暂时不可用' }, { status: 500 })
  }
}`,
      },
      {
        id: 'c4',
        title: '无限画布视口变换',
        desc: '坐标转换 + 虚拟化，200 节点不掉帧。',
        tag: 'Canvas',
        stars: 33,
        updated: '2026.07.30',
        license: 'MIT',
        body: `type Point = { x: number; y: number }
type Viewport = { x: number; y: number; scale: number }

export const toWorld = (p: Point, v: Viewport): Point => ({
  x: (p.x - v.x) / v.scale,
  y: (p.y - v.y) / v.scale,
})

export const toScreen = (p: Point, v: Viewport): Point => ({
  x: p.x * v.scale + v.x,
  y: p.y * v.scale + v.y,
})

// 以鼠标位置为中心缩放：先求世界坐标，改 scale，再把该点拉回原位
export function zoomAt(v: Viewport, pointer: Point, nextScale: number): Viewport {
  const world = toWorld(pointer, v)
  return {
    scale: nextScale,
    x: pointer.x - world.x * nextScale,
    y: pointer.y - world.y * nextScale,
  }
}`,
      },
    ],
  },
  {
    key: 'design',
    title: '设计资产',
    desc: '配色、字体、组件规范，做作品集直接拿。',
    color: 'rgb(var(--c-rose))',
    items: [
      {
        id: 'd1',
        title: 'Paper Brutal 色板',
        desc: '米白纸感 + 墨黑硬边 + 酸性绿点缀。',
        tag: '配色',
        stars: 64,
        updated: '2026.10.02',
        license: 'CC BY 4.0',
        body: `:root {
  --paper: 250 247 240;  /* 米白纸 */
  --ink: 22 22 24;       /* 墨黑硬边 */
  --lime: 200 240 96;    /* 酸性绿点缀 */
  --coral: 240 112 96;   /* 珊瑚红 */
  --sky: 96 152 240;
  --grape: 142 112 220;
}

/* 硬边卡片：1.5px 边框 + 无模糊阴影，靠位移造"纸片"感 */
.card {
  border: 1.5px solid rgb(var(--ink));
  box-shadow: 4px 4px 0 rgb(var(--ink));
  background: rgb(var(--paper));
}`,
      },
      {
        id: 'd2',
        title: '卡片硬阴影规范',
        desc: '2/4/8px 三档硬阴影，hover 位移 3px。',
        tag: 'UI',
        stars: 22,
        updated: '2026.09.24',
        license: 'CC BY 4.0',
        body: `--shadow-1: 2px 2px 0 rgb(var(--ink));
--shadow-2: 4px 4px 0 rgb(var(--ink));
--shadow-3: 8px 8px 0 rgb(var(--ink));

/* 交互规则 */
静息       → shadow-1
hover      → translate(-3px,-3px) + shadow-2
active     → translate(0,0) + shadow-1（按下有回弹感）
浮层/弹窗   → shadow-3

注意：硬阴影必须是不透明纯色；带 alpha 的阴影会看起来像脏污，而不是"纸片"。`,
      },
      {
        id: 'd3',
        title: '杂志式版式栅格',
        desc: '12 列非对称栅格，适合信息密度高的首页。',
        tag: '版式',
        stars: 19,
        updated: '2026.09.10',
        license: 'CC BY 4.0',
        body: `桌面三栏：236px（目录）/ 1fr（正文）/ 200px（侧栏）；
正文最大行宽 68ch，超过就分栏，不要靠加大字号撑满；
标题跨 8 列、正文跨 7 列，留白列专门放批注与图注；
断点：lg 1024px 以下折成单列，间距统一 16px，不做横向滚动。`,
      },
    ],
  },
  {
    key: 'reading',
    title: '在读 / 在听',
    desc: '最近喂养大脑的东西。',
    color: 'rgb(var(--c-grape))',
    items: [
      {
        id: 'r1',
        title: '《Building LLM Apps》',
        desc: '工程视角讲评测与可观测性，第三章反复读。',
        tag: '书',
        stars: 15,
        updated: '2026.09.06',
        license: '读书笔记',
        body: `第 3 章 · 可观测性 读书笔记
· 评测不是打分，是回归：每次改 Prompt 都要能回答「哪一条变差了」。
· 日志四件套：request_id / model / latency / token_count，缺一条就无法定位。
· 线上失败样本要能一键回流到评测集，否则永远在重复踩同一个坑。
· 灰度不是可选项：先 5% 流量对比，再放量。`,
      },
      {
        id: 'r2',
        title: 'Anthropic: Building effective agents',
        desc: '少即是多，能不用框架就不用框架。',
        tag: '论文',
        stars: 41,
        updated: '2026.08.20',
        license: '原文链接',
        link: 'https://www.anthropic.com/research/building-effective-agents',
        body: `原文：https://www.anthropic.com/research/building-effective-agents

核心观点：
· 先用最简单的工作流；只有「步骤无法预先确定」时才上智能体。
· 工具描述要写得像给新人看的文档，模型才知道什么时候该调用。
· 能用一个循环解决的问题，不要拆成五个角色互相传话。`,
      },
      {
        id: 'r3',
        title: 'Latent Space 播客',
        desc: '通勤路上听，采访比教程真实。',
        tag: '播客',
        stars: 12,
        updated: '2026.08.02',
        license: '原文链接',
        link: 'https://www.latent.space',
        body: `https://www.latent.space

为什么听：嘉宾都是把系统真正跑上线的人，踩坑细节比教程真实。
最近反复听的两期：RAG in production、Evals for agents（都讲了失败案例，比成功案例有用）。`,
      },
    ],
  },
]

export type ResourceFile = {
  id: string
  name: string
  /** 统一小写、不带点；图标与配色由 FileIcon 按扩展名自动映射，未知类型回退通用样式 */
  ext: string
  size: string
  date: string
  /** 已知分类见资源中心筛选栏；服务端可能返回其它分类，类型保持放宽 */
  category: string
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
  { id: 'f1', name: '晓叶-AI全栈开发-简历', ext: 'docx', size: '199 KB', date: '2026.10.12', category: '简历与作品集', desc: '最新版简历原件（含 7 个项目与技术栈索引）。', downloads: 386, starred: true, url: '/files/wyx-resume-2026.docx' },
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
