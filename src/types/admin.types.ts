export type TimeCalibrationStatus = 'not-set' | 'auto-suggested' | 'manual' | 'verified';

export type TimeCalibrationSummary = 'not-set' | 'auto-suggested' | 'calibrated' | 'no-account';

export type AdminUserRow = {
  userId: string;
  email: string;
  traderName: string | null;
  createdAt: string;
  lastSignInAt: string | null;

  language: 'ja' | 'en' | null;
  dataSource: 'demo' | 'database' | null;
  defaultDataset: 'A' | 'B' | 'C' | null;

  tradesCount: number;
  lastTradeAt: string | null;
  totalProfit: number;

  lastImportAt: string | null;
  accountsCount: number;

  timeCalibrationSummary: TimeCalibrationSummary;
};

export function summarizeTimeCalibrationStatus(
  accountsCount: number,
  statuses: TimeCalibrationStatus[]
): TimeCalibrationSummary {
  if (accountsCount === 0) {
    return 'no-account';
  }

  if (statuses.includes('not-set')) {
    return 'not-set';
  }

  if (statuses.includes('manual') || statuses.includes('verified')) {
    return 'calibrated';
  }

  return 'auto-suggested';
}
