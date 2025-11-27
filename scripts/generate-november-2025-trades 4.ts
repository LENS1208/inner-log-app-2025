const november2025TradesA = [
  { ticket: '101000500', item: 'EURUSD', side: 'buy', size: 2.0, open_time: '2025.11.01 08:00:00', open_price: 1.0745, close_time: '2025.11.01 16:30:00', close_price: 1.0870, sl: 1.0695, tp: 1.0870, commission: -12.0, swap: 3.2, profit: 25000, comment: 'Trend' },
  { ticket: '101000501', item: 'GBPUSD', side: 'sell', size: 1.5, open_time: '2025.11.04 09:15:00', open_price: 1.2920, close_time: '2025.11.04 17:45:00', close_price: 1.2780, sl: 1.2970, tp: 1.2730, commission: -12.0, swap: 2.8, profit: 21000, comment: 'Breakout' },
  { ticket: '101000502', item: 'USDJPY', side: 'buy', size: 3.0, open_time: '2025.11.06 10:30:00', open_price: 149.50, close_time: '2025.11.06 18:00:00', close_price: 150.80, sl: 149.00, tp: 151.00, commission: -12.0, swap: 4.5, profit: 39000, comment: 'Reversal' },
  { ticket: '101000503', item: 'AUDUSD', side: 'buy', size: 2.0, open_time: '2025.11.08 07:45:00', open_price: 0.6545, close_time: '2025.11.08 15:20:00', close_price: 0.6695, sl: 0.6495, tp: 0.6745, commission: -12.0, swap: 3.6, profit: 30000, comment: 'Pullback' },
  { ticket: '101000504', item: 'EURJPY', side: 'sell', size: 2.5, open_time: '2025.11.11 11:00:00', open_price: 164.50, close_time: '2025.11.11 19:30:00', close_price: 162.80, sl: 165.00, tp: 162.50, commission: -12.0, swap: 3.1, profit: 42500, comment: 'Range' },
  { ticket: '101000505', item: 'GBPJPY', side: 'buy', size: 1.8, open_time: '2025.11.13 08:30:00', open_price: 194.50, close_time: '2025.11.13 16:45:00', close_price: 196.80, sl: 193.50, tp: 197.00, commission: -12.0, swap: 2.9, profit: 41400, comment: 'Scalp' },
  { ticket: '101000506', item: 'EURUSD', side: 'buy', size: 2.2, open_time: '2025.11.15 09:20:00', open_price: 1.0745, close_time: '2025.11.15 17:50:00', close_price: 1.0885, sl: 1.0695, tp: 1.0890, commission: -12.0, swap: 3.8, profit: 30800, comment: 'Trend' },
  { ticket: '101000507', item: 'USDJPY', side: 'buy', size: 2.8, open_time: '2025.11.18 10:15:00', open_price: 149.20, close_time: '2025.11.18 18:40:00', close_price: 150.95, sl: 148.70, tp: 151.20, commission: -12.0, swap: 4.2, profit: 49000, comment: 'Breakout' },
  { ticket: '101000508', item: 'GBPUSD', side: 'sell', size: 1.6, open_time: '2025.11.20 11:30:00', open_price: 1.2915, close_time: '2025.11.20 19:00:00', close_price: 1.2740, sl: 1.2965, tp: 1.2715, commission: -12.0, swap: 3.3, profit: 28000, comment: 'Range' },
  { ticket: '101000509', item: 'AUDUSD', side: 'sell', size: 1.9, open_time: '2025.11.22 08:45:00', open_price: 0.6695, close_time: '2025.11.22 16:20:00', close_price: 0.6550, sl: 0.6745, tp: 0.6545, commission: -12.0, swap: 3.5, profit: 27550, comment: 'Pullback' },
  { ticket: '101000510', item: 'EURJPY', side: 'buy', size: 2.3, open_time: '2025.11.25 09:50:00', open_price: 162.30, close_time: '2025.11.25 17:15:00', close_price: 164.40, sl: 161.80, tp: 164.80, commission: -12.0, swap: 3.7, profit: 48300, comment: 'Reversal' },
  { ticket: '101000511', item: 'USDJPY', side: 'sell', size: 2.1, open_time: '2025.11.27 10:20:00', open_price: 151.20, close_time: '2025.11.27 18:45:00', close_price: 149.70, sl: 151.70, tp: 149.20, commission: -12.0, swap: 4.1, profit: 31500, comment: 'Scalp' },
  { ticket: '101000512', item: 'GBPUSD', side: 'buy', size: 1.4, open_time: '2025.11.29 11:15:00', open_price: 1.2730, close_time: '2025.11.29 19:30:00', close_price: 1.2880, sl: 1.2680, tp: 1.2905, commission: -12.0, swap: 3.4, profit: 21000, comment: 'Trend' },
];

