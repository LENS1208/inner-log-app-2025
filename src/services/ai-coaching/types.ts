export type TradeExample = {
  date: string;
  symbol: string;
  side: "BUY" | "SELL";
  lots: number;
  entry: number;
  exit: number;
  pnlJPY: number;
  pips?: number;
  note?: string;
  ticket?: string | number;
};

export type KPIRow = {
  metric: string;
  target: string;
  coachNote: string;
};

export type RuleRow = {
  ruleId: string;
  title: string;
  content: string;
  coachNote: string;
};

export type StrengthWeaknessRow = {
  item: string;
  strength: string;
  improvement: string;
  coachNote: string;
};

export type Playbook = {
  trendFollowing: {
    conditions: string[];
    entry: string[];
    sl: string;
    tp: string;
    example?: TradeExample;
    coachNote: string;
  };
  meanReversion: {
    conditions: string[];
    lotPolicy: string;
    timeStop?: string;
    example?: TradeExample;
    coachNote: string;
  };
};

export type FourWeekPlanRow = {
  week: string;
  theme: string;
  content: string;
  coachNote: string;
};

export type DiaryGuideRow = {
  item: string;
  content: string;
  coachNote: string;
};

export type EvaluationScore = {
  overall: number;
  riskManagement: number;
  entryTiming: number;
  exitStrategy: number;
  emotionalControl: number;
  consistency: number;
  explanation: string;
};

export type SummaryCategory = {
  category: string;
  description: string;
};

export type CoachingSheet = {
  summary: string[];
  summaryCategories?: SummaryCategory[];
  summaryComment?: string;
  examples: TradeExample[];
  strengthsWeaknesses: StrengthWeaknessRow[];
  strengthsWeaknessesComment?: string;
  rules: RuleRow[];
  rulesComment?: string;
  playbook: Playbook;
  playbookComment?: string;
  diaryGuide: { rows: DiaryGuideRow[]; comment?: string };
  kpis: KPIRow[];
  kpisComment?: string;
  fourWeekPlan: FourWeekPlanRow[];
  fourWeekPlanComment?: string;
  coachingMessage: string[];
  nextSteps: string[];
  evaluationScore?: EvaluationScore;
};

export type AIResponse = {
  markdown: string;
  sheet: CoachingSheet;
  meta?: { model?: string; generatedAt?: string };
};
