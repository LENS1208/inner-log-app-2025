import type { TradeRow, TradeMetrics, TPSLParams, Recommendation, DDBasic } from '../types/evaluation.types';

export function asFloat(val: any): number {
  if (typeof val === 'number') return val;
  const s = String(val || '').replace(/[^\d.-]/g, '');
  return parseFloat(s) || 0;
}

export function maxDrawdown(equity: number[]): number {
  let peak = -Infinity;
  let maxdd = 0;
  for (const v of equity) {
    peak = Math.max(peak, v);
    maxdd = Math.min(maxdd, v - peak);
  }
  return maxdd;
}

export function estimateRfromLosses(pnls: number[]): number {
  const losses = pnls
    .filter((x) => x < 0)
    .map((x) => Math.abs(x))
    .sort((a, b) => a - b);
  if (losses.length === 0) return 1;
  const mid = losses.length >> 1;
  return losses.length % 2
    ? losses[mid]
    : ((losses[mid - 1] || 0) + (losses[mid] || 0)) / 2 || 1;
}

function headerIndex(rows: TradeRow[]): Record<string, string> {
  if (!rows || rows.length === 0) return {};
  const first = rows[0];
  const cols: Record<string, string> = {};
  const keys = Object.keys(first);
  for (const k of keys) {
    const lower = k.toLowerCase();
    if (lower.includes('pnl') || lower.includes('profit')) cols.pnl = k;
    if (lower.includes('pip')) cols.pips = k;
    if (lower.includes('win') || lower.includes('result')) cols.win = k;
  }
  return cols;
}

export function computeMetrics(rows: TradeRow[]): TradeMetrics | null {
  if (!rows || rows.length === 0) return null;
  const cols = headerIndex(rows);
  let wins = 0;
  let pos = 0;
  let neg = 0;
  let pipsSum = 0;
  const eq: number[] = [];
  const pnls: number[] = [];
  const pipsArr: number[] = [];
  let cum = 0;

  for (const r of rows) {
    const pnl = asFloat(r[cols.pnl] ?? r.pnl ?? 0);
    const pips = cols.pips ? asFloat(r[cols.pips]) : r.pips ? asFloat(r.pips) : 0;
    const win = cols.win
      ? String(r[cols.win]).toLowerCase().startsWith('t') || asFloat(r[cols.win]) > 0
      : pnl > 0;

    if (win) wins++;
    if (pnl > 0) pos += pnl;
    else neg += pnl;
    pipsSum += pips;
    pnls.push(pnl);
    pipsArr.push(pips);
    cum += pnl;
    eq.push(cum);
  }

  const trades = rows.length;
  const winrate = trades ? wins / trades : 0;
  const pf = neg !== 0 ? pos / Math.abs(neg) : pos > 0 ? Infinity : 0;
  const maxdd = maxDrawdown(eq);

  return { trades, winrate, pf, pipsSum, equity: eq, pnls, pipsArr, maxdd };
}

export function recomputeFromPnls(pnls: number[], pips: number[]): TradeMetrics {
  let wins = 0;
  let pos = 0;
  let neg = 0;
  let pipsSum = 0;
  const eq: number[] = [];
  let cum = 0;

  for (let i = 0; i < pnls.length; i++) {
    const v = pnls[i];
    if (v > 0) wins++;
    if (v > 0) pos += v;
    else neg += v;
    pipsSum += pips[i] || 0;
    cum += v;
    eq.push(cum);
  }

  const trades = pnls.length;
  const winrate = trades ? wins / trades : 0;
  const pf = neg !== 0 ? pos / Math.abs(neg) : pos > 0 ? Infinity : 0;
  const maxdd = maxDrawdown(eq);

  return { trades, winrate, pf, pipsSum, equity: eq, maxdd, pnls, pipsArr: pips };
}

export function applyTPSL(
  pnls: number[],
  pipsArr: number[],
  params: TPSLParams
): { pnls: number[]; pips: number[] } {
  const R = estimateRfromLosses(pnls);
  const TP = params.ratio * R * (params.trailing ? 1.05 : 1.0);
  const SL = R * (params.be ? 0.95 : 1.0);
  const outPnls: number[] = [];
  const outPips: number[] = [];

  for (let i = 0; i < pnls.length; i++) {
    const p0 = pnls[i];
    const pip0 = pipsArr[i] || 0;
    let p = p0;
    if (p0 > 0) p = Math.min(p0, TP);
    else if (p0 < 0) p = Math.max(p0, -SL);
    if (params.be && Math.abs(p) < 0.1 * R) p = 0;
    outPnls.push(p);
    outPips.push(p0 !== 0 ? pip0 * (p / p0) : 0);
  }

  return { pnls: outPnls, pips: outPips };
}

export function recommendTPSL(
  baseMetrics: TradeMetrics,
  ddBasis: DDBasic,
  initCap: number
): Recommendation | null {
  const candidates = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
  let best: Recommendation | null = null;
  const baseWR = baseMetrics.winrate;

  for (const r of candidates) {
    const adj = applyTPSL(baseMetrics.pnls, baseMetrics.pipsArr, {
      ratio: r,
      trailing: true,
      be: false,
    });
    const m = recomputeFromPnls(adj.pnls, adj.pips);
    const ddPct =
      ddBasis === 'capital'
        ? (-Math.abs(m.maxdd) / initCap) * 100
        : (-Math.abs(m.maxdd) / estimateRfromLosses(adj.pnls)) * 100;
    const okDD = ddPct > -12;
    const okWR = m.winrate >= Math.max(0, baseWR - 0.03);
    if (okDD && okWR) {
      if (!best || m.pf > (best.pf || 0)) {
        best = { ratio: r, pf: m.pf, wr: m.winrate, dd: ddPct };
      }
    }
  }

  return best;
}

export function demoMetrics(): TradeMetrics {
  const N = 120;
  const pnls: number[] = [];
  const pipsArr: number[] = [];
  const eq: number[] = [];
  let cum = 0;

  for (let i = 0; i < N; i++) {
    const win = Math.random() < 0.55;
    const R = 800;
    const rr = 1.2 + Math.random() * 1.2;
    const v = win ? R * rr : -R;
    pnls.push(v);
    pipsArr.push(win ? rr * 10 : -10);
    cum += v;
    eq.push(cum);
  }

  const m = recomputeFromPnls(pnls, pipsArr);
  return { ...m, pnls, pipsArr };
}

export function calculateDDPercent(
  maxdd: number,
  ddBasis: DDBasic,
  initCap: number,
  pnls: number[]
): number {
  if (ddBasis === 'capital') {
    return (-Math.abs(maxdd) / initCap) * 100;
  }
  return (-Math.abs(maxdd) / estimateRfromLosses(pnls)) * 100;
}
