import type { Trade } from "./types";
import { getTradeProfit } from "./filterTrades";

export type MarketCondition = "高ボラティリティ" | "中ボラティリティ" | "低ボラティリティ";

export interface MarketConditionStats {
  condition: MarketCondition;
  count: number;
  profit: number;
  wins: number;
  losses: number;
  winRate: number;
  avgProfit: number;
  pf: number;
}

export function estimateMarketCondition(trade: Trade): MarketCondition {
  const pips = Math.abs(trade.pips || 0);

  if (pips >= 60) return "高ボラティリティ";
  if (pips >= 20) return "中ボラティリティ";
  return "低ボラティリティ";
}

export function analyzeMarketConditions(trades: Trade[]): MarketConditionStats[] {
  const conditionsMap = new Map<MarketCondition, {
    count: number;
    profit: number;
    wins: number;
    losses: number;
  }>();

  const conditions: MarketCondition[] = ["高ボラティリティ", "中ボラティリティ", "低ボラティリティ"];
  conditions.forEach(c => conditionsMap.set(c, { count: 0, profit: 0, wins: 0, losses: 0 }));

  trades.forEach((trade) => {
    const condition = estimateMarketCondition(trade);
    const profit = getTradeProfit(trade);
    const stats = conditionsMap.get(condition)!;

    stats.count++;
    stats.profit += profit;
    if (profit > 0) stats.wins++;
    if (profit < 0) stats.losses++;
  });

  return Array.from(conditionsMap.entries()).map(([condition, stats]) => {
    const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
    const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;

    const grossProfit = trades
      .filter(t => estimateMarketCondition(t) === condition && getTradeProfit(t) > 0)
      .reduce((sum, t) => sum + getTradeProfit(t), 0);

    const grossLoss = Math.abs(
      trades
        .filter(t => estimateMarketCondition(t) === condition && getTradeProfit(t) < 0)
        .reduce((sum, t) => sum + getTradeProfit(t), 0)
    );

    const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    return {
      condition,
      ...stats,
      winRate,
      avgProfit,
      pf,
    };
  });
}
