import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { HelpIcon } from '../common/HelpIcon';
import { getAccentColor, getLossColor, getProfitColor, getOrangeColor, getGreenColor } from '../../lib/chartColors';
import { formatJPY, formatJPYSigned, getPnLColor, pnlStyle } from '../../lib/formatters';
import { getTradePair, getTradeSide, getTradeProfit } from '../../lib/filterTrades';
import type { Trade } from '../../lib/types';

interface DDEventDetailDrawerProps {
  clickedDate: string;
  allTrades: Trade[];
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

function detectDDEvent(clickedDate: string, trades: Trade[]): { startDate: string; endDate: string; trades: Trade[] } {
  // トレードを時系列でソート
  const sorted = [...trades]
    .filter(t => {
      const date = parseDateTime(t.datetime || t.openTime);
      return !isNaN(date.getTime()) && t.type?.toLowerCase() !== 'balance';
    })
    .sort((a, b) => parseDateTime(a.datetime || a.openTime).getTime() - parseDateTime(b.datetime || b.openTime).getTime());

  if (sorted.length === 0) {
    return { startDate: clickedDate, endDate: clickedDate, trades: [] };
  }

  // 累積損益とピークを計算
  let equity = 0;
  let peak = 0;
  const points: { date: Date; equity: number; peak: number; dd: number; trade: Trade }[] = [];

  sorted.forEach(t => {
    equity += getTradeProfit(t);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    const date = parseDateTime(t.datetime || t.openTime);
    points.push({ date, equity, peak, dd, trade: t });
  });

  // クリックされた日付に最も近いポイントを見つける
  const clickedDateTime = new Date(clickedDate);
  let nearestIndex = 0;
  let minDiff = Math.abs(points[0].date.getTime() - clickedDateTime.getTime());

  points.forEach((p, i) => {
    const diff = Math.abs(p.date.getTime() - clickedDateTime.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      nearestIndex = i;
    }
  });

  // そのポイントがDDイベント中かどうか確認
  if (points[nearestIndex].dd === 0) {
    // DD中でない場合は、最も近いDDイベントを探す
    return { startDate: clickedDate, endDate: clickedDate, trades: [] };
  }

  // DDイベントの開始を見つける（直前のピーク）
  let startIndex = nearestIndex;
  while (startIndex > 0 && points[startIndex - 1].dd > 0) {
    startIndex--;
  }

  // DDイベントの終了を見つける（次のピーク到達またはDD終了）
  let endIndex = nearestIndex;
  const eventPeak = points[startIndex].peak;
  while (endIndex < points.length - 1 && points[endIndex].equity < eventPeak) {
    endIndex++;
  }

  const eventTrades = points.slice(startIndex, endIndex + 1).map(p => p.trade);
  const startDate = points[startIndex].date.toISOString().split('T')[0];
  const endDate = points[endIndex].date.toISOString().split('T')[0];

  return { startDate, endDate, trades: eventTrades };
}

export default function DDEventDetailDrawer({ clickedDate, allTrades, onClose }: DDEventDetailDrawerProps) {
  const drawerRef = React.useRef<HTMLDivElement>(null);

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
    // DDイベントを検出
    const ddEvent = detectDDEvent(clickedDate, allTrades);
    const { startDate, endDate, trades } = ddEvent;

    if (trades.length === 0) {
      return {
        startDate: clickedDate,
        endDate: clickedDate,
        ddAmount: 0,
        ddR: 0,
        duration: 0,
        tradeCount: 0,
        pairCount: 0,
        setupCount: 0,
        pairData: [],
        setupData: [],
        weekdayData: [],
        timeData: [],
        avgHoldingTime: 0,
        lossTrades: [],
        aiComment: 'DDイベントが検出されませんでした。'
      };
    }

    // KPI計算
    const totalLoss = trades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const ddAmount = Math.abs(totalLoss);
    const avgRisk = 10000; // 仮のR値基準
    const ddR = ddAmount / avgRisk;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const uniquePairs = new Set(trades.map(t => getTradePair(t)));
    const uniqueSetups = new Set(trades.map(t => t.comment || 'タグなし'));

    // 損失トレードのみ抽出
    const lossTrades = trades.filter(t => getTradeProfit(t) < 0).sort((a, b) => getTradeProfit(a) - getTradeProfit(b));

    // 通貨ペア別損失
    const pairMap = new Map<string, number>();
    lossTrades.forEach(t => {
      const pair = getTradePair(t);
      pairMap.set(pair, (pairMap.get(pair) || 0) + getTradeProfit(t));
    });
    const pairData = Array.from(pairMap.entries())
      .map(([pair, loss]) => ({ pair, loss: Math.abs(loss) }))
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 5);

