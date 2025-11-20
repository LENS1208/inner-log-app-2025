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
  id?: string;
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

interface DailyProfitBreakdownPanelProps {
  trades: TradeWithProfit[];
  dateLabel: string;
  onClose: () => void;
}

export default function DailyProfitBreakdownPanel({ trades, dateLabel, onClose }: DailyProfitBreakdownPanelProps) {
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

    // 時間帯別集計
    const hourlyMap = new Map<number, { profit: number; count: number; wins: number }>();
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (isNaN(date.getTime())) return;
      const hour = date.getHours();
      const current = hourlyMap.get(hour) || { profit: 0, count: 0, wins: 0 };
      hourlyMap.set(hour, {
        profit: current.profit + getProfit(t),
        count: current.count + 1,
        wins: current.wins + (getProfit(t) > 0 ? 1 : 0)
      });
    });

    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      ...(hourlyMap.get(hour) || { profit: 0, count: 0, wins: 0 })
    }));

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
      .sort((a, b) => Math.abs(b[1].profit) - Math.abs(a[1].profit))
      .slice(0, 6);

    // 売買方向別
    const longTrades = trades.filter(t => t.side === 'LONG');
    const shortTrades = trades.filter(t => t.side === 'SHORT');
    const longProfit = longTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const shortProfit = shortTrades.reduce((sum, t) => sum + getProfit(t), 0);

    // 時系列での取引推移
    const sortedTrades = [...trades].sort((a, b) =>
      parseDateTime(a.datetime || a.time).getTime() - parseDateTime(b.datetime || b.time).getTime()
    );

    let cumulative = 0;
    const tradeProgression = sortedTrades.map(t => {
      cumulative += getProfit(t);
      return {
        time: parseDateTime(t.datetime || t.time),
        profit: getProfit(t),
        cumulative,
        pair: t.pair || t.symbol || 'UNKNOWN',
        side: t.side,
      };
    });

    // 最大利益・最大損失のトレード
    const maxProfitTrade = [...trades].sort((a, b) => getProfit(b) - getProfit(a))[0];
    const maxLossTrade = [...trades].sort((a, b) => getProfit(a) - getProfit(b))[0];

    // セッション別（アジア・欧州・米国）
    const sessionMap = new Map<string, { profit: number; count: number }>();
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (isNaN(date.getTime())) return;
      const hour = date.getHours();

      let session = 'その他';
      if (hour >= 8 && hour < 15) session = 'アジア（8-15時）';
      else if (hour >= 15 && hour < 21) session = '欧州（15-21時）';
      else if (hour >= 21 || hour < 6) session = '米国（21-6時）';

      const current = sessionMap.get(session) || { profit: 0, count: 0 };
      sessionMap.set(session, {
        profit: current.profit + getProfit(t),
        count: current.count + 1
      });
    });

    const sessionData = Array.from(sessionMap.entries());

    return {
      tradeCount: trades.length,
      totalPnL,
      avgProfit,
      avgLoss,
      winRate,
      hourlyData,
      pairData: sortedPairs,
      longCount: longTrades.length,
      shortCount: shortTrades.length,
      longProfit,
      shortProfit,
      tradeProgression,
      maxProfitTrade,
      maxLossTrade,
      sessionData,
    };
  }, [trades]);

  const hourlyChartData = useMemo(() => ({
    labels: stats.hourlyData.map(d => `${d.hour}時`),
    datasets: [
      {
        label: '時間帯別損益',
        data: stats.hourlyData.map(d => d.profit),
        backgroundColor: stats.hourlyData.map(d => d.profit >= 0 ? getAccentColor() : getLossColor()),
        borderWidth: 0,
      },
    ],
  }), [stats.hourlyData, theme]);

  const pairChartData = useMemo(() => ({
    labels: stats.pairData.map(([pair]) => pair),
    datasets: [{
      data: stats.pairData.map(([, data]) => data.count),
      backgroundColor: [
        getAccentColor(),
        getLossColor(),
        getLongColor(),
        getShortColor(0.8),
        'rgba(139, 92, 246, 0.8)',
        'rgba(6, 182, 212, 0.8)',
      ],
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

  const sessionChartData = useMemo(() => ({
    labels: stats.sessionData.map(([session]) => session),
    datasets: [{
      label: 'セッション別損益',
      data: stats.sessionData.map(([, data]) => data.profit),
      backgroundColor: stats.sessionData.map(([, data]) => data.profit >= 0 ? getLongColor() : getLossColor()),
      borderWidth: 0,
    }],
  }), [stats.sessionData, theme]);

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
              {dateLabel} 詳細分析
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
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>デイリーサマリー</h3>
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
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>平均損益</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.totalPnL / stats.tradeCount >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {Math.round(stats.totalPnL / stats.tradeCount).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>注目トレード</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {stats.maxProfitTrade && (
                <div style={{ padding: 16, background: 'var(--surface)', border: `2px solid var(--gain)`, borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>🏆 最大利益トレード</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                        {stats.maxProfitTrade.pair || stats.maxProfitTrade.symbol} {stats.maxProfitTrade.side === 'LONG' ? '買い' : '売り'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        {parseDateTime(stats.maxProfitTrade.datetime || stats.maxProfitTrade.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gain)' }}>
                      +{Math.round(getProfit(stats.maxProfitTrade)).toLocaleString('ja-JP')}円
                    </div>
                  </div>
                </div>
              )}
              {stats.maxLossTrade && getProfit(stats.maxLossTrade) < 0 && (
                <div style={{ padding: 16, background: 'var(--surface)', border: `2px solid var(--loss)`, borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>⚠️ 最大損失トレード</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                        {stats.maxLossTrade.pair || stats.maxLossTrade.symbol} {stats.maxLossTrade.side === 'LONG' ? '買い' : '売り'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        {parseDateTime(stats.maxLossTrade.datetime || stats.maxLossTrade.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--loss)' }}>
                      {Math.round(getProfit(stats.maxLossTrade)).toLocaleString('ja-JP')}円
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>時間帯別損益</h3>
            <div style={{ height: 240 }}>
              <Bar
                data={hourlyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const idx = context.dataIndex;
                          const data = stats.hourlyData[idx];
                          return [
                            `損益: ${data.profit >= 0 ? '+' : ''}${Math.round(data.profit).toLocaleString('ja-JP')}円`,
                            `取引数: ${data.count}回`,
                            data.count > 0 ? `勝率: ${((data.wins / data.count) * 100).toFixed(1)}%` : ''
                          ].filter(Boolean);
                        },
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
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>セッション別パフォーマンス</h3>
            <div style={{ height: 200 }}>
              {stats.sessionData.length > 0 ? (
                <Bar
                  data={sessionChartData}
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
                            const data = stats.sessionData[idx][1];
                            return [
                              `損益: ${data.profit >= 0 ? '+' : ''}${Math.round(data.profit).toLocaleString('ja-JP')}円`,
                              `取引数: ${data.count}回`,
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
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>通貨ペア別取引数</h3>
            <div style={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {stats.pairData.length > 0 ? (
                <Doughnut
                  data={pairChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const idx = context.dataIndex;
                            const [pair, data] = stats.pairData[idx];
                            return [
                              `${pair}: ${data.count}件`,
                              `損益: ${data.profit >= 0 ? '+' : ''}${Math.round(data.profit).toLocaleString('ja-JP')}円`,
                            ];
                          },
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
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>買いポジション</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: stats.longProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                    {(stats.longProfit >= 0 ? '+' : '') + Math.round(stats.longProfit).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {stats.longCount}回取引
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>売りポジション</div>
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

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>トレード履歴</h3>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid var(--line)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>時刻</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>通貨</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>方向</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>損益</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>累積</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.tradeProgression.map((trade, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--ink)' }}>
                        {trade.time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {trade.pair}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: trade.side === 'LONG' ? getLongColor(0.15) : getShortColor(0.15),
                          color: trade.side === 'LONG' ? getLongColor() : getShortColor(),
                        }}>
                          {trade.side === 'LONG' ? '買' : '売'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: trade.profit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                        {(trade.profit >= 0 ? '+' : '') + Math.round(trade.profit).toLocaleString('ja-JP')}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: trade.cumulative >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                        {(trade.cumulative >= 0 ? '+' : '') + Math.round(trade.cumulative).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
