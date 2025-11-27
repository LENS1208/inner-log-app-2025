type TradeRecord = {
  ticket: string;
  item: string;
  type: 'buy' | 'sell';
  size: number;
  openTime: string;
  openPrice: number;
  closeTime: string;
  closePrice: number;
  sl: number;
  tp: number;
  commission: number;
  swap: number;
  profit: number;
  comment: string;
  xmPoints?: number;
};

type Transaction = {
  user_id: string;
  transaction_type: 'deposit' | 'withdrawal';
  amount: number;
  transaction_date: string;
  description: string;
};

const CURRENCY_PAIRS_DATASET_A = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'EURJPY', 'GBPJPY'];
const CRYPTO_PAIRS = ['BTCUSD', 'ETHUSD'];
const CURRENCY_PAIRS_DATASET_B = ['EURUSD', 'USDJPY', 'EURJPY', 'GBPJPY']; // 半分に削減
const CURRENCY_PAIRS_DATASET_C = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'EURJPY', 'GBPJPY'];

const SETUPS = ['Trend', 'Breakout', 'Reversal', 'Pullback', 'Range'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutes(date: Date, minutes: number): Date {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  return newDate;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function skipWeekends(date: Date): Date {
  while (isWeekend(date)) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  }
  return date;
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

function getPairInfo(pair: string) {
  const isJPY = pair.endsWith('JPY');
  const pipMultiplier = isJPY ? 100 : 10000;

  let basePrice = 1.0;
  let priceRange = 0.02;

  if (pair === 'EURUSD') {
    basePrice = 1.08;
    priceRange = 0.05;
  } else if (pair === 'GBPUSD') {
    basePrice = 1.28;
    priceRange = 0.05;
  } else if (pair === 'USDJPY') {
    basePrice = 150.0;
    priceRange = 3.0;
  } else if (pair === 'AUDUSD') {
    basePrice = 0.66;
    priceRange = 0.03;
  } else if (pair === 'EURJPY') {
    basePrice = 163.0;
    priceRange = 4.0;
  } else if (pair === 'GBPJPY') {
    basePrice = 195.0;
    priceRange = 5.0;
  } else if (pair === 'USDCHF') {
    basePrice = 0.88;
    priceRange = 0.03;
  } else if (pair === 'NZDUSD') {
    basePrice = 0.61;
    priceRange = 0.02;
  } else if (pair === 'BTCUSD') {
    basePrice = 65000;
    priceRange = 5000;
  } else if (pair === 'ETHUSD') {
    basePrice = 3200;
    priceRange = 300;
  }

  return { basePrice, priceRange, pipMultiplier, isJPY };
}

function calculateSwap(pair: string, side: string, holdDays: number, size: number = 1): number {
  if (pair === 'BTCUSD' || pair === 'ETHUSD') return 0;

  // More realistic swap: -50 to 150 yen per lot per day for buy, -150 to 50 for sell
  const baseSwapPerLot = side === 'buy' ? randomFloat(-50, 150) : randomFloat(-150, 50);
  const totalSwap = baseSwapPerLot * size * holdDays;
  return Math.floor(totalSwap); // Floor to remove decimals
}

function generateDatasetA(): TradeRecord[] {
  const trades: TradeRecord[] = [];
  const startDate = new Date('2024-06-01T08:00:00');
  const endDate = new Date('2025-11-30T18:00:00');

  let ticketNum = 101000001;
  let currentDate = skipWeekends(new Date(startDate));
  let runningProfit = 0;
  const targetProfit = 2800000;
  const totalTrades = 350;

  // 通貨ペアごとの得意不得意（勝率%）
  const pairWinRate: Record<string, number> = {
    'EURUSD': 0.50,  // 普通
    'GBPUSD': 0.30,  // 苦手
    'USDJPY': 0.90,  // 非常に得意
    'AUDUSD': 0.55,  // やや得意
    'EURJPY': 0.85,  // 得意
    'GBPJPY': 0.70,  // やや得意
    'BTCUSD': 0.90,  // 非常に得意
    'ETHUSD': 0.75   // 得意
  };

  // 仮想通貨取引を行う日のインデックス（同じ日に複数取引）
  const cryptoDayIndices = [45, 120, 195, 270];
  const cryptoTradesPerDay: Record<number, number> = {}; // 各日の取引カウント

  for (let i = 0; i < totalTrades; i++) {
    // 特定の日には仮想通貨取引を複数件追加
    const isCryptoDayStart = cryptoDayIndices.includes(i);

    if (isCryptoDayStart) {
      // 同じ日に2-4件の仮想通貨取引を追加
      const numCryptoTrades = randomInt(2, 4);
      const cryptoDate = new Date(currentDate);

      for (let c = 0; c < numCryptoTrades; c++) {
        const pair = randomChoice(CRYPTO_PAIRS);
        const { basePrice, priceRange, pipMultiplier } = getPairInfo(pair);
        const type = randomChoice(['buy', 'sell'] as const);
        const size = parseFloat((randomFloat(0.5, 2.0)).toFixed(1));

        // 通貨ペアの得意不得意に基づいて勝ち負けを決定
        const isWinTrade = Math.random() < pairWinRate[pair];
        let profitBias = isWinTrade ? randomFloat(0.5, 1.5) : randomFloat(-1.2, -0.4);

        const setup = randomChoice(SETUPS);
        const openPrice = basePrice + randomFloat(-priceRange / 2, priceRange / 2);
        const pipMove = randomFloat(-35, 45) + profitBias * 12;
        const closePrice = type === 'buy'
          ? openPrice + (pipMove / pipMultiplier)
          : openPrice - (pipMove / pipMultiplier);

        // 同じ日の中で時間をずらす（2-6時間間隔）
        const hourOffset = c * randomFloat(2, 6);
        const openTime = addMinutes(cryptoDate, hourOffset * 60);
        const holdMinutes = randomFloat(30, 300);
        const closeTime = addMinutes(openTime, holdMinutes);

        const pips = Math.abs(openPrice - closePrice) * pipMultiplier;
        const profit = Math.round((closePrice - openPrice) * (type === 'buy' ? 1 : -1) * size * 100000);
        const holdDays = Math.max(0.1, holdMinutes / (24 * 60)); // Minimum 0.1 day
        const swap = calculateSwap(pair, type, holdDays, size);

        const slDistance = randomFloat(10, 25) / pipMultiplier;
        const tpDistance = randomFloat(20, 60) / pipMultiplier;
        const sl = type === 'buy' ? openPrice - slDistance : openPrice + slDistance;
        const tp = type === 'buy' ? openPrice + tpDistance : openPrice - tpDistance;

        trades.push({
          ticket: String(ticketNum++),
          item: pair,
          type,
          size,
          openTime: formatDateTime(openTime),
          openPrice: parseFloat(openPrice.toFixed(2)),
          closeTime: formatDateTime(closeTime),
          closePrice: parseFloat(closePrice.toFixed(2)),
          sl: parseFloat(sl.toFixed(2)),
          tp: parseFloat(tp.toFixed(2)),
          commission: -12,
          swap,
          profit,
          comment: setup
        });

        runningProfit += profit;
      }
    }

    // 通常のFX取引（土日はスキップ）
    if (isWeekend(currentDate)) {
      currentDate = skipWeekends(currentDate);
    }

    const pair = randomChoice(CURRENCY_PAIRS_DATASET_A);
    const { basePrice, priceRange, pipMultiplier, isJPY } = getPairInfo(pair);

    const type = randomChoice(['buy', 'sell'] as const);
    const size = parseFloat((randomFloat(0.5, 3.5)).toFixed(1));

    // 通貨ペアの得意不得意に基づいて勝ち負けを決定
    const isWinTrade = Math.random() < pairWinRate[pair];

    const remainingTrades = totalTrades - i;
    const remainingProfit = targetProfit - runningProfit;
    let profitBias = remainingProfit / remainingTrades / 10000;

    // 勝ち取引は大きく、負け取引は小さくする
    if (isWinTrade) {
      profitBias = Math.abs(profitBias) + randomFloat(0.5, 1.5);
    } else {
      profitBias = -Math.abs(profitBias) - randomFloat(0.3, 1.0);
    }

    const setup = randomChoice(SETUPS);

    const openPrice = basePrice + randomFloat(-priceRange / 2, priceRange / 2);
    const pipMove = randomFloat(-35, 45) + profitBias * 12;
    const closePrice = type === 'buy'
      ? openPrice + (pipMove / pipMultiplier)
      : openPrice - (pipMove / pipMultiplier);

    const openTime = new Date(currentDate);
    const holdMinutes = randomFloat(30, 480);
    const closeTime = addMinutes(openTime, holdMinutes);

    const pips = Math.abs(openPrice - closePrice) * pipMultiplier;
    const profit = Math.round((closePrice - openPrice) * (type === 'buy' ? 1 : -1) * size * 100000);

    const holdDays = Math.max(0.1, holdMinutes / (24 * 60)); // Minimum 0.1 day
    const swap = calculateSwap(pair, type, holdDays, size);

    const slDistance = randomFloat(10, 25) / pipMultiplier;
    const tpDistance = randomFloat(20, 60) / pipMultiplier;
    const sl = type === 'buy' ? openPrice - slDistance : openPrice + slDistance;
    const tp = type === 'buy' ? openPrice + tpDistance : openPrice - tpDistance;

    trades.push({
      ticket: String(ticketNum++),
      item: pair,
      type,
      size,
      openTime: formatDateTime(openTime),
      openPrice: parseFloat(openPrice.toFixed(isJPY ? 3 : 5)),
      closeTime: formatDateTime(closeTime),
      closePrice: parseFloat(closePrice.toFixed(isJPY ? 3 : 5)),
      sl: parseFloat(sl.toFixed(isJPY ? 3 : 5)),
      tp: parseFloat(tp.toFixed(isJPY ? 3 : 5)),
      commission: -12,
      swap,
      profit,
      comment: setup
    });

    runningProfit += profit;

    // 1〜3日間隔で取引（土日スキップ、隙間をあける）
    const daysToAdd = randomFloat(1, 3);
    currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    currentDate = skipWeekends(currentDate);

    if (currentDate > endDate) {
      break;
    }
  }

  return trades;
}

function generateDatasetB(): TradeRecord[] {
  const trades: TradeRecord[] = [];
  const startDate = new Date('2024-08-01T08:00:00');
  const endDate = new Date('2025-11-30T18:00:00');

  let ticketNum = 102000001;
  let currentDate = skipWeekends(new Date(startDate));
  let runningProfit = 0;
  const targetProfit = -300000; // 大きく勝ったり負けたりで最終的に損失
  const totalTrades = 420;

  // 通貨ペアごとの得意不得意（勝率%）- より極端に
  const pairWinRate: Record<string, number> = {
    'EURUSD': 0.48,
    'USDJPY': 0.52,
    'EURJPY': 0.43,
    'GBPJPY': 0.38
  };

  // 大きな勝ちと大きな負けを繰り返すパターン（負けの方を多くする）
  const bigWinIndices = [5, 58, 128, 201, 276, 352];
  const bigLossIndices = [10, 22, 35, 50, 67, 85, 103, 121, 139, 157, 175, 194, 213, 232, 250, 269, 288, 307, 326, 345, 364, 383, 402, 415];

  // 大きく勝ったり負けたりを繰り返す
  for (let i = 0; i < totalTrades; i++) {
    // 土日はスキップ
    if (isWeekend(currentDate)) {
      currentDate = skipWeekends(currentDate);
    }

    const pair = randomChoice(CURRENCY_PAIRS_DATASET_B);
    const { basePrice, priceRange, pipMultiplier, isJPY } = getPairInfo(pair);

    const type = randomChoice(['buy', 'sell'] as const);

    // 大きな勝ち/負けの取引ではロットサイズを大きくする（負けの方をより大きく）
    const isBigWin = bigWinIndices.includes(i);
    const isBigLoss = bigLossIndices.includes(i);
    const size = isBigWin
      ? parseFloat((randomFloat(3.0, 6.0)).toFixed(1))
      : isBigLoss
      ? parseFloat((randomFloat(5.0, 10.0)).toFixed(1))
      : parseFloat((randomFloat(0.3, 2.5)).toFixed(1));

    // 大きな勝ち/負けのパターン（負けをより大きく）
    let profitBias: number;
    if (isBigWin) {
      profitBias = randomFloat(2.0, 4.0); // 大きな勝ち（控えめ）
    } else if (isBigLoss) {
      profitBias = randomFloat(-8.0, -5.0); // 大きな負け（より大きく）
    } else {
      // 通常の取引
      const isWinTrade = Math.random() < pairWinRate[pair];
      profitBias = isWinTrade ? randomFloat(0.3, 1.2) : randomFloat(-1.2, -0.3);
    }

    const setup = randomChoice(SETUPS);

    const openPrice = basePrice + randomFloat(-priceRange / 2, priceRange / 2);
    const pipMove = randomFloat(-30, 50) + profitBias * 15;
    const closePrice = type === 'buy'
      ? openPrice + (pipMove / pipMultiplier)
      : openPrice - (pipMove / pipMultiplier);

    const openTime = new Date(currentDate);
    const holdMinutes = randomFloat(20, 600);
    const closeTime = addMinutes(openTime, holdMinutes);

    const pips = Math.abs(openPrice - closePrice) * pipMultiplier;
    const profit = Math.round((closePrice - openPrice) * (type === 'buy' ? 1 : -1) * size * 100000);

    const holdDays = Math.max(0.1, holdMinutes / (24 * 60)); // Minimum 0.1 day
    const swap = calculateSwap(pair, type, holdDays, size);

    const slDistance = randomFloat(8, 22) / pipMultiplier;
    const tpDistance = randomFloat(18, 55) / pipMultiplier;
    const sl = type === 'buy' ? openPrice - slDistance : openPrice + slDistance;
    const tp = type === 'buy' ? openPrice + tpDistance : openPrice - tpDistance;

    trades.push({
      ticket: String(ticketNum++),
      item: pair,
      type,
      size,
      openTime: formatDateTime(openTime),
      openPrice: parseFloat(openPrice.toFixed(isJPY ? 3 : 5)),
      closeTime: formatDateTime(closeTime),
      closePrice: parseFloat(closePrice.toFixed(isJPY ? 3 : 5)),
      sl: parseFloat(sl.toFixed(isJPY ? 3 : 5)),
      tp: parseFloat(tp.toFixed(isJPY ? 3 : 5)),
      commission: -12,
      swap,
      profit,
      comment: setup
    });

    runningProfit += profit;

    // 1〜3日間隔で取引（土日スキップ、隙間をあける）
    const daysToAdd = randomFloat(1, 3);
    currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    currentDate = skipWeekends(currentDate);

    if (currentDate > endDate) {
      break;
    }
  }

  return trades;
}

function generateDatasetC(): TradeRecord[] {
  const trades: TradeRecord[] = [];
  const startDate = new Date('2025-01-01T08:00:00');
  const endDate = new Date('2025-11-30T18:00:00');

  let ticketNum = 103000001;
  let currentDate = skipWeekends(new Date(startDate));
  let runningProfit = 0;
  const targetLoss = -2500000;
  const totalTrades = 480;

  // 通貨ペアごとの得意不得意（勝率%）
  const pairWinRate: Record<string, number> = {
    'EURUSD': 0.40,  // やや苦手
    'GBPUSD': 0.20,  // 非常に苦手
    'USDJPY': 0.65,  // やや得意
    'AUDUSD': 0.30,  // 苦手
    'EURJPY': 0.55,  // 普通
    'GBPJPY': 0.15   // 非常に苦手
  };

  const fomoTradeIndices = [42, 78, 95, 134, 167, 189, 225, 268, 311, 357, 398, 442];

  for (let i = 0; i < totalTrades; i++) {
    // 土日はスキップ
    if (isWeekend(currentDate)) {
      currentDate = skipWeekends(currentDate);
    }

    const pair = randomChoice(CURRENCY_PAIRS_DATASET_C);
    const { basePrice, priceRange, pipMultiplier, isJPY } = getPairInfo(pair);

    const type = randomChoice(['buy', 'sell'] as const);

    const isFomoTrade = fomoTradeIndices.includes(i);
    const size = isFomoTrade
      ? parseFloat((randomFloat(4.0, 9.0)).toFixed(1))
      : parseFloat((randomFloat(0.5, 2.8)).toFixed(1));

    // 中盤(100-300)は利益が出る期間
    let adjustedWinRate = pairWinRate[pair];
    if (i >= 100 && i <= 300) {
      adjustedWinRate = Math.min(0.95, adjustedWinRate + 0.30); // 利益期間は勝率アップ
    } else if (i > 300) {
      adjustedWinRate = Math.max(0.10, adjustedWinRate - 0.25); // 後半大きく負ける
    }

    // 通貨ペアの得意不得意に基づいて勝ち負けを決定
    const isWinTrade = !isFomoTrade && (Math.random() < adjustedWinRate);
    let profitBias: number;

    if (isFomoTrade) {
      profitBias = randomFloat(-12, -5);
    } else if (isWinTrade) {
      profitBias = randomFloat(0.4, 1.2);
    } else {
      profitBias = randomFloat(-1.2, -0.4);
    }

    const setup = isFomoTrade ? 'FOMO' : randomChoice(SETUPS);

    const openPrice = basePrice + randomFloat(-priceRange / 2, priceRange / 2);
    const pipMove = isFomoTrade
      ? randomFloat(-90, -35)
      : randomFloat(-40, 45) + profitBias * 12;
    const closePrice = type === 'buy'
      ? openPrice + (pipMove / pipMultiplier)
      : openPrice - (pipMove / pipMultiplier);

    const openTime = new Date(currentDate);
    const holdMinutes = randomFloat(25, 420);
    const closeTime = addMinutes(openTime, holdMinutes);

    const pips = Math.abs(openPrice - closePrice) * pipMultiplier;
    const profit = Math.round((closePrice - openPrice) * (type === 'buy' ? 1 : -1) * size * 100000);

    const holdDays = Math.max(0.1, holdMinutes / (24 * 60)); // Minimum 0.1 day
    const swap = calculateSwap(pair, type, holdDays, size);

    const slDistance = isFomoTrade
      ? randomFloat(50, 100) / pipMultiplier
      : randomFloat(10, 28) / pipMultiplier;
    const tpDistance = randomFloat(20, 65) / pipMultiplier;
    const sl = type === 'buy' ? openPrice - slDistance : openPrice + slDistance;
    const tp = type === 'buy' ? openPrice + tpDistance : openPrice - tpDistance;

    // XMポイントの計算（1ロットあたり約10〜20ポイント）
    const xmPoints = Math.round(size * randomFloat(10, 20));

    trades.push({
      ticket: String(ticketNum++),
      item: pair,
      type,
      size,
      openTime: formatDateTime(openTime),
      openPrice: parseFloat(openPrice.toFixed(isJPY ? 3 : 5)),
      closeTime: formatDateTime(closeTime),
      closePrice: parseFloat(closePrice.toFixed(isJPY ? 3 : 5)),
      sl: parseFloat(sl.toFixed(isJPY ? 3 : 5)),
      tp: parseFloat(tp.toFixed(isJPY ? 3 : 5)),
      commission: -12,
      swap,
      profit,
      comment: setup,
      xmPoints
    });

    runningProfit += profit;

    // 1〜3日間隔で取引（土日スキップ、隙間をあける）
    const daysToAdd = randomFloat(1, 3);
    currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    currentDate = skipWeekends(currentDate);

    if (currentDate > endDate) {
      break;
    }
  }

  return trades;
}

function generateTransactionsForDataset(
  dataset: 'A' | 'B' | 'C',
  trades: TradeRecord[]
): { deposits: number; withdrawals: number; transactions: any[] } {
  const transactions: any[] = [];
  let totalDeposits = 0;
  let totalWithdrawals = 0;

  // 取引開始日の前に初期入金
  const firstTradeDate = new Date(trades[0].openTime);
  const initialDepositDate = new Date(firstTradeDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (dataset === 'A') {
    // データセットA: 初期入金1,000,000円、追加入金2回、出金1回
    const initialDeposit = 1000000;
    transactions.push({
      date: formatDateTime(initialDepositDate),
      type: 'deposit',
      amount: initialDeposit,
      description: '初回入金'
    });
    totalDeposits += initialDeposit;

    // 途中で追加入金（取引の1/3くらいで）
    const additionalDeposit1Date = new Date(trades[Math.floor(trades.length / 3)].openTime);
    transactions.push({
      date: formatDateTime(additionalDeposit1Date),
      type: 'deposit',
      amount: 500000,
      description: '追加入金'
    });
    totalDeposits += 500000;

    // さらに途中で追加入金
    const additionalDeposit2Date = new Date(trades[Math.floor(trades.length * 2 / 3)].openTime);
    transactions.push({
      date: formatDateTime(additionalDeposit2Date),
      type: 'deposit',
      amount: 300000,
      description: '追加入金'
    });
    totalDeposits += 300000;

    // 最後に一部出金
    const withdrawalDate = new Date(trades[trades.length - 10].closeTime);
    transactions.push({
      date: formatDateTime(withdrawalDate),
      type: 'withdrawal',
      amount: 1000000,
      description: '利益出金'
    });
    totalWithdrawals += 1000000;

  } else if (dataset === 'B') {
    // データセットB: 初期入金3,000,000円、大損後に追加入金2回
    const initialDeposit = 3000000;
    transactions.push({
      date: formatDateTime(initialDepositDate),
      type: 'deposit',
      amount: initialDeposit,
      description: '初回入金'
    });
    totalDeposits += initialDeposit;

    // 大きな損失後に追加入金（取引の1/4くらいで）
    const additionalDeposit1Date = new Date(trades[Math.floor(trades.length / 4)].openTime);
    transactions.push({
      date: formatDateTime(additionalDeposit1Date),
      type: 'deposit',
      amount: 2000000,
      description: '追加入金（損失補填）'
    });
    totalDeposits += 2000000;

    // さらに大きな損失後に追加入金
    const additionalDeposit2Date = new Date(trades[Math.floor(trades.length * 3 / 4)].openTime);
    transactions.push({
      date: formatDateTime(additionalDeposit2Date),
      type: 'deposit',
      amount: 1500000,
      description: '追加入金（損失補填）'
    });
    totalDeposits += 1500000;

  } else if (dataset === 'C') {
    // データセットC: 初期入金800,000円、中盤で利益出金、後半で追加入金
    const initialDeposit = 800000;
    transactions.push({
      date: formatDateTime(initialDepositDate),
      type: 'deposit',
      amount: initialDeposit,
      description: '初回入金'
    });
    totalDeposits += initialDeposit;

    // 中盤の利益が出ている時期に出金
    const withdrawalDate = new Date(trades[Math.floor(trades.length / 2)].closeTime);
    transactions.push({
      date: formatDateTime(withdrawalDate),
      type: 'withdrawal',
      amount: 400000,
      description: '利益出金'
    });
    totalWithdrawals += 400000;

    // 後半の損失後に追加入金
    const additionalDepositDate = new Date(trades[Math.floor(trades.length * 4 / 5)].openTime);
    transactions.push({
      date: formatDateTime(additionalDepositDate),
      type: 'deposit',
      amount: 600000,
      description: '追加入金'
    });
    totalDeposits += 600000;
  }

  return { deposits: totalDeposits, withdrawals: totalWithdrawals, transactions };
}

function calculateAccountSummary(dataset: 'A' | 'B' | 'C', trades: TradeRecord[], transactionData: any) {
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const totalSwap = trades.reduce((sum, t) => sum + t.swap, 0);
  const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0);
  const xmPointsEarned = trades.reduce((sum, t) => sum + (t.xmPoints || 0), 0);

  const swapPositive = trades.reduce((sum, t) => sum + (t.swap > 0 ? t.swap : 0), 0);
  const swapNegative = trades.reduce((sum, t) => sum + (t.swap < 0 ? t.swap : 0), 0);

  const closedPL = totalProfit + totalSwap + totalCommission;

  return {
    dataset,
    total_deposits: transactionData.deposits,
    total_withdrawals: transactionData.withdrawals,
    xm_points_earned: xmPointsEarned,
    xm_points_used: 0,
    total_swap: totalSwap,
    swap_positive: swapPositive,
    swap_negative: swapNegative,
    total_commission: totalCommission,
    total_profit: totalProfit,
    closed_pl: closedPL
  };
}

function tradesToCSV(trades: TradeRecord[], includeXMPoints: boolean = false): string {
  const header = includeXMPoints
    ? 'Ticket\tItem\tType\tSize\tOpen Time\tOpen Price\tClose Time\tClose Price\tS/L\tT/P\tCommission\tSwap\tProfit\tComment\tXM Points\n'
    : 'Ticket\tItem\tType\tSize\tOpen Time\tOpen Price\tClose Time\tClose Price\tS/L\tT/P\tCommission\tSwap\tProfit\tComment\n';
  const rows = trades.map(t => {
    const base = `${t.ticket}\t${t.item}\t${t.type}\t${t.size}\t${t.openTime}\t${t.openPrice}\t${t.closeTime}\t${t.closePrice}\t${t.sl}\t${t.tp}\t${t.commission}\t${t.swap}\t${t.profit}\t${t.comment}`;
    return includeXMPoints ? `${base}\t${t.xmPoints || 0}` : base;
  }).join('\n');
  return header + rows;
}

console.log('Generating Dataset A...');
const datasetA = generateDatasetA();
const totalProfitA = datasetA.reduce((sum, t) => sum + t.profit, 0);
const totalSwapA = datasetA.reduce((sum, t) => sum + t.swap, 0);
console.log(`Dataset A: ${datasetA.length} trades, Total Profit: ¥${totalProfitA.toLocaleString()}, Total Swap: ¥${totalSwapA.toFixed(1)}`);

const pairStatsA: Record<string, { trades: number; profit: number }> = {};
datasetA.forEach(t => {
  if (!pairStatsA[t.item]) pairStatsA[t.item] = { trades: 0, profit: 0 };
  pairStatsA[t.item].trades++;
  pairStatsA[t.item].profit += t.profit;
});
console.log('Pair breakdown:');
Object.entries(pairStatsA).forEach(([pair, stats]) => {
  console.log(`  ${pair}: ${stats.trades} trades, ¥${stats.profit.toLocaleString()}`);
});

console.log('\nGenerating Dataset B...');
const datasetB = generateDatasetB();
const totalProfitB = datasetB.reduce((sum, t) => sum + t.profit, 0);
const totalSwapB = datasetB.reduce((sum, t) => sum + t.swap, 0);
console.log(`Dataset B: ${datasetB.length} trades, Total Profit: ¥${totalProfitB.toLocaleString()}, Total Swap: ¥${totalSwapB.toFixed(1)}`);

const pairStatsB: Record<string, { trades: number; profit: number }> = {};
datasetB.forEach(t => {
  if (!pairStatsB[t.item]) pairStatsB[t.item] = { trades: 0, profit: 0 };
  pairStatsB[t.item].trades++;
  pairStatsB[t.item].profit += t.profit;
});
console.log('Pair breakdown:');
Object.entries(pairStatsB).forEach(([pair, stats]) => {
  console.log(`  ${pair}: ${stats.trades} trades, ¥${stats.profit.toLocaleString()}`);
});

console.log('\nGenerating Dataset C...');
const datasetC = generateDatasetC();
const totalProfitC = datasetC.reduce((sum, t) => sum + t.profit, 0);
const totalSwapC = datasetC.reduce((sum, t) => sum + t.swap, 0);
console.log(`Dataset C: ${datasetC.length} trades, Total Profit: ¥${totalProfitC.toLocaleString()}, Total Swap: ¥${totalSwapC.toFixed(1)}`);

const pairStatsC: Record<string, { trades: number; profit: number }> = {};
datasetC.forEach(t => {
  if (!pairStatsC[t.item]) pairStatsC[t.item] = { trades: 0, profit: 0 };
  pairStatsC[t.item].trades++;
  pairStatsC[t.item].profit += t.profit;
});
console.log('Pair breakdown:');
Object.entries(pairStatsC).forEach(([pair, stats]) => {
  console.log(`  ${pair}: ${stats.trades} trades, ¥${stats.profit.toLocaleString()}`);
});

// 中盤の利益確認
const midPeriodC = datasetC.slice(100, 301);
const midProfitC = midPeriodC.reduce((sum, t) => sum + t.profit, 0);
console.log(`Mid-period (trade 100-300): ¥${midProfitC.toLocaleString()}`);

const fs = require('fs');

// CSV出力
fs.writeFileSync('./public/demo/A.csv', tradesToCSV(datasetA));
console.log('\n✅ Dataset A saved to ./public/demo/A.csv');

fs.writeFileSync('./public/demo/B.csv', tradesToCSV(datasetB));
console.log('✅ Dataset B saved to ./public/demo/B.csv');

fs.writeFileSync('./public/demo/C.csv', tradesToCSV(datasetC, true));
console.log('✅ Dataset C saved to ./public/demo/C.csv (with XM Points)');

// トランザクションとaccount_summaryデータを生成
console.log('\nGenerating transaction and summary data...');
const transactionsA = generateTransactionsForDataset('A', datasetA);
const transactionsB = generateTransactionsForDataset('B', datasetB);
const transactionsC = generateTransactionsForDataset('C', datasetC);

const summaryA = calculateAccountSummary('A', datasetA, transactionsA);
const summaryB = calculateAccountSummary('B', datasetB, transactionsB);
const summaryC = calculateAccountSummary('C', datasetC, transactionsC);

console.log('\nDataset A Summary:');
console.log(`  Deposits: ¥${summaryA.total_deposits.toLocaleString()}`);
console.log(`  Withdrawals: ¥${summaryA.total_withdrawals.toLocaleString()}`);
console.log(`  Total Swap: ¥${summaryA.total_swap.toFixed(1)}`);
console.log(`  XM Points: ${summaryA.xm_points_earned}`);

console.log('\nDataset B Summary:');
console.log(`  Deposits: ¥${summaryB.total_deposits.toLocaleString()}`);
console.log(`  Withdrawals: ¥${summaryB.total_withdrawals.toLocaleString()}`);
console.log(`  Total Swap: ¥${summaryB.total_swap.toFixed(1)}`);

console.log('\nDataset C Summary:');
console.log(`  Deposits: ¥${summaryC.total_deposits.toLocaleString()}`);
console.log(`  Withdrawals: ¥${summaryC.total_withdrawals.toLocaleString()}`);
console.log(`  Total Swap: ¥${summaryC.total_swap.toFixed(1)}`);
console.log(`  XM Points: ${summaryC.xm_points_earned}`);

// JSON出力（マイグレーションに使用）
const summaryData = {
  datasets: { A: summaryA, B: summaryB, C: summaryC },
  transactions: {
    A: transactionsA.transactions,
    B: transactionsB.transactions,
    C: transactionsC.transactions
  }
};

fs.writeFileSync('./public/demo/account-data.json', JSON.stringify(summaryData, null, 2));
console.log('\n✅ Account data saved to ./public/demo/account-data.json');
