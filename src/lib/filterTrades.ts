import type { Trade } from "./types";
import type { Filters } from "./dataset.context";

export function isValidCurrencyPair(symbol: string): boolean {
  if (!symbol) return false;

  const normalized = symbol.toUpperCase().trim();

  // 入金・出金・ボーナスなどのキーワードを除外
  const excludeKeywords = [
    'DEPOSIT', 'CREDIT', 'BONUS', 'WITHDRAWAL', 'WITHDRAW',
    'BALANCE', 'TRANSFER', 'PAYMENT', 'COMMISSION', 'FEE',
    'REBATE', 'ADJUSTMENT', 'CORRECTION', 'CD-ECS-BWR'
  ];

  for (const keyword of excludeKeywords) {
    if (normalized.includes(keyword)) {
      return false;
    }
  }

  // ハイフンやスペースを含む場合は除外（通常の通貨ペアには含まれない）
  if (normalized.includes('-') || normalized.includes(' ')) {
    return false;
  }

  // 通貨ペアの一般的なパターン
  // 例: EURUSD (6), XAUUSD (6), BTCUSD (6), US30 (4), NAS100 (6)
  const validPatterns = [
    /^[A-Z]{6}$/,      // EURUSD, GBPJPY など
    /^[A-Z]{3}[A-Z]{3}$/, // 3文字+3文字
    /^XAU[A-Z]{3}$/,   // 金（XAUUSD など）
    /^XAG[A-Z]{3}$/,   // 銀（XAGUSD など）
    /^[A-Z]{3,4}\d{2,3}$/, // インデックス（US30, NAS100 など）
  ];

  return validPatterns.some(pattern => pattern.test(normalized));
}

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
