export type ProfitMode = 'yen' | 'pips' | 'both';

export interface DailyReportData {
  date: string;
  profitMode: ProfitMode;
  mainProfitValue: {
    yen: number;
    pips: number;
  };
  winRate: number;
  pf: number;
  maxDD: number;
  tradeCount: number;
  sessionProfitData: {
    session: string;
    profit: number;
  }[];
  pairProfitData: {
    pair: string;
    profit: number;
  }[];
  equityData: {
    time: string;
    equity: number;
  }[];
  showUsername: boolean;
  username?: string;
  brokerName?: string;
  showBrokerLink: boolean;
  wins: number;
  losses: number;
  draws: number;
}

export interface DailyReportCardProps {
  data: DailyReportData;
  cardType: '1' | '2';
  onExportComplete?: (blob: Blob) => void;
}
