import type { TradeRow, TradeMetrics } from '../types/evaluation.types';
import { computeMetrics } from '../utils/evaluation-metrics';
import { getAllTrades, dbToTrade } from '../lib/db.service';
import { parseCsvText } from '../lib/csv';

export const INIT_CAPITAL = 1_000_000;

function generateMockTrades(): TradeRow[] {
  const mockTrades: TradeRow[] = [];
  const pairs = ['USD/JPY', 'EUR/USD', 'GBP/JPY', 'AUD/USD', 'EUR/JPY'];
  const baseDate = new Date('2024-01-01').getTime();

  for (let i = 0; i < 150; i++) {
    const isWin = Math.random() > 0.45;
    const pips = isWin
      ? Math.random() * 40 + 10
      : -(Math.random() * 30 + 8);

    const pnl = isWin
      ? Math.random() * 15000 + 3000
      : -(Math.random() * 12000 + 2000);

    const datetime = new Date(baseDate + i * 8 * 60 * 60 * 1000);

    mockTrades.push({
      pnl,
      pips,
      win: isWin,
      pair: pairs[Math.floor(Math.random() * pairs.length)],
      side: Math.random() > 0.5 ? 'Long' : 'Short',
      datetime: datetime.toISOString(),
      hour: datetime.getUTCHours(),
      dayOfWeek: datetime.getUTCDay(),
    });
  }

  return mockTrades;
}

export async function getDataRows(useDatabase: boolean, dataset?: string | null): Promise<TradeRow[]> {
  try {
    if (useDatabase) {
      console.log('🔍 getDataRows: データベースからデータ取得開始', { dataset });
      const dbTrades = await getAllTrades(dataset !== undefined ? dataset : null);
      console.log('🔍 getDataRows: データベースから取得した件数:', dbTrades.length);
      const trades = dbTrades.map(dbToTrade);
      return trades.map(t => ({
        ticket: t.id,
        openDate: t.openTime,
        closeDate: t.datetime,
        symbol: t.pair,
        side: t.side,
        lots: t.volume,
        openPrice: t.openPrice,
        closePrice: t.closePrice,
        sl: t.stopPrice,
        tp: t.targetPrice,
        profit: t.profitYen,
        pips: t.pips,
        swap: t.swap,
        commission: t.commission,
        pnl: t.profitYen,
        win: t.profitYen > 0,
        pair: t.pair,
        datetime: t.datetime,
        hour: new Date(t.datetime).getUTCHours(),
        dayOfWeek: new Date(t.datetime).getUTCDay(),
      }));
    } else {
      const datasetName = dataset || 'A';
      const res = await fetch(`/demo/${datasetName}.csv?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const trades = parseCsvText(text);
        return trades.map(t => ({
          pnl: t.profitYen,
          pips: t.pips,
          win: t.profitYen > 0,
          pair: t.pair,
          side: t.side,
          datetime: t.datetime,
          hour: new Date(t.datetime || Date.now()).getUTCHours(),
          dayOfWeek: new Date(t.datetime || Date.now()).getUTCDay(),
        }));
      }
    }
  } catch (err) {
    console.error('データ読み込みエラー:', err);
  }

  return generateMockTrades();
}

export async function getDataMetrics(useDatabase: boolean, dataset?: string | null): Promise<TradeMetrics> {
  const rows = await getDataRows(useDatabase, dataset);
  return computeMetrics(rows);
}

export const demoConfig = {
  INIT_CAPITAL,
};
