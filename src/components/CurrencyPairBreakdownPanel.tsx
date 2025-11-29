import React, { useMemo, useState, useEffect, useRef } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { Bar, Line, Pie } from 'react-chartjs-2';
import type { Trade } from '../lib/types';
import { useTheme } from '../lib/theme.context';
import { HelpIcon } from './common/HelpIcon';
import Card from './common/Card';

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

interface CurrencyPairBreakdownPanelProps {
  trades: TradeWithProfit[];
  pairLabel: string;
  onClose: () => void;
}

export default function CurrencyPairBreakdownPanel({ trades, pairLabel, onClose }: CurrencyPairBreakdownPanelProps) {
  const { theme } = useTheme();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set(['basic', 'pie', 'hour-profit', 'weekday-profit']));
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

    const longTrades = trades.filter(t => t.side === 'LONG');
    const shortTrades = trades.filter(t => t.side === 'SHORT');

    const longCount = longTrades.length;
    const shortCount = shortTrades.length;

    const longWinTrades = longTrades.filter(t => getProfit(t) > 0);
    const shortWinTrades = shortTrades.filter(t => getProfit(t) > 0);

    const longWinRate = longCount > 0 ? (longWinTrades.length / longCount) * 100 : 0;
    const shortWinRate = shortCount > 0 ? (shortWinTrades.length / shortCount) * 100 : 0;

    const longTotalPnL = longTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const shortTotalPnL = shortTrades.reduce((sum, t) => sum + getProfit(t), 0);

    const longAvgPnL = longCount > 0 ? longTotalPnL / longCount : 0;
    const shortAvgPnL = shortCount > 0 ? shortTotalPnL / shortCount : 0;

    const longGrossProfit = longTrades.filter(t => getProfit(t) > 0).reduce((sum, t) => sum + getProfit(t), 0);
    const longGrossLoss = Math.abs(longTrades.filter(t => getProfit(t) <= 0).reduce((sum, t) => sum + getProfit(t), 0));
    const longPF = longGrossLoss > 0 ? longGrossProfit / longGrossLoss : (longGrossProfit > 0 ? Infinity : 0);

    const shortGrossProfit = shortTrades.filter(t => getProfit(t) > 0).reduce((sum, t) => sum + getProfit(t), 0);
    const shortGrossLoss = Math.abs(shortTrades.filter(t => getProfit(t) <= 0).reduce((sum, t) => sum + getProfit(t), 0));
    const shortPF = shortGrossLoss > 0 ? shortGrossProfit / shortGrossLoss : (shortGrossProfit > 0 ? Infinity : 0);

    const grossProfit = winTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + getProfit(t), 0));
    const pf = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

    const hourMap = new Map<number, { profit: number; count: number }>();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { profit: 0, count: 0 });
    }

    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        const current = hourMap.get(hour)!;
        current.profit += getProfit(t);
        current.count += 1;
      }
    });

    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}時`);
    const hourCounts = Array.from({ length: 24 }, (_, i) => hourMap.get(i)!.count);
    const hourProfits = Array.from({ length: 24 }, (_, i) => hourMap.get(i)!.profit);

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

    const maxProfit = Math.max(...trades.map(t => getProfit(t)));
    const maxLoss = Math.min(...trades.map(t => getProfit(t)));
    const avgHoldingTime = trades.reduce((sum, t) => {
      let holdingTimeMin = 0;
      if (typeof t.time === 'number' && (t as any).openTimeMs) {
        holdingTimeMin = (t.time - (t as any).openTimeMs) / (1000 * 60);
      } else if (t.datetime && (t as any).openTime) {
        const closeTime = parseDateTime(t.datetime).getTime();
        const openTime = parseDateTime((t as any).openTime).getTime();
        holdingTimeMin = (closeTime - openTime) / (1000 * 60);
      }
      return sum + holdingTimeMin;
    }, 0) / trades.length;

    return {
      tradeCount: trades.length,
      avgPnL,
      winRate,
      pf,
      totalPnL,
      longCount,
      shortCount,
      longWinRate,
      shortWinRate,
      longAvgPnL,
      shortAvgPnL,
      longPF,
      shortPF,
      longTotalPnL,
      shortTotalPnL,
      hourLabels,
      hourCounts,
      hourProfits,
      weekdayLabels,
      weekdayCounts,
      weekdayProfits,
      holdingTimeRanges,
      holdingTimeWinCounts,
      holdingTimeLossCounts,
      sortedTrades,
      maxProfit,
      maxLoss,
      avgHoldingTime,
    };
  }, [trades, chunkedTrades]);




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
          {/* ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: getAccentColor(), margin: '0 0 4px 0' }}>
                {pairLabel}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>この通貨ペアの詳細分析</p>
            </div>
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

          {/* ブロックA：基本KPI */}
          <section style={{ marginBottom: 24, marginTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <Card title="取引回数" helpText="この通貨ペアの総取引回数">
                <div className="kpi-value" style={{ color: 'var(--ink)' }}>
                  {stats.tradeCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </Card>
              <Card title="平均損益(EV)" helpText="1取引あたりの期待値">
                <div className="kpi-value" style={{ color: stats.avgPnL >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.avgPnL >= 0 ? '+' : ''}{Math.round(stats.avgPnL).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </Card>
              <Card title="勝率" helpText="勝ちトレードの割合">
                <div className="kpi-value" style={{ color: stats.winRate >= 50 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.winRate.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>%</span>
                </div>
              </Card>
              <Card title="PF" helpText="プロフィットファクター（総利益÷総損失）">
                <div className="kpi-value" style={{ color: stats.pf >= 1 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.pf === Infinity ? '∞' : stats.pf.toFixed(2)}
                </div>
              </Card>
            </div>
          </section>

          {/* ブロックB：通貨ペアの特徴 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>通貨ペアの特徴</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
              {/* ① 円グラフ：売り vs 買い */}
              <Card title="売り vs 買い" helpText="ロングとショートの取引割合">
                <div style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {visibleSections.has('pie') && (
                    <Pie
                      data={{
                        labels: ['買い', '売り'],
                        datasets: [{
                          data: [stats.longCount, stats.shortCount],
                          backgroundColor: [getLongColor(), getShortColor()],
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' as const },
                          tooltip: {
                            callbacks: {
                              label: (context: any) => {
                                const total = stats.tradeCount;
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value}回 (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </Card>

              {/* ミニカード：ペアの性格 */}
              <Card title="このペアの性格" helpText="通貨ペアの取引特性">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>平均保有時間</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {stats.avgHoldingTime < 60 ? '短期' : stats.avgHoldingTime < 480 ? '中期' : '長期'}
                      ({Math.round(stats.avgHoldingTime)}分)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>方向性</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: stats.longTotalPnL > stats.shortTotalPnL ? getLongColor() : getShortColor() }}>
                      {stats.longTotalPnL > stats.shortTotalPnL ? '買い優位' : '売り優位'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>パフォーマンス</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: stats.pf >= 1.5 ? 'var(--gain)' : stats.pf >= 1 ? 'var(--accent)' : 'var(--loss)' }}>
                      {stats.pf >= 1.5 ? '良好' : stats.pf >= 1 ? '中立' : '要改善'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>最大利益</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--gain)' }}>
                      +{Math.round(stats.maxProfit).toLocaleString('ja-JP')}円
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>最大損失</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--loss)' }}>
                      {Math.round(stats.maxLoss).toLocaleString('ja-JP')}円
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* ② 棒グラフ：時間帯別 損益 */}
            <Card title="時間帯別損益" helpText="このペアが最も機能する時間帯" style={{ marginBottom: 16 }}>
              <div style={{ height: 220 }}>
                {visibleSections.has('hour-profit') ? (
                  <Bar
                    data={{
                      labels: stats.hourLabels,
                      datasets: [{
                        label: '損益',
                        data: stats.hourProfits,
                        backgroundColor: stats.hourProfits.map(p => p >= 0 ? getLongColor() : getLossColor()),
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => `損益: ${Math.round(context.parsed.y).toLocaleString('ja-JP')}円`
                          }
                        }
                      },
                      scales: {
                        x: { grid: { color: getGridLineColor() }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
                        y: { beginAtZero: true, grid: { color: getGridLineColor() }, ticks: { callback: (v: any) => `${v.toLocaleString()}円` } }
                      }
                    }}
                  />
                ) : <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted)' }}>読み込み中...</div>}
              </div>
            </Card>

            {/* ③ 棒グラフ：曜日別 損益 */}
            <Card title="曜日別損益" helpText="曜日ごとのパフォーマンス比較">
              <div style={{ height: 220 }}>
                {visibleSections.has('weekday-profit') ? (
                  <Bar
                    data={{
                      labels: stats.weekdayLabels,
                      datasets: [{
                        label: '損益',
                        data: stats.weekdayProfits,
                        backgroundColor: stats.weekdayProfits.map(p => p >= 0 ? getLongColor() : getLossColor()),
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => `損益: ${Math.round(context.parsed.y).toLocaleString('ja-JP')}円`
                          }
                        }
                      },
                      scales: {
                        x: { grid: { color: getGridLineColor() } },
                        y: { beginAtZero: true, grid: { color: getGridLineColor() }, ticks: { callback: (v: any) => `${v.toLocaleString()}円` } }
                      }
                    }}
                  />
                ) : <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted)' }}>読み込み中...</div>}
              </div>
            </Card>
          </section>

          {/* 売り vs 買い詳細 */}
          <section
            ref={(el) => (sectionRefs.current['pie'] = el)}
            data-section-id="pie"
            style={{ marginBottom: 32 }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>売り vs 買い詳細</h3>
            {(stats.longCount > 0 || stats.shortCount > 0) ? (
              <div style={{
                padding: '20px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 12
              }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  marginBottom: 8,
                  textAlign: 'center'
                }}>
                  {pairLabel} ({stats.tradeCount}回)
                </div>
                <div style={{
                  height: 1,
                  background: 'var(--line)',
                  margin: '12px 0'
                }} />

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 16,
                  alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: getShortColor(),
                      marginBottom: 12
                    }}>
                      売り ({stats.shortCount}回)
                    </div>
                  </div>
                  <div style={{
                    width: 1,
                    height: 180,
                    background: 'var(--line)'
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: getLongColor(),
                      marginBottom: 12
                    }}>
                      買い ({stats.longCount}回)
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 16,
                  marginTop: -168
                }}>
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.shortWinRate >= 50 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'right'
                      }}>
                        {stats.shortWinRate.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>EV</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.shortAvgPnL >= 0 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'right'
                      }}>
                        {stats.shortAvgPnL >= 0 ? '+' : ''}{Math.round(stats.shortAvgPnL).toLocaleString('ja-JP')}円
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>PF</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.shortPF >= 1 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'right'
                      }}>
                        {stats.shortPF === Infinity ? '∞' : stats.shortPF.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>合計</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.shortTotalPnL >= 0 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'right'
                      }}>
                        {stats.shortTotalPnL >= 0 ? '+' : ''}{Math.round(stats.shortTotalPnL).toLocaleString('ja-JP')}円
                      </div>
                    </div>
                  </div>

                  <div style={{ width: 1 }} />

                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.longWinRate >= 50 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'left'
                      }}>
                        {stats.longWinRate.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>EV</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.longAvgPnL >= 0 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'left'
                      }}>
                        {stats.longAvgPnL >= 0 ? '+' : ''}{Math.round(stats.longAvgPnL).toLocaleString('ja-JP')}円
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>PF</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.longPF >= 1 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'left'
                      }}>
                        {stats.longPF === Infinity ? '∞' : stats.longPF.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>合計</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.longTotalPnL >= 0 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'left'
                      }}>
                        {stats.longTotalPnL >= 0 ? '+' : ''}{Math.round(stats.longTotalPnL).toLocaleString('ja-JP')}円
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  height: 1,
                  background: 'var(--line)',
                  margin: '16px 0'
                }} />

                <div style={{
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '8px',
                  borderRadius: 8,
                  background: stats.longTotalPnL > stats.shortTotalPnL
                    ? getLongColor(0.1)
                    : stats.shortTotalPnL > stats.longTotalPnL
                    ? getShortColor(0.1)
                    : 'rgba(100, 116, 139, 0.1)',
                  color: stats.longTotalPnL > stats.shortTotalPnL
                    ? getLongColor()
                    : stats.shortTotalPnL > stats.longTotalPnL
                    ? getShortColor()
                    : 'var(--muted)'
                }}>
                  {stats.longTotalPnL > stats.shortTotalPnL
                    ? '買い優位'
                    : stats.shortTotalPnL > stats.longTotalPnL
                    ? '売り優位'
                    : '同等'}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>データがありません</div>
            )}
          </section>

        </div>
      </div>
    </>
  );
}
