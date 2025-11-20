export type TradeRow = {
  pnl?: number | string;
  pips?: number | string;
  win?: boolean | string;
  [key: string]: any;
};

export type DatasetKey = 'A' | 'B' | 'C';

export type DDBasic = 'capital' | 'r';

export type TradeMetrics = {
  trades: number;
  winrate: number;
  pf: number;
  pipsSum: number;
  equity: number[];
  maxdd: number;
  pnls: number[];
  pipsArr: number[];
};

export type ScoreParts = {
  entry: number;
  dd: number;
  rr: number;
  risk: number;
  stability: number;
};

export type OverallScore = {
  overall: number;
  parts: ScoreParts;
  rank: string;
};

export type TPSLParams = {
  ratio: number;
  trailing: boolean;
  be: boolean;
};

export type Recommendation = {
  ratio: number;
  pf: number;
  wr: number;
  dd: number;
};
