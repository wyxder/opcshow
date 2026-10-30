export type Block =
  | { t: 'p'; v: string }
  | { t: 'code'; lang: string; v: string }
  | { t: 'quote'; v: string }
  | { t: 'list'; items: string[] }
  | { t: 'note'; title: string; v: string }
  | { t: 'table'; head: string[]; rows: string[][] }

export type Sub = { id: string; title: string; blocks: Block[] }
export type Section = { id: string; title: string; lead?: string; subs: Sub[] }

export type Article = {
  id: string
  title: string
  subtitle: string
  category: string
  tags: string[]
  date: string
  readMin: number
  views: number
  accent: string
  abstract: string
  sections: Section[]
}

export const articleCategories = [
  { key: 'all', label: '全部', count: 6 },
  { key: 'RAG 工程化', label: 'RAG 工程化', count: 2 },
  { key: 'Agent 评测', label: 'Agent 评测', count: 2 },
  { key: '工程手记', label: '工程手记', count: 2 },
]

export const articles: Article[] = [
  {
    id: 'rag-engineering',
    title: 'RAG 工程化：从切片到溯源的 7 个决策',
    subtitle: '把 Demo 级检索做成能上生产的知识库，靠的从来不是换个更大的模型。',
    category: 'RAG 工程化',
    tags: ['RAG', '检索', '评测'],
    date: '2026-09-18',
    readMin: 12,
    views: 4210,
    accent: '#3C5BFF',
    abstract:
      '在字节的电商客服项目里，我把 Recall@5 从 0.72 推到 0.93。真正起作用的不是换模型，而是七个工程决策：切片粒度、元数据、双路召回、融合、重排、溯源与回归评测。',
    sections: [
      {
        id: 's1',
        title: '01 切片：先想清楚「一个可回答单元」',
        lead: '分块不是文本长度的数学题，而是业务语义题。',
        subs: [
          {
            id: 's1-1',
            title: '按文档结构切，而不是按字符数切',
            blocks: [
              {
                t: 'p',
                v: '最常见的失败是 512 token 固定窗口。它会把一张表格切成两半，把「3.2 退款条件」的标题和内容分到两个 chunk 里。检索时命中标题却没有正文，模型只能瞎编。',
              },
              {
                t: 'p',
                v: '我的做法是先用解析器恢复结构：标题层级、列表、表格、图片说明。然后以「最小完整语义单元」为切片边界——一个条款、一段问答、一张表。超长单元再按句号与列表项二次切。',
              },
              {
                t: 'code',
                lang: 'python',
                v: `def adaptive_chunk(node, limit=420):
    # 结构优先：标题 + 正文构成一个语义单元
    if node.is_heading_group and node.tokens <= limit:
        return [build_chunk(node, meta=node.path)]
    # 超长时按句子边界退让，保留父子引用
    pieces = split_by_sentence(node.text, limit)
    return [build_chunk(p, parent=node.id) for p in pieces]`,
              },
              {
                t: 'note',
                title: '经验值',
                v: '电商客服类文档 300–450 token 效果最好；法律/医疗条款可以更短，因为一条就是一个可回答单元。',
              },
            ],
          },
          {
            id: 's1-2',
            title: '元数据决定你能不能溯源',
            blocks: [
              {
                t: 'p',
                v: '每个 chunk 必须带：文档 ID、页码、标题路径、生效时间、业务域。少一个，你在做「来源追溯」时就得回头重跑全量入库。',
              },
              {
                t: 'list',
                items: [
                  'doc_id / chunk_id：用于前端高亮定位原文',
                  'page + bbox：PDF 直接跳到对应页',
                  'path：标题路径，让模型知道这段在讲什么层级的内容',
                  'effective_at：政策类文档必须带，否则新旧条款会互相污染',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 's2',
        title: '02 召回：双路 + 融合 + 重排',
        lead: '单一向量召回只解决「像」，解决不了「准」。',
        subs: [
          {
            id: 's2-1',
            title: 'BM25 与向量的分工',
            blocks: [
              {
                t: 'p',
                v: '向量擅长语义近似，BM25 擅长精确命中（订单号、政策编号、专有名词）。用户问「S6 系列退货政策」时，BM25 把精确词抓回来，向量补足「退货」与「七天无理由」的语义桥接。',
              },
              {
                t: 'code',
                lang: 'python',
                v: `dense = index.search(vec, k=40)      # 语义召回
sparse = bm25.search(query, k=40)    # 关键词召回
fused = rrf([dense, sparse], k=60)   # Reciprocal Rank Fusion
top = reranker.rerank(query, fused[:20])[:6]`,
              },
              { t: 'p', v: 'RRF 的价值在于不需要把两路分数归一化，只融合排名，稳定且几乎不用调参。k=60 是论文默认值，我在业务集上试过 30/60/100，差异在 0.01 以内。' },
            ],
          },
          {
            id: 's2-2',
            title: '重排是性价比最高的一步',
            blocks: [
              {
                t: 'p',
                v: '把 Top-20 交给 cross-encoder 重排到 Top-6，比换 Embedding 模型便宜得多，而且收益立刻体现在 Recall@5 和答案忠实度上。',
              },
              {
                t: 'table',
                head: ['策略', 'Recall@5', '首字延迟', '备注'],
                rows: [
                  ['纯向量 Top-5', '0.72', '320ms', '基线'],
                  ['双路 + RRF', '0.84', '390ms', '改动最小'],
                  ['双路 + RRF + 重排', '0.93', '640ms', '上线方案'],
                ],
              },
            ],
          },
        ],
      },
      {
        id: 's3',
        title: '03 溯源：让用户敢信',
        lead: '没有引用的 RAG，只是一个更会说谎的搜索框。',
        subs: [
          {
            id: 's3-1',
            title: '引用不是装饰，是契约',
            blocks: [
              { t: 'p', v: '回答的每一句关键结论都该绑定 chunk_id。前端把引用渲染成可点击的胶囊，点开定位原文并高亮。做不到这一点，客服场景就没法上线。' },
              { t: 'quote', v: '当模型知道「说出来就要拿出处」时，它的拒答率会上升，但用户信任度会翻倍。' },
            ],
          },
          {
            id: 's3-2',
            title: '评测集要跟着业务长',
            blocks: [
              { t: 'p', v: '8 类业务场景、200 条评测样本、30 条人工校准。每次改切片或模型都全量回归，指标不许降。' },
              {
                t: 'list',
                items: [
                  'Recall@5 / MRR：检索层',
                  'Faithfulness / Answer Relevancy：生成层',
                  '拒答正确率：该说不的时候说不',
                  '人工校准：Judge 打分的下限保护',
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'agent-eval',
    title: 'Agent 评测别玄学：22 个指标怎么选',
    subtitle: '从「感觉变好了」到「pass_rate 涨了 0.07」，中间隔着一整套指标体系。',
    category: 'Agent 评测',
    tags: ['评测', 'LLM-as-a-Judge', '指标体系'],
    date: '2026-09-02',
    readMin: 10,
    views: 3180,
    accent: '#7C5CFF',
    abstract:
      '在评测中台项目里我沉淀了 22 个内置指标。指标不在多，在于每个都能回答一个业务问题，并且稳定可复现。',
    sections: [
      {
        id: 'e1',
        title: '01 先分层，再选指标',
        subs: [
          {
            id: 'e1-1',
            title: '三层指标：检索 / 生成 / 行为',
            blocks: [
              { t: 'p', v: '检索层看有没有找对材料，生成层看有没有用对材料，行为层看工具调用与任务是否完成。三层混在一起，你就永远不知道问题出在哪。' },
              {
                t: 'table',
                head: ['层级', '代表指标', '是否确定性'],
                rows: [
                  ['检索', 'HitRate@K / MRR / Context Precision', '确定性'],
                  ['生成', 'Faithfulness / Relevancy / 术语一致性', 'Judge'],
                  ['行为', 'Task Completion / Tool Correctness', '确定性 + Judge'],
                ],
              },
            ],
          },
          {
            id: 'e1-2',
            title: '确定性指标优先',
            blocks: [
              { t: 'p', v: '能算出来的不要问模型。工具名对不对、参数结构对不对、JSON 能不能解析，这些用代码判定，零成本且不漂移。' },
              { t: 'code', lang: 'python', v: `def tool_correctness(call, expected):
    name_ok = call.name == expected.name
    args_ok = all(call.args.get(k) == v for k, v in expected.args.items())
    return 1.0 if name_ok and args_ok else 0.0` },
            ],
          },
        ],
      },
      {
        id: 'e2',
        title: '02 打分理由必须落库',
        subs: [
          {
            id: 'e2-1',
            title: '没有理由的分数无法复盘',
            blocks: [
              { t: 'p', v: '每条 Judge 评分都持久化 score 与 ≤800 字理由。出问题时你能看到模型为什么给 0.4，而不是重跑一次祈祷它变好。' },
              { t: 'note', title: '反模式', v: '只存平均分。平均分掩盖了长尾崩塌，而 Agent 的失败几乎总是长尾。' },
            ],
          },
          {
            id: 'e2-2',
            title: '人工校准是护栏',
            blocks: [{ t: 'p', v: '随机抽 30 条人工打分，与 Judge 的一致性低于阈值时，先修 prompt 或指标定义，不要相信批量结果。' }],
          },
        ],
      },
      {
        id: 'e3',
        title: '03 A/B 盲测补上「人类偏好」',
        subs: [
          {
            id: 'e3-1',
            title: '用哈希打乱左右',
            blocks: [
              { t: 'p', v: 'MD5(sample_id) 的奇偶决定 A/B 展示顺序，避免位置偏置。输出结构化对比与胜率，和自动指标互为证据。' },
              { t: 'code', lang: 'ts', v: `const flip = md5(String(row.id)).charCodeAt(0) % 2 === 0
const left = flip ? row.b : row.a
const right = flip ? row.a : row.b` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'harness',
    title: 'Harness：给 Agent 装上方向盘',
    subtitle: 'Agent 能力的天花板由模型决定，稳定性由 Harness 决定。',
    category: 'Agent 评测',
    tags: ['Harness', '工程', '可靠性'],
    date: '2026-08-21',
    readMin: 9,
    views: 2760,
    accent: '#FF5A2B',
    abstract:
      'Harness 不是框架，是约束。它负责把不确定的模型输出，变成可追踪、可回归、可回滚的工程行为。',
    sections: [
      {
        id: 'h1',
        title: '01 Harness 到底管什么',
        subs: [
          {
            id: 'h1-1',
            title: '四个抓手：上下文 / 工具 / 预算 / 验收',
            blocks: [
              { t: 'list', items: ['上下文：注入什么、裁剪什么、什么时候压缩', '工具：权限边界、参数校验、失败重试', '预算：token、步数、时长三重熔断', '验收：每次运行留痕，可回归'] },
              { t: 'p', v: '把这四件事写进代码而不是 prompt，Agent 才不会在长会话里「逐渐失控」。' },
            ],
          },
          {
            id: 'h1-2',
            title: '越权就返回 404',
            blocks: [
              { t: 'p', v: '工具层做租户隔离与资源鉴权，越权直接拒绝，而不是让模型「礼貌地」跳过。安全靠代码，不靠提示词。' },
              { t: 'code', lang: 'ts', v: `if (!ctx.ownedResources.has(resourceId)) {
  throw new NotFoundError() // 不暴露存在性
}` },
            ],
          },
        ],
      },
      {
        id: 'h2',
        title: '02 回归用例进 CI',
        subs: [
          {
            id: 'h2-1',
            title: '12 条用例，比 1000 条灵感有用',
            blocks: [
              { t: 'p', v: '挑最容易坏、影响最大的路径写成回归用例：越权、空知识库、工具超时、上下文超长、拒答诚实度。每次 PR 跑一遍，红了就修。' },
              { t: 'note', title: '门槛设多少', v: '关键路径 pass_rate 必须 100%，其他指标允许下降 0.02 以内。' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'rsi-loop',
    title: 'RSI 自进化：让评测反向修改系统',
    subtitle: '评测不只是打分，它可以是产品的第二套训练回路。',
    category: 'RAG 工程化',
    tags: ['RSI', '闭环', '可回滚'],
    date: '2026-08-08',
    readMin: 11,
    views: 1990,
    accent: '#C9F158',
    abstract:
      '把「失败归因 → 优化提案 → 影子回归 → 验收写回」做成流水线，指标才能自己往上走。前提是可审批、可回滚、可审计。',
    sections: [
      {
        id: 'r1',
        title: '01 四步闭环',
        subs: [
          {
            id: 'r1-1',
            title: '失败归因要机器可读',
            blocks: [
              { t: 'p', v: '把 badcase 归到具体维度：检索缺失、引用错误、工具参数错、拒答失败。归因维度固定，优化提案才能被自动化生成。' },
              { t: 'code', lang: 'json', v: `{
  "case_id": "eval_0341",
  "failure_class": "retrieval_miss",
  "evidence_ids": ["doc_88#p3"],
  "proposal": { "kind": "chunking", "from": 512, "to": 384 }
}` },
            ],
          },
          {
            id: 'r1-2',
            title: '影子回归与验收口径',
            blocks: [
              { t: 'p', v: '任何提案先在影子环境跑全量评测：目标指标增益 ≥ 0.03，受保护指标降幅 ≤ 0.02，否则自动拒绝。通过后写回并要求人工审批。' },
              { t: 'list', items: ['目标增益 ≥ 0.03', '受保护指标降幅 ≤ 0.02', '每次变更保留 diff 与评测快照', '一键回滚到上一个稳定版本'] },
            ],
          },
        ],
      },
      {
        id: 'r2',
        title: '02 别让系统自己放飞',
        subs: [
          {
            id: 'r2-1',
            title: '三层刹车',
            blocks: [
              { t: 'p', v: '白名单提案类型、收益门槛、人工审批。三层刹车缺一层，自进化就会变成自走炮。' },
              { t: 'quote', v: '自动化的边界，是你敢不敢让它半夜改生产。' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'vibe-coding',
    title: 'Vibe Coding 的正确姿势：AI 编程的边界感',
    subtitle: '写得快不等于写得对。和模型协作，最重要的是知道什么时候自己上手。',
    category: '工程手记',
    tags: ['AI 编程', '工作流', 'Codex'],
    date: '2026-07-19',
    readMin: 8,
    views: 5340,
    accent: '#BFD8FF',
    abstract:
      '上线过 7 款付费产品之后，我大概摸清了：哪些活交出去，哪些必须自己写。',
    sections: [
      {
        id: 'v1',
        title: '01 交给 AI 的三类活',
        subs: [
          {
            id: 'v1-1',
            title: '样板代码、迁移、测试',
            blocks: [
              { t: 'list', items: ['CRUD 与表单：模式固定，改起来快', '框架迁移与版本升级：机械但需要耐心', '测试用例与 mock 数据：覆盖比创意重要', '文案与多语言：接近零风险'] },
              { t: 'p', v: '这些工作的验收标准明确，错了立刻能看出来，是 AI 最舒服的区间。' },
            ],
          },
        ],
      },
      {
        id: 'v2',
        title: '02 必须自己写的三类活',
        subs: [
          {
            id: 'v2-1',
            title: '状态机、并发、计费',
            blocks: [
              { t: 'p', v: '涉及钱、涉及并发、涉及不可逆副作用的逻辑，我会自己写，然后让 AI 帮我找漏洞。顺序反了，宕机的时候你不知道该怪谁。' },
              { t: 'note', title: '我的检查清单', v: '幂等键、失败补偿、超时与重试上限、日志里能不能定位到那一次请求。' },
            ],
          },
          {
            id: 'v2-2',
            title: '给 AI 的上下文要像交接文档',
            blocks: [
              { t: 'code', lang: 'md', v: `## 目标
把支付回调的积分发放改成幂等
## 约束
- 不改表结构，复用 attempt_id
- 失败必须可补偿，写 workflow_log
## 验收
- 同一 attempt 重复回调只发一次积分
- 单测覆盖 3 种重复场景` },
              { t: 'p', v: '约束写清楚，返工就少一半。这也是 Harness 思路在人际协作上的投影。' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'multimodal-cost',
    title: '多模态应用的 3 个「看不见」的成本',
    subtitle: '图片、语音、视频接进来，账单和体验都会变。',
    category: '工程手记',
    tags: ['多模态', '成本', '架构'],
    date: '2026-06-30',
    readMin: 7,
    views: 1620,
    accent: '#FFB3C7',
    abstract:
      '做数字人导游和带货视频平台时踩过的坑：转码、轮询、失败重试，才是多模态真正的成本中心。',
    sections: [
      {
        id: 'm1',
        title: '01 异步任务的三个陷阱',
        subs: [
          {
            id: 'm1-1',
            title: '轮询要有退避，失败要有补偿',
            blocks: [
              { t: 'p', v: '视频生成动辄 30s 以上，前端轮询必须指数退避。后端要记录 attempt 与最后一次状态，用户刷新页面也能接着看。' },
              { t: 'list', items: ['统一任务模型：queued / running / succeeded / failed', '结果持久化到对象存储，别放内存', '失败可重试，重试要幂等', '前端订阅事件，而不是傻轮询'] },
            ],
          },
          {
            id: 'm1-2',
            title: '把模型差异关在网关里',
            blocks: [{ t: 'p', v: '不同厂商的字段、状态码、超时都不同。用一个内部标准接口把差异吃掉，上层只认一种协议，换模型才不痛。' }],
          },
        ],
      },
    ],
  },
]

export const articleById = (id?: string) => articles.find((a) => a.id === id)
