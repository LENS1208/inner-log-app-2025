import React, { useMemo, useEffect, useRef } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import { getAccentColor, getLossColor, getWarningColor } from '../../lib/chartColors';
import { Trade } from '../../lib/types';
import { getTradeProfit, getTradePair } from '../../lib/filterTrades';

interface ExitTimingDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  avgLoss: number;
  filterType?: 'early' | 'delayed' | 'efficiency_range';
  efficiencyRange?: { min: number; max: number };
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN);
  if (typeof datetime === 'number') return new Date(datetime);
  let dt = datetime.trim().replace(/\./g, '-').replace(' ', 'T');
  return new Date(dt);
}

function getTimeOfDay(datetime: string): string {
  const dt = parseDateTime(datetime);
  if (isNaN(dt.getTime())) return '不明';
  const hour = dt.getUTCHours();

  if (hour >= 0 && hour < 9) return 'アジア朝';
  if (hour >= 9 && hour < 13) return '欧州前場';
  if (hour >= 13 && hour < 17) return '欧州後場';
  if (hour >= 17 && hour < 21) return 'NY前場';
  if (hour >= 21 && hour < 24) return 'NY後場';
  return 'アジア深夜';
}

function getHoldTimeMinutes(openTime: string, closeTime: string): number {
  const open = parseDateTime(openTime);
  const close = parseDateTime(closeTime);
  if (isNaN(open.getTime()) || isNaN(close.getTime())) return 0;
  return Math.floor((close.getTime() - open.getTime()) / 60000);
}

