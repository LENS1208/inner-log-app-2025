// src/lib/metrics.ts
import type { Trade } from "./types";

const isJpyCross = (pair: string) => /JPY$/i.test((pair || "").trim());

export function computeDurationMinutes(t: Trade): number | null {
  if (!t.openTime || !t.datetime) return null;
  const a = Date.parse(t.openTime.replace(/\./g, "-").replace(/\//g, "-"));
  const b = Date.parse(t.datetime.replace(/\./g, "-").replace(/\//g, "-"));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 60000));
}

export function computePipsFromPrices(t: Trade): number | null {
  if (t.pips || t.pips === 0) return t.pips; // 既に算出済みならそれを使う
  if (t.openPrice == null || t.closePrice == null) return null;
  const mult = isJpyCross(t.pair) ? 100 : 10000;
  const diff = t.side === "LONG" ? (t.closePrice - t.openPrice) : (t.openPrice - t.closePrice);
  return +(diff * mult).toFixed(1);
}

export function computeGrossNet(t: Trade): { gross: number; net: number; cost: number } {
  const commission = t.commission ?? 0;
  const swap = t.swap ?? 0;
  const gross = t.profitYen; // CSVの Profit を Gross とみなす前提（必要に応じて逆に）
  const net = Math.round(gross + swap - commission);
  const cost = Math.round(commission - swap); // 正の値ほどコスト
  return { gross, net, cost };
}

// Stop/Target がある場合の簡易RRR（Entry基準のピップ幅）
export function computeRRR(t: Trade): number | null {
  if (t.openPrice == null || t.stopPrice == null || t.targetPrice == null) return null;
  const mult = isJpyCross(t.pair) ? 100 : 10000;
  const riskPips = Math.abs((t.openPrice - t.stopPrice) * mult);
  const rewardPips = Math.abs((t.targetPrice - t.openPrice) * mult);
  if (!riskPips) return null;
  return +(rewardPips / riskPips).toFixed(2);
}
