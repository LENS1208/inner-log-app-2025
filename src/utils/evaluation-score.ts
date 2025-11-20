import type { TradeMetrics, OverallScore, ScoreParts, DDBasic } from '../types/evaluation.types';
import { estimateRfromLosses, calculateDDPercent } from './evaluation-metrics';

function clamp(v: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, v));
}

export function scoreFromMetrics(
  m: TradeMetrics,
  ddBasis: DDBasic,
  initCap: number
): OverallScore {
  const sEntry = clamp(((m.winrate - 0.35) / (0.8 - 0.35)) * 10);

  const ddPct = calculateDDPercent(m.maxdd, ddBasis, initCap, m.pnls);
  const sDD = clamp(((20 + ddPct) / 20) * 10);

  const pfFinite = m.pf === Infinity ? 3 : m.pf;
  const sRR = clamp(((pfFinite - 0.8) / (2.0 - 0.8)) * 10);

  const sRisk = clamp(sDD * 0.7 + sRR * 0.3);
  const sStab = clamp(m.winrate * 10 * 0.6 + sRR * 0.4);

  const parts: ScoreParts = {
    entry: sEntry,
    dd: sDD,
    rr: sRR,
    risk: sRisk,
    stability: sStab,
  };

  const overall = clamp(
    (parts.entry + parts.dd + parts.rr + parts.risk + parts.stability) / 5
  );

  const rank =
    overall >= 9
      ? 'S級トレーダー（卓越）'
      : overall >= 8
      ? 'A級トレーダー（優秀）'
      : overall >= 7
      ? 'B級トレーダー（良好）'
      : 'C級（改善中）';

  return { overall, parts, rank };
}
