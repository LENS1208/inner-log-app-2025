import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { HelpIcon } from '../common/HelpIcon';
import { getAccentColor, getLossColor, getProfitColor, getOrangeColor, getGreenColor } from '../../lib/chartColors';
import { formatJPY, formatJPYSigned, getPnLColor, pnlStyle } from '../../lib/formatters';
import { getTradePair, getTradeSide, getTradeProfit } from '../../lib/filterTrades';
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

    // AIコメント生成
    let aiComment = 'この日のトレード分析が完了しました。';
    if (pairData.length > 0) {
      const topPair = pairData[0];
      const pairProfit = topPair.profit >= 0 ? '利益' : '損失';
      aiComment = `この日は${topPair.pair}で主に${pairProfit}を出しました。`;

      if (timeData.length > 0) {
        const topTime = timeData[0];
        const timeProfit = topTime.profit >= 0 ? '利益' : '損失';
        aiComment += `${topTime.time}の時間帯に${timeProfit}が集中しています。`;
      }
    }

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
      aiComment
    };
  }, [trades]);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '40%',
          minWidth: 400,
          maxWidth: 600,
          backgroundColor: 'var(--card-bg)',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--card-bg)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            zIndex: 1,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>{date} の詳細分析</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>この日の損益構造と内訳</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: 'var(--muted)',
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

        <div style={{ padding: '20px', flex: 1 }}>
          {/* ブロックA: 日次KPI */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 12, color: 'var(--muted)' }}>
              日次KPI
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: 12, backgroundColor: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>日次損益</div>
                <div style={{ fontSize: 18, ...pnlStyle, color: getPnLColor(analysis.totalProfit) }}>
                  {formatJPYSigned(analysis.totalProfit)}
                </div>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>{analysis.winRate.toFixed(1)}%</div>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>取引回数</div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>{analysis.tradeCount}回</div>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>平均損益</div>
                <div style={{ fontSize: 16, ...pnlStyle, color: getPnLColor(analysis.avgProfit) }}>
                  {formatJPYSigned(analysis.avgProfit)}
                </div>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>平均pips</div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{analysis.avgPips.toFixed(1)}</div>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>PF</div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{analysis.pf.toFixed(2)}</div>
              </div>
            </div>
          </section>

          {/* ブロックB: 構成分析 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 12, color: 'var(--muted)' }}>
              構成分析
            </h3>

            {/* 通貨ペア別 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>通貨ペア別損益</div>
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
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>時間帯別損益</div>
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
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>戦略タグ別損益</div>
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
            <h3 style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 12, color: 'var(--muted)' }}>
              AIコメント
            </h3>
            <div style={{ padding: 12, backgroundColor: 'var(--bg)', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
              {analysis.aiComment}
            </div>
          </section>

          {/* ブロックD: トレード一覧 */}
          <section>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 12, color: 'var(--muted)' }}>
              該当トレード一覧
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 'bold' }}>日時</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 'bold' }}>通貨ペア</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 'bold' }}>売買</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 'bold' }}>戦略タグ</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold' }}>損益</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold' }}>pips</th>
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
        </div>
      </div>
    </>
  );
}
