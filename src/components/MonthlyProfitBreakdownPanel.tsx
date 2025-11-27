import React, { useMemo } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { useTheme } from '../lib/theme.context';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import type { Trade } from '../lib/types';

type TradeWithProfit = {
  profitYen?: number;
  profitJPY?: number;
  datetime?: string;
  time?: number;
  pair?: string;
  symbol?: string;
  side?: 'LONG' | 'SHORT';
  openTime?: string;
  closePrice?: number;
  openPrice?: number;
};

function getProfit(t: TradeWithProfit): number {
  return t.profitYen ?? t.profitJPY ?? 0;
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN);
  if (typeof datetime === 'number') return new Date(datetime);

  let dt = datetime.trim();
  if (!dt) return new Date(NaN);

  dt = dt.replace(/\./g, '-').replace(' ', 'T');
  return new Date(dt);
}

interface MonthlyProfitBreakdownPanelProps {
  trades: TradeWithProfit[];
  monthLabel: string;
  onClose: () => void;
}

export default function MonthlyProfitBreakdownPanel({ trades, monthLabel, onClose }: MonthlyProfitBreakdownPanelProps) {
  const { theme } = useTheme();
  const stats = useMemo(() => {
    const totalPnL = trades.reduce((sum, t) => sum + getProfit(t), 0);
    const winTrades = trades.filter(t => getProfit(t) > 0);
    const lossTrades = trades.filter(t => getProfit(t) <= 0);

    const totalProfit = winTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const totalLoss = lossTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const avgProfit = winTrades.length > 0 ? totalProfit / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? totalLoss / lossTrades.length : 0;
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
    const profitFactor = totalLoss !== 0 ? Math.abs(totalProfit / totalLoss) : 0;

    // 日別損益の推移
    const dailyMap = new Map<string, { profit: number; count: number; wins: number }>();
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (isNaN(date.getTime())) return;
      const dateStr = date.toISOString().split('T')[0];
      const current = dailyMap.get(dateStr) || { profit: 0, count: 0, wins: 0 };
      dailyMap.set(dateStr, {
        profit: current.profit + getProfit(t),
        count: current.count + 1,
        wins: current.wins + (getProfit(t) > 0 ? 1 : 0)
      });
    });

    const sortedDaily = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const dailyLabels = sortedDaily.map(([date]) => date);
    const dailyProfits = sortedDaily.map(([, data]) => data.profit);
    const dailyCounts = sortedDaily.map(([, data]) => data.count);
    const dailyWinRates = sortedDaily.map(([, data]) => data.count > 0 ? (data.wins / data.count) * 100 : 0);

    // 累積損益の計算
    let cumulative = 0;
    const cumulativeProfits = dailyProfits.map(p => {
      cumulative += p;
      return cumulative;
    });

    // 週別集計（週の始まり = 月曜日）
    const weeklyMap = new Map<string, { profit: number; count: number; wins: number }>();
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (isNaN(date.getTime())) return;

      // 週の始まりを月曜日にする
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      const weekKey = monday.toISOString().split('T')[0];

      const current = weeklyMap.get(weekKey) || { profit: 0, count: 0, wins: 0 };
      weeklyMap.set(weekKey, {
        profit: current.profit + getProfit(t),
        count: current.count + 1,
        wins: current.wins + (getProfit(t) > 0 ? 1 : 0)
      });
    });

    const sortedWeekly = Array.from(weeklyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    // 通貨ペア別集計
    const pairMap = new Map<string, { profit: number; count: number; wins: number }>();
    trades.forEach(t => {
      const pair = t.pair || t.symbol || 'UNKNOWN';
      const current = pairMap.get(pair) || { profit: 0, count: 0, wins: 0 };
      pairMap.set(pair, {
        profit: current.profit + getProfit(t),
        count: current.count + 1,
        wins: current.wins + (getProfit(t) > 0 ? 1 : 0)
      });
    });

    const sortedPairs = Array.from(pairMap.entries())
      .sort((a, b) => b[1].profit - a[1].profit)
      .slice(0, 8);

    // 売買方向別
    const longTrades = trades.filter(t => t.side === 'LONG');
    const shortTrades = trades.filter(t => t.side === 'SHORT');
    const longProfit = longTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const shortProfit = shortTrades.reduce((sum, t) => sum + getProfit(t), 0);

    // 最大連勝・連敗の計算
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    const sortedTrades = [...trades].sort((a, b) =>
      parseDateTime(a.datetime || a.time).getTime() - parseDateTime(b.datetime || b.time).getTime()
    );

    sortedTrades.forEach(t => {
      const profit = getProfit(t);
      if (profit > 0) {
        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
      } else {
        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
        maxLossStreak = Math.max(maxLossStreak, Math.abs(currentStreak));
      }
    });

    return {
      tradeCount: trades.length,
      totalPnL,
      avgProfit,
      avgLoss,
      winRate,
      profitFactor,
      dailyLabels,
      dailyProfits,
      dailyCounts,
      dailyWinRates,
      cumulativeProfits,
      weeklyData: sortedWeekly,
      pairData: sortedPairs,
      longCount: longTrades.length,
      shortCount: shortTrades.length,
      longProfit,
      shortProfit,
      maxWinStreak,
      maxLossStreak,
    };
  }, [trades]);

  const dailyProfitChartData = useMemo(() => ({
    labels: stats.dailyLabels,
    datasets: [{
      label: '日次損益',
      data: stats.dailyProfits,
      backgroundColor: stats.dailyProfits.map(p => p >= 0 ? getAccentColor() : getLossColor()),
      borderWidth: 0,
    }],
  }), [stats.dailyLabels, stats.dailyProfits, theme]);

  const cumulativeChartData = useMemo(() => ({
    labels: stats.dailyLabels,
    datasets: [{
      label: '累積損益',
      data: stats.cumulativeProfits,
      borderColor: getAccentColor(),
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.1,
    }],
  }), [stats.dailyLabels, stats.cumulativeProfits, theme]);

  const pairChartData = useMemo(() => ({
    labels: stats.pairData.map(([pair]) => pair),
    datasets: [{
      label: '通貨ペア別損益',
      data: stats.pairData.map(([, data]) => data.profit),
      backgroundColor: stats.pairData.map(([, data]) => data.profit >= 0 ? getAccentColor() : getLossColor()),
      borderWidth: 0,
    }],
  }), [stats.pairData, theme]);

  const sideChartData = useMemo(() => ({
    labels: ['買い', '売り'],
    datasets: [{
      data: [stats.longCount, stats.shortCount],
      backgroundColor: [getLongColor(), getShortColor()],
      borderWidth: 0,
    }],
  }), [stats.longCount, stats.shortCount, theme]);

  const weeklyChartData = useMemo(() => ({
    labels: stats.weeklyData.map(([week]) => {
      const date = new Date(week);
      return `${date.getMonth() + 1}/${date.getDate()}週`;
    }),
    datasets: [{
      label: '週次損益',
      data: stats.weeklyData.map(([, data]) => data.profit),
      backgroundColor: stats.weeklyData.map(([, data]) => data.profit >= 0 ? getLongColor() : getLossColor()),
      borderWidth: 0,
    }],
  }), [stats.weeklyData, theme]);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: 680,
          height: '100vh',
          background: 'var(--surface)',
          zIndex: 1001,
          overflowY: 'auto',
          boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.2)',
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}</style>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: getAccentColor(), margin: 0 }}>
              {monthLabel} 詳細分析
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                background: 'transparent',
                fontSize: 24,
                cursor: 'pointer',
                color: 'var(--muted)',
              }}
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>月次サマリー</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>総損益</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.totalPnL >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {(stats.totalPnL >= 0 ? '+' : '') + Math.round(stats.totalPnL).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>取引回数</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
                  {stats.tradeCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>勝率</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
                  {stats.winRate.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>%</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>プロフィットファクター</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.profitFactor >= 1 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.profitFactor.toFixed(2)}
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>平均利益</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gain)' }}>
                  +{Math.round(stats.avgProfit).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>平均損失</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--loss)' }}>
                  {Math.round(stats.avgLoss).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>連勝・連敗記録</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>最大連勝</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gain)' }}>
                  {stats.maxWinStreak} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>連勝</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>最大連敗</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--loss)' }}>
                  {stats.maxLossStreak} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>連敗</span>
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>日次損益推移</h3>
            <div style={{ height: 240 }}>
              {stats.dailyLabels.length > 0 ? (
                <Bar
                  data={dailyProfitChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          title: (items: any) => {
                            const label = stats.dailyLabels[items[0].dataIndex];
                            return new Date(label).toLocaleDateString('ja-JP');
                          },
                          label: (context: any) => {
                            const idx = context.dataIndex;
                            const profit = stats.dailyProfits[idx];
                            const count = stats.dailyCounts[idx];
                            const wr = stats.dailyWinRates[idx];
                            return [
                              `損益: ${profit >= 0 ? '+' : ''}${Math.round(profit).toLocaleString('ja-JP')}円`,
                              `取引数: ${count}回`,
                              `勝率: ${wr.toFixed(1)}%`
                            ];
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value: any, index: number) => {
                            const date = new Date(stats.dailyLabels[index]);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          },
                        },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value: any) => `${Math.round(value).toLocaleString('ja-JP')}円`,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ color: 'var(--muted)' }}>データがありません</div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>累積損益カーブ</h3>
            <div style={{ height: 240 }}>
              {stats.dailyLabels.length > 0 ? (
                <Line
                  data={cumulativeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          title: (items: any) => {
                            const label = stats.dailyLabels[items[0].dataIndex];
                            return new Date(label).toLocaleDateString('ja-JP');
                          },
                          label: (context: any) => {
                            const profit = context.parsed.y;
                            return `累積損益: ${profit >= 0 ? '+' : ''}${Math.round(profit).toLocaleString('ja-JP')}円`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value: any, index: number) => {
                            const date = new Date(stats.dailyLabels[index]);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          },
                        },
                      },
                      y: {
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value: any) => `${Math.round(value).toLocaleString('ja-JP')}円`,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ color: 'var(--muted)' }}>データがありません</div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>週次損益</h3>
            <div style={{ height: 200 }}>
              {stats.weeklyData.length > 0 ? (
                <Bar
                  data={weeklyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const idx = context.dataIndex;
                            const data = stats.weeklyData[idx][1];
                            return [
                              `損益: ${data.profit >= 0 ? '+' : ''}${Math.round(data.profit).toLocaleString('ja-JP')}円`,
                              `取引数: ${data.count}回`,
                              `勝率: ${data.count > 0 ? ((data.wins / data.count) * 100).toFixed(1) : 0}%`
                            ];
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: getGridLineColor() },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value: any) => `${Math.round(value).toLocaleString('ja-JP')}円`,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ color: 'var(--muted)' }}>データがありません</div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>通貨ペア別損益</h3>
            <div style={{ height: 240 }}>
              {stats.pairData.length > 0 ? (
                <Bar
                  data={pairChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y' as const,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const idx = context.dataIndex;
                            const data = stats.pairData[idx][1];
                            return [
                              `損益: ${data.profit >= 0 ? '+' : ''}${Math.round(data.profit).toLocaleString('ja-JP')}円`,
                              `取引数: ${data.count}回`,
                              `勝率: ${data.count > 0 ? ((data.wins / data.count) * 100).toFixed(1) : 0}%`
                            ];
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value: any) => `${Math.round(value).toLocaleString('ja-JP')}円`,
                        },
                      },
                      y: {
                        grid: { color: getGridLineColor() },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ color: 'var(--muted)' }}>データがありません</div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>売買方向別</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {(stats.longCount > 0 || stats.shortCount > 0) ? (
                  <Doughnut
                    data={sideChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => `${context.label}: ${context.parsed}件`,
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div style={{ color: 'var(--muted)' }}>データがありません</div>
                )}
              </div>
              <div>
                <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>買いポジション損益</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: stats.longProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                    {(stats.longProfit >= 0 ? '+' : '') + Math.round(stats.longProfit).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {stats.longCount}回取引
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>売りポジション損益</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: stats.shortProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                    {(stats.shortProfit >= 0 ? '+' : '') + Math.round(stats.shortProfit).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {stats.shortCount}回取引
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
