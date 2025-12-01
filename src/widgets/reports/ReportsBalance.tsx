import React, { useEffect, useMemo, useState } from "react";
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor, createDrawdownGradient } from "../../lib/chartColors";
import { Line, Bar } from "react-chartjs-2";
import { ja } from 'date-fns/locale';
import { useDataset } from "../../lib/dataset.context";
import type { Trade } from "../../lib/types";
import { filterTrades, getTradeProfit, isValidCurrencyPair } from "../../lib/filterTrades";
import { HelpIcon } from "../../components/common/HelpIcon";
import EquityCurveDayDetailDrawer from "../../components/reports/EquityCurveDayDetailDrawer";
import DDEventDetailDrawer from "../../components/reports/DDEventDetailDrawer";

interface AccountSnapshot {
  date: string;
  balance: number;
  equity: number;
  leverage?: number;
  marginLevel?: number;
}

interface TransactionEvent {
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  memo?: string;
}

export default function ReportsBalance() {
  const { dataset, filters, useDatabase, isInitialized } = useDataset();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accountData, setAccountData] = useState<AccountSnapshot[]>([]);
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [equityCurveDayPanel, setEquityCurveDayPanel] = useState<{ dateLabel: string; trades: Trade[] } | null>(null);
  const [ddEventPanel, setDdEventPanel] = useState<{ clickedDate: string; allTrades: Trade[] } | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!isMounted) return;
      if (!isInitialized) return;

      setIsLoading(true);
      try {
        let tradesData: Trade[];

        if (useDatabase) {
          const { getAllTrades } = await import('../../lib/db.service');
          const data = await getAllTrades(dataset);

          const mapped: Trade[] = (data || [])
            .filter((t: any) => isValidCurrencyPair(t.item))
            .map((t: any) => {
              const openTime = typeof t.open_time === 'string' ? t.open_time : new Date(t.open_time).toISOString();
              const closeTime = typeof t.close_time === 'string' ? t.close_time : new Date(t.close_time).toISOString();

              return {
                id: t.id || t.ticket || String(Math.random()),
                datetime: closeTime,
                openTime: openTime,
                closeTime: closeTime,
                pair: t.item || t.pair || t.symbol || '',
                side: (t.action?.toUpperCase() === 'BUY' || t.action?.toUpperCase() === 'LONG') ? 'LONG' : 'SHORT',
                volume: Number(t.size || t.volume || 0),
                profitYen: Number(t.profit || 0),
                pips: Number(t.pips || 0),
                swap: Number(t.swap || 0),
                commission: Number(t.commission || 0),
              } as Trade;
            });

          if (isMounted) setTrades(mapped);
          tradesData = mapped;
        } else {
          const text = await fetch('/demo/' + dataset + '.csv').then(r => r.text());
          const { parseCsvText } = await import('../../lib/csv');
          const raw = parseCsvText(text);
          if (isMounted) setTrades(raw);
          tradesData = raw;
        }

        const accountResponse = await fetch('/demo/account-data.json');
        const accountJson = await accountResponse.json();
        const datasetTransactions = accountJson.transactions?.[dataset] || [];

        const formattedTransactions: TransactionEvent[] = datasetTransactions.map((tx: any) => ({
          date: tx.date,
          type: tx.type,
          amount: tx.amount,
          memo: tx.description,
        }));

        if (isMounted) setTransactions(formattedTransactions);

        const dailyPnL: Record<string, number> = {};
        tradesData.forEach((trade: any) => {
          const closeTime = trade.closeTime || trade.datetime || trade.time;
          if (!closeTime) return;
          const date = new Date(closeTime);
          const dateStr = date.toISOString().split('T')[0];
          const profit = trade.profitJPY || trade.profitYen || 0;
          dailyPnL[dateStr] = (dailyPnL[dateStr] || 0) + profit;
        });

        const accountSnapshots: AccountSnapshot[] = [];
        const startDate = new Date('2024-05-01');
        const endDate = new Date();
        let balance = 1000000;
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];

          const txOnThisDay = formattedTransactions.find(t => {
            const txDate = new Date(t.date.replace(/\./g, '-').split(' ')[0]);
            return txDate.toISOString().split('T')[0] === dateStr;
          });

          if (txOnThisDay) {
            if (txOnThisDay.type === 'deposit') {
              balance += txOnThisDay.amount;
            } else {
              balance -= txOnThisDay.amount;
            }
          }

          const dailyProfit = dailyPnL[dateStr] || 0;
          balance += dailyProfit;

          accountSnapshots.push({
            date: dateStr,
            balance: Math.max(balance, 0),
            equity: Math.max(balance, 0),
            leverage: 5 + Math.random() * 10,
            marginLevel: 500 + Math.random() * 450,
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (isMounted) setAccountData(accountSnapshots);

      } catch (error) {
        console.error('データ読み込みエラー:', error);
        if (isMounted) {
          setTrades([]);
          setAccountData([]);
          setTransactions([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [dataset, useDatabase, isInitialized]);

  const filtered = useMemo(() => filterTrades(trades, filters), [trades, filters]);

  const kpiMetrics = useMemo(() => {
    if (filtered.length === 0 || accountData.length === 0) {
      return {
        netAssetChange: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        swapTotal: 0,
        peakBalance: 0,
        maxDrawdown: 0,
        realGrowthRate: 0,
        avgLeverage: 0,
      };
    }

    const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
    const swapTotal = filtered.reduce((sum, t) => sum + (t.swap || 0), 0);

    const initialBalance = accountData[0]?.balance || 0;
    const finalBalance = accountData[accountData.length - 1]?.balance || 0;
    const netAssetChange = finalBalance - initialBalance - totalDeposits + totalWithdrawals;
    const peakBalance = Math.max(...accountData.map(s => s.balance));

    let maxDD = 0;
    let peak = initialBalance;
    accountData.forEach(snapshot => {
      const adjustedBalance = snapshot.balance - totalDeposits + totalWithdrawals;
      if (adjustedBalance > peak) peak = adjustedBalance;
      const dd = ((adjustedBalance - peak) / peak) * 100;
      if (dd < maxDD) maxDD = dd;
    });

    const realGrowthRate = initialBalance > 0 ? ((netAssetChange / initialBalance) * 100) : 0;
    const avgLeverage = accountData.reduce((sum, s) => sum + (s.leverage || 0), 0) / accountData.length;

    return {
      netAssetChange,
      totalDeposits,
      totalWithdrawals,
      swapTotal,
      peakBalance,
      maxDrawdown: maxDD,
      realGrowthRate,
      avgLeverage,
    };
  }, [filtered, accountData, transactions]);

  // 資産残高グラフ（入出金を含む口座残高）
  const balanceChartData = useMemo(() => {
    if (accountData.length === 0) return null;

    const labels = accountData.map(s => new Date(s.date).getTime());
    const depositPoints: number[] = [];
    const withdrawalPoints: number[] = [];

    accountData.forEach((snapshot) => {
      const hasDeposit = transactions.some(t => {
        const txDate = new Date(t.date.replace(/\./g, '-').split(' ')[0]);
        return t.type === 'deposit' && txDate.toISOString().split('T')[0] === snapshot.date;
      });
      const hasWithdrawal = transactions.some(t => {
        const txDate = new Date(t.date.replace(/\./g, '-').split(' ')[0]);
        return t.type === 'withdrawal' && txDate.toISOString().split('T')[0] === snapshot.date;
      });

      depositPoints.push(hasDeposit ? snapshot.balance : null as any);
      withdrawalPoints.push(hasWithdrawal ? snapshot.balance : null as any);
    });

    return {
      labels,
      datasets: [
        {
          label: '口座残高',
          data: accountData.map(s => s.balance),
          borderColor: getAccentColor(),
          backgroundColor: getAccentColor(0.1),
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2.5,
        },
        {
          label: '入金',
          data: depositPoints,
          pointRadius: 6,
          pointBackgroundColor: getLongColor(),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          showLine: false,
        },
        {
          label: '出金',
          data: withdrawalPoints,
          pointRadius: 6,
          pointBackgroundColor: getLossColor(),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          showLine: false,
        },
      ],
    };
  }, [accountData, transactions]);

  // 累積取引損益グラフ（入出金を除いた取引損益のみ）
  const equityChartData = useMemo(() => {
    if (filtered.length === 0) return null;

    const sorted = [...filtered].sort((a, b) => {
      const timeA = new Date(a.closeTime || a.datetime || 0).getTime();
      const timeB = new Date(b.closeTime || b.datetime || 0).getTime();
      return timeA - timeB;
    });

    // 有効な日時を持つ取引のみをフィルター
    const validTrades = sorted.filter(t => {
      const time = new Date(t.closeTime || t.datetime || 0).getTime();
      return !isNaN(time) && time > 0;
    });

    if (validTrades.length === 0) return null;

    const labels = validTrades.map(t => new Date(t.closeTime || t.datetime || 0).getTime());
    const equity: number[] = [];
    let acc = 0;

    for (const t of validTrades) {
      const profit = t.profitJPY || t.profitYen || 0;
      acc += profit;
      equity.push(acc);
    }

    return {
      labels,
      datasets: [{
        label: '累積取引損益（Equity Curve）',
        data: equity,
        borderWidth: 2.5,
        borderColor: (context: any) => {
          if (!context.chart.data.datasets[0].data) return getAccentColor();
          const dataIndex = context.dataIndex;
          if (dataIndex === undefined) return getAccentColor();
          const value = context.chart.data.datasets[0].data[dataIndex] as number;
          return value >= 0 ? getAccentColor(1) : getLossColor(1);
        },
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea, scales} = chart;
          if (!chartArea || !scales.y) return getAccentColor(0.1);

          const yScale = scales.y;
          const zeroY = yScale.getPixelForValue(0);
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);

          if (zeroY >= chartArea.top && zeroY <= chartArea.bottom) {
            const posRatio = (zeroY - chartArea.top) / (chartArea.bottom - chartArea.top);
            const stopBefore = Math.max(0, Math.min(0.99, posRatio - 0.01));
            const stopAfter = Math.max(0.01, Math.min(1, posRatio + 0.01));

            gradient.addColorStop(0, getAccentColor(0.3));
            gradient.addColorStop(stopBefore, getAccentColor(0.05));
            gradient.addColorStop(stopAfter, getLossColor(0.05));
            gradient.addColorStop(1, getLossColor(0.3));
          } else if (zeroY < chartArea.top) {
            gradient.addColorStop(0, getLossColor(0.3));
            gradient.addColorStop(1, getLossColor(0.05));
          } else {
            gradient.addColorStop(0, getAccentColor(0.3));
            gradient.addColorStop(1, getAccentColor(0.05));
          }

          return gradient;
        },
        pointRadius: 0,
        fill: 'origin',
        tension: 0.1,
        segment: {
          borderColor: (ctx: any) => {
            return ctx.p1.parsed.y >= 0 ? getAccentColor() : getLossColor();
          }
        }
      }]
    };
  }, [filtered]);

  const leverageChartData = useMemo(() => {
    if (accountData.length === 0) return null;

    return {
      labels: accountData.map(s => {
        const date = new Date(s.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: '実効レバレッジ',
          data: accountData.map(s => s.leverage || 0),
          borderColor: getAccentColor(),
          backgroundColor: getAccentColor(0.2),
          fill: true,
          tension: 0.4,
          Radius: 0,
        },
      ],
    };
  }, [accountData]);

  const marginLevelChartData = useMemo(() => {
    if (accountData.length === 0) return null;

    return {
      labels: accountData.map(s => {
        const date = new Date(s.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: '証拠金維持率の推移',
          data: accountData.map(s => s.marginLevel || 0),
          borderColor: getAccentColor(),
          backgroundColor: getAccentColor(0.2),
          fill: true,
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    };
  }, [accountData]);

  // ドローダウンチャート
  const drawdownChartData = useMemo(() => {
    if (filtered.length === 0) return null;

    const sorted = [...filtered].sort((a, b) => {
      const timeA = new Date(a.closeTime || a.datetime || 0).getTime();
      const timeB = new Date(b.closeTime || b.datetime || 0).getTime();
      return timeA - timeB;
    });

    const validTrades = sorted.filter(t => {
      const time = new Date(t.closeTime || t.datetime || 0).getTime();
      return !isNaN(time) && time > 0;
    });

    if (validTrades.length === 0) return null;

    const labels = validTrades.map(t => new Date(t.closeTime || t.datetime || 0).getTime());
    let equity = 0;
    let peak = 0;
    const dd: number[] = [];

    for (const t of validTrades) {
      const profit = t.profitJPY || t.profitYen || 0;
      equity += profit;
      if (equity > peak) peak = equity;
      dd.push(peak - equity);
    }

    return {
      labels,
      datasets: [{
        label: 'ドローダウン（円）',
        data: dd,
        borderWidth: 2.5,
        borderColor: getLossColor(1),
        pointRadius: 0,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return getLossColor(0.1);
          return createDrawdownGradient(ctx, chartArea);
        },
        tension: 0.1,
      }]
    };
  }, [filtered]);

  // 勝ち負け集計チャート
  const winLossChartData = useMemo(() => {
    if (filtered.length === 0) return null;

    let winCount = 0;
    let lossCount = 0;
    let winProfit = 0;
    let lossProfit = 0;

    filtered.forEach(t => {
      const profit = t.profitJPY || t.profitYen || 0;
      if (profit > 0) {
        winCount++;
        winProfit += profit;
      } else if (profit < 0) {
        lossCount++;
        lossProfit += Math.abs(profit);
      }
    });

    const winRate = (winCount + lossCount) > 0 ? ((winCount / (winCount + lossCount)) * 100).toFixed(1) : '0.0';

    return {
      winCount,
      lossCount,
      winProfit,
      lossProfit,
      winRate,
      data: {
        labels: ['勝ち', '負け'],
        datasets: [
          {
            label: '取引数',
            data: [winCount, lossCount],
            backgroundColor: [getAccentColor(0.8), getLossColor(0.8)],
            borderColor: [getAccentColor(1), getLossColor(1)],
            borderWidth: 2,
          }
        ]
      }
    };
  }, [filtered]);

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* 現在の状態 */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          現在の状態
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title">
            純資産増減
            <HelpIcon text="取引損益から入出金を差し引いた、実質的な資産の増減額です。" />
          </div>
          <div className="kpi-value" style={{ color: kpiMetrics.netAssetChange >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
            {kpiMetrics.netAssetChange >= 0 ? '+' : ''}{Math.round(kpiMetrics.netAssetChange).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: kpiMetrics.netAssetChange >= 0 ? 'var(--gain)' : 'var(--loss)' }}>円</span>
          </div>
          <div className="kpi-desc">入出金を除いた資産増減</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            最大資金DD
            <HelpIcon text="入出金を除いた資産の最大下落幅" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--loss)' }}>
            {Math.abs(kpiMetrics.maxDrawdown).toFixed(1)} <span className="kpi-unit" style={{ color: 'var(--loss)' }}>%</span>
          </div>
          <div className="kpi-desc">入出金を除いた最大下落幅</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            最高資産
            <HelpIcon text="口座残高が最も高かった時点の金額です。ピークからの下落度合いを確認できます。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>
            {Math.round(kpiMetrics.peakBalance).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--accent)' }}>円</span>
          </div>
          <div className="kpi-desc">残高の過去最高値</div>
        </div>
      </div>

      {/* これまでの推移 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          これまでの推移
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title">
            累計入金額
            <HelpIcon text="口座への入金総額です。追加資金への依存度を把握できます。" />
          </div>
          <div className="kpi-value">
            {Math.round(kpiMetrics.totalDeposits).toLocaleString('ja-JP')} <span className="kpi-unit">円</span>
          </div>
          <div className="kpi-desc">これまでの入金総額</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            累計出金額
            <HelpIcon text="口座からの出金総額です。利益確定の習慣を確認できます。" />
          </div>
          <div className="kpi-value">
            {Math.round(kpiMetrics.totalWithdrawals).toLocaleString('ja-JP')} <span className="kpi-unit">円</span>
          </div>
          <div className="kpi-desc">これまでの出金総額</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            スワップ累計
            <HelpIcon text="ポジションの保有期間に応じて発生したスワップポイントの累計です。" />
          </div>
          <div className="kpi-value" style={{ color: kpiMetrics.swapTotal >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
            {kpiMetrics.swapTotal >= 0 ? '+' : ''}{Math.round(kpiMetrics.swapTotal).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: kpiMetrics.swapTotal >= 0 ? 'var(--gain)' : 'var(--loss)' }}>円</span>
          </div>
          <div className="kpi-desc">スワップ損益の累計</div>
        </div>
      </div>

      {/* あなたの傾向 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          あなたの傾向
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title">
            平均実効レバレッジ
            <HelpIcon text="実際の取引で使用しているレバレッジの平均値です。リスク水準の確認に使います。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>
            {kpiMetrics.avgLeverage.toFixed(1)} <span className="kpi-unit" style={{ color: 'var(--accent)' }}>倍</span>
          </div>
          <div className="kpi-desc">期間内の平均レバレッジ</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            実質成長率
            <HelpIcon text="入出金を除外した、純粋なトレードによる資産成長率です。" />
          </div>
          <div className="kpi-value" style={{ color: kpiMetrics.realGrowthRate >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
            {kpiMetrics.realGrowthRate >= 0 ? '+' : ''}{kpiMetrics.realGrowthRate.toFixed(1)} <span className="kpi-unit" style={{ color: kpiMetrics.realGrowthRate >= 0 ? 'var(--gain)' : 'var(--loss)' }}>%</span>
          </div>
          <div className="kpi-desc">入金額に対する増加率</div>
        </div>

        <div className="kpi-card" style={{ visibility: 'hidden' }}>
          {/* 空のカード（グリッドレイアウト維持用） */}
        </div>
      </div>

      {/* 資産残高と累積取引損益を横並びで表示 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* 資産残高グラフ */}
        <div className="kpi-card">
          <div className="kpi-title">
            資産残高
            <HelpIcon text="入出金を含む口座残高の推移を表示します。" />
          </div>
          <div className="kpi-desc" style={{ marginBottom: 12 }}>入出金を含む口座残高の推移</div>
          {balanceChartData ? (
            <div style={{ height: 320 }}>
              <Line
                data={balanceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        font: { size: 12 },
                        usePointStyle: true,
                        padding: 15,
                      },
                      onClick: (e, legendItem, legend) => {
                        const index = legendItem.datasetIndex!;
                        const ci = legend.chart;
                        const meta = ci.getDatasetMeta(index);
                        meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                        ci.update();
                      },
                    },
                    tooltip: {
                      callbacks: {
                        title: (items: any) => items[0]?.parsed?.x ? new Date(items[0].parsed.x).toLocaleDateString('ja-JP') : '',
                        label: (context: any) => {
                          if (context.datasetIndex === 0) {
                            return `残高: ${Math.round(context.parsed.y).toLocaleString('ja-JP')}円`;
                          }
                          if (context.datasetIndex === 1) {
                            return `入金イベント`;
                          }
                          if (context.datasetIndex === 2) {
                            return `出金イベント`;
                          }
                          return context.dataset.label;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      type: 'time' as const,
                      adapters: { date: { locale: ja } },
                      grid: { color: getGridLineColor() },
                      ticks: { font: { size: 11 }, maxRotation: 0 },
                      time: { tooltipFormat: 'yyyy/MM/dd' }
                    },
                    y: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (value: any) => `${(value / 1000).toFixed(0)}k`,
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>

        {/* 累積取引損益グラフ */}
        <div className="kpi-card">
          <div className="kpi-title">
            累積取引損益（Equity Curve）
            <HelpIcon text="入出金を除いた損益の累積" />
          </div>
          <div className="kpi-desc" style={{ marginBottom: 12 }}>入出金を除いた損益の累積</div>
          {equityChartData ? (
            <div style={{ height: 320 }}>
              <Line
                data={equityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  spanGaps: true,
                  interaction: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                  onClick: (event: any, elements: any) => {
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      const sorted = [...filtered].sort((a, b) => {
                        const timeA = new Date(a.closeTime || a.datetime || 0).getTime();
                        const timeB = new Date(b.closeTime || b.datetime || 0).getTime();
                        return timeA - timeB;
                      });
                      const validTrades = sorted.filter(t => {
                        const time = new Date(t.closeTime || t.datetime || 0).getTime();
                        return !isNaN(time) && time > 0;
                      });
                      if (index < validTrades.length) {
                        const clickedTrade = validTrades[index];
                        const clickedTime = new Date(clickedTrade.closeTime || clickedTrade.datetime || 0);
                        const dateStr = clickedTime.toISOString().split('T')[0];
                        const dayTrades = validTrades.filter(t => {
                          const tradeDate = new Date(t.closeTime || t.datetime || 0);
                          return tradeDate.toISOString().split('T')[0] === dateStr;
                        });
                        setEquityCurveDayPanel({ dateLabel: dateStr, trades: dayTrades });
                      }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items: any) => items[0]?.parsed?.x ? new Date(items[0].parsed.x).toLocaleString('ja-JP') : '',
                        label: (item: any) => `累積取引損益（Equity Curve）: ${new Intl.NumberFormat('ja-JP').format(item.parsed.y)} 円`
                      }
                    }
                  },
                  scales: {
                    x: {
                      type: 'time' as const,
                      adapters: { date: { locale: ja } },
                      grid: { color: getGridLineColor() },
                      ticks: { font: { size: 11 }, maxRotation: 0 },
                      time: { tooltipFormat: 'yyyy/MM/dd HH:mm' }
                    },
                    y: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (v: any) => new Intl.NumberFormat('ja-JP').format(v) + ' 円'
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>
      </div>

      {/* 最大下落幅の推移（ドローダウン）と勝ち負け集計 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* ドローダウンチャート */}
        <div className="kpi-card">
          <div className="kpi-title">
            最大下落幅の推移（ドローダウン）
            <HelpIcon text="資産のピークからの下落幅を示します。リスク管理に重要な指標です。" />
          </div>
          <div className="kpi-desc" style={{ marginBottom: 12 }}>エクイティカーブの最大下落幅</div>
          {drawdownChartData ? (
            <div style={{ height: 320 }}>
              <Line
                data={drawdownChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  spanGaps: true,
                  interaction: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                  onClick: (event: any, elements: any) => {
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      const sorted = [...filtered].sort((a, b) => {
                        const timeA = new Date(a.closeTime || a.datetime || 0).getTime();
                        const timeB = new Date(b.closeTime || b.datetime || 0).getTime();
                        return timeA - timeB;
                      });
                      const validTrades = sorted.filter(t => {
                        const time = new Date(t.closeTime || t.datetime || 0).getTime();
                        return !isNaN(time) && time > 0;
                      });
                      if (index < validTrades.length) {
                        const clickedTrade = validTrades[index];
                        const clickedTime = new Date(clickedTrade.closeTime || clickedTrade.datetime || 0);
                        const dateStr = clickedTime.toISOString().split('T')[0];
                        setDdEventPanel({ clickedDate: dateStr, allTrades: validTrades });
                      }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items: any) => items[0]?.parsed?.x ? new Date(items[0].parsed.x).toLocaleString('ja-JP') : '',
                        label: (item: any) => `DD: ${new Intl.NumberFormat('ja-JP').format(item.parsed.y)} 円`
                      }
                    }
                  },
                  scales: {
                    x: {
                      type: 'time' as const,
                      adapters: { date: { locale: ja } },
                      grid: { color: getGridLineColor() },
                      ticks: { font: { size: 11 }, maxRotation: 0 },
                      time: { tooltipFormat: 'yyyy/MM/dd HH:mm' }
                    },
                    y: {
                      beginAtZero: true,
                      reverse: true,
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (v: any) => new Intl.NumberFormat('ja-JP').format(v) + ' 円'
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>

        {/* 勝ち負け集計チャート */}
        <div className="kpi-card">
          <div className="kpi-title">
            勝ち負け集計
            <HelpIcon text="勝ちと負けの取引数と損益を集計します。勝率と損益のバランスを確認できます。" />
          </div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{winLossChartData?.winRate || '0.0'}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>勝ち</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gain)' }}>{winLossChartData?.winCount || 0}回</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>負け</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--loss)' }}>{winLossChartData?.lossCount || 0}回</div>
            </div>
          </div>
          {winLossChartData ? (
            <div style={{ height: 240, position: 'relative', zIndex: 10 }}>
              <Bar
                data={winLossChartData.data}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      enabled: true,
                      position: 'nearest' as const,
                      yAlign: 'bottom' as const,
                      callbacks: {
                        label: (context: any) => {
                          const index = context.dataIndex;
                          const count = context.parsed.y;
                          const profit = index === 0 ? winLossChartData.winProfit : winLossChartData.lossProfit;
                          const total = winLossChartData.winCount + winLossChartData.lossCount;
                          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                          return [
                            `取引数: ${count}回 (${percentage}%)`,
                            `損益: ${index === 0 ? '+' : '-'}${new Intl.NumberFormat('ja-JP').format(profit)}円`
                          ];
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: { color: getGridLineColor() },
                      ticks: { font: { size: 11 } }
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (value: any) => `${value}回`
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title">
            実効レバレッジ推移
            <HelpIcon text="実際の取引に使用しているレバレッジの推移を表示します。" />
          </div>
          {leverageChartData ? (
            <div style={{ height: 200 }}>
              <Line
                data={leverageChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: getGridLineColor() }, ticks: { font: { size: 11 } } },
                    y: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (value: any) => `${value}倍`,
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            証拠金維持率
            <HelpIcon text="証拠金維持率の推移（口座の安全性指標）" />
          </div>
          {marginLevelChartData ? (
            <div style={{ height: 200 }}>
              <Line
                data={marginLevelChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: getGridLineColor() }, ticks: { font: { size: 11 } } },
                    y: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (value: any) => `${value}%`,
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: "bold", color: "var(--ink)", display: "flex", alignItems: "center" }}>
          入出金イベント一覧
          <HelpIcon text="口座への入金・出金の履歴を時系列で表示" />
        </h3>
        {transactions.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--line)' }}>
                <th style={{ padding: 10, textAlign: 'left', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>日付</th>
                <th style={{ padding: 10, textAlign: 'left', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>種類</th>
                <th style={{ padding: 10, textAlign: 'right', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>金額</th>
                <th style={{ padding: 10, textAlign: 'left', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>メモ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => {
                const txDate = new Date(tx.date.replace(/\./g, '-').split(' ')[0]);
                return (
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid var(--line)', height: 44, cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--chip)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: 10, fontSize: 13 }}>{txDate.toLocaleDateString('ja-JP')}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: tx.type === 'deposit' ? getLongColor(0.1) : getLossColor(0.1),
                        color: tx.type === 'deposit' ? getLongColor() : getLossColor(),
                      }}>
                        {tx.type === 'deposit' ? '入金' : '出金'}
                      </span>
                    </td>
                    <td style={{ padding: 10, textAlign: 'right', fontSize: 15, fontWeight: 700, color: tx.type === 'deposit' ? 'var(--gain)' : 'var(--loss)' }}>
                      {tx.type === 'deposit' ? '+' : '-'}
                      {Math.round(tx.amount).toLocaleString('ja-JP')} <span style={{ fontSize: 13 }}>円</span>
                    </td>
                    <td style={{ padding: 10, fontSize: 13, color: 'var(--muted)' }}>
                      {tx.memo || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>入出金イベントがありません</div>
        )}
      </div>

      {/* 改善ポイント */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          改善ポイント
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>DDの本質的深さ</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>
            入出金補正後の最大DDは <strong>{Math.abs(kpiMetrics.maxDrawdown).toFixed(1)}%</strong>。
            {Math.abs(kpiMetrics.maxDrawdown) > 20 ? 'リスク許容度を超えている状態' : '適切な範囲内'}
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>レバレッジと損失の相関</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>
            平均実効レバレッジは <strong>{kpiMetrics.avgLeverage.toFixed(1)}倍</strong>。
            {kpiMetrics.avgLeverage > 25 ? '高レバレッジ環境での取引が継続' : '適切なレバレッジ管理'}
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>入出金のクセ</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>
            累計入金 <strong>{Math.round(kpiMetrics.totalDeposits / 10000).toFixed(0)}万円</strong>、
            累計出金 <strong>{Math.round(kpiMetrics.totalWithdrawals / 10000).toFixed(0)}万円</strong>。
            {kpiMetrics.totalDeposits > kpiMetrics.totalWithdrawals * 2 ? '追加入金への依存度が高い状態' : '健全な資金管理'}
          </div>
        </div>
      </div>

      {/* 次のアクション */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          次のアクション
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            ロットサイズを見直す
          </div>
        </div>
        <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            レバレッジ上限を20倍以内に設定
          </div>
        </div>
        <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            週次で利益出金ルールを設定
          </div>
        </div>
      </div>

      {/* 参考情報 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          参考情報
        </h3>
      </div>

      {/* ドリルダウンパネル */}
      {equityCurveDayPanel && (
        <EquityCurveDayDetailDrawer
          date={equityCurveDayPanel.dateLabel}
          trades={equityCurveDayPanel.trades}
          onClose={() => setEquityCurveDayPanel(null)}
        />
      )}

      {ddEventPanel && (
        <DDEventDetailDrawer
          clickedDate={ddEventPanel.clickedDate}
          allTrades={ddEventPanel.allTrades}
          onClose={() => setDdEventPanel(null)}
        />
      )}
    </div>
  );
}
