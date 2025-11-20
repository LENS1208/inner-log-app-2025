import { calculatePips } from './formatters';

export type ParsedTrade = {
  ticket: string;
  openTime: string;
  type: string;
  size: number;
  item: string;
  openPrice: number;
  closeTime: string;
  closePrice: number;
  pnl: number;
  pips?: number;
  commission?: number;
  swap?: number;
};

export type AccountTransaction = {
  ticket: string;
  transactionDate: string;
  transactionType: string;
  category: string;
  description: string;
  amount: number;
};

export type AccountSummary = {
  totalDeposits: number;
  totalWithdrawals: number;
  xmPointsEarned: number;
  xmPointsUsed: number;
  totalSwap: number;
  totalCommission: number;
  totalProfit: number;
  closedPL: number;
};

export type ParsedStatement = {
  trades: ParsedTrade[];
  transactions: AccountTransaction[];
  summary: AccountSummary;
};

export function parseHtmlStatement(htmlText: string): ParsedTrade[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  const trades: ParsedTrade[] = [];

  const tables = doc.querySelectorAll('table');
  console.log(`🔍 Found ${tables.length} tables in HTML`);

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    console.log(`📊 Processing table with ${rows.length} rows`);

    let headerIndices: { [key: string]: number } = {};
    let isDataSection = false;
    let rowsParsed = 0;
    let sectionStartRow = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('th, td');

      if (cells.length === 0) continue;

      const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim().replace(/\s+/g, ' ') || '');

      if (cellTexts.some(text =>
        text.toLowerCase().includes('ticket') ||
        text.toLowerCase().includes('order') ||
        text.toLowerCase().includes('position')
      )) {
        const tempHeaderIndices: { [key: string]: number } = {};
        cellTexts.forEach((text, idx) => {
          const lower = text.toLowerCase();
          if (lower.includes('ticket') || lower.includes('order')) tempHeaderIndices['ticket'] = idx;
          if (lower.includes('open time') || lower.includes('opentime')) tempHeaderIndices['openTime'] = idx;
          if (lower.includes('type')) tempHeaderIndices['type'] = idx;
          if (lower.includes('size') || lower.includes('volume') || lower.includes('lot')) tempHeaderIndices['size'] = idx;
          if (lower.includes('item') || lower.includes('symbol')) tempHeaderIndices['symbol'] = idx;
          if (lower.includes('price') && idx < 8 && !lower.includes('close')) tempHeaderIndices['openPrice'] = idx;
          if (lower.includes('close time') || lower.includes('closetime')) tempHeaderIndices['closeTime'] = idx;
          if (lower.includes('commission')) tempHeaderIndices['commission'] = idx;
          if (lower.includes('swap')) tempHeaderIndices['swap'] = idx;
          if (lower.includes('profit')) tempHeaderIndices['pnl'] = idx;
          if (lower.includes('pips')) tempHeaderIndices['pips'] = idx;
        });

        const requiredFields = ['ticket', 'openTime', 'type', 'symbol'];
        const hasAllRequired = requiredFields.every(field => tempHeaderIndices[field] !== undefined);

        if (hasAllRequired) {
          if (sectionStartRow >= 0) {
            const sectionRowsParsed = rowsParsed;
            console.log(`📍 Section from row ${sectionStartRow} to ${i-1}: parsed ${rowsParsed} trades`);
          }
          headerIndices = tempHeaderIndices;
          isDataSection = true;
          sectionStartRow = i;
          const prevRowsParsed = rowsParsed;
          rowsParsed = 0;
          console.log(`🔖 Found valid header row at index ${i}, starting new section`);
        } else {
          console.log(`⚠️ Skipped incomplete header at index ${i}:`, tempHeaderIndices);
        }
        continue;
      }

      if (!isDataSection || Object.keys(headerIndices).length === 0) continue;

      if (cellTexts.length < 3) continue;

      const ticketText = cellTexts[headerIndices['ticket']] || '';
      const numericTicket = ticketText.replace(/\D/g, '');
      if (!numericTicket || isNaN(Number(numericTicket))) {
        continue;
      }

      const typeText = (cellTexts[headerIndices['type']] || '').toLowerCase();
      if (!typeText.includes('buy') && !typeText.includes('sell')) {
        continue;
      }

      try {
        const openTimeIdx = headerIndices['openTime'];
        const sizeIdx = headerIndices['size'];
        const symbolIdx = headerIndices['symbol'];
        const openPriceIdx = headerIndices['openPrice'];
        const closeTimeIdx = headerIndices['closeTime'];
        const closeTimeText = cellTexts[closeTimeIdx] || '';

        let closePriceIdx = closeTimeIdx + 1;
        if (closePriceIdx >= cellTexts.length) continue;

        const trade: ParsedTrade = {
          ticket: numericTicket,
          openTime: cellTexts[openTimeIdx] || '',
          type: typeText.includes('buy') ? 'buy' : 'sell',
          size: parseFloat(cellTexts[sizeIdx]?.replace(/[^\d.]/g, '') || '0'),
          item: (cellTexts[symbolIdx] || '').toLowerCase(),
          openPrice: parseFloat(cellTexts[openPriceIdx]?.replace(/[^\d.]/g, '') || '0'),
          closeTime: closeTimeText,
          closePrice: parseFloat(cellTexts[closePriceIdx]?.replace(/[^\d.]/g, '') || '0'),
          pnl: parseFloat(cellTexts[headerIndices['pnl']]?.replace(/[^\d.-]/g, '') || '0'),
        };

        if (headerIndices['commission'] !== undefined) {
          trade.commission = parseFloat(cellTexts[headerIndices['commission']]?.replace(/[^\d.-]/g, '') || '0');
        }
        if (headerIndices['swap'] !== undefined) {
          trade.swap = parseFloat(cellTexts[headerIndices['swap']]?.replace(/[^\d.-]/g, '') || '0');
        }
        if (headerIndices['pips'] !== undefined) {
          trade.pips = parseFloat(cellTexts[headerIndices['pips']]?.replace(/[^\d.-]/g, '') || '0');
        }

        if (trade.openPrice > 0 && trade.closePrice > 0) {
          const side = trade.type === 'buy' ? 'LONG' : 'SHORT';
          trade.pips = calculatePips(trade.openPrice, trade.closePrice, side, trade.item);
        }

        if (trade.ticket && trade.openTime && trade.closeTime && !isNaN(trade.pnl)) {
          trades.push(trade);
          rowsParsed++;
        }
      } catch (error) {
        console.warn('Failed to parse row:', error);
        continue;
      }
    }

    if (sectionStartRow >= 0) {
      console.log(`📍 Final section from row ${sectionStartRow}: parsed ${rowsParsed} trades`);
    }

    const uniqueTrades = trades.length;
    console.log(`✅ Parsed ${uniqueTrades} trades from ${rows.length} rows in this table`);
  }

  console.log(`📈 Grand total trades parsed: ${trades.length}`);

  if (trades.length > 0) {
    const firstTrade = trades[0];
    const lastTrade = trades[trades.length - 1];
    console.log(`📅 Date range: ${firstTrade.openTime} to ${lastTrade.openTime}`);
  }

  return trades;
}

