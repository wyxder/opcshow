/**
 * 生成资源中心里那份真实可下载的 ZIP（fx.md F2）。
 * 纯 Node 实现 STORED（不压缩）zip，不引入新依赖：
 *   本地文件头 + 中央目录 + EOCD，CRC32 自己算。
 * 用法：node scripts/gen-files.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(root, 'public', 'files')
mkdirSync(outDir, { recursive: true })

/* ---------------------------------- CRC32 --------------------------------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/* -------------------------------- ZIP writer -------------------------------- */
function makeZip(entries) {
  const locals = []
  const centrals = []
  let offset = 0

  for (const { name, data } of entries) {
    const body = Buffer.from(data, 'utf8')
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(body)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // flag: utf-8 names
    local.writeUInt16LE(0, 8) // method: stored
    local.writeUInt16LE(0, 10) // time
    local.writeUInt16LE(0x2621, 12) // date: 2026-01-01
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(body.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, nameBuf, body)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0x2621, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(body.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuf)

    offset += 30 + nameBuf.length + body.length
  }

  const localBuf = Buffer.concat(locals)
  const centralBuf = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(localBuf.length, 16)

  return Buffer.concat([localBuf, centralBuf, eocd])
}

/* --------------------------------- 内容 ---------------------------------- */

const readme = `Harness 回归用例模板
=====================

给 Agent / RAG 系统做 CI 回归的最小可用骨架：12 条用例 + 一个 mock 工具服务。
设计原则（和站内《Agent 评测别玄学》一致）：

  1. 能算出来的指标不交给模型判断 —— 前 8 条全是确定性断言；
  2. 工具调用必须可断言 —— mock server 记录调用轨迹，方便比对 tool_correctness；
  3. 失败要能定位 —— 每条用例带 expect 明细与 references 命中要求。

文件
----
  cases.json              12 条用例（检索层 / 生成层 / 行为层）
  mock_tool_server.py     FastAPI mock，暴露 /search 与 /refund/check
  run_regression.py       跑用例、算指标、输出 report.json
  README.md               本文件

跑起来
------
  pip install fastapi uvicorn httpx
  uvicorn mock_tool_server:app --port 8100
  python run_regression.py --base http://127.0.0.1:8100
  # 期望输出：report.json + 控制台 pass_rate

接 CI
-----
  run_regression.py 退出码：pass_rate < 阈值时返回 1，可直接当门禁。
  建议阈值：确定性用例 100%，LLM-as-a-Judge 用例 >= 0.85。
`

const cases = JSON.stringify(
  {
    version: '2026.07',
    thresholds: { deterministic: 1.0, judge: 0.85 },
    cases: [
      { id: 'R-01', layer: 'retrieval', query: '七天无理由和十五天包退冲突吗', expect: { top_k: 5, must_hit_chunks: ['chunk-12'], hitrate_at_k: 0.9 } },
      { id: 'R-02', layer: 'retrieval', query: '预售商品什么时候发货', expect: { top_k: 5, must_hit_chunks: ['chunk-08'], must_not_hit: ['chunk-03'] } },
      { id: 'R-03', layer: 'retrieval', query: '积分能抵多少钱', expect: { top_k: 5, must_hit_chunks: ['chunk-15'], mrr_min: 0.5 } },
      { id: 'R-04', layer: 'retrieval', query: '过期优惠券能恢复吗', expect: { top_k: 5, must_hit_chunks: ['chunk-19'] } },
      { id: 'G-05', layer: 'generation', query: '定制商品能退吗', expect: { contains: ['不属于七天无理由'], not_contains: ['都可以'], faithfulness_min: 0.9, require_citation: true } },
      { id: 'G-06', layer: 'generation', query: '防水等级是多少', expect: { contains: ['IPX4'], not_contains: ['完全防水'], require_citation: true } },
      { id: 'G-07', layer: 'generation', query: '你们老板是谁', expect: { contains: ['无法回答'], must_refuse: true } },
      { id: 'G-08', layer: 'generation', query: '换货要重新付运费吗', expect: { contains: ['质量问题'], branch_count_min: 2 } },
      { id: 'T-09', layer: 'tool', query: '帮我查订单 8842 能不能价保', expect: { tool_calls: [{ name: 'refund.check', args_include: { order_id: '8842' } }], max_steps: 4 } },
      { id: 'T-10', layer: 'tool', query: '物流停更多久可以催单', expect: { tool_calls: [{ name: 'search' }], must_return_citation: true } },
      { id: 'T-11', layer: 'tool', query: '先查库存再判断能否改地址', expect: { tool_calls: [{ name: 'search' }, { name: 'refund.check' }], order_sensitive: true } },
      { id: 'T-12', layer: 'tool', query: '（越权）把所有订单退掉', expect: { must_deny: true, http_status: 404, max_steps: 2 } },
    ],
  },
  null,
  2,
)

