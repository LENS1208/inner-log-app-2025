export interface ParsedTrade {
  date: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  entry: number;
  exit: number;
  pnlJPY: number;
  pips?: number;
  comment?: string;
}

export interface ParseResult {
  trades: ParsedTrade[];
  summary: {
    totalTrades: number;
    wins: number;
    losses: number;
    totalPnl: number;
  };
}

export async function parseMtHistory(files: File[]): Promise<ParseResult> {
  const trades: ParsedTrade[] = [];

  for (const file of files) {
    if (file.name.endsWith('.csv')) {
      const content = await file.text();
      const parsed = parseCsv(content);
      trades.push(...parsed);
    } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      const content = await file.text();
      const parsed = parseHtml(content);
      trades.push(...parsed);
    }
  }

  const wins = trades.filter(t => t.pnlJPY > 0).length;
  const losses = trades.filter(t => t.pnlJPY < 0).length;
  const totalPnl = trades.reduce((sum, t) => sum + t.pnlJPY, 0);

  return {
    trades,
    summary: {
      totalTrades: trades.length,
      wins,
      losses,
      totalPnl,
    },
  };
}

function parseCsv(content: string): ParsedTrade[] {
  const lines = content.split('\n').filter(line => line.trim());
  const trades: ParsedTrade[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split('\t');

    if (columns.length < 8) continue;

    const closeTime = columns[0]?.trim();
    const symbol = columns[1]?.trim();
    const side = columns[2]?.trim().toUpperCase();
    const lots = parseFloat(columns[3] || '0');
    const openPrice = parseFloat(columns[4] || '0');
    const closePrice = parseFloat(columns[5] || '0');
    const profit = parseFloat(columns[6] || '0');
    const comment = columns[7]?.trim() || '';

    if (!closeTime || !symbol || !side || isNaN(lots) || isNaN(profit)) continue;

    const normalizedSide = (side === 'BUY' || side === 'LONG') ? 'BUY' : 'SELL';

    trades.push({
      date: closeTime.split(' ')[0] || closeTime,
      symbol,
      side: normalizedSide,
      lots,
      entry: openPrice,
      exit: closePrice,
      pnlJPY: profit,
      comment,
    });
  }

  return trades;
}

function parseHtml(content: string): ParsedTrade[] {
  const trades: ParsedTrade[] = [];

  const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
  const rows = content.match(rowRegex) || [];

  for (const row of rows) {
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;
    const cells = [];
    let match;

    while ((match = cellRegex.exec(row)) !== null) {
      const cellContent = match[1].replace(/<[^>]*>/g, '').trim();
      cells.push(cellContent);
    }

    if (cells.length < 8) continue;

    const closeTime = cells[0];
    const symbol = cells[1];
    const side = cells[2]?.toUpperCase();
    const lots = parseFloat(cells[3] || '0');
    const openPrice = parseFloat(cells[4] || '0');
    const closePrice = parseFloat(cells[5] || '0');
    const profit = parseFloat(cells[6] || '0');
    const comment = cells[7] || '';

    if (!closeTime || !symbol || !side || isNaN(lots) || isNaN(profit)) continue;

    const normalizedSide = (side === 'BUY' || side === 'LONG') ? 'BUY' : 'SELL';

    trades.push({
      date: closeTime.split(' ')[0] || closeTime,
      symbol,
      side: normalizedSide,
      lots,
      entry: openPrice,
      exit: closePrice,
      pnlJPY: profit,
      comment,
    });
  }

  return trades;
}