    // 戦略タグ別損失
    const setupMap = new Map<string, number>();
    lossTrades.forEach(t => {
      const setup = t.comment || 'タグなし';
      setupMap.set(setup, (setupMap.get(setup) || 0) + getTradeProfit(t));
    });
    const setupData = Array.from(setupMap.entries())
      .map(([setup, loss]) => ({ setup, loss: Math.abs(loss) }))
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 5);

    // 曜日別損失
    const weekdayMap = new Map<string, number>();
    lossTrades.forEach(t => {
      const date = parseDateTime(t.datetime || t.openTime);
      if (!isNaN(date.getTime())) {
        const weekday = getWeekdayJP(date);
        weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + getTradeProfit(t));
      }
    });
    const weekdayOrder = ['月', '火', '水', '木', '金', '土', '日'];
    const weekdayData = weekdayOrder
      .filter(day => weekdayMap.has(day))
      .map(day => ({ weekday: day, loss: Math.abs(weekdayMap.get(day) || 0) }));

    // 時間帯別損失
    const timeMap = new Map<string, number>();
    lossTrades.forEach(t => {
      const date = parseDateTime(t.datetime || t.openTime);
      if (!isNaN(date.getTime())) {
        const timeOfDay = getTimeOfDay(date);
        timeMap.set(timeOfDay, (timeMap.get(timeOfDay) || 0) + getTradeProfit(t));
      }
    });
    const timeData = Array.from(timeMap.entries())
      .map(([time, loss]) => ({ time, loss: Math.abs(loss) }))
      .sort((a, b) => b.loss - a.loss);

    // 平均保有時間
    const holdingTimes = lossTrades
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

    // AIコメント生成
    let aiComment = 'このDDイベントを分析しました。';
    if (pairData.length > 0 && setupData.length > 0) {
      const topPair = pairData[0];
      const topSetup = setupData[0];
      const topTime = timeData.length > 0 ? timeData[0] : null;

      aiComment = `このDDは${topPair.pair}での${topSetup.setup}戦略の損失により発生しており、`;
      if (topTime) {
        aiComment += `主に${topTime.time}の時間帯に集中しています。`;
      } else {
        aiComment += `${lossTrades.length}件の損失トレードが含まれます。`;
      }
    }

    return {
      startDate,
      endDate,
      ddAmount,
      ddR,
      duration,
      tradeCount: trades.length,
      pairCount: uniquePairs.size,
      setupCount: uniqueSetups.size,
      pairData,
      setupData,
      weekdayData,
      timeData,
      avgHoldingTime,
      lossTrades: lossTrades.slice(0, 20),
      aiComment
    };
  }, [clickedDate, allTrades]);

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
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>ドローダウンイベントの詳細</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>
                  残高の過去最高値（{analysis.startDate} 〜 {analysis.endDate}）
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* ブロックA: DDイベントKPI */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              DDイベントKPI
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>DD幅（円）</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: getLossColor() }}>
                  {formatJPY(analysis.ddAmount)}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>DD幅（R）</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{analysis.ddR.toFixed(2)}R</div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>期間</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{analysis.duration}日</div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>関与した取引数</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{analysis.tradeCount}件</div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>関与した通貨ペア数</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{analysis.pairCount}ペア</div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>関与した戦略数</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{analysis.setupCount}種</div>
              </div>
            </div>
          </section>

          {/* ブロックB: 構造分析 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              構造分析
            </h3>

            {/* 通貨ペア別損失 */}
            {analysis.pairData.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>通貨ペア別損失</div>
                <div style={{ height: 160 }}>
                  <Bar
                    data={{
                      labels: analysis.pairData.map(d => d.pair),
                      datasets: [{
                        label: '損失',
                        data: analysis.pairData.map(d => d.loss),
                        backgroundColor: getLossColor(),
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `損失: ${formatJPY(context.parsed.y)}`
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

            {/* 戦略タグ別損失 */}
            {analysis.setupData.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>戦略タグ別損失</div>
                <div style={{ height: 160 }}>
                  <Bar
                    data={{
                      labels: analysis.setupData.map(d => d.setup),
                      datasets: [{
                        label: '損失',
                        data: analysis.setupData.map(d => d.loss),
                        backgroundColor: getLossColor(),
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `損失: ${formatJPY(context.parsed.y)}`
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

            {/* 曜日別損失 */}
            {analysis.weekdayData.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>曜日別損失</div>
                <div style={{ height: 160 }}>
                  <Bar
                    data={{
                      labels: analysis.weekdayData.map(d => d.weekday),
                      datasets: [{
                        label: '損失',
                        data: analysis.weekdayData.map(d => d.loss),
                        backgroundColor: getLossColor(),
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `損失: ${formatJPY(context.parsed.y)}`
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

            {/* 時間帯別損失 */}
            {analysis.timeData.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>時間帯別損失</div>
                <div style={{ height: 160 }}>
                  <Bar
                    data={{
                      labels: analysis.timeData.map(d => d.time),
                      datasets: [{
                        label: '損失',
                        data: analysis.timeData.map(d => d.loss),
                        backgroundColor: getLossColor(),
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `損失: ${formatJPY(context.parsed.y)}`
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
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>保有時間の傾向:</strong> DDトレードの平均保有時間は {analysis.avgHoldingTime.toFixed(1)}時間
              </div>
              <div style={{ fontSize: 13 }}>
                <strong>損失トレード数:</strong> {analysis.lossTrades.length}件の損失トレードが含まれます
              </div>
            </div>
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

          {/* ブロックE: DDトレード一覧 */}
          <section>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              DDトレード一覧
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--chip)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>日時</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>通貨ペア</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>戦略タグ</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>損益</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>pips</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.lossTrades.map((t, idx) => {
                    const profit = getTradeProfit(t);
                    const pair = getTradePair(t);
                    const date = parseDateTime(t.datetime || t.openTime);
                    const dateStr = !isNaN(date.getTime()) ? date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }) + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-';

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 4px' }}>{dateStr}</td>
                        <td style={{ padding: '8px 4px' }}>{pair}</td>
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
            {analysis.tradeCount > 20 && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-light)' }}>
                  このDDイベントには全{analysis.tradeCount}件のトレードが含まれます（上位20件を表示）
                </span>
              </div>
            )}
          </section>
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
