import React, { useMemo, useEffect, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { getAccentColor, getLossColor, getLongColor, getShortColor } from '../../lib/chartColors';
import { Trade } from '../../lib/types';
import { getTradeProfit, getTradeSide, getTradePair } from '../../lib/filterTrades';

interface PipsRangeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rangeLabel: string;
  minPips: number;
  maxPips: number;
  trades: Trade[];
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN);
  if (typeof datetime === 'number') return new Date(datetime);
  let dt = datetime.trim().replace(/\./g, '-').replace(' ', 'T');
  return new Date(dt);
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

function getHoldTimeMinutes(openTime: string, closeTime: string): number {
  const open = parseDateTime(openTime);
  const close = parseDateTime(closeTime);
  if (isNaN(open.getTime()) || isNaN(close.getTime())) return 0;
  return Math.floor((close.getTime() - open.getTime()) / 60000);
}

export default function PipsRangeDetailDrawer({ isOpen, onClose, rangeLabel, minPips, maxPips, trades }: PipsRangeDetailDrawerProps) {
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

  const stats = useMemo(() => {
    const totalProfit = trades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const winTrades = trades.filter(t => getTradeProfit(t) > 0);
    const lossTrades = trades.filter(t => getTradeProfit(t) <= 0);
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
    const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;
    const avgPips = trades.length > 0
      ? trades.reduce((sum, t) => sum + Math.abs(t.pips || 0), 0) / trades.length
      : 0;

    const grossProfit = winTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + getTradeProfit(t), 0));
    const pf = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);

    return {
      totalProfit,
      tradeCount: trades.length,
      winRate,
      avgProfit,
      avgPips,
      pf
    };
  }, [trades]);

  const pairStats = useMemo(() => {
    const map = new Map<string, { profit: number; count: number }>();

    trades.forEach(t => {
      const pair = getTradePair(t);
      const current = map.get(pair) || { profit: 0, count: 0 };
      map.set(pair, {
        profit: current.profit + getTradeProfit(t),
        count: current.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([pair, data]) => ({ pair, ...data }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  }, [trades]);

  const setupStats = useMemo(() => {
    const map = new Map<string, { profit: number; count: number }>();

    trades.forEach(t => {
      const setup = t.setup || '未分類';
      const current = map.get(setup) || { profit: 0, count: 0 };
      map.set(setup, {
        profit: current.profit + getTradeProfit(t),
        count: current.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([setup, data]) => ({ setup, ...data }))
      .sort((a, b) => b.profit - a.profit);
  }, [trades]);

  const directionStats = useMemo(() => {
    const longTrades = trades.filter(t => getTradeSide(t) === 'LONG');
    const shortTrades = trades.filter(t => getTradeSide(t) === 'SHORT');

    return {
      long: { count: longTrades.length },
      short: { count: shortTrades.length }
    };
  }, [trades]);

  const holdTimeStats = useMemo(() => {
    const ranges = [
      { label: '〜30分', min: 0, max: 30 },
      { label: '30分〜2時間', min: 30, max: 120 },
      { label: '2〜8時間', min: 120, max: 480 },
      { label: '8時間〜1日', min: 480, max: 1440 },
      { label: '1日以上', min: 1440, max: Infinity }
    ];

    return ranges.map(range => {
      const rangeTrades = trades.filter(t => {
        const minutes = getHoldTimeMinutes(t.openTime, t.datetime);
        return minutes >= range.min && minutes < range.max;
      });

      const profit = rangeTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
      return { label: range.label, profit, count: rangeTrades.length };
    });
  }, [trades]);

  const profitLossStats = useMemo(() => {
    const winTrades = trades.filter(t => getTradeProfit(t) > 0);
    const lossTrades = trades.filter(t => getTradeProfit(t) < 0);

    const winProfit = winTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const lossProfit = lossTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);

    const winWinRate = winTrades.length > 0 ? 100 : 0;
    const lossWinRate = 0;

    const winEV = winTrades.length > 0 ? winProfit / winTrades.length : 0;
    const lossEV = lossTrades.length > 0 ? lossProfit / lossTrades.length : 0;

    return {
      win: { count: winTrades.length, profit: winProfit, winRate: winWinRate, ev: winEV },
      loss: { count: lossTrades.length, profit: lossProfit, winRate: lossWinRate, ev: lossEV }
    };
  }, [trades]);

  const streakAnalysis = useMemo(() => {
    const sorted = [...trades].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    sorted.forEach(t => {
      const profit = getTradeProfit(t);
      if (profit > 0) {
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
      } else {
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
        maxLossStreak = Math.max(maxLossStreak, Math.abs(currentStreak));
      }
    });

    return { maxWinStreak, maxLossStreak };
  }, [trades]);

  const aiComment = useMemo(() => {
    const winRate = stats.winRate;
    const avgWin = profitLossStats.win.ev;
    const avgLoss = Math.abs(profitLossStats.loss.ev);
    const topPair = pairStats[0];
    const topSetup = setupStats.find(s => s.profit < 0);

    let comment = `${rangeLabel}の`;

    if (minPips < 20) {
      comment += '短期決済では';
    } else if (minPips >= 60) {
      comment += '大幅利確/損切りでは';
    } else {
      comment += '中規模トレードでは';
    }

    comment += `勝率${winRate.toFixed(0)}%ですが、`;

    if (avgWin > avgLoss * 1.5) {
      comment += '利益幅が損失幅より大きく効率的です。';
    } else if (avgWin < avgLoss * 0.7) {
      comment += '利益幅が小さく損切りの方が大きくなっています。';
    } else {
      comment += '利益幅と損失幅のバランスが取れています。';
    }

    if (topSetup && topPair) {
      comment += ` 特に${topPair.pair}の${topSetup.setup}が小幅負けの主因です。`;
    }

    return comment;
  }, [rangeLabel, minPips, stats.winRate, profitLossStats, pairStats, setupStats]);

  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
      .slice(0, 20);
  }, [trades]);

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
                  価格帯：{rangeLabel} の詳細分析
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>
                  この pips ビンのトレード傾向
                </p>
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

          {/* 基本KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>取引回数</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                {stats.tradeCount}回
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>勝率</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{stats.winRate.toFixed(1)}%</div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均損益</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stats.avgProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.avgProfit >= 0 ? '+' : ''}{Math.round(stats.avgProfit).toLocaleString()}円
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均pips</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{stats.avgPips.toFixed(1)}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>PF</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                {stats.pf >= 999 ? '∞' : stats.pf.toFixed(2)}
              </div>
            </div>
          </div>

          {/* 価格帯の中身分析 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>価格帯の中身分析</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {/* 通貨ペア別損益 */}
              {pairStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>通貨ペア別損益</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: pairStats.map(p => p.pair),
                        datasets: [{
                          label: '損益',
                          data: pairStats.map(p => p.profit),
                          backgroundColor: pairStats.map(p => p.profit >= 0 ? getAccentColor() : getLossColor()),
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            ticks: {
                              callback: (value) => `${(value as number).toLocaleString()}円`,
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

              {/* 戦略別損益 */}
              {setupStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>戦略別損益</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: setupStats.map(s => s.setup),
                        datasets: [{
                          label: '損益',
                          data: setupStats.map(s => s.profit),
                          backgroundColor: setupStats.map(s => s.profit >= 0 ? getAccentColor() : getLossColor()),
                        }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: {
                            ticks: {
                              callback: (value) => `${(value as number).toLocaleString()}円`,
                              font: { size: 10 }
                            },
                          },
                          y: {
                            ticks: { font: { size: 10 } }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 買い/売りの構成 */}
              {(directionStats.long.count + directionStats.short.count > 0) && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>買い/売りの構成</h4>
                  <div style={{ height: 150 }}>
                    <Pie
                      data={{
                        labels: ['買い', '売り'],
                        datasets: [{
                          data: [directionStats.long.count, directionStats.short.count],
                          backgroundColor: [getLongColor(), getShortColor()],
                          borderWidth: 0,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' as const, labels: { font: { size: 11 } } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 保有時間の傾向 */}
              {holdTimeStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>保有時間の傾向</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: holdTimeStats.map(h => h.label),
                        datasets: [{
                          label: '損益',
                          data: holdTimeStats.map(h => h.profit),
                          backgroundColor: holdTimeStats.map(h => h.profit >= 0 ? getAccentColor() : getLossColor()),
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            ticks: {
                              callback: (value) => `${(value as number).toLocaleString()}円`,
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
            </div>
          </div>

          {/* 行動のクセ */}
          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>行動のクセ</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* 利確 vs 損切り */}
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--ink-light)' }}>利確 vs 損切りの成功率</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>利確側</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gain)' }}>
                      {profitLossStats.win.count}回 / EV {profitLossStats.win.ev >= 0 ? '+' : ''}{Math.round(profitLossStats.win.ev).toLocaleString()}円
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>損切り側</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--loss)' }}>
                      {profitLossStats.loss.count}回 / EV {Math.round(profitLossStats.loss.ev).toLocaleString()}円
                    </div>
                  </div>
                </div>
              </div>

              {/* 連勝/連敗との関係 */}
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--ink-light)' }}>連勝/連敗の状況</h4>
                <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-light)' }}>最大連勝</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gain)' }}>
                      {streakAnalysis.maxWinStreak}回
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-light)' }}>最大連敗</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--loss)' }}>
                      {streakAnalysis.maxLossStreak}回
                    </div>
                  </div>
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
              該当トレード一覧（{recentTrades.length}件）
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
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>ロット</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>保有時間</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: 8, color: 'var(--ink)' }}>
                        {new Date(trade.datetime).toLocaleDateString('ja-JP')}
                      </td>
                      <td style={{ padding: 8, color: 'var(--ink)' }}>{getTradePair(trade)}</td>
                      <td style={{ padding: 8, color: 'var(--ink-light)' }}>{trade.setup || '-'}</td>
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
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                        {(trade.volume || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                        {formatHoldTime(trade.openTime, trade.datetime)}
                      </td>
                    </tr>
                  ))}
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
                この範囲の全トレードを見る（取引一覧へ）→
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
