import React, { useMemo, useState, useEffect, useRef } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { useTheme } from '../lib/theme.context';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
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

function getMarketSession(hour: number): string {
  if (hour >= 0 && hour < 3) return 'ニューヨーククローズ';
  if (hour >= 3 && hour < 9) return 'アジア早朝・オセアニア';
  if (hour >= 9 && hour < 15) return '東京タイム';
  if (hour >= 15 && hour < 17) return '東京クローズ・ロンドン準備';
  if (hour >= 17 && hour < 22) return 'ロンドンタイム';
  if (hour >= 22 && hour < 24) return 'ニューヨークタイム';
  return '市場';
}

interface TimeOfDayBreakdownPanelProps {
  trades: TradeWithProfit[];
  rangeLabel: string;
  onClose: () => void;
}

export default function TimeOfDayBreakdownPanel({ trades, rangeLabel, onClose }: TimeOfDayBreakdownPanelProps) {
  const { theme } = useTheme();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set(['basic']));
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId) {
              setVisibleSections((prev) => new Set(prev).add(sectionId));
            }
          }
        });
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const CHUNK_SIZE = 50;
  const chunkedTrades = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < trades.length; i += CHUNK_SIZE) {
      chunks.push(trades.slice(i, i + CHUNK_SIZE));
    }
    return chunks;
  }, [trades]);

  const stats = useMemo(() => {
    const winTrades = trades.filter(t => getProfit(t) > 0);
    const lossTrades = trades.filter(t => getProfit(t) <= 0);

    const totalPnL = trades.reduce((sum, t) => sum + getProfit(t), 0);
    const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0;

    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;

    const pairCounts: Record<string, number> = {};
    trades.forEach(t => {
      const pair = t.pair || t.symbol || 'UNKNOWN';
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    });

    const longCount = trades.filter(t => t.side === 'LONG').length;
    const shortCount = trades.filter(t => t.side === 'SHORT').length;

    const weekdayMap = new Map<number, { profit: number; count: number }>();
    for (let i = 0; i < 7; i++) {
      weekdayMap.set(i, { profit: 0, count: 0 });
    }

    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const day = date.getDay();
        const current = weekdayMap.get(day)!;
        current.profit += getProfit(t);
        current.count += 1;
      }
    });

    const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayCounts = weekdayLabels.map((_, i) => weekdayMap.get(i)!.count);
    const weekdayProfits = weekdayLabels.map((_, i) => weekdayMap.get(i)!.profit);

    const holdingTimeRanges = [
      { label: '30分以内', min: 0, max: 30 },
      { label: '30分～1時間', min: 30, max: 60 },
      { label: '1～2時間', min: 60, max: 120 },
      { label: '2～4時間', min: 120, max: 240 },
      { label: '4～8時間', min: 240, max: 480 },
      { label: '8～24時間', min: 480, max: 1440 },
      { label: '1日以上', min: 1440, max: Infinity },
    ];

    const holdingTimeWinCounts = holdingTimeRanges.map(() => 0);
    const holdingTimeLossCounts = holdingTimeRanges.map(() => 0);

    trades.forEach(t => {
      const profit = getProfit(t);
      let holdingTimeMin = 0;

      if (typeof t.time === 'number' && (t as any).openTimeMs) {
        holdingTimeMin = (t.time - (t as any).openTimeMs) / (1000 * 60);
      } else if (t.datetime && (t as any).openTime) {
        const closeTime = parseDateTime(t.datetime).getTime();
        const openTime = parseDateTime((t as any).openTime).getTime();
        holdingTimeMin = (closeTime - openTime) / (1000 * 60);
      }

      if (Number.isFinite(holdingTimeMin) && holdingTimeMin >= 0) {
        const rangeIndex = holdingTimeRanges.findIndex(r => holdingTimeMin > r.min && holdingTimeMin <= r.max);
        if (rangeIndex >= 0) {
          if (profit > 0) {
            holdingTimeWinCounts[rangeIndex]++;
          } else {
            holdingTimeLossCounts[rangeIndex]++;
          }
        }
      }
    });

    const sortedTrades = chunkedTrades.flatMap(chunk =>
      [...chunk].sort((a, b) => {
        const dateA = parseDateTime(a.datetime || a.time).getTime();
        const dateB = parseDateTime(b.datetime || b.time).getTime();
        return dateA - dateB;
      })
    );

    const firstTrade = trades[0];
    const hour = firstTrade ? parseDateTime(firstTrade.datetime || firstTrade.time).getHours() : 0;
    const marketSession = getMarketSession(hour);

    return {
      tradeCount: trades.length,
      avgPnL,
      winRate,
      pairCounts,
      longCount,
      shortCount,
      weekdayLabels,
      weekdayCounts,
      weekdayProfits,
      holdingTimeRanges,
      holdingTimeWinCounts,
      holdingTimeLossCounts,
      sortedTrades,
      marketSession,
    };
  }, [trades, chunkedTrades]);

  const topPairs = Object.entries(stats.pairCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const pairChartData = useMemo(() => {
    if (!visibleSections.has('pair')) return null;
    return {
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
    };
  }, [topPairs, visibleSections]);

  const sideChartData = useMemo(() => {
    if (!visibleSections.has('side')) return null;
    return {
      labels: ['売り', '買い'],
      datasets: [{
        data: [stats.shortCount, stats.longCount],
        backgroundColor: [getShortColor(), getLongColor()],
        borderWidth: 0,
      }],
    };
  }, [stats.longCount, stats.shortCount, visibleSections]);

  const weekdayChartData = useMemo(() => {
    if (!visibleSections.has('weekday')) return null;
    return {
      labels: stats.weekdayLabels,
      datasets: [{
        label: '取引回数',
        data: stats.weekdayCounts,
        backgroundColor: stats.weekdayProfits.map(p => p >= 0 ? getLongColor() : getLossColor()),
      }],
    };
  }, [stats.weekdayLabels, stats.weekdayCounts, stats.weekdayProfits, visibleSections]);

  const holdingTimeChartData = useMemo(() => {
    if (!visibleSections.has('holding')) return null;
    return {
      labels: stats.holdingTimeRanges.map(r => r.label),
      datasets: [
        {
          label: '勝ち取引',
          data: stats.holdingTimeWinCounts,
          backgroundColor: getLongColor(),
        },
        {
          label: '負け取引',
          data: stats.holdingTimeLossCounts,
          backgroundColor: getLossColor(),
        }
      ]
    };
  }, [stats.holdingTimeRanges, stats.holdingTimeWinCounts, stats.holdingTimeLossCounts, visibleSections]);

  const pnlTimeSeriesData = useMemo(() => {
    if (!visibleSections.has('pnl')) return null;
    return {
      labels: stats.sortedTrades.map((_, i) => i + 1),
      datasets: [{
        label: '損益',
        data: stats.sortedTrades.map(t => getProfit(t)),
        borderColor: (context: any) => {
          if (!context.raw) return getAccentColor();
          return context.raw >= 0 ? getLongColor() : getLossColor();
        },
        backgroundColor: (context: any) => {
          if (!context.raw) return getAccentColor(0.3);
          return context.raw >= 0 ? getLongColor(0.3) : getLossColor(0.3);
        },
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        segment: {
          borderColor: (ctx: any) => {
            return ctx.p1.parsed.y >= 0 ? getLongColor() : getLossColor();
          }
        }
      }]
    };
  }, [stats.sortedTrades, visibleSections]);

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

          <section style={{ marginBottom: 24, padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>市場セッション</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{stats.marketSession}</div>
          </section>

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
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>勝率</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.winRate >= 50 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.winRate.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>%</span>
                </div>
              </div>
            </div>
          </section>

          <section
            ref={(el) => (sectionRefs.current['pair'] = el)}
            data-section-id="pair"
            style={{ marginBottom: 32 }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>通貨ペア別</h3>
            <div style={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {pairChartData && topPairs.length > 0 ? (
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
                <div style={{ color: 'var(--muted)' }}>
                  {pairChartData === null ? '読み込み中...' : 'データがありません'}
                </div>
              )}
            </div>
          </section>

          <section
            ref={(el) => (sectionRefs.current['side'] = el)}
            data-section-id="side"
            style={{ marginBottom: 32 }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>売り vs 買い</h3>
            <div style={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {sideChartData && (stats.longCount > 0 || stats.shortCount > 0) ? (
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
                <div style={{ color: 'var(--muted)' }}>
                  {sideChartData === null ? '読み込み中...' : 'データがありません'}
                </div>
              )}
            </div>
          </section>

          <section
            ref={(el) => (sectionRefs.current['weekday'] = el)}
            data-section-id="weekday"
            style={{ marginBottom: 32 }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>曜日別</h3>
            <div style={{ height: 280 }}>
              {weekdayChartData ? (
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
                          stepSize: 1,
                        },
                        grid: { color: getGridLineColor() },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted)' }}>
                  読み込み中...
                </div>
              )}
            </div>
          </section>

          <section
            ref={(el) => (sectionRefs.current['holding'] = el)}
            data-section-id="holding"
            style={{ marginBottom: 32 }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>保有時間別</h3>
            <div style={{ height: 300 }}>
              {holdingTimeChartData ? (
                <Bar
                  data={holdingTimeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top',
                        labels: { font: { size: 12 } }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => `${context.dataset.label}: ${context.parsed.y}件`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        stacked: false,
                        grid: { color: getGridLineColor() },
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                          font: { size: 11 }
                        }
                      },
                      y: {
                        stacked: false,
                        beginAtZero: true,
                        ticks: {
                          callback: (value: any) => `${value}件`,
                        },
                        grid: { color: getGridLineColor() },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted)' }}>
                  読み込み中...
                </div>
              )}
            </div>
          </section>

          <section
            ref={(el) => (sectionRefs.current['pnl'] = el)}
            data-section-id="pnl"
            style={{ marginBottom: 32 }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>損益時系列</h3>
            <div style={{ height: 300 }}>
              {pnlTimeSeriesData ? (
                <Line
                  data={pnlTimeSeriesData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => `損益: ${Math.round(context.parsed.y).toLocaleString('ja-JP')}円`,
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
                        beginAtZero: false,
                        ticks: {
                          callback: (value: any) => `${Math.round(value).toLocaleString('ja-JP')}円`,
                        },
                        grid: { color: getGridLineColor() },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted)' }}>
                  読み込み中...
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