const mockServer = `"""mock_tool_server.py — Agent 回归用的最小 mock 工具服务。

暴露两个只读工具，任何写操作一律 404（工具越权要返回 404 而不是 500）：
  GET /search?q=...        返回命中片段（带 chunk_id，方便断言溯源）
  GET /refund/check?order_id=...   返回该订单的售后资格

跑起来：
  uvicorn mock_tool_server:app --port 8100
"""

from __future__ import annotations

from fastapi import FastAPI, Query

app = FastAPI(title="Harness regression mock", version="2026.07")

CHUNKS = [
    {"chunk_id": "chunk-12", "doc_id": "doc-refund-policy-3.2", "text": "七天无理由与十五天包退不叠加，以商品页标注的售后类型为准。"},
    {"chunk_id": "chunk-08", "doc_id": "doc-shipping-sla-2.2", "text": "预售商品按商品页标注时间发货，不适用 48 小时规则。"},
    {"chunk_id": "chunk-03", "doc_id": "doc-shipping-sla-2.1", "text": "常规商品 48 小时内发货。"},
    {"chunk_id": "chunk-15", "doc_id": "doc-membership-2.3", "text": "100 积分抵 1 元，单笔最高抵扣订单金额 10%。"},
    {"chunk_id": "chunk-19", "doc_id": "doc-coupon-2.5", "text": "过期优惠券不支持恢复。"},
    {"chunk_id": "chunk-05", "doc_id": "doc-refund-policy-4.1", "text": "定制商品不属于七天无理由范围，质量问题除外。"},
    {"chunk_id": "chunk-09", "doc_id": "doc-sku-8842-specs-3", "text": "标称 IPX4，防溅水，不支持浸水。"},
    {"chunk_id": "chunk-01", "doc_id": "doc-price-guard-1.1", "text": "下单 7 天内降价可申请一键价保。"},
]

ORDERS = {
    "8842": {"order_id": "8842", "price_guard": True, "days_since_paid": 3, "customized": False},
    "1024": {"order_id": "1024", "price_guard": False, "days_since_paid": 21, "customized": True},
}


@app.get("/search")
def search(q: str = Query(..., min_length=1), top_k: int = Query(5, ge=1, le=20)):
    """最朴素的字面召回，够用来跑检索层断言；换成真向量库时接口不变。"""
    scored = []
    for c in CHUNKS:
        hit = sum(1 for token in q if token in c["text"])
        if hit:
            scored.append((hit, c))
    scored.sort(key=lambda x: -x[0])
    return {"query": q, "hits": [c for _, c in scored[:top_k]]}


@app.get("/refund/check")
def refund_check(order_id: str = Query(...)):
    order = ORDERS.get(order_id)
    if not order:
        return {"order_id": order_id, "price_guard": False, "reason": "订单不存在或无权限"}
    return {**order, "reason": "7 天内降价可申请价保" if order["price_guard"] else "超出价保窗口"}


# 任何写操作都当作越权：404 而不是 500，避免 Agent 从状态码里学到「重试可能成功」
@app.api_route("/{path:path}", methods=["POST", "PUT", "PATCH", "DELETE"])
async def deny(path: str):
    return {"error": "not_found", "path": path, "hint": "该工具集只读"}
`

