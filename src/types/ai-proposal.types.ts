export type Yen = number;
export type Pips = number;

export type KpiItem = {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | undefined;
};

export type TradeIdea = {
  id: string;
  side: '買い' | '売り';
  entry: string;
  slPips: number;
  tpPips: number;
  expected: number;
  confidence: '◎' | '○' | '△';
};

export type DailyActions = {
  stance: string;
  session: string;
  anchor: string;
  riskNote: string;
};

export type HeroData = {
  pair: string;
  bias: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  nowYen: Yen;
  buyEntry?: string;
  sellEntry?: string;
};

export type Factors = {
  technical: string[];
  fundamental: string[];
  sentiment: string[];
};

export type AiProposalData = {
  hero: HeroData;
  daily: DailyActions;
  scenario: {
    strong: string;
    base: string;
    weak: string;
  };
  ideas: TradeIdea[];
  factors: Factors;
  notes: {
    memo: string[];
  };
};

export type AiProposalHandlers = {
  onGenerate?: (payload: any) => void;
  onRegenerate?: () => void;
  onFix?: () => void;
  onCreateTradeNote?: (ideaId: string) => void;
};
