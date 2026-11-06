export type Project = {
  id: string
  title: string
  en: string
  role: string
  period: string
  category: 'AI 全栈' | 'Agent 开发' | 'AI 后端' | 'AI 前端'
  award?: string
  stack: string[]
  summary: string
  bullets: { k: string; v: string }[]
  metrics: { label: string; value: string }[]
  tags: string[]
  accent: string
  motif: 'grid' | 'orbit' | 'wave' | 'bars' | 'stack' | 'rings'
  featured?: boolean
  /** 在线体验地址：有值时首页卡片显示「立即体验」按钮并跳转 */
  demo?: string
}

export const projects: Project[] = [
  {
    id: 'aigc-commerce',
    title: '跨境电商 AIGC 带货视频创作平台',
    en: 'COMMERCE STUDIO',
    role: 'AI 全栈开发',
    period: '2026.05 — 至今',
    category: 'AI 全栈',
    award: '上海星火 OPC 决赛第一名 · 最佳商业价值奖',
    stack: ['React', 'FastAPI', 'LangGraph', 'Java', 'Spring Boot', 'Redis', 'PostgreSQL', 'Supabase', 'RAG', 'Skills', 'Seedance 2.5'],
    summary:
      '一款跨境电商带货视频 AI 生成工具，跑通「商品 URL 卖点提取 → 数字人口播 → AI 带货视频生成 → 云端剪辑 → 多平台分发」的闭环。',
    bullets: [
      { k: '智能选品', v: '规划全球商品选品模块，接入三方数据引擎实时追踪，支持 URL 一键解析与 CSV 批量导入。' },
      { k: 'Agent 创作区', v: '开发 AIGC 带货视频工作台，支持分镜编辑与 7+ AI 场景工作箱，沉淀 Prompt 至知识库。' },
      { k: '多轨道剪辑台', v: 'React + Framer Motion 实现时间轴拖拽、对齐与参数调节，剪辑时长缩短 60%。' },
      { k: '带货 AI 主播', v: 'NLP 情感时间轴标注关联 StepAudio 2.5 语调参数与数字人表情姿态，拟真度提升 40%。' },
      { k: '数据运营后台', v: 'Workflow 日志详情与退款控制器，对接 Attempt 捕获逻辑，支持算力积分冲正退回。' },
      { k: '付费闭环', v: '会员订阅 + 积分加油包 + 邀请裂变三级模式，完成支付宝 AI 付接入，上线收益 1.2w。' },
    ],
    metrics: [
      { label: '制作周期', value: '2 天 → 3 分钟' },
      { label: '单条成本', value: '≈ 2 元' },
      { label: '上线收益', value: '1.2w' },
      { label: '决赛名次', value: '第一名' },
    ],
    tags: ['商业化落地', '视频生成', '订阅制'],
    accent: 'rgb(var(--c-coral))',
    motif: 'wave',
    featured: true,
    demo: 'https://commerce.wyx.space',
  },
  {
    id: 'douyin-rag',
    title: '抖音电商 RAG 企业客服与智慧运营系统',
    en: 'RAG SERVICE DESK',
    role: 'AI 应用开发',
    period: '2025.06 — 2025.09',
    category: 'Agent 开发',
    award: '字节跳动 AI 工程训练营 · 试点商家接待量下降 45%',
    stack: ['Python', 'CrewAI', 'RAG', 'Puppeteer', 'Embedding', 'RRF', 'SSE', 'RAGAS'],
    summary:
      '面向 B 端的生产级智能客服产品，集成多模态 AI、多智能体意图识别与 RAG 知识库问答，解决商家人工客服成本高、知识分散的痛点。',
    bullets: [
      { k: '爬虫入库', v: 'Puppeteer 抓取抖音电商中心 250+ 份 PDF，格式标准化后自动入库，整理效率提升约 60%。' },
      { k: 'RAG 知识库', v: '「切片-索引-匹配-溯源」工作流，双路召回 + RRF 融合（k=60），检索命中率提升至 92%。' },
      { k: 'Multi-Agent', v: 'CrewAI 实现「意图识别官 → 客服执行员」协同，按三类意图分发工具调用，降低异常中断。' },
      { k: '多模态输入', v: '图片/视频解析、语音 ASR 模块，支持多轮对话与上下文记忆，回答严格溯源原文档链接。' },
      { k: '数据大屏', v: 'InsightsSidebar 封装 Top10 高频问题柱状图与 30 天知识引用热力图，迭代效率提升 50%。' },
      { k: 'Harness 评测', v: '自研 4 维 RAGAS 脚本，8 类场景 200 条评测集 + LLM-as-Judge + 30 条人工校准，Recall@5 0.72 → 0.93。' },
    ],
    metrics: [
      { label: 'Recall@5', value: '0.93' },
      { label: '响应时间', value: '60s → 3s' },
      { label: '接待量', value: '↓ 45%' },
      { label: '文档入库', value: '250+' },
    ],
    tags: ['RAG', '多智能体', '生产级'],
    accent: 'rgb(var(--c-blue))',
    motif: 'orbit',
    featured: true,
    demo: 'https://ragdesk.wyx.space',
  },
  {
    id: 'eval-rsi',
    title: 'Agent 与 RSI 自进化评测中台',
    en: 'EVAL & RSI LAB',
    role: 'Agent 开发',
    period: '2026.08 — 至今',
    category: 'Agent 开发',
    award: '长沙 CSDN Agent 创新大赛决赛第二名',
    stack: ['FastAPI', 'Native Agent', 'LLM-as-a-Judge', 'React', 'TypeScript', 'SQLite', 'Pydantic', 'Asyncio', 'PyMuPDF'],
    summary:
      '面向 RAG、AI Agent、多轮对话的评测工作台，把「数据 → 场景指标 → Judge 模型 → 自动执行 → 人工复核 → 报告」串成一条流水线。',
    bullets: [
      { k: '指标体系', v: '预置 3 类场景模板，prompt_override 覆盖业务规则，按指标输出 mean / min / max / pass_rate / error。' },
      { k: 'RAG 评估', v: 'PDF 解析 + 结构化/长度双模式分块，携带 reference_context_ids 证据分片，支持 HitRate@K、MRR 等 8 个指标。' },
      { k: 'Agent 评估', v: '3 个 LLM 侧指标 + 5 个确定性指标（工具名与参数匹配），保证评测可复现。' },
      { k: '原生引擎', v: '自研 LLM-as-a-Judge 引擎沉淀 22 个内置指标，每条评分持久化理由（≤800 字），可解释可追溯。' },
      { k: 'A/B 盲测', v: 'MD5 哈希随机化展示顺序，支持 LLM vs Endpoint vs 自身三类对比，输出胜率统计。' },
      { k: 'RSI 自进化', v: '「失败归因 → 优化提案 → 影子回归 → 验收写回」闭环，4 张数据表、7 个组件、16 个接口、42 个用例。' },
    ],
    metrics: [
      { label: '内置指标', value: '22' },
      { label: 'REST 接口', value: '16' },
      { label: '用例覆盖', value: '42' },
      { label: '目标增益', value: '≥ 0.03' },
    ],
    tags: ['评测', 'RSI', '可审计'],
    accent: 'rgb(var(--c-grape))',
    motif: 'bars',
    featured: true,
    demo: 'https://eval-lab.wyx.space',
  },
  {
    id: 'harness-research',
    title: 'Harness 驱动的多智能体科研 AI 工作台',
    en: 'RESEARCH HARNESS',
    role: 'AI 全栈开发',
    period: '2026.06 — 至今',
    category: 'AI 全栈',
    award: '南京阿里中心 AI 黑客松决赛入围 · 西安黑客松 AI 软件赛道第二名',
    stack: ['React', 'TypeScript', 'Node.js', 'Express', 'FastAPI', 'DeepSeek', 'Multi-Agent', 'RAG', 'MCP Server'],
    summary:
      '一站式科研 AI 工作台，覆盖「选题 → 文献 → 复现 → 实验 → 分析 → 写作 → 投稿」全生命周期，让知识库数据可追溯、可沉淀。',
    bullets: [
      { k: '8 大对话模式', v: 'General / ReAct / CodeAct 等 8 类模式，各自独立推理链与输出形态，推理过程可见，越权返回 404。' },
      { k: '多 Agent 评审', v: '理论/方法/实验/写作/伦理 5 类专家团 + 主席合议，输出 6 维评分报告。' },
      { k: '文献研读', v: 'MCP Server 接入 arXiv / OpenAlex，三栏论文窗口与 3D 参考文献引用图谱。' },
      { k: 'Harness 评测', v: '术语一致性、拒答诚实度等指标接入 12 条 CI 回归用例；320 条标注集 Recall@5 0.71 → 0.92、MRR 0.66 → 0.85。' },
      { k: 'RAG 检索', v: '结构化评分检索 + Embedding 语义召回，reference 事件附带文档 ID、页码与原文片段，Top-3 命中率 76% → 93%。' },
      { k: '实验复现', v: '参数看板、消融矩阵、SOTA 对比，对接 CCF 期刊倒计时与 image2.5 学术图表生成。' },
    ],
    metrics: [
      { label: 'Recall@5', value: '0.92' },
      { label: 'MRR', value: '0.85' },
      { label: 'Top-3', value: '93%' },
      { label: 'CI 回归', value: '12 条' },
    ],
    tags: ['科研提效', 'MCP', '知识图谱'],
    accent: 'rgb(var(--c-amber))',
    motif: 'grid',
    demo: 'https://research-harness.wyx.space',
  },
  {
    id: 'coder-platform',
    title: 'Coder 企业零代码 AI 应用生成平台',
    en: 'CODER PLATFORM',
    role: 'AI 后端开发',
    period: '2024.05 — 2024.08',
    category: 'AI 后端',
    award: '西安粤嵌信息科技 · 独立部署上线',
    stack: ['Java', 'Spring Cloud Alibaba', 'Dubbo3', 'LangGraph4j', 'Redis', 'Caffeine', 'Vue'],
    summary:
      '一句话描述需求即可生成可运行 Web 页面，支持可视化编辑、智能路由生成、预览部署与域名分享的 AI 应用生成平台。',
    bullets: [
      { k: 'AI 代码生成', v: 'LangGraph4j 构建「提示词增强 → 智能路由 → 代码生成 → 质检」状态图，节点间传递工作流上下文。' },
      { k: 'Tool 调用', v: '文件读/写/改/删、目录读取、任务退出共 6 类 @Tool，@ToolMemoryId 按 appId 隔离多租户调用。' },
      { k: '可视化编辑', v: '首页、对话生成、应用管理、后台管理等 10+ 页面，元素选中可视化编辑，修改生效率 90%+。' },
      { k: '微服务架构', v: '拆分用户/应用/AI 生成等 4 个独立服务，Nacos 注册配置 + Dubbo3 RPC，可独立部署扩容。' },
      { k: '缓存优化', v: 'Caffeine 本地缓存使实例重建率降低 60%；Redis 缓存把响应从 200ms 压到 20ms 以内。' },
      { k: '一键部署', v: 'deployKey → 构建 → 产物复制 → URL 生成链路，一次性构建成功率提升至 95%+。' },
    ],
    metrics: [
      { label: '生效率', value: '90%+' },
      { label: '构建成功率', value: '95%+' },
      { label: '响应耗时', value: '200ms → 20ms' },
      { label: '微服务', value: '4 个' },
    ],
    tags: ['低代码', '微服务', '多租户'],
    accent: 'rgb(var(--c-lime))',
    motif: 'stack',
  },
  {
    id: 'canvas-director',
    title: '基于五模态的无限画布 AIGC 导演台',
    en: 'INFINITE CANVAS',
    role: 'AI 前端开发',
    period: '2026.03 — 2026.05',
    category: 'AI 前端',
    award: '腾讯 PCG 校园 AI 产品创意大赛',
    stack: ['React 19', 'Next.js 16', 'TypeScript', 'Three.js', 'Zustand', 'Go', 'MySQL', 'MCP Server'],
    summary:
      '一站式 5 模态 AI 视觉创作：无限画布、图片/音频/视频生成、3D 导演台、720 全景与素材沉淀的完整 Agent 创作链路。',
    bullets: [
      { k: '无限画布', v: '坐标变换实现视口虚拟化 + Zustand 细粒度订阅，小地图、框选、复制粘贴，200+ 节点保持 60fps。' },
      { k: '多模态 AI', v: 'Go 后端统一 3 类模态任务模型、全局轮询与结果持久化，任务中断率降低约 30%。' },
      { k: '3D 导演台', v: 'Three.js 场景树管理角色/群演/机位，30fps 关键帧时间轴与画面截图复用。' },
      { k: '多协议网关', v: '统一 OpenAI 兼容 Chat/Images/Videos 为内部标准接口，全量落日志，支持 10+ 模型、5 类媒体能力。' },
      { k: 'Skills 体系', v: '沉淀视频创作、3D 动画、品牌广告等内置 Skills，用户可复用导入，输出格式统一。' },
      { k: 'AI 评测', v: 'Langfuse 全链路 Trace + DeepEval 12 条学术质量用例，接入 Harness 回归与 CI 门禁。' },
    ],
    metrics: [
      { label: '画布节点', value: '200+' },
      { label: '帧率', value: '60fps' },
      { label: '接入模型', value: '10+' },
      { label: '中断率', value: '↓ 30%' },
    ],
    tags: ['Three.js', '无限画布', 'Skills'],
    accent: 'rgb(var(--c-sky))',
    motif: 'rings',
  },
  {
    id: 'digital-tour-guide',
    title: '多模态 AI 数字人导游与智慧运营 Agent',
    en: 'DIGITAL GUIDE',
    role: 'Agent 开发',
    period: '2026.05 — 2026.07',
    category: 'Agent 开发',
    award: '字节 TRAE AI 创造力大赛 Top300 入围（1.3%）',
    stack: ['React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'ASR/TTS', 'Live2D', 'DeepSeek', 'RAG'],
    summary:
      '面向 C 端游客与 B 端运营后台的 AI 数字人导游，集成高德 IP 服务、RAG 与 VR3D 识景，提供热门景点攻略与行程规划。',
    bullets: [
      { k: '架构设计', v: 'Next.js 14 + TypeScript 严密类型定义，模块化 API Route，统一异常处理与 Zod 校验。' },
      { k: '景点内容', v: '梳理 14 大核心城市，完成 70+ 精选景点高清图核查、简介编辑、标签分类与坐标归档。' },
      { k: 'RAG 知识库', v: '「角色设定 + 文化背景」Prompt 模板，280 条人工标注集上 Top-3 命中率 71% → 92%。' },
      { k: '数字人导游', v: 'Live2D IP 形象 + 实时语音对谈与微表情触发，使用率提升 62%，陪伴时长增加 3.5 分钟。' },
      { k: '运营后台', v: '游客情感指数、热搜词云、客流量图表，知识库分级上传与数字人音色配置中心。' },
    ],
    metrics: [
      { label: 'Top-3 命中', value: '92%' },
      { label: '使用率', value: '↑ 62%' },
      { label: '满意度', value: '96.5%' },
      { label: '入围率', value: '1.3%' },
    ],
    tags: ['数字人', 'Live2D', 'C/B 双端'],
    accent: 'rgb(var(--c-rose))',
    motif: 'orbit',
  },
]

export const featuredProjects = projects.filter((p) => p.featured)