export function parseFullHtmlStatement(htmlText: string): ParsedStatement {
  const trades = parseHtmlStatement(htmlText);
  const transactions = parseAccountTransactions(htmlText);
  const summary = parseAccountSummary(htmlText, trades);

  return { trades, transactions, summary };
}

function parseAccountTransactions(htmlText: string): AccountTransaction[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const transactions: AccountTransaction[] = [];

  const tables = doc.querySelectorAll('table');

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 3) continue;

      const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
      const typeCell = cellTexts[2]?.toLowerCase() || '';

      if (typeCell === 'balance' || typeCell === 'credit') {
        const ticket = cellTexts[0]?.replace(/\D/g, '') || '';
        const dateText = cellTexts[1] || '';
        const description = cellTexts[3] || '';
        const amountText = cellTexts[cellTexts.length - 1] || '0';
        const amount = parseFloat(amountText.replace(/[^\d.-]/g, '') || '0');

        let transactionType = 'other';
        let category = typeCell;

        if (typeCell === 'balance') {
          if (description.includes('Transfer') || description.includes('CD-') || description.includes('CW-')) {
            if (amount > 0) {
              transactionType = 'deposit';
              category = 'transfer';
            } else {
              transactionType = 'withdrawal';
              category = 'transfer';
            }
          } else if (description.includes('EXP')) {
            transactionType = 'fee';
            category = 'fee';
          }
        } else if (typeCell === 'credit') {
          if (description.includes('Credit In-XMP')) {
            transactionType = 'xm_points_earned';
            category = 'credit';
          } else if (description.includes('Credit Out')) {
            transactionType = 'xm_points_used';
            category = 'credit';
          } else if (description.includes('Credit In')) {
            transactionType = 'bonus';
            category = 'credit';
          }
        }

        transactions.push({
          ticket,
          transactionDate: dateText,
          transactionType,
          category,
          description,
          amount,
        });
      }
    }
  }

  console.log(`💰 Parsed ${transactions.length} account transactions`);
  return transactions;
}

