export type Yen = number;
export type Pips = number;

export type DailyKpi = {
  winRate: number;
  trades: number;
  wins: number;
  losses: number;
  avgYenPerTrade: Yen;
  pf: number;
  totalPips: Pips;
};

export type DayTradeRow = {
  time: string;
  symbol: string;
  sideJp: '買い' | '売り';
  pnlYen: Yen;
};

export type LinkedNoteRow = {
  title: string;
  kind: '日次' | '取引' | '週次' | '自由';
  updated: string;
};

export type AiAdvice = {
  items: string[];
  lastUpdated?: string;
  pinned?: boolean;
};

export type TextareaGroupValue = {
  good: string;
  improve: string;
  nextPromise: string;
  free: string;
};