const november2025TradesB = [
  { ticket: '101000600', item: 'EURUSD', side: 'buy', size: 1.2, open_time: '2025.11.02 09:30:00', open_price: 1.0790, close_time: '2025.11.02 17:00:00', close_price: 1.0820, sl: 1.0740, tp: 1.0840, commission: -12.0, swap: 2.1, profit: 3600, comment: 'Trend' },
  { ticket: '101000601', item: 'GBPUSD', side: 'sell', size: 0.8, open_time: '2025.11.05 10:45:00', open_price: 1.2850, close_time: '2025.11.05 18:20:00', close_price: 1.2820, sl: 1.2900, tp: 1.2770, commission: -12.0, swap: 1.5, profit: 2400, comment: 'Breakout' },
  { ticket: '101000602', item: 'USDJPY', side: 'buy', size: 1.5, open_time: '2025.11.07 08:15:00', open_price: 150.10, close_time: '2025.11.07 16:45:00', close_price: 150.05, sl: 149.60, tp: 150.60, commission: -12.0, swap: 2.8, profit: -750, comment: 'Reversal' },
  { ticket: '101000603', item: 'AUDUSD', side: 'sell', size: 1.0, open_time: '2025.11.10 11:20:00', open_price: 0.6620, close_time: '2025.11.10 19:50:00', close_price: 0.6640, sl: 0.6670, tp: 0.6570, commission: -12.0, swap: 1.9, profit: -2000, comment: 'Pullback' },
  { ticket: '101000604', item: 'EURJPY', side: 'buy', size: 1.3, open_time: '2025.11.12 09:00:00', open_price: 163.40, close_time: '2025.11.12 17:30:00', close_price: 163.80, sl: 162.90, tp: 164.40, commission: -12.0, swap: 2.3, profit: 5200, comment: 'Range' },
  { ticket: '101000605', item: 'GBPJPY', side: 'sell', size: 0.9, open_time: '2025.11.14 10:15:00', open_price: 195.60, close_time: '2025.11.14 18:40:00', close_price: 195.20, sl: 196.10, tp: 194.60, commission: -12.0, swap: 1.7, profit: 3600, comment: 'Scalp' },
  { ticket: '101000606', item: 'EURUSD', side: 'sell', size: 1.1, open_time: '2025.11.17 08:30:00', open_price: 1.0810, close_time: '2025.11.17 16:00:00', close_price: 1.0830, sl: 1.0860, tp: 1.0760, commission: -12.0, swap: 2.0, profit: -2200, comment: 'Trend' },
  { ticket: '101000607', item: 'USDJPY', side: 'sell', size: 1.4, open_time: '2025.11.19 11:40:00', open_price: 150.40, close_time: '2025.11.19 19:10:00', close_price: 150.10, sl: 150.90, tp: 149.90, commission: -12.0, swap: 2.5, profit: 4200, comment: 'Breakout' },
  { ticket: '101000608', item: 'GBPUSD', side: 'buy', size: 0.7, open_time: '2025.11.21 09:50:00', open_price: 1.2760, close_time: '2025.11.21 17:20:00', close_price: 1.2790, sl: 1.2710, tp: 1.2860, commission: -12.0, swap: 1.3, profit: 2100, comment: 'Range' },
  { ticket: '101000609', item: 'AUDUSD', side: 'buy', size: 1.2, open_time: '2025.11.24 10:30:00', open_price: 0.6585, close_time: '2025.11.24 18:00:00', close_price: 0.6605, sl: 0.6535, tp: 0.6635, commission: -12.0, swap: 2.2, profit: 2400, comment: 'Pullback' },
  { ticket: '101000610', item: 'EURJPY', side: 'sell', size: 1.0, open_time: '2025.11.26 08:45:00', open_price: 163.70, close_time: '2025.11.26 16:15:00', close_price: 163.50, sl: 164.20, tp: 163.20, commission: -12.0, swap: 1.8, profit: 2000, comment: 'Reversal' },
  { ticket: '101000611', item: 'USDJPY', side: 'buy', size: 0.8, open_time: '2025.11.28 09:20:00', open_price: 150.30, close_time: '2025.11.28 11:30:00', close_price: 150.50, sl: 149.80, tp: 150.80, commission: -12.0, swap: 1.4, profit: 1600, comment: 'Scalp' },
  { ticket: '101000612', item: 'GBPUSD', side: 'sell', size: 0.6, open_time: '2025.11.29 14:10:00', open_price: 1.2815, close_time: '2025.11.29 16:20:00', close_price: 1.2805, sl: 1.2865, tp: 1.2765, commission: -12.0, swap: 1.1, profit: 600, comment: 'Trend' },
];

