#!/usr/bin/env python3
"""微表情数据集清洗骨架：光流特征提取 + 标注校验 + 批量重采样。

对应站内「资源中心 → 微表情数据清洗脚本」。这是一个可以直接改路径跑起来的**模板**：
真实数据（含被试知情同意）不放公开仓库，需要的话邮件索取 wyxcode@qq.com。

依赖：python 3.10 / opencv-python 4.9 / numpy 1.26 / pandas 2.2
用法：
    python micro-expression-clean.py --src ./raw --out ./clean --fps 25 --workers 4
    # 期望输出：clean/clips/*.mp4 + clean/labels.csv + clean/report.json
"""

from __future__ import annotations

import argparse
import json
from concurrent.futures import ProcessPoolExecutor
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2  # type: ignore
import numpy as np  # type: ignore
import pandas as pd  # type: ignore

# 常见动作单元（AU），真实标注请对齐 FACS 编码表。
VALID_AU = {"AU1", "AU2", "AU4", "AU6", "AU7", "AU9", "AU10", "AU12",
            "AU14", "AU15", "AU20", "AU23", "AU24", "AU25", "AU26", "AU28"}
MIN_ONSET_FRAMES = 2  # 少于 2 帧的起始-峰值段，光流基本采不到有效信息
MAX_GAP = 1000  # ms，相邻标注间隔超过它就认为漏标


@dataclass
class ClipResult:
    clip_id: str
    frames: int
    fps: float
    duration_ms: int
    au_count: int
    mag_mean: float
    issues: list[str]


def read_frames(path: Path) -> tuple[list[np.ndarray], float]:
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    gray = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        gray.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
    cap.release()
    return gray, fps


def optical_flow_magnitude(frames: list[np.ndarray]) -> np.ndarray:
    """逐帧 Farneback 光流，返回幅值序列（长度 = len(frames) - 1）。

    微表情看的是「局部肌肉位移」，所以幅值序列本身就是特征，
    平滑只做到能对齐 onset/apex/offset 三个关键点为止。
    """
    out = np.zeros(max(len(frames) - 1, 0), dtype=np.float32)
    for i in range(1, len(frames)):
        flow = cv2.calcOpticalFlowFarneback(
            frames[i - 1], frames[i], None, 0.5, 3, 15, 3, 5, 1.2, 0
        )
        out[i - 1] = float(np.mean(cv2.magnitude(flow[..., 0], flow[..., 1])))
    return out


def check_labels(clip_id: str, labels: pd.DataFrame, mag: np.ndarray, fps: float) -> list[str]:
    """标注校验：AU 合法性、区间顺序、时长下限、漏标空洞。"""
    issues: list[str] = []
    prev_end = -1
    for row in labels.itertuples():
        au = str(getattr(row, "au", ""))
        if au not in VALID_AU:
            issues.append(f"{clip_id}: 未知 AU {au}")
            continue
        onset = int(getattr(row, "onset"))
        apex = int(getattr(row, "apex"))
        offset = int(getattr(row, "offset"))
        if not (onset <= apex <= offset):
            issues.append(
                f"{clip_id}/{au}: onset({onset}) ≤ apex({apex}) ≤ offset({offset}) 不成立")
        if offset - onset < MIN_ONSET_FRAMES:
            issues.append(
                f"{clip_id}/{au}: 区间仅 {offset - onset} 帧，短于 {MIN_ONSET_FRAMES}")
        if onset * 1000 / fps - prev_end > MAX_GAP and prev_end >= 0:
            issues.append(
                f"{clip_id}/{au}: 与上一段空洞 {onset * 1000 / fps - prev_end:.0f}ms")
        prev_end = offset * 1000 / fps
    if mag.size and float(mag.max()) < 1e-3:
        issues.append(f"{clip_id}: 光流幅值接近 0，可能是纯色/黑帧")
    return issues


def resample(frames: list[np.ndarray], src_fps: float, dst_fps: float) -> list[np.ndarray]:
    """按目标帧率线性重采样（不做插值合成，只丢帧/重复帧，保持像素真实性）。"""
    if abs(src_fps - dst_fps) < 1e-6 or not frames:
        return frames
    ratio = dst_fps / src_fps
    idx = (np.arange(len(frames)) * ratio).astype(int)
    idx = np.clip(idx, 0, len(frames) - 1)
    return [frames[i] for i in idx]


def write_clip(path: Path, frames: list[np.ndarray], fps: float) -> None:
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    h, w = frames[0].shape[:2]
    writer = cv2.VideoWriter(str(path), fourcc, fps, (w, h), isColor=False)
    for f in frames:
        writer.write(f)
    writer.release()


def process_one(job: tuple[Path, Path, Path, float]) -> ClipResult:
    video, label_csv, out_dir, dst_fps = job
    clip_id = video.stem
    frames, src_fps = read_frames(video)
    issues: list[str] = []
    if len(frames) < 3:
        return ClipResult(clip_id, len(frames), src_fps, 0, 0, 0.0, [f"{clip_id}: 帧数不足"])

    labels = pd.read_csv(label_csv)
    mag = optical_flow_magnitude(frames)
    issues += check_labels(clip_id, labels, mag, src_fps)

    frames = resample(frames, src_fps, dst_fps)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_clip(out_dir / "clips" / f"{clip_id}.mp4", frames, dst_fps)
    labels.to_csv(out_dir / "labels.csv", mode="a",
                  header=not (out_dir / "labels.csv").exists(), index=False)

    return ClipResult(
        clip_id=clip_id,
        frames=len(frames),
        fps=dst_fps,
        duration_ms=int(len(frames) * 1000 / dst_fps),
        au_count=int(labels["au"].nunique()) if "au" in labels else 0,
        mag_mean=float(mag.mean()) if mag.size else 0.0,
        issues=issues,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True,
                    help="原始目录：clips/*.mp4 与 labels/*.csv 同名")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, default=25.0, help="统一目标帧率")
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    src, out = Path(args.src), Path(args.out)
    videos = sorted(src.glob("clips/*.mp4"))
    jobs = [
        (v, src / "labels" / f"{v.stem}.csv", out, args.fps)
        for v in videos
        if (src / "labels" / f"{v.stem}.csv").exists()
    ]
    missing = [v.stem for v in videos if not (
        src / "labels" / f"{v.stem}.csv").exists()]
    if missing:
        print(
            f"[warn] 没有标注文件被跳过：{missing[:5]}{' …' if len(missing) > 5 else ''}")

    results = []
    with ProcessPoolExecutor(max_workers=args.workers) as ex:
        for r in ex.map(process_one, jobs):
            results.append(r)

    report = {
        "total": len(results),
        "rejected": sum(1 for r in results if r.issues),
        "avg_frames": round(float(np.mean([r.frames for r in results] or [0])), 1),
        "issues": [i for r in results for i in r.issues][:200],
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.json").write_text(json.dumps(report,
                                                ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "records.jsonl").write_text(
        "\n".join(json.dumps(asdict(r), ensure_ascii=False) for r in results), encoding="utf-8"
    )
    print(
        f"[done] {report['total']} 段，{report['rejected']} 段有标注问题 → {out / 'report.json'}")


if __name__ == "__main__":
    main()
