import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { HelpIcon } from '../common/HelpIcon';
import { AiCoachMessage } from '../common/AiCoachMessage';
import { getAccentColor, getLossColor, getProfitColor, getOrangeColor, getGreenColor } from '../../lib/chartColors';
import { formatJPY, formatJPYSigned, getPnLColor, pnlStyle } from '../../lib/formatters';
import { getTradePair, getTradeSide, getTradeProfit } from '../../lib/filterTrades';
import { generateWinLossDrawerComment } from '../../lib/aiCoachGenerator';
import { useDataset } from '../../lib/dataset.context';
import type { Trade } from '../../lib/types';

interface WinLossDetailDrawerProps {
  kind: 'WIN' | 'LOSS';
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

function getWeekdayJP(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

export default function WinLossDetailDrawer({ kind, trades, onClose }: WinLossDetailDrawerProps) {
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
    const isWin = kind === 'WIN';
    const filtered = trades.filter(t => {
      const profit = getTradeProfit(t);
      return isWin ? profit > 0 : profit < 0;
    });

    const totalProfit = filtered.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const avgProfit = filtered.length > 0 ? totalProfit / filtered.length : 0;
    const avgPips = filtered.length > 0 ? filtered.reduce((sum, t) => sum + (t.pips || 0), 0) / filtered.length : 0;

    // PF計算
    const totalGross = filtered.filter(t => getTradeProfit(t) > 0).reduce((sum, t) => sum + getTradeProfit(t), 0);
    const totalLoss = Math.abs(filtered.filter(t => getTradeProfit(t) < 0).reduce((sum, t) => sum + getTradeProfit(t), 0));
    const pf = totalLoss > 0 ? totalGross / totalLoss : totalGross > 0 ? 999 : 0;

    // 最大勝ち/最大負け
    const sortedByProfit = [...filtered].sort((a, b) => getTradeProfit(b) - getTradeProfit(a));
    const extremeTrade = isWin ? sortedByProfit[0] : sortedByProfit[sortedByProfit.length - 1];
    const extremeProfit = extremeTrade ? getTradeProfit(extremeTrade) : 0;

    // 通貨ペア別
    const pairMap = new Map<string, number>();
    filtered.forEach(t => {
      const pair = getTradePair(t);
      pairMap.set(pair, (pairMap.get(pair) || 0) + getTradeProfit(t));
    });
    const pairData = Array.from(pairMap.entries())
      .map(([pair, profit]) => ({ pair, profit }))
      .sort((a, b) => (isWin ? b.profit - a.profit : a.profit - b.profit))
      .slice(0, 5);

    // 戦略タグ別
    const setupMap = new Map<string, number>();
    filtered.forEach(t => {
      const setup = t.comment || 'タグなし';
      setupMap.set(setup, (setupMap.get(setup) || 0) + getTradeProfit(t));
    });
    const setupData = Array.from(setupMap.entries())
      .map(([setup, profit]) => ({ setup, profit }))
      .sort((a, b) => (isWin ? b.profit - a.profit : a.profit - b.profit))
      .slice(0, 5);

    // 時間帯別
    const timeMap = new Map<string, number>();
    filtered.forEach(t => {
      const date = parseDateTime(t.datetime || t.openTime);
      if (!isNaN(date.getTime())) {
        const timeOfDay = getTimeOfDay(date);
        timeMap.set(timeOfDay, (timeMap.get(timeOfDay) || 0) + getTradeProfit(t));
      }
    });
    const timeData = Array.from(timeMap.entries())
      .map(([time, profit]) => ({ time, profit }))
      .sort((a, b) => (isWin ? b.profit - a.profit : a.profit - b.profit));

    // 曜日別
    const weekdayMap = new Map<string, number>();
    filtered.forEach(t => {
      const date = parseDateTime(t.datetime || t.openTime);
      if (!isNaN(date.getTime())) {
        const weekday = getWeekdayJP(date);
        weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + getTradeProfit(t));
      }
    });
    const weekdayOrder = ['月', '火', '水', '木', '金', '土', '日'];
    const weekdayData = weekdayOrder
      .filter(day => weekdayMap.has(day))
      .map(day => ({ weekday: day, profit: weekdayMap.get(day) || 0 }));

    // 平均保有時間
    const holdingTimes = filtered
      .map(t => {
        const open = parseDateTime(t.openTime);
        const close = parseDateTime(t.datetime);
        if (!isNaN(open.getTime()) && !isNaN(close.getTime())) {
          return (close.getTime() - open.getTime()) / (1000 * 60 * 60);
        }
        return 0;
      })
      .filter(h => h > 0);
    const avgHoldingTime = holdingTimes.length > 0 ? holdingTimes.reduce((sum, h) => sum + h, 0) / holdingTimes.length : 0;

    // R-multiple分布（仮の基準R=10000円）
    const avgRisk = 10000;
    const rMultiples = filtered.map(t => getTradeProfit(t) / avgRisk);
    const rBuckets = new Map<string, number>();
    rMultiples.forEach(r => {
      let bucket = '';
      if (r < -2) bucket = '-2R以下';
      else if (r < -1) bucket = '-2R~-1R';
      else if (r < 0) bucket = '-1R~0R';
      else if (r < 1) bucket = '0R~1R';
      else if (r < 2) bucket = '1R~2R';
      else if (r < 3) bucket = '2R~3R';
      else bucket = '3R以上';
      rBuckets.set(bucket, (rBuckets.get(bucket) || 0) + 1);
    });
    const rDistribution = Array.from(rBuckets.entries()).map(([range, count]) => ({ range, count }));

    // AIコーチコメント生成
    const coachType = (userSettings?.coach_avatar_preset || 'teacher') as 'teacher' | 'beginner' | 'advanced';
    const aiCoachComment = generateWinLossDrawerComment(
      isWin ? 'WIN' : 'LOSS',
      {
        count: filtered.length,
        totalAmount: totalProfit,
        avgAmount: avgProfit,
        avgPips: avgPips,
      },
      coachType
    );

    // 表示用トレード
    const displayTrades = isWin
      ? [...filtered].sort((a, b) => getTradeProfit(b) - getTradeProfit(a)).slice(0, 20)
      : [...filtered].sort((a, b) => getTradeProfit(a) - getTradeProfit(b)).slice(0, 20);

    return {
      filtered,
      totalProfit,
      avgProfit,
      avgPips,
      pf,
      extremeProfit,
      pairData,
      setupData,
      timeData,
      weekdayData,
      avgHoldingTime,
      rDistribution,
      aiCoachComment,
      displayTrades
    };
  }, [kind, trades, userSettings]);

  const isWin = kind === 'WIN';
  const title = isWin ? '勝ちトレードの詳細分析' : '負けトレードの詳細分析';

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
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>この側のトレード構造</p>
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
          {/* ブロックA: 基本KPI */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              基本KPI
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>
                  {isWin ? '勝ち取引数' : '負け取引数'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  {analysis.filtered.length}件
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均損益</div>
                <div style={{ fontSize: 18, ...pnlStyle, color: getPnLColor(analysis.avgProfit) }}>
                  {formatJPYSigned(analysis.avgProfit)}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均pips</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  {analysis.avgPips.toFixed(1)}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>PF</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  {analysis.pf.toFixed(2)}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>
                  {isWin ? '最大勝ち' : '最大負け'}
                </div>
                <div style={{ fontSize: 18, ...pnlStyle, color: getPnLColor(analysis.extremeProfit) }}>
                  {formatJPYSigned(analysis.extremeProfit)}
                </div>
              </div>
            </div>
          </section>

          {/* ブロックB: 構造分析 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              構造分析
            </h3>

            {/* 通貨ペア別 */}
            {analysis.pairData.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>通貨ペア別損益</div>
                <div style={{ height: 160 }}>
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
            )}

            {/* 戦略タグ別 */}
            {analysis.setupData.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>戦略タグ別損益</div>
                <div style={{ height: 160 }}>
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
            )}

            {/* 時間帯別 */}
            {analysis.timeData.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>時間帯別損益</div>
                <div style={{ height: 160 }}>
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
            )}

            {/* 曜日別 */}
            {analysis.weekdayData.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>曜日別損益</div>
                <div style={{ height: 160 }}>
                  <Bar
                    data={{
                      labels: analysis.weekdayData.map(d => d.weekday),
                      datasets: [{
                        label: '損益',
                        data: analysis.weekdayData.map(d => d.profit),
                        backgroundColor: analysis.weekdayData.map(d => d.profit >= 0 ? getAccentColor() : getLossColor()),
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
            )}
          </section>

          {/* ブロックC: 行動パターン */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              行動パターン
            </h3>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>平均保有時間:</strong> {analysis.avgHoldingTime.toFixed(1)}時間
              </div>
            </div>

            {analysis.rDistribution.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>R-multiple分布</div>
                <div style={{ height: 140 }}>
                  <Bar
                    data={{
                      labels: analysis.rDistribution.map(d => d.range),
                      datasets: [{
                        label: '件数',
                        data: analysis.rDistribution.map(d => d.count),
                        backgroundColor: getAccentColor(),
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.parsed.y}件`
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ブロックD: AIコメント */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              AIコメント
            </h3>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
              {analysis.aiComment}
            </div>
          </section>

          {/* ブロックE: トレード一覧 */}
          <section>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              {isWin ? '勝ち' : '負け'}トレード一覧
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
                  {analysis.displayTrades.map((t, idx) => {
                    const profit = getTradeProfit(t);
                    const pair = getTradePair(t);
                    const side = getTradeSide(t);
                    const date = parseDateTime(t.datetime || t.openTime);
                    const dateStr = !isNaN(date.getTime()) ? date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }) + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-';

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 4px' }}>{dateStr}</td>
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
            {analysis.filtered.length > 20 && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-light)' }}>
                  {isWin ? '勝ち' : '負け'}トレード全{analysis.filtered.length}件（上位20件を表示）
                </span>
              </div>
            )}
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
