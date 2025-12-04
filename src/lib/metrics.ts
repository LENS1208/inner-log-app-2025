// src/lib/metrics.ts
import type { Trade, TradeKpi } from "./types";

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

/**
 * 将来的に MAE/MFE や TP 情報をここに渡す想定。
 * v0 ではすべて optional にしておき、渡されなければ「データ不足」扱いにする。
 */
export type TradeMetricsExtra = {
  maxFavorablePips?: number | null;      // MFE
  maxAdversePips?: number | null;        // MAE
  maxPossibleGainPips?: number | null;   // 決済後も含めた理論最大利益
  plannedTpPips?: number | null;         // 計画TPまでの距離
};

/**
 * 7つの評価指標の数値そのもの。
 * null の場合は「対象外」または「データ不足」としてUI側で表示する。
 */
export type TradeEfficiencyMetrics = {
  entryEfficiency: number | null;        // %
  exitEfficiency: number | null;         // %
  missedPotential: number | null;        // %
  stopEfficiency: number | null;         // %
  timeEfficiency: number | null;         // pips/時間
  opportunityGainRate: number | null;    // %
  rMultiple: number | null;              // R値
};

/**
 * 7つの指標をまとめて計算する関数。
 * v0 では、時間効率 & R値だけを確実に計算し、
 * MAE/MFEが必要なものは extra が無ければ null を返す。
 */
export function computeTradeEfficiencyMetrics(
  trade: Trade,
  kpi: TradeKpi,
  extra?: TradeMetricsExtra
): TradeEfficiencyMetrics {
  const pips = typeof trade.pips === "number" ? trade.pips : 0;
  const isWin = pips > 0;
  const isLoss = pips < 0;

  // holdMs フィールド名が実装で揺れている可能性があるので両対応しておく
  const rawHoldMs =
    // @ts-expect-error - 型定義の差異を吸収するためのフォールバック
    (kpi.holdMs ?? kpi.hold_ms ?? kpi.hold_ms_total ?? 0);
  const holdMs =
    typeof rawHoldMs === "number" && rawHoldMs > 0 ? rawHoldMs : 0;

  // --- (1) エントリー効率（MFE必須。v0では extra が無ければ null） ---
  let entryEfficiency: number | null = null;
  if (isWin && extra?.maxFavorablePips && extra.maxFavorablePips > 0) {
    entryEfficiency = (pips / extra.maxFavorablePips) * 100;
  }

  // --- (2) エグジット効率（maxPossibleGainPips 必須） ---
  let exitEfficiency: number | null = null;
  if (isWin && extra?.maxPossibleGainPips && extra.maxPossibleGainPips > 0) {
    exitEfficiency = (pips / extra.maxPossibleGainPips) * 100;
  }

  // --- (3) もったいない指数（MFE必須）---
  let missedPotential: number | null = null;
  if (isWin && extra?.maxFavorablePips && extra.maxFavorablePips > 0) {
    missedPotential =
      ((extra.maxFavorablePips - pips) / extra.maxFavorablePips) * 100;
  }

  // --- (4) 損切り効率（MAE必須・負けトレードのみ） ---
  let stopEfficiency: number | null = null;
  if (
    isLoss &&
    typeof extra?.maxAdversePips === "number" &&
    extra.maxAdversePips < 0
  ) {
    const absPips = Math.abs(pips);
    const absMae = Math.abs(extra.maxAdversePips);
    if (absMae > 0) {
      stopEfficiency = (absPips / absMae) * 100;
    }
  }

  // --- (5) 時間効率（全トレード）---
  let timeEfficiency: number | null = null;
  if (holdMs > 0) {
    const holdHours = holdMs / (1000 * 60 * 60);
    if (holdHours > 0) {
      timeEfficiency = pips / holdHours;
    }
  }

  // --- (6) 機会獲得率（plannedTpPips 必須）---
  let opportunityGainRate: number | null = null;
  if (
    isWin &&
    typeof extra?.plannedTpPips === "number" &&
    extra.plannedTpPips > 0
  ) {
    opportunityGainRate = (pips / extra.plannedTpPips) * 100;
  }

  // --- (7) R値（kpi.rrr があればそのまま利用）---
  let rMultiple: number | null = null;
  // @ts-expect-error - rrr フィールド名の揺れを許容
  const rawRrr = kpi.rrr ?? kpi.r_multiple ?? null;
  if (typeof rawRrr === "number") {
    rMultiple = rawRrr;
  } else {
    // v0では SL からの再計算は行わず、将来の拡張に回す
    rMultiple = null;
  }

  return {
    entryEfficiency,
    exitEfficiency,
    missedPotential,
    stopEfficiency,
    timeEfficiency,
    opportunityGainRate,
    rMultiple,
  };
}
