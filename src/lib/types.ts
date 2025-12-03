export type Side = "LONG" | "SHORT";

export type Trade = {
  id: string;
  datetime: string;
  pair: string;
  side: Side;
  volume: number;
  profitYen: number;
  pips: number;
  memo?: string;

  openTime?: string;
  openPrice?: number;
  closePrice?: number;
  stopPrice?: number;
  targetPrice?: number;
  commission?: number;
  swap?: number;
  comment?: string;
  holdTimeMin?: number;
  type?: string; // 'buy', 'sell', 'balance' など

  symbol?: string;
  action?: Side;
  profit?: number;
  item?: string;
  ticket?: string;
  size?: number;
  closeTime?: string;
  sl?: number;
  tp?: number;

  // トレードメトリクス
  mfe_pips?: number; // Maximum Favorable Excursion
  mae_pips?: number; // Maximum Adverse Excursion
  max_possible_gain_pips?: number; // 理論上の最大利益
  planned_tp_pips?: number; // 計画TP
};