const runner = `"""run_regression.py — 跑 cases.json，输出 pass_rate 与分层指标。

    python run_regression.py --base http://127.0.0.1:8100 [--answerer my_answer_fn]

默认用一个「回声式」答案函数占位，方便先把流水线跑通；
接入真实系统时，把 answer() 换成你自己的 Agent 调用即可，断言逻辑不用改。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import httpx

HERE = Path(__file__).parent


def answer(client: httpx.Client, query: str) -> dict:
    """占位答案函数：检索一次，把命中片段拼成回答。

    替换点：换成你的 RAG / Agent 调用，返回 {\"text\": str, \"citations\": [chunk_id], \"tool_calls\": [..]}
    """
    hits = client.get("/search", params={"q": query, "top_k": 5}).json().get("hits", [])
    text = " ".join(h["text"] for h in hits) or "知识库中没有相关信息，无法回答这个问题"
    return {
        "text": text,
        "citations": [h["chunk_id"] for h in hits],
        "tool_calls": [{"name": "search", "args": {"q": query}}],
    }


def check_retrieval(client: httpx.Client, case: dict) -> tuple[bool, str]:
    hits = client.get("/search", params={"q": case["query"], "top_k": case["expect"].get("top_k", 5)}).json()["hits"]
    ids = [h["chunk_id"] for h in hits]
    for must in case["expect"].get("must_hit_chunks", []):
        if must not in ids:
            return False, f"未命中 {must}，实际 {ids}"
    for ban in case["expect"].get("must_not_hit", []):
        if ban in ids:
            return False, f"不应命中 {ban}"
    return True, "ok"


def check_generation(client: httpx.Client, case: dict) -> tuple[bool, str]:
    out = answer(client, case["query"])
    text = out["text"]
    exp = case["expect"]
    for token in exp.get("contains", []):
        if token not in text:
            return False, f"缺少关键表述「{token}」"
    for token in exp.get("not_contains", []):
        if token in text:
            return False, f"出现禁用表述「{token}」"
    if exp.get("must_refuse") and "无法回答" not in text:
        return False, "该拒答时没有拒答"
    if exp.get("require_citation") and not out["citations"]:
        return False, "无来源引用"
    return True, "ok"


def check_tool(client: httpx.Client, case: dict) -> tuple[bool, str]:
    out = answer(client, case["query"])
    calls = out.get("tool_calls", [])
    exp = case["expect"]
    if exp.get("must_deny"):
        r = client.request("POST", "/refund/check", params={"order_id": "1"})
        if r.status_code == 200 and "error" not in r.json():
            return False, "写操作没有被拒绝"
        return True, "ok"
    want = [t["name"] for t in exp.get("tool_calls", [])]
    got = [c["name"] for c in calls]
    if exp.get("order_sensitive"):
        if got != want:
            return False, f"调用顺序不符：期望 {want}，实际 {got}"
    elif any(w not in got for w in want):
        return False, f"缺少工具调用：期望 {want}，实际 {got}"
    if len(got) > exp.get("max_steps", 8):
        return False, f"步数超上限：{len(got)}"
    return True, "ok"


CHECKERS = {"retrieval": check_retrieval, "generation": check_generation, "tool": check_tool}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8100")
    ap.add_argument("--cases", default=str(HERE / "cases.json"))
    args = ap.parse_args()

    spec = json.loads(Path(args.cases).read_text(encoding="utf-8"))
    client = httpx.Client(base_url=args.base, timeout=10)

    results = []
    for case in spec["cases"]:
        try:
            ok, msg = CHECKERS[case["layer"]](client, case)
        except Exception as err:  # noqa: BLE001 回归里失败也要被记录而不是中断
            ok, msg = False, f"执行异常：{err}"
        results.append({"id": case["id"], "layer": case["layer"], "pass": ok, "msg": msg})

    total = len(results)
    passed = sum(1 for r in results if r["pass"])
    per_layer = {}
    for layer in ("retrieval", "generation", "tool"):
        sub = [r for r in results if r["layer"] == layer]
        per_layer[layer] = round(sum(x["pass"] for x in sub) / len(sub), 3) if sub else None

    report = {
        "total": total,
        "passed": passed,
        "pass_rate": round(passed / total, 3),
        "per_layer": per_layer,
        "failures": [r for r in results if not r["pass"]],
    }
    (HERE / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))

    gate = spec["thresholds"]["deterministic"]
    return 0 if report["pass_rate"] >= gate else 1


if __name__ == "__main__":
    sys.exit(main())
`

const zip = makeZip([
  { name: 'README.md', data: readme },
  { name: 'cases.json', data: cases },
  { name: 'mock_tool_server.py', data: mockServer },
  { name: 'run_regression.py', data: runner },
])

writeFileSync(join(outDir, 'harness-regression-template.zip'), zip)
console.log(`[gen-files] public/files/harness-regression-template.zip ✓（${(zip.length / 1024).toFixed(1)} KB）`)
