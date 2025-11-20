export const fmt = {
  datetime_utc: (v: string|Date) => {
    const d = typeof v === "string" ? new Date(v) : v;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hour}:${min}`;
  },
  datetime_simple: (v: string|Date) => {
    const d = typeof v === "string" ? new Date(v) : v;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hour}:${min}`;
  },
  yen_signed_colored: (n?: number) => {
    if (n == null) return { text: "—", cls: "" };
    const sign = n >= 0 ? "+" : "−";
    const cls  = n >= 0 ? "pnl-pos" : "pnl-neg";
    return { text: `${sign}${Math.abs(n).toLocaleString("ja-JP")}円`, cls };
  },
  pips_signed_colored: (n?: number) => {
    if (n == null) return { text: "—", cls: "" };
    const sign = n >= 0 ? "+" : "−";
    const cls  = n >= 0 ? "pnl-pos" : "pnl-neg";
    return { text: `${sign}${Math.abs(n).toFixed(1)}`, cls };
  },
  swap_signed_colored: (n?: number) => {
    if (n == null || n === 0) return { text: "—", cls: "" };
    const floored = Math.floor(Math.abs(n));
    const sign = n >= 0 ? "+" : "−";
    const cls  = n >= 0 ? "pnl-pos" : "pnl-neg";
    return { text: `${sign}${floored.toLocaleString("ja-JP")}円`, cls };
  },
  r_1: (n?: number) => (n==null ? "—" : `${n.toFixed(1)}R`),
  int: (n?: number) => (n==null ? "—" : Math.round(n).toString()),
  lots: (n?: number) => (n==null ? "—" : n.toFixed(2)),
  note_icon: (note?: string) => {
    if (!note || note.trim() === "") return "—";
    return { text: "📝", cls: "note-icon" };
  },
  symbol: (s?: string) => (s || "—"),
  side_caps: (s?: string) => {
    if (!s) return "—";
    if (s === "LONG" || s === "BUY" || s === "買い") return { text: "買い", cls: "side-long" };
    if (s === "SHORT" || s === "SELL" || s === "売り") return { text: "売り", cls: "side-short" };
    return s;
  },
  price_raw: (n?: number) => (n==null ? "—" : n.toString()),
  price_with_unit: (n?: number) => {
    if (n == null) return "—";
    return n.toFixed(3);
  }
};

export function formatJPY(value: number): string {
  return `${Math.round(value).toLocaleString('ja-JP')}円`;
}

export function formatJPYSigned(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatJPY(value)}`;
}

export function formatSwap(value: number): string {
  const floored = Math.floor(Math.abs(value));
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${floored.toLocaleString('ja-JP')}円`;
}

export function formatSwapNoSign(value: number): string {
  const floored = Math.floor(Math.abs(value));
  return `${floored.toLocaleString('ja-JP')}`;
}

export function getPnLColor(value: number): string {
  return value >= 0 ? 'var(--gain)' : 'var(--loss)';
}

export const pnlStyle = {
  fontWeight: 700 as const
};

export function getPipMultiplier(symbol: string): number {
  const sym = (symbol || '').toUpperCase();

  if (sym.includes('JPY')) {
    return 100;
  }

  if (sym.includes('GOLD') || sym.includes('XAU')) {
    return 10;
  }

  if (sym.includes('SILVER') || sym.includes('XAG')) {
    return 1000;
  }

  if (sym.includes('OIL') || sym.includes('WTI') || sym.includes('BRENT')) {
    return 100;
  }

  if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('CRYPTO')) {
    return 1;
  }

  if (sym.match(/^(US|JP|DE|UK|FR)\d+/)) {
    return 1;
  }

  return 10000;
}

export function calculatePips(openPrice: number, closePrice: number, side: 'LONG' | 'SHORT' | 'BUY' | 'SELL', symbol: string): number {
  if (!openPrice || !closePrice) return 0;

  const normalizedSide = side.toUpperCase();
  const isLong = normalizedSide === 'LONG' || normalizedSide === 'BUY';

  const priceDiff = isLong
    ? (closePrice - openPrice)
    : (openPrice - closePrice);

  const multiplier = getPipMultiplier(symbol);

  return +(priceDiff * multiplier).toFixed(1);
}
