import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { HelpIcon } from '../common/HelpIcon';
import { AiCoachMessage } from '../common/AiCoachMessage';
import { getAccentColor, getLossColor, getProfitColor, getOrangeColor, getGreenColor } from '../../lib/chartColors';
import { formatJPY, formatJPYSigned, getPnLColor, pnlStyle } from '../../lib/formatters';
import { getTradePair, getTradeSide, getTradeProfit } from '../../lib/filterTrades';
import { generateDayDetailComment } from '../../lib/aiCoachGenerator';
import { useDataset } from '../../lib/dataset.context';
import type { Trade } from '../../lib/types';

interface EquityCurveDayDetailDrawerProps {
  date: string;
  trades: Trade[];
  onClose: () => void;
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN);
  if (typeof datetime === 'number') return new Date(datetime);
  let dt = datetime.trim();
  if (!dt) return new Date(NaN);
  dt = dt.replace(/\./g, '-').replace(' ', 'T');
  return new Date(dt);
}

function getTimeOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return '早朝';
  if (hour >= 9 && hour < 12) return '午前';
  if (hour >= 12 && hour < 15) return '午後';
  if (hour >= 15 && hour < 18) return '夕方';
  if (hour >= 18 && hour < 21) return '夜';
  if (hour >= 21 || hour < 5) return '深夜';
  return '不明';
}

export default function EquityCurveDayDetailDrawer({ date, trades, onClose }: EquityCurveDayDetailDrawerProps) {
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const { userSettings } = useDataset();

  React.useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.focus();
    }
  }, []);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [onClose]);

  const analysis = useMemo(() => {
    const totalProfit = trades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const wins = trades.filter(t => getTradeProfit(t) > 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;
    const avgPips = trades.length > 0 ? trades.reduce((sum, t) => sum + (t.pips || 0), 0) / trades.length : 0;
    const totalGross = trades.filter(t => getTradeProfit(t) > 0).reduce((sum, t) => sum + getTradeProfit(t), 0);
    const totalLoss = Math.abs(trades.filter(t => getTradeProfit(t) < 0).reduce((sum, t) => sum + getTradeProfit(t), 0));
    const pf = totalLoss > 0 ? totalGross / totalLoss : totalGross > 0 ? 999 : 0;

    // 通貨ペア別
    const pairMap = new Map<string, number>();
    trades.forEach(t => {
      const pair = getTradePair(t);
      pairMap.set(pair, (pairMap.get(pair) || 0) + getTradeProfit(t));
    });
    const pairData = Array.from(pairMap.entries())
      .map(([pair, profit]) => ({ pair, profit }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 5);

    // 時間帯別
    const timeMap = new Map<string, number>();
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.openTime);
      if (!isNaN(date.getTime())) {
        const timeOfDay = getTimeOfDay(date);
        timeMap.set(timeOfDay, (timeMap.get(timeOfDay) || 0) + getTradeProfit(t));
      }
    });
    const timeData = Array.from(timeMap.entries())
      .map(([time, profit]) => ({ time, profit }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit));

    // 戦略タグ別
    const setupMap = new Map<string, number>();
    trades.forEach(t => {
      const setup = t.comment || 'タグなし';
      setupMap.set(setup, (setupMap.get(setup) || 0) + getTradeProfit(t));
    });
    const setupData = Array.from(setupMap.entries())
      .map(([setup, profit]) => ({ setup, profit }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 5);

    // AIコーチコメント生成
    const coachType = (userSettings?.coach_avatar_preset || 'teacher') as 'teacher' | 'beginner' | 'advanced';
    const aiCoachComment = generateDayDetailComment(
      {
        dayProfit: totalProfit,
        wins: wins,
        losses: trades.length - wins,
        dateStr: date,
      },
      coachType
    );

    return {
      totalProfit,
      winRate,
      tradeCount: trades.length,
      avgProfit,
      avgPips,
      pf,
      pairData,
      timeData,
      setupData,
      aiCoachComment
    };
  }, [trades, date, userSettings]);

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
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{date} の詳細分析</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>残高の週去最高値</p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--chip)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--line)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--chip)';
                }}
              >
                閉じる
              </button>
            </div>
          </div>

          {/* ブロックA: 日次KPI */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              日次KPI
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>日次損益</div>
                <div style={{ fontSize: 18, ...pnlStyle, color: getPnLColor(analysis.totalProfit) }}>
                  {formatJPYSigned(analysis.totalProfit)}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>勝率</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{analysis.winRate.toFixed(1)}%</div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>取引回数</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{analysis.tradeCount}回</div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均損益</div>
                <div style={{ fontSize: 16, ...pnlStyle, color: getPnLColor(analysis.avgProfit) }}>
                  {formatJPYSigned(analysis.avgProfit)}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均pips</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{analysis.avgPips.toFixed(1)}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>PF</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{analysis.pf.toFixed(2)}</div>
              </div>
            </div>
          </section>

          {/* ブロックB: 構成分析 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              構成分析
            </h3>

            {/* 通貨ペア別 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>通貨ペア別損益</div>
              <div style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: analysis.pairData.map(d => d.pair),
                    datasets: [{
                      label: '損益',
                      data: analysis.pairData.map(d => d.profit),
                      backgroundColor: analysis.pairData.map(d => d.profit >= 0 ? getAccentColor() : getLossColor()),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `損益: ${formatJPYSigned(context.parsed.y)}`
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (v) => formatJPY(v as number)
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* 時間帯別 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>時間帯別損益</div>
              <div style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: analysis.timeData.map(d => d.time),
                    datasets: [{
                      label: '損益',
                      data: analysis.timeData.map(d => d.profit),
                      backgroundColor: analysis.timeData.map(d => d.profit >= 0 ? getAccentColor() : getLossColor()),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `損益: ${formatJPYSigned(context.parsed.y)}`
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (v) => formatJPY(v as number)
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* 戦略タグ別 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>戦略タグ別損益</div>
              <div style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: analysis.setupData.map(d => d.setup),
                    datasets: [{
                      label: '損益',
                      data: analysis.setupData.map(d => d.profit),
                      backgroundColor: analysis.setupData.map(d => d.profit >= 0 ? getAccentColor() : getLossColor()),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `損益: ${formatJPYSigned(context.parsed.y)}`
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (v) => formatJPY(v as number)
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </section>

          {/* ブロックC: AIコメント */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              AIコメント
            </h3>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
              {analysis.aiComment}
            </div>
          </section>

          {/* ブロックD: トレード一覧 */}
          <section>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              該当トレード一覧
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--chip)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>日時</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>通貨ペア</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>売買</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>戦略タグ</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>損益</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>pips</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, idx) => {
                    const profit = getTradeProfit(t);
                    const pair = getTradePair(t);
                    const side = getTradeSide(t);
                    const date = parseDateTime(t.datetime || t.openTime);
                    const timeStr = !isNaN(date.getTime()) ? date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-';

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 4px' }}>{timeStr}</td>
                        <td style={{ padding: '8px 4px' }}>{pair}</td>
                        <td style={{ padding: '8px 4px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 11,
                            backgroundColor: side === 'LONG' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 146, 60, 0.1)',
                            color: side === 'LONG' ? getGreenColor() : getOrangeColor()
                          }}>
                            {side === 'LONG' ? '買' : '売'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 4px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.comment || '-'}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', ...pnlStyle, color: getPnLColor(profit) }}>
                          {formatJPYSigned(profit)}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                          {t.pips?.toFixed(1) || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* AIコーチメッセージ */}
          <AiCoachMessage comment={analysis.aiCoachComment} compact />
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
