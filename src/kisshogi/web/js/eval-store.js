// Evaluation values for the current game, normalized to Black's viewpoint.

import { Color } from "./shogi.js";

export const MATE_VALUE = 15;

export function normalizeScore(score, turn) {
  if (!score) return null;
  let value;
  if (score.type === "cp") value = score.value / 100;
  else if (score.type === "mate") {
    const magnitude = MATE_VALUE;
    value = score.value > 0 ? magnitude : -magnitude;
  } else return null;
  if (turn === Color.WHITE) value = -value;
  return Math.max(-MATE_VALUE, Math.min(MATE_VALUE, value));
}

export class EvalStore {
  constructor() {
    this.entries = new Map();
  }

  clear() { this.entries.clear(); }

  clearFrom(ply) {
    for (const key of [...this.entries.keys()]) {
      if (key >= ply) this.entries.delete(key);
    }
  }

  record(ply, score, sfen, source, depth = null) {
    const turn = sfen?.split(" ")[1] === "w" ? Color.WHITE : Color.BLACK;
    const value = normalizeScore(score, turn);
    if (value === null) return;
    this.entries.set(ply, {
      ply,
      sfen,
      score,
      value,
      source,
      depth,
      mate: score.type === "mate" ? score.value : null,
    });
  }

  get(ply) { return this.entries.get(ply) || null; }

  series(length) {
    const out = [];
    for (let ply = 0; ply <= length; ply += 1) {
      const entry = this.entries.get(ply);
      if (entry) out.push(entry);
    }
    return out;
  }

  has(ply) { return this.entries.has(ply); }
}

export function graphGeometry(series, length, width = 360, height = 150) {
  const padX = 8;
  const padY = 12;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = Math.max(1, height - padY * 2);
  const x = (ply) => padX + (length > 0 ? (ply / length) * innerW : 0);
  const y = (value) => padY + ((MATE_VALUE - value) / (MATE_VALUE * 2)) * innerH;
  const points = series.map((entry) => ({ ...entry, x: x(entry.ply), y: y(entry.value) }));
  const path = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")
    : "";
  return { points, path, zeroY: y(0), padX, padY, innerW, innerH, x, y };
}
