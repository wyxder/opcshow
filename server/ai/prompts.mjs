/**
 * Prompt 版本化与组装（fx.md A-07）。
 *
 * 默认 prompt 存在 ai.json 的 prompts 表，字段与后台 AiConfigPage 同构：
 * { id, name, scene, version, body, active, updatedAt, history[] }
 * 服务端只返回版本号与正文，不回传任何密钥。
 */

export const GUARDRAILS =
  '回答必须基于站内已发布内容。没有证据时直接说「站内没有直接依据」，并引导用户去看对应文章。不要编造项目指标、获奖、个人信息或外部链接。'

export const DEFAULT_PROMPTS = [
  {
    id: 'p_chat',
    name: '站点 AI 助手 · 主提示词',
    scene: '全站对话',
    version: 3,
    active: true,
    body:
      '你是晓叶个人站的 AI 助手，只回答与站内内容相关的问题。\n' +
      '语气：直接、具体、不恭维；能给出文章小节就给出小节。\n' +
      '结构：先给结论，再给 1–3 条依据，最后给可点开的引用。',
    updatedAt: '2026-10-30T00:00:00.000Z',
    history: [],
  },
  {
    id: 'p_resume',
    name: '简历摘要生成',
    scene: '简历解析',
    version: 2,
    active: true,
    body: '根据结构化简历生成 120 字以内摘要，只保留量化指标，不添加任何原文没有的经历。',
    updatedAt: '2026-10-30T00:00:00.000Z',
    history: [],
  },
  {
    id: 'p_moderation',
    name: '留言审核分类',
    scene: '互动审核',
    version: 1,
    active: true,
    body: '判断留言属于：咨询 / 合作 / 闲聊 / 垃圾信息。只输出类别与置信度，不解释。',
    updatedAt: '2026-10-30T00:00:00.000Z',
    history: [],
  },
]

export function activePrompt(prompts, scene) {
  return prompts?.find((p) => p.scene === scene && p.active) ?? prompts?.[0] ?? DEFAULT_PROMPTS[0]
}

export const SITE_FACTS = [
  '站点：WYX.SPACE / 晓叶的个人作品站。',
  '作者：魏云潇（晓叶），陕西科技大学信息与通信工程硕士在读，求职方向 AI 全栈 / 智能体开发实习。',
  '核心经历：字节跳动电商 RAG 客服（Recall@5 0.72→0.93，人工接待 -45%）；Agent 与 RSI 评测中台（22 指标 + 42 用例）；跨境电商 AIGC 带货视频平台（收益 1.2w，星火 OPC 国赛一等奖）。',
  '联系方式：wyxcode@qq.com。',
  '站内有 6 篇结构化长文、7 个项目、简历与文件下载。',
]

export function buildMessages({ prompt, guardrails, context, hits, history, message }) {
  const contextLine = context
    ? `用户正在阅读：${context.articleTitle ?? ''}${context.sectionTitle ? ` · ${context.sectionTitle}` : ''}`
    : '用户当前不在文章页。'

  const evidence = hits?.length
    ? hits
        .map(
          (h, i) =>
            `[${i + 1}] 路径：${h.path}\n标题：${h.articleTitle} / ${h.sectionTitle} / ${h.subTitle}\n正文：${h.text.slice(0, 700)}`,
        )
        .join('\n\n')
    : '（本次没有检索到站内证据）'

  const system = [
    prompt.body,
    '',
    '【站点事实】',
    ...SITE_FACTS.map((s) => `· ${s}`),
    '',
    '【全局约束】',
    guardrails,
    '',
    '【阅读上下文】',
    contextLine,
    '',
    '【检索证据】',
    evidence,
    '',
    '输出要求：如果引用了证据，必须使用对应路径；没有证据时明确拒答。',
  ].join('\n')

  return [
    { role: 'system', content: system },
    ...(history ?? []).slice(-8).map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content).slice(0, 2000) })),
    { role: 'user', content: message },
  ]
}
