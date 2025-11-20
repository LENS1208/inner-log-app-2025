import React, { useMemo } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor, createProfitGradient } from "../lib/chartColors";
import { useTheme } from '../lib/theme.context';
import { Bar, Line } from 'react-chartjs-2';
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
  setup?: string;
  comment?: string;
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

interface SetupBreakdownPanelProps {
  trades: TradeWithProfit[];
  setupLabel: string;
  onClose: () => void;
}

export default function SetupBreakdownPanel({ trades, setupLabel, onClose }: SetupBreakdownPanelProps) {
  const { theme } = useTheme();
  const stats = useMemo(() => {
    const winTrades = trades.filter(t => getProfit(t) > 0);
    const lossTrades = trades.filter(t => getProfit(t) <= 0);

    const totalPnL = trades.reduce((sum, t) => sum + getProfit(t), 0);
    const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0;

    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;

    const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + getProfit(t), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((sum, t) => sum + getProfit(t), 0) / lossTrades.length) : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

    const sortedByProfit = [...trades].sort((a, b) => getProfit(b) - getProfit(a));
    const maxProfit = sortedByProfit.length > 0 ? getProfit(sortedByProfit[0]) : 0;
    const minProfit = sortedByProfit.length > 0 ? getProfit(sortedByProfit[sortedByProfit.length - 1]) : 0;

    const profits = trades.map(t => getProfit(t)).sort((a, b) => a - b);
    const q1 = profits[Math.floor(profits.length * 0.25)] || 0;
    const median = profits[Math.floor(profits.length * 0.5)] || 0;
    const q3 = profits[Math.floor(profits.length * 0.75)] || 0;

    let maxConsecutiveWins = 0;
    let currentConsecutiveWins = 0;
    trades.forEach(t => {
      if (getProfit(t) > 0) {
        currentConsecutiveWins++;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
      } else {
        currentConsecutiveWins = 0;
      }
    });

    const scoreWinRate = Math.min(winRate / 60 * 40, 40);
    const scoreRR = Math.min(riskRewardRatio / 3 * 40, 40);
    const scoreStability = Math.min((1 - (q3 - q1) / (maxProfit - minProfit || 1)) * 20, 20);
    const totalScore = Math.round(scoreWinRate + scoreRR + scoreStability);

    let scoreLabel = '要改善';
    if (totalScore >= 80) scoreLabel = '優秀';
    else if (totalScore >= 50) scoreLabel = '良好';

    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = parseDateTime(a.datetime || a.time).getTime();
      const dateB = parseDateTime(b.datetime || b.time).getTime();
      return dateA - dateB;
    });

    const cumulativePnL = sortedTrades.reduce((acc, t) => {
      const lastValue = acc.length > 0 ? acc[acc.length - 1] : 0;
      return [...acc, lastValue + getProfit(t)];
    }, [] as number[]);

    const heatmapData = new Map<string, { profit: number; count: number }>();
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.set(`${day}-${hour}`, { profit: 0, count: 0 });
      }
    }

    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const day = date.getDay();
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        const current = heatmapData.get(key)!;
        current.profit += getProfit(t);
        current.count += 1;
      }
    });

    const pairFrequency = new Map<string, number>();
    trades.forEach(t => {
      const pair = t.pair || t.symbol;
      if (pair) {
        pairFrequency.set(pair, (pairFrequency.get(pair) || 0) + 1);
      }
    });
    const topPairs = Array.from(pairFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pair, count]) => ({ pair, count }));

    const recommendations: string[] = [];

    const hourStats = new Map<number, { win: number; total: number }>();
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        if (!hourStats.has(hour)) hourStats.set(hour, { win: 0, total: 0 });
        const stat = hourStats.get(hour)!;
        stat.total++;
        if (getProfit(t) > 0) stat.win++;
      }
    });

    const bestHour = Array.from(hourStats.entries())
      .filter(([_, stat]) => stat.total >= 3)
      .sort((a, b) => (b[1].win / b[1].total) - (a[1].win / a[1].total))[0];

    const worstHour = Array.from(hourStats.entries())
      .filter(([_, stat]) => stat.total >= 3)
      .sort((a, b) => (a[1].win / a[1].total) - (b[1].win / b[1].total))[0];

    if (bestHour && worstHour) {
      const bestRate = (bestHour[1].win / bestHour[1].total * 100).toFixed(0);
      const worstRate = (worstHour[1].win / worstHour[1].total * 100).toFixed(0);
      recommendations.push(`${bestHour[0]}時台の勝率${bestRate}%が最高 → この時間帯に集中すべき`);
      recommendations.push(`${worstHour[0]}時台の勝率${worstRate}%が最低 → この時間帯は避けるべき`);
    }

    if (riskRewardRatio < 1.5) {
      recommendations.push(`リスクリワードレシオが${riskRewardRatio.toFixed(2)}と低い → 利確目標を上げるか損切りを早めるべき`);
    }

    const longHoldingTrades = trades.filter(t => {
      if (typeof t.time === 'number' && (t as any).openTimeMs) {
        const holdingTimeMin = (t.time - (t as any).openTimeMs) / (1000 * 60);
        return holdingTimeMin > 120;
      }
      return false;
    });

    if (longHoldingTrades.length > 0) {
      const longHoldingWinRate = longHoldingTrades.filter(t => getProfit(t) > 0).length / longHoldingTrades.length * 100;
      if (longHoldingWinRate < 40) {
        recommendations.push(`保有時間2時間超の勝率${longHoldingWinRate.toFixed(0)}%が低い → 早めの決済を検討すべき`);
      }
    }

    if (topPairs.length > 0) {
      const topPairTrades = trades.filter(t => (t.pair || t.symbol) === topPairs[0].pair);
      const topPairWinRate = topPairTrades.filter(t => getProfit(t) > 0).length / topPairTrades.length * 100;
      if (topPairWinRate < 40) {
        recommendations.push(`${topPairs[0].pair}での勝率${topPairWinRate.toFixed(0)}%が低い → この通貨ペアは避けるべき`);
      } else if (topPairWinRate > 60) {
        recommendations.push(`${topPairs[0].pair}での勝率${topPairWinRate.toFixed(0)}%が高い → この通貨ペアに特化すべき`);
      }
    }

    return {
      tradeCount: trades.length,
      totalScore,
      scoreLabel,
      expectancy,
      riskRewardRatio,
      winRate,
      maxConsecutiveWins,
      maxProfit,
      minProfit,
      median,
      q1,
      q3,
      avgWin,
      avgLoss,
      sortedTrades,
      cumulativePnL,
      heatmapData,
      topPairs,
      recommendations,
    };
  }, [trades]);

  const performanceMatrixData = useMemo(() => ({
    labels: ['勝率', 'R:R比', '最大連勝'],
    datasets: [
      {
        label: '勝率（%）',
        data: [stats.winRate, 0, 0],
        backgroundColor: getAccentColor(),
        yAxisID: 'y',
      },
      {
        label: 'R:R比',
        data: [0, stats.riskRewardRatio, 0],
        backgroundColor: getLongColor(),
        yAxisID: 'y1',
      },
      {
        label: '最大連勝数',
        data: [0, 0, stats.maxConsecutiveWins],
        backgroundColor: getShortColor(),
        yAxisID: 'y2',
      },
    ],
  }), [stats.winRate, stats.riskRewardRatio, stats.maxConsecutiveWins, theme]);

  const cumulativePnLData = useMemo(() => ({
    labels: stats.sortedTrades.map((_, i) => i + 1),
    datasets: [{
      label: '累積損益',
      data: stats.cumulativePnL,
      borderColor: getAccentColor(),
      backgroundColor: (context: any) => {
        const chart = context.chart;
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return getAccentColor(0.1);
        return createProfitGradient(ctx, chartArea, scales);
      },
      fill: true,
      tension: 0.4,
      borderWidth: 2,
    }]
  }), [stats.sortedTrades, stats.cumulativePnL, theme]);

  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

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
          maxWidth: 640,
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
              {setupLabel} 戦略分析
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
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>総合評価</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>該当取引回数</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
                  {stats.tradeCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>総合スコア</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.totalScore >= 80 ? 'var(--gain)' : stats.totalScore >= 50 ? 'var(--warning)' : 'var(--loss)' }}>
                  {stats.totalScore} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>点</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{stats.scoreLabel}</div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>期待値</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.expectancy >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {Math.round(stats.expectancy).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>R:R比</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.riskRewardRatio >= 2.0 ? 'var(--gain)' : stats.riskRewardRatio >= 1.0 ? 'var(--warning)' : 'var(--loss)' }}>
                  {stats.riskRewardRatio.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>:1</span>
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>パフォーマンス指標</h3>
            <div style={{ height: 240 }}>
              <Bar
                data={performanceMatrixData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: { font: { size: 12 } }
                    },
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: { display: true, text: '勝率（%）' },
                      max: 100,
                      grid: { color: getGridLineColor() },
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: { display: true, text: 'R:R比' },
                      max: 5,
                      grid: { drawOnChartArea: false },
                    },
                    y2: {
                      type: 'linear',
                      display: false,
                      position: 'right',
                      max: Math.max(stats.maxConsecutiveWins + 2, 10),
                    },
                  },
                }}
              />
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>損益分布（箱ひげ図風）</h3>
            <div style={{ padding: 24, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 180 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>最大値</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gain)' }}>
                    {Math.round(stats.maxProfit).toLocaleString('ja-JP')}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>第3四分位</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                    {Math.round(stats.q3).toLocaleString('ja-JP')}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>中央値</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                    {Math.round(stats.median).toLocaleString('ja-JP')}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>第1四分位</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                    {Math.round(stats.q1).toLocaleString('ja-JP')}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>最小値</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--loss)' }}>
                    {Math.round(stats.minProfit).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center', padding: 12, background: getLongColor(0.1), borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>平均利益</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gain)' }}>
                    {Math.round(stats.avgWin).toLocaleString('ja-JP')} 円
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: 12, background: getLossColor(0.1), borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>平均損失</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--loss)' }}>
                    {Math.round(stats.avgLoss).toLocaleString('ja-JP')} 円
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>累積損益推移</h3>
            <div style={{ height: 300 }}>
              <Line
                data={cumulativePnLData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `累積損益: ${Math.round(context.parsed.y).toLocaleString('ja-JP')}円`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        callback: (value: any) => `#${value}`,
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
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>エントリー時間帯ヒートマップ</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 8, background: 'var(--surface)', border: '1px solid var(--line)' }}></th>
                    {Array.from({ length: 24 }, (_, i) => (
                      <th key={i} style={{ padding: 8, background: 'var(--surface)', border: '1px solid var(--line)', minWidth: 28 }}>
                        {i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekdayLabels.map((label, day) => (
                    <tr key={day}>
                      <td style={{ padding: 8, background: 'var(--surface)', border: '1px solid var(--line)', fontWeight: 'bold' }}>
                        {label}
                      </td>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const key = `${day}-${hour}`;
                        const data = stats.heatmapData.get(key)!;
                        const avgProfit = data.count > 0 ? data.profit / data.count : 0;

                        let bgColor = 'var(--surface)';
                        if (data.count > 0) {
                          if (avgProfit > 0) {
                            const intensity = Math.min(Math.abs(avgProfit) / 5000, 1);
                            bgColor = getLongColor(intensity * 0.8);
                          } else {
                            const intensity = Math.min(Math.abs(avgProfit) / 5000, 1);
                            bgColor = getLossColor(intensity * 0.8);
                          }
                        }

                        return (
                          <td
                            key={hour}
                            style={{
                              padding: 8,
                              background: bgColor,
                              border: '1px solid var(--line)',
                              textAlign: 'center',
                              color: data.count > 0 && Math.abs(avgProfit) > 2000 ? 'white' : 'var(--ink)',
                              fontWeight: data.count > 0 ? 'bold' : 'normal',
                            }}
                            title={data.count > 0 ? `${data.count}件, 平均${Math.round(avgProfit)}円` : 'データなし'}
                          >
                            {data.count > 0 ? data.count : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              セル内の数字は取引回数、色は平均損益（緑＝利益、赤＝損失）
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>相関分析</h3>
            <div style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--ink)', marginBottom: 8 }}>
                  よく使う通貨ペア TOP3
                </div>
                {stats.topPairs.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--ink)' }}>
                    {stats.topPairs.map((item, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {item.pair} - {item.count}回 ({((item.count / stats.tradeCount) * 100).toFixed(1)}%)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>データがありません</div>
                )}
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>改善提案</h3>
            <div style={{ padding: 20, background: 'rgba(0, 132, 199, 0.05)', border: '1px solid rgba(0, 132, 199, 0.2)', borderRadius: 12 }}>
              {stats.recommendations.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--ink)', lineHeight: 1.8 }}>
                  {stats.recommendations.map((rec, i) => (
                    <li key={i} style={{ marginBottom: 12 }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                  十分なデータが集まり次第、具体的な改善提案を表示します
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
