import type { Trade } from "./types";
import type { Filters } from "./dataset.context";

export function filterTrades(trades: Trade[], filters: Filters): Trade[] {
  let result = [...trades];

  console.log('🔎 filterTrades called:', {
    totalTrades: trades.length,
    filters,
    symbolFilter: filters.symbol
  });

  if (filters.symbol) {
    result = result.filter((t) => {
      const tradePair = t.pair || t.symbol || (t as any).item;
      return tradePair === filters.symbol;
    });
    console.log('  → After symbol filter:', result.length, 'trades');
  }

  if (filters.side) {
    result = result.filter((t) => (t.side || t.action) === filters.side);
  }

  if (filters.pnl === "win") {
    result = result.filter((t) => (t.profitYen || t.profit || 0) > 0);
  }
  if (filters.pnl === "loss") {
    result = result.filter((t) => (t.profitYen || t.profit || 0) < 0);
  }

  if (filters.from) {
    result = result.filter((t) => {
      const dateStr = (t.openTime || t.datetime).split(" ")[0];
      return dateStr >= filters.from!;
    });
  }
  if (filters.to) {
    result = result.filter((t) => {
      const dateStr = (t.openTime || t.datetime).split(" ")[0];
      return dateStr <= filters.to!;
    });
  }

  if (filters.weekday) {
    if (filters.weekday === "weekdays") {
      result = result.filter((t) => {
        const day = new Date(t.openTime || t.datetime).getDay();
        return day >= 1 && day <= 5;
      });
    } else if (filters.weekday === "weekend") {
      result = result.filter((t) => {
        const day = new Date(t.openTime || t.datetime).getDay();
        return day === 0 || day === 6;
      });
    } else {
      result = result.filter((t) => {
        return new Date(t.openTime || t.datetime).getDay().toString() === filters.weekday;
      });
    }
  }

  if (filters.session) {
    result = result.filter((t) => {
      const hour = new Date(t.openTime || t.datetime).getHours();
      if (filters.session === "asia") return hour >= 0 && hour < 9;
      if (filters.session === "london") return hour >= 9 && hour < 17;
      if (filters.session === "ny") return hour >= 17 && hour < 24;
      if (filters.session === "thin") return hour >= 0 && hour < 6;
      return true;
    });
  }

  return result;
}

export function getTradeProfit(t: Trade): number {
  return t.profitYen || t.profit || 0;
}

export function getTradePair(t: Trade): string {
  return t.pair || t.symbol || (t as any).item || "UNKNOWN";
}

export function getTradeSide(t: Trade): "LONG" | "SHORT" {
  return t.side || t.action || "LONG";
}

export function getTradeTime(t: Trade): string {
  return t.openTime || t.datetime;
}