function formatHoldTime(openTime: string, closeTime: string): string {
  const open = parseDateTime(openTime);
  const close = parseDateTime(closeTime);
  if (isNaN(open.getTime()) || isNaN(close.getTime())) return '-';

  const minutes = Math.floor((close.getTime() - open.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) return `${hours}時間${mins}分`;
  return `${mins}分`;
}

function calculateExitEfficiency(trade: Trade): number {
  const profit = getTradeProfit(trade);
  const pips = trade.pips || 0;

  if (profit > 0) {
    return Math.min(100, (pips / Math.abs(pips)) * 100);
  } else if (profit < 0) {
    return Math.max(-100, (pips / Math.abs(pips)) * -100);
  }
  return 0;
}

export default function ExitTimingDetailDrawer({
  isOpen,
  onClose,
  trades,
  avgLoss,
  filterType,
  efficiencyRange
}: ExitTimingDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape, true);
      return () => document.removeEventListener('keydown', handleEscape, true);
    }
  }, [isOpen, onClose]);

  const filteredTrades = useMemo(() => {
    if (efficiencyRange) {
      return trades.filter(t => {
        const eff = calculateExitEfficiency(t);
        return eff >= efficiencyRange.min && eff < efficiencyRange.max;
      });
    }
    return trades;
  }, [trades, efficiencyRange]);

  const stats = useMemo(() => {
    const totalProfit = filteredTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const winTrades = filteredTrades.filter(t => getTradeProfit(t) > 0);
    const lossTrades = filteredTrades.filter(t => getTradeProfit(t) < 0);

    const avgEfficiency = filteredTrades.length > 0
      ? filteredTrades.reduce((sum, t) => sum + calculateExitEfficiency(t), 0) / filteredTrades.length
      : 0;

    const absAvgLoss = Math.abs(avgLoss);
    const avgWinR = winTrades.length > 0 && absAvgLoss > 0
      ? winTrades.reduce((sum, t) => sum + (getTradeProfit(t) / absAvgLoss), 0) / winTrades.length
      : 0;

    const avgLossR = lossTrades.length > 0 && absAvgLoss > 0
      ? lossTrades.reduce((sum, t) => sum + (getTradeProfit(t) / absAvgLoss), 0) / lossTrades.length
      : 0;

    const earlyExits = filteredTrades.filter(t => {
      const eff = calculateExitEfficiency(t);
      return getTradeProfit(t) > 0 && eff < 50;
    }).length;

    const delayedExits = filteredTrades.filter(t => {
      const eff = calculateExitEfficiency(t);
      return getTradeProfit(t) < 0 && eff < -50;
    }).length;

    const improvementPotential = avgEfficiency < 100 ? (100 - avgEfficiency) : 0;

    return {
      tradeCount: filteredTrades.length,
      avgEfficiency,
      avgWinR,
      avgLossR,
      earlyExits,
      delayedExits,
      improvementPotential
    };
  }, [filteredTrades, avgLoss]);

  const efficiencyDistribution = useMemo(() => {
    const ranges = [
      { label: '-100~-50', min: -100, max: -50 },
      { label: '-50~0', min: -50, max: 0 },
      { label: '0~25', min: 0, max: 25 },
      { label: '25~50', min: 25, max: 50 },
      { label: '50~75', min: 50, max: 75 },
      { label: '75~100', min: 75, max: 100 }
    ];

    return ranges.map(range => {
      const count = filteredTrades.filter(t => {
        const eff = calculateExitEfficiency(t);
        return eff >= range.min && eff < range.max;
      }).length;

      return {
        label: range.label,
        count,
        percentage: filteredTrades.length > 0 ? (count / filteredTrades.length) * 100 : 0
      };
    });
  }, [filteredTrades]);

  const setupStats = useMemo(() => {
    const map = new Map<string, { efficiency: number; count: number }>();

    filteredTrades.forEach(t => {
      const setup = (t as any).setup || 'その他';
      const eff = calculateExitEfficiency(t);
      const current = map.get(setup) || { efficiency: 0, count: 0 };
      map.set(setup, {
        efficiency: current.efficiency + eff,
        count: current.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([setup, data]) => ({
        setup,
        avgEfficiency: data.count > 0 ? data.efficiency / data.count : 0,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredTrades]);

  const pairStats = useMemo(() => {
    const map = new Map<string, { efficiency: number; count: number }>();

    filteredTrades.forEach(t => {
      const pair = getTradePair(t);
      const eff = calculateExitEfficiency(t);
      const current = map.get(pair) || { efficiency: 0, count: 0 };
      map.set(pair, {
        efficiency: current.efficiency + eff,
        count: current.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([pair, data]) => ({
        pair,
        avgEfficiency: data.count > 0 ? data.efficiency / data.count : 0,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredTrades]);

  const timeStats = useMemo(() => {
    const map = new Map<string, { efficiency: number; count: number }>();
    const order = ['アジア朝', '欧州前場', '欧州後場', 'NY前場', 'NY後場', 'アジア深夜'];

    filteredTrades.forEach(t => {
      const timeSlot = getTimeOfDay(t.datetime);
      const eff = calculateExitEfficiency(t);
      const current = map.get(timeSlot) || { efficiency: 0, count: 0 };
      map.set(timeSlot, {
        efficiency: current.efficiency + eff,
        count: current.count + 1
      });
    });

    return order.map(slot => ({
      slot,
      avgEfficiency: map.get(slot)?.count ? (map.get(slot)!.efficiency / map.get(slot)!.count) : 0,
      count: map.get(slot)?.count || 0
    }));
  }, [filteredTrades]);

  const scatterData = useMemo(() => {
    return filteredTrades.map(t => ({
      x: getHoldTimeMinutes(t.openTime, t.datetime),
      y: calculateExitEfficiency(t),
      profit: getTradeProfit(t)
    }));
  }, [filteredTrades]);

  const aiComment = useMemo(() => {
    let comment = '';

    if (stats.avgEfficiency > 60) {
      comment += '決済タイミングが非常に良好です。';
    } else if (stats.avgEfficiency > 40) {
      comment += '決済タイミングはまずまずですが、改善の余地があります。';
    } else {
      comment += '決済タイミングに大きな改善の余地があります。';
    }

    if (stats.earlyExits > stats.tradeCount * 0.3) {
      comment += `早期決済が${stats.earlyExits}回と多く、利益を伸ばし切れていない可能性があります。`;
    }

    if (stats.delayedExits > stats.tradeCount * 0.2) {
      comment += `損切りの遅延が${stats.delayedExits}回見られます。損失を小さく抑える工夫が必要です。`;
    }

    const topSetup = setupStats[0];
    if (topSetup && topSetup.avgEfficiency > 60) {
      comment += `${topSetup.setup}戦略での決済が特に優秀です。`;
    }

    const bestTime = timeStats.reduce((max, curr) =>
      curr.avgEfficiency > max.avgEfficiency ? curr : max
    , timeStats[0]);

    if (bestTime && bestTime.count > 0) {
      comment += `${bestTime.slot}の決済判断が最も良好です。`;
    }

    return comment;
  }, [stats, setupStats, timeStats]);

  const recentTrades = useMemo(() => {
    return [...filteredTrades]
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
      .slice(0, 20);
  }, [filteredTrades]);

  if (!isOpen) return null;

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
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '40%',
          minWidth: 600,
          maxWidth: 800,
          background: 'var(--surface)',
          zIndex: 9999,
          overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
          animation: 'slideInRight 0.3s ease-out',
          outline: 'none',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div style={{ padding: 24 }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  決済タイミングの詳細分析
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>
                  あなたの決済行動のクセと改善ポイント
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: 'var(--ink-light)',
                  padding: 0,
                  width: 32,
                  height: 32,
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* 基本KPI */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>基本KPI</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>取引回数</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  {stats.tradeCount}回
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均決済効率</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: stats.avgEfficiency >= 50 ? 'var(--gain)' : 'var(--warning)' }}>
                  {stats.avgEfficiency.toFixed(1)}%
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>利確平均R</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gain)' }}>
                  +{stats.avgWinR.toFixed(2)}R
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>損切り平均R</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--loss)' }}>
                  {stats.avgLossR.toFixed(2)}R
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>早期決済回数</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warning)' }}>
                  {stats.earlyExits}回
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>損切り遅延</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--loss)' }}>
                  {stats.delayedExits}回
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>改善余地</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                  {stats.improvementPotential.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* 決済効率の構造分析 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>決済効率の構造分析</h3>

            {/* 決済効率分布 */}
            <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>決済効率分布</h4>
              <div style={{ height: 150 }}>
                <Bar
                  data={{
                    labels: efficiencyDistribution.map(d => d.label),
                    datasets: [{
                      label: '件数',
                      data: efficiencyDistribution.map(d => d.count),
                      backgroundColor: efficiencyDistribution.map(d => {
                        if (d.label.includes('-')) return getLossColor();
                        if (d.label.includes('0~') || d.label.includes('25~')) return getWarningColor();
                        return getAccentColor();
                      }),
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const d = efficiencyDistribution[context.dataIndex];
                            return [
                              `件数: ${d.count}回`,
                              `割合: ${d.percentage.toFixed(1)}%`
                            ];
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { font: { size: 10 } }
                      },
                      x: {
                        ticks: { font: { size: 9 } }
                      }
                    },
                  }}
                />
              </div>
            </div>

            {/* 保有時間 × 決済効率 */}
            <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>保有時間 × 決済効率</h4>
              <div style={{ height: 200 }}>
                <Scatter
                  data={{
                    datasets: [{
                      label: '決済効率',
                      data: scatterData,
                      backgroundColor: scatterData.map(d => d.profit >= 0 ? getAccentColor() : getLossColor()),
                      pointRadius: 4,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const d = context.raw;
                            return [
                              `保有時間: ${Math.floor(d.x / 60)}h${d.x % 60}m`,
                              `決済効率: ${d.y.toFixed(1)}%`,
                              `損益: ${d.profit.toLocaleString()}円`
                            ];
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        title: { display: true, text: '保有時間（分）', font: { size: 11 } },
                        ticks: { font: { size: 10 } }
                      },
                      y: {
                        title: { display: true, text: '決済効率（%）', font: { size: 11 } },
                        ticks: { font: { size: 10 } }
                      }
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* 戦略・通貨・時間帯との相性 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>戦略・通貨・時間帯との相性</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {/* 戦略タグ別決済効率 */}
              {setupStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>戦略タグ別決済効率</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: setupStats.map(s => s.setup),
                        datasets: [{
                          label: '決済効率',
                          data: setupStats.map(s => s.avgEfficiency),
                          backgroundColor: setupStats.map(s => s.avgEfficiency >= 50 ? getAccentColor() : getWarningColor()),
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            ticks: {
                              callback: (value) => `${value}%`,
                              font: { size: 10 }
                            },
                          },
                          x: {
                            ticks: { font: { size: 9 } }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 通貨ペア別決済効率 */}
              {pairStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>通貨ペア別決済効率</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: pairStats.map(p => p.pair),
                        datasets: [{
                          label: '決済効率',
                          data: pairStats.map(p => p.avgEfficiency),
                          backgroundColor: pairStats.map(p => p.avgEfficiency >= 50 ? getAccentColor() : getWarningColor()),
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            ticks: {
                              callback: (value) => `${value}%`,
                              font: { size: 10 }
                            },
                          },
                          x: {
                            ticks: { font: { size: 10 } }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 時間帯別決済傾向 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>時間帯別決済傾向</h4>
                <div style={{ height: 150 }}>
                  <Bar
                    data={{
                      labels: timeStats.map(t => t.slot),
                      datasets: [{
                        label: '決済効率',
                        data: timeStats.map(t => t.avgEfficiency),
                        backgroundColor: timeStats.map(t => t.avgEfficiency >= 50 ? getAccentColor() : getWarningColor()),
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          ticks: {
                            callback: (value) => `${value}%`,
                            font: { size: 10 }
                          },
                        },
                        x: {
                          ticks: { font: { size: 9 } }
                        }
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AIコメント */}
          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>AIコメント</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
              {aiComment}
            </p>
          </div>

          {/* トレード一覧 */}
          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              トレード一覧（{recentTrades.length}件）
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>日時</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>通貨ペア</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>戦略</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>損益</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>pips</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>R</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>決済効率</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>保有時間</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, idx) => {
                    const rValue = avgLoss !== 0 ? getTradeProfit(trade) / Math.abs(avgLoss) : 0;
                    const eff = calculateExitEfficiency(trade);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: 8, color: 'var(--ink)' }}>
                          {new Date(trade.datetime).toLocaleDateString('ja-JP')}
                        </td>
                        <td style={{ padding: 8, color: 'var(--ink)' }}>{getTradePair(trade)}</td>
                        <td style={{ padding: 8, color: 'var(--ink-light)' }}>{(trade as any).setup || '-'}</td>
                        <td style={{
                          padding: 8,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: getTradeProfit(trade) >= 0 ? 'var(--gain)' : 'var(--loss)'
                        }}>
                          {getTradeProfit(trade) >= 0 ? '+' : ''}{Math.round(getTradeProfit(trade)).toLocaleString()}円
                        </td>
                        <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                          {(trade.pips || 0).toFixed(1)}
                        </td>
                        <td style={{
                          padding: 8,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: rValue >= 0 ? 'var(--gain)' : 'var(--loss)'
                        }}>
                          {rValue >= 0 ? '+' : ''}{rValue.toFixed(2)}R
                        </td>
                        <td style={{
                          padding: 8,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: eff >= 50 ? 'var(--gain)' : eff >= 0 ? 'var(--warning)' : 'var(--loss)'
                        }}>
                          {eff.toFixed(1)}%
                        </td>
                        <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                          {formatHoldTime(trade.openTime, trade.datetime)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <a
                href="#/trades"
                style={{
                  fontSize: 13,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                この決済行動の全トレードを見る（取引一覧へ）→
              </a>
            </div>
          </div>

          {/* フッター */}
          <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>

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
    </>
  );
}