const november2025TradesC = [
  { ticket: '101000700', item: 'EURUSD', side: 'buy', size: 2.0, open_time: '2025.11.03 08:15:00', open_price: 1.0845, close_time: '2025.11.03 15:30:00', close_price: 1.0720, sl: 1.0795, tp: 1.0895, commission: -12.0, swap: -5.2, profit: -25000, comment: 'Trend' },
  { ticket: '101000701', item: 'GBPUSD', side: 'sell', size: 1.5, open_time: '2025.11.05 10:20:00', open_price: 1.2780, close_time: '2025.11.05 18:45:00', close_price: 1.2920, sl: 1.2730, tp: 1.2930, commission: -12.0, swap: -3.8, profit: -21000, comment: 'Breakout' },
  { ticket: '101000702', item: 'USDJPY', side: 'buy', size: 3.0, open_time: '2025.11.07 06:30:00', open_price: 150.80, close_time: '2025.11.07 12:15:00', close_price: 149.50, sl: 150.30, tp: 151.30, commission: -12.0, swap: -7.5, profit: -39000, comment: 'Range' },
  { ticket: '101000703', item: 'AUDUSD', side: 'sell', size: 2.0, open_time: '2025.11.10 14:00:00', open_price: 0.6545, close_time: '2025.11.10 20:30:00', close_price: 0.6695, sl: 0.6495, tp: 0.6745, commission: -12.0, swap: -4.3, profit: -30000, comment: 'Reversal' },
  { ticket: '101000704', item: 'EURJPY', side: 'buy', size: 2.5, open_time: '2025.11.12 09:45:00', open_price: 164.50, close_time: '2025.11.12 16:20:00', close_price: 162.80, sl: 164.00, tp: 165.00, commission: -12.0, swap: -6.1, profit: -42500, comment: 'Pullback' },
  { ticket: '101000705', item: 'GBPJPY', side: 'sell', size: 1.8, open_time: '2025.11.14 11:30:00', open_price: 194.50, close_time: '2025.11.14 19:00:00', close_price: 196.80, sl: 193.50, tp: 197.00, commission: -12.0, swap: -5.5, profit: -41400, comment: 'Scalp' },
  { ticket: '101000706', item: 'EURUSD', side: 'sell', size: 2.2, open_time: '2025.11.17 07:15:00', open_price: 1.0745, close_time: '2025.11.17 14:45:00', close_price: 1.0885, sl: 1.0695, tp: 1.0890, commission: -12.0, swap: -4.7, profit: -30800, comment: 'Trend' },
  { ticket: '101000707', item: 'USDJPY', side: 'sell', size: 2.8, open_time: '2025.11.19 13:20:00', open_price: 149.20, close_time: '2025.11.19 19:50:00', close_price: 150.95, sl: 148.70, tp: 151.20, commission: -12.0, swap: -6.8, profit: -49000, comment: 'Breakout' },
  { ticket: '101000708', item: 'GBPUSD', side: 'buy', size: 1.6, open_time: '2025.11.21 08:40:00', open_price: 1.2740, close_time: '2025.11.21 15:10:00', close_price: 1.2620, sl: 1.2690, tp: 1.2790, commission: -12.0, swap: -3.9, profit: -19200, comment: 'Range' },
  { ticket: '101000709', item: 'AUDUSD', side: 'buy', size: 1.9, open_time: '2025.11.24 10:15:00', open_price: 0.6695, close_time: '2025.11.24 17:30:00', close_price: 0.6550, sl: 0.6645, tp: 0.6745, commission: -12.0, swap: -4.5, profit: -27550, comment: 'Pullback' },
  { ticket: '101000710', item: 'EURJPY', side: 'sell', size: 2.3, open_time: '2025.11.26 12:00:00', open_price: 162.30, close_time: '2025.11.26 18:25:00', close_price: 164.40, sl: 161.80, tp: 164.80, commission: -12.0, swap: -5.8, profit: -48300, comment: 'Reversal' },
  { ticket: '101000711', item: 'USDJPY', side: 'buy', size: 2.1, open_time: '2025.11.28 09:30:00', open_price: 149.70, close_time: '2025.11.28 11:45:00', close_price: 149.20, sl: 149.20, tp: 150.20, commission: -12.0, swap: -1.8, profit: -10500, comment: 'Scalp' },
  { ticket: '101000712', item: 'GBPUSD', side: 'sell', size: 1.4, open_time: '2025.11.29 14:20:00', open_price: 1.2880, close_time: '2025.11.29 16:40:00', close_price: 1.2730, sl: 1.2930, tp: 1.2680, commission: -12.0, swap: -1.2, profit: 21000, comment: 'Trend' },
];

