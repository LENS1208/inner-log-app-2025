export type Yen = number;
export type Pips = number;

export type DailyKpi = {
  winRate: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  avgPnLPerTradeYen: Yen;
  profitFactor: number;
  totalPips: Pips;
  dayTotalYen: Yen;
  dateJst: string;
  weekdayJp: string;
};

export type DayTradeRow = {
  time: string;
  symbol: string;
  sideJp: "買い" | "売り";
  pnlYen: Yen;
  ticket?: string;
};

export type LinkedNoteRow = {
  title: string;
  kind: "日次" | "取引" | "週次" | "自由";
  updatedAt: string;
};

export type AiAdvice = {
  items: string[];
  lastUpdated?: string;
  pinned?: boolean;
};

export type JournalPayload = {
  good: string;
  improve: string;
  nextPromise: string;
  free: string;
};

export type DailyNotePageProps = {
  kpi: DailyKpi;
  trades: DayTradeRow[];
  linkedNotes: LinkedNoteRow[];
  advice: AiAdvice;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onOpenDailyNote?: () => void;
  onSave?: (payload: JournalPayload) => void;
  onOpenTradesList?: () => void;
  onOpenNote?: (title: string) => void;
  onGenerateAdvice?: () => void;
  onRegenerateAdvice?: () => void;
  onPinAdvice?: () => void;
};
