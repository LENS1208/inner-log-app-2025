import type { TradeRow } from '../types/evaluation.types';

export type HeatmapCell = {
  row: string;
  col: string;
  value: number;
  count: number;
};

export function computePairTimeHeatmap(trades: TradeRow[]): HeatmapCell[] {
  const pairs = ['USD/JPY', 'EUR/USD', 'GBP/JPY', 'AUD/USD', 'EUR/JPY'];
  const timeSlots = ['0-3', '3-6', '6-9', '9-12', '12-15', '15-18', '18-21', '21-24'];

  const grid: Record<string, { totalPnl: number; count: number }> = {};

  trades.forEach(trade => {
    const pair = trade.pair || 'USD/JPY';
    const hour = trade.hour !== undefined ? Number(trade.hour) : 0;
    const slotIndex = Math.floor(hour / 3);
    const timeSlot = timeSlots[slotIndex] || '0-3';

    const key = `${pair}|${timeSlot}`;
    if (!grid[key]) {
      grid[key] = { totalPnl: 0, count: 0 };
    }

    const pnl = typeof trade.pnl === 'number' ? trade.pnl : parseFloat(String(trade.pnl || 0));
    grid[key].totalPnl += pnl;
    grid[key].count++;
  });

  const results: HeatmapCell[] = [];

  pairs.forEach(pair => {
    timeSlots.forEach(timeSlot => {
      const key = `${pair}|${timeSlot}`;
      const data = grid[key];

      if (data && data.count > 0) {
        const avgPnl = data.totalPnl / data.count;
        const normalized = Math.max(0, Math.min(1, (avgPnl + 5000) / 10000));
        results.push({
          row: pair,
          col: timeSlot,
          value: normalized,
          count: data.count,
        });
      } else {
        results.push({
          row: pair,
          col: timeSlot,
          value: 0.5,
          count: 0,
        });
      }
    });
  });

  return results;
}

export function computeDayTimeHeatmap(trades: TradeRow[]): HeatmapCell[] {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const timeSlots = ['0-3', '3-6', '6-9', '9-12', '12-15', '15-18', '18-21', '21-24'];

  const grid: Record<string, { wins: number; total: number }> = {};

  trades.forEach(trade => {
    const dayOfWeek = trade.dayOfWeek !== undefined ? Number(trade.dayOfWeek) : 0;
    const day = days[dayOfWeek];
    const hour = trade.hour !== undefined ? Number(trade.hour) : 0;
    const slotIndex = Math.floor(hour / 3);
    const timeSlot = timeSlots[slotIndex] || '0-3';

    const key = `${day}|${timeSlot}`;
    if (!grid[key]) {
      grid[key] = { wins: 0, total: 0 };
    }

    const isWin = trade.win === true || (typeof trade.pnl === 'number' && trade.pnl > 0);
    if (isWin) grid[key].wins++;
    grid[key].total++;
  });

  const results: HeatmapCell[] = [];

  days.forEach(day => {
    timeSlots.forEach(timeSlot => {
      const key = `${day}|${timeSlot}`;
      const data = grid[key];

      if (data && data.total > 0) {
        const winRate = data.wins / data.total;
        results.push({
          row: day,
          col: timeSlot,
          value: winRate,
          count: data.total,
        });
      } else {
        results.push({
          row: day,
          col: timeSlot,
          value: 0.5,
          count: 0,
        });
      }
    });
  });

  return results;
}