console.log('Dataset A (November 2025 - Large Profits):');
console.log(`Total trades: ${november2025TradesA.length}`);
const totalProfitA = november2025TradesA.reduce((sum, t) => sum + t.profit, 0);
console.log(`Total P&L: ${totalProfitA.toFixed(2)}`);

console.log('\nDataset B (November 2025 - Balanced):');
console.log(`Total trades: ${november2025TradesB.length}`);
const totalProfitB = november2025TradesB.reduce((sum, t) => sum + t.profit, 0);
console.log(`Total P&L: ${totalProfitB.toFixed(2)}`);

console.log('\nDataset C (November 2025 - Large Losses):');
console.log(`Total trades: ${november2025TradesC.length}`);
const totalProfitC = november2025TradesC.reduce((sum, t) => sum + t.profit, 0);
console.log(`Total P&L: ${totalProfitC.toFixed(2)}`);

function generateCSVRows(trades: any[]) {
  return trades.map(t =>
    `${t.ticket}\t${t.item}\t${t.side}\t${t.size}\t${t.open_time}\t${t.open_price}\t${t.close_time}\t${t.close_price}\t${t.sl}\t${t.tp}\t${t.commission}\t${t.swap}\t${t.profit}\t${t.comment}`
  ).join('\n');
}

console.log('\n=== CSV for Dataset A ===');
console.log(generateCSVRows(november2025TradesA));

console.log('\n=== CSV for Dataset B ===');
console.log(generateCSVRows(november2025TradesB));

console.log('\n=== CSV for Dataset C ===');
console.log(generateCSVRows(november2025TradesC));
