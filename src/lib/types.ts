export type Side = "LONG" | "SHORT";

export type BrokerId = "xm" | "unknown";

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
  type?: string;
  brokerId?: BrokerId;

  symbol?: string;
  action?: Side;
  profit?: number;
  item?: string;
  ticket?: string;
  size?: number;
  closeTime?: string;
  sl?: number;
  tp?: number;
};

export type TradeKpi = {
  holdMs?: number;
  hold_ms?: number;
  hold_ms_total?: number;
  rrr?: number;
  r_multiple?: number;
};