function parseAccountSummary(htmlText: string, trades: ParsedTrade[]): AccountSummary {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  let totalSwap = 0;
  let totalCommission = 0;
  let totalProfit = 0;
  let closedPL = 0;

  const summaryText = doc.body.textContent || '';
  const closedPLMatch = summaryText.match(/Closed P\/L:.*?(-?\d[\d\s,]*)/);
  if (closedPLMatch) {
    closedPL = parseFloat(closedPLMatch[1].replace(/[\s,]/g, ''));
  }

  trades.forEach(trade => {
    totalCommission += trade.commission || 0;
    totalSwap += trade.swap || 0;
    totalProfit += trade.pnl || 0;
  });

  const transactions = parseAccountTransactions(htmlText);

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let xmPointsEarned = 0;
  let xmPointsUsed = 0;

  transactions.forEach(txn => {
    if (txn.transactionType === 'deposit' && txn.amount > 0) {
      totalDeposits += txn.amount;
    } else if (txn.transactionType === 'withdrawal' && txn.amount < 0) {
      totalWithdrawals += Math.abs(txn.amount);
    } else if (txn.transactionType === 'xm_points_earned') {
      xmPointsEarned += txn.amount;
    } else if (txn.transactionType === 'xm_points_used') {
      xmPointsUsed += Math.abs(txn.amount);
    }
  });

  console.log(`📊 Summary: Deposits=${totalDeposits}, Withdrawals=${totalWithdrawals}, XMP Earned=${xmPointsEarned}, XMP Used=${xmPointsUsed}`);

  return {
    totalDeposits,
    totalWithdrawals,
    xmPointsEarned,
    xmPointsUsed,
    totalSwap,
    totalCommission,
    totalProfit,
    closedPL,
  };
}

export function convertHtmlTradesToCsvFormat(trades: ParsedTrade[]): string {
  const headers = ['Ticket', 'Open Time', 'Type', 'Size', 'Item', 'Price', 'Close Time', 'Price', 'Commission', 'Swap', 'Profit', 'Pips'];

  const rows = trades.map(trade => [
    trade.ticket,
    trade.openTime,
    trade.type,
    trade.size.toString(),
    trade.item,
    trade.openPrice.toString(),
    trade.closeTime,
    trade.closePrice.toString(),
    (trade.commission || 0).toString(),
    (trade.swap || 0).toString(),
    trade.pnl.toString(),
    (trade.pips || 0).toFixed(1),
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
