import React, { useMemo } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { useTheme } from '../lib/theme.context';
import { Bar, Doughnut } from 'react-chartjs-2';
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

interface HoldingTimeBreakdownPanelProps {
  trades: TradeWithProfit[];
  rangeLabel: string;
  onClose: () => void;
}

export default function HoldingTimeBreakdownPanel({ trades, rangeLabel, onClose }: HoldingTimeBreakdownPanelProps) {
  const { theme } = useTheme();
  const stats = useMemo(() => {
    const totalPnL = trades.reduce((sum, t) => sum + getProfit(t), 0);
    const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0;

    let totalHoldingTimeMin = 0;
    let validHoldingTimeCount = 0;

    trades.forEach(t => {
      if (t.datetime && t.openTime) {
        const closeTime = parseDateTime(t.datetime).getTime();
        const openTime = parseDateTime(t.openTime).getTime();
        if (!isNaN(closeTime) && !isNaN(openTime)) {
          totalHoldingTimeMin += (closeTime - openTime) / (1000 * 60);
          validHoldingTimeCount++;
        }
      } else if (typeof t.time === 'number' && (t as any).openTimeMs) {
        totalHoldingTimeMin += (t.time - (t as any).openTimeMs) / (1000 * 60);
        validHoldingTimeCount++;
      }
    });

    const avgHoldingTimeMin = validHoldingTimeCount > 0 ? totalHoldingTimeMin / validHoldingTimeCount : 0;

    const pairCounts: Record<string, number> = {};
    trades.forEach(t => {
      const pair = t.pair || t.symbol || 'UNKNOWN';
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    });

    const longCount = trades.filter(t => t.side === 'LONG').length;
    const shortCount = trades.filter(t => t.side === 'SHORT').length;

    const hourCounts = new Array(24).fill(0);
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        hourCounts[hour]++;
      }
    });

    const weekdayCounts = new Array(7).fill(0);
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const day = date.getDay();
        weekdayCounts[day]++;
      }
    });

    const pnlBuckets: number[] = [];
    trades.forEach(t => {
      pnlBuckets.push(getProfit(t));
    });

    return {
      tradeCount: trades.length,
      avgPnL,
      avgHoldingTimeMin,
      pairCounts,
      longCount,
      shortCount,
      hourCounts,
      weekdayCounts,
      pnlBuckets,
    };
  }, [trades]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}分`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}日${remainingHours}時間${mins}分`;
    }
    return `${hours}時間${mins}分`;
  };

  const topPairs = Object.entries(stats.pairCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const pairChartData = useMemo(() => ({
    labels: topPairs.map(([pair]) => pair),
    datasets: [{
      data: topPairs.map(([, count]) => count),
      backgroundColor: [
        getAccentColor(),
        getLossColor(),
        getLongColor(),
        getShortColor(0.8),
        'rgba(139, 92, 246, 0.8)',
        'rgba(6, 182, 212, 0.8)',
        getAccentColor(),
        'rgba(236, 72, 153, 0.8)',
      ],
      borderWidth: 0,
    }],
  }), [topPairs, theme]);

  const sideChartData = useMemo(() => ({
    labels: ['売り', '買い'],
    datasets: [{
      data: [stats.shortCount, stats.longCount],
      backgroundColor: [getShortColor(), getLongColor()],
      borderWidth: 0,
    }],
  }), [stats.longCount, stats.shortCount, theme]);

  const hourChartData = useMemo(() => ({
    labels: Array.from({ length: 24 }, (_, i) => `${i}時`),
    datasets: [{
      label: '取引回数',
      data: stats.hourCounts,
      backgroundColor: getAccentColor(),
    }],
  }), [stats.hourCounts, theme]);

  const weekdayChartData = useMemo(() => ({
    labels: ['日', '月', '火', '水', '木', '金', '土'],
    datasets: [{
      label: '取引回数',
      data: stats.weekdayCounts,
      backgroundColor: getLongColor(),
    }],
  }), [stats.weekdayCounts, theme]);

  const pnlDistributionData = useMemo(() => {
    const sortedPnL = [...stats.pnlBuckets].sort((a, b) => a - b);
    const wins = sortedPnL.filter(p => p > 0);
    const losses = sortedPnL.filter(p => p <= 0);

    return {
      labels: [...losses.map((_, i) => `損失${i + 1}`), ...wins.map((_, i) => `利益${i + 1}`)],
      datasets: [{
        label: '損益',
        data: [...losses, ...wins],
        backgroundColor: [...losses.map(() => getLossColor()), ...wins.map(() => getLongColor())],
      }],
    };
  }, [stats.pnlBuckets]);

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
          maxWidth: 560,
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
              {rangeLabel} 詳細分析
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
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>基本統計</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>該当取引回数</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
                  {stats.tradeCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  {stats.avgPnL >= 0 ? '平均利益' : '平均損失'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.avgPnL >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {Math.round(stats.avgPnL).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>平均保有時間</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
                  {formatTime(stats.avgHoldingTimeMin)}
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>通貨ペア別</h3>
            <div style={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {topPairs.length > 0 ? (
                <Doughnut
                  data={pairChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' },
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
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>売り vs 買い</h3>
            <div style={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {(stats.longCount > 0 || stats.shortCount > 0) ? (
                <Doughnut
                  data={sideChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' },
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
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>
              時間帯別（日本時間）
            </h3>
            <div style={{ height: 300 }}>
              <Bar
                data={hourChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `取引回数: ${context.parsed.y}件`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        callback: (value: any, index: number) => {
                          return index % 2 === 0 ? `${index}時` : '';
                        },
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                      },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value: any) => `${value}件`,
                        stepSize: Math.max(1, Math.ceil(Math.max(...stats.hourCounts) / 5)),
                      },
                      grid: { color: getGridLineColor() },
                    },
                  },
                }}
              />
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>曜日別</h3>
            <div style={{ height: 300 }}>
              <Bar
                data={weekdayChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `取引回数: ${context.parsed.y}件`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: getGridLineColor() },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value: any) => `${value}件`,
                        stepSize: Math.max(1, Math.ceil(Math.max(...stats.weekdayCounts) / 5)),
                      },
                      grid: { color: getGridLineColor() },
                    },
                  },
                }}
              />
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>損益分布</h3>
            <div style={{ height: 300 }}>
              <Bar
                data={pnlDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `${Math.round(context.parsed.y).toLocaleString('ja-JP')}円`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: getGridLineColor() },
                      ticks: { display: false },
                    },
                    y: {
                      beginAtZero: false,
                      ticks: {
                        callback: (value: any) => `${Math.round(value).toLocaleString('ja-JP')}円`,
                      },
                      grid: { color: getGridLineColor() },
                    },
                  },
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
