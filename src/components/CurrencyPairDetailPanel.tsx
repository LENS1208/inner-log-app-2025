import React, { useMemo } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { Bar, Pie } from 'react-chartjs-2';
import type { Trade } from '../lib/types';
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
  pips?: number;
  volume?: number;
  setup?: string;
  ticket?: string;
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

interface CurrencyPairDetailPanelProps {
  trades: TradeWithProfit[];
  pairLabel: string;
  onClose: () => void;
}

export default function CurrencyPairDetailPanel({ trades, pairLabel, onClose }: CurrencyPairDetailPanelProps) {
  console.log('[CurrencyPairDetailPanel] Rendering with:', pairLabel, 'trades:', trades.length);

  const stats = useMemo(() => {
    const winTrades = trades.filter(t => getProfit(t) > 0);
    const lossTrades = trades.filter(t => getProfit(t) <= 0);

    const totalPnL = trades.reduce((sum, t) => sum + getProfit(t), 0);
    const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0;
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;

    const avgPips = trades.length > 0
      ? trades.reduce((sum, t) => sum + Math.abs(t.pips || 0), 0) / trades.length
      : 0;

    const grossProfit = winTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + getProfit(t), 0));
    const pf = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

    const longCount = trades.filter(t => t.side === 'LONG').length;
    const shortCount = trades.filter(t => t.side === 'SHORT').length;

    // 時間帯別集計
    const hourMap = new Map<number, { wins: number; losses: number; profit: number }>();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { wins: 0, losses: 0, profit: 0 });
    }

    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        const current = hourMap.get(hour)!;
        const profit = getProfit(t);
        if (profit > 0) current.wins++;
        else current.losses++;
        current.profit += profit;
      }
    });

    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}時`);
    const hourWins = Array.from({ length: 24 }, (_, i) => hourMap.get(i)!.wins);
    const hourLosses = Array.from({ length: 24 }, (_, i) => hourMap.get(i)!.losses);
    const hourProfits = Array.from({ length: 24 }, (_, i) => hourMap.get(i)!.profit);

    // 曜日別集計
    const weekdayMap = new Map<number, { count: number; profit: number }>();
    for (let i = 0; i < 7; i++) {
      weekdayMap.set(i, { count: 0, profit: 0 });
    }

    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const day = date.getDay();
        const current = weekdayMap.get(day)!;
        current.count += 1;
        current.profit += getProfit(t);
      }
    });

    const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayCounts = weekdayLabels.map((_, i) => weekdayMap.get(i)!.count);
    const weekdayProfits = weekdayLabels.map((_, i) => weekdayMap.get(i)!.profit);

    // 戦略別集計
    const setupMap = new Map<string, number>();
    trades.forEach(t => {
      const setup = t.setup || '未分類';
      setupMap.set(setup, (setupMap.get(setup) || 0) + 1);
    });
    const setupData = Array.from(setupMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 勝ちやすい時間帯 TOP3
    const hourWinRates = Array.from({ length: 24 }, (_, i) => {
      const data = hourMap.get(i)!;
      const total = data.wins + data.losses;
      return {
        hour: i,
        winRate: total > 0 ? (data.wins / total) * 100 : 0,
        count: total,
        profit: data.profit,
      };
    }).filter(h => h.count >= 3);

    const topWinHours = [...hourWinRates]
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3);

    const bottomWinHours = [...hourWinRates]
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 3);

    // 戦略別勝率 TOP3
    const setupWinRates = Array.from(setupMap.keys()).map(setup => {
      const setupTrades = trades.filter(t => (t.setup || '未分類') === setup);
      const wins = setupTrades.filter(t => getProfit(t) > 0).length;
      const winRate = setupTrades.length > 0 ? (wins / setupTrades.length) * 100 : 0;
      const totalProfit = setupTrades.reduce((sum, t) => sum + getProfit(t), 0);
      return { setup, winRate, count: setupTrades.length, profit: totalProfit };
    }).filter(s => s.count >= 3);

    const topWinSetups = [...setupWinRates]
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3);

    // 直近トレード10件
    const recentTrades = [...trades]
      .sort((a, b) => {
        const dateA = parseDateTime(a.datetime || a.time).getTime();
        const dateB = parseDateTime(b.datetime || b.time).getTime();
        return dateB - dateA;
      })
      .slice(0, 15);

    return {
      tradeCount: trades.length,
      avgPnL,
      winRate,
      avgPips,
      pf,
      totalPnL,
      longCount,
      shortCount,
      hourLabels,
      hourWins,
      hourLosses,
      hourProfits,
      weekdayLabels,
      weekdayCounts,
      weekdayProfits,
      setupData,
      topWinHours,
      bottomWinHours,
      topWinSetups,
      recentTrades,
    };
  }, [trades]);

  // AIコメント生成
  const aiComment = useMemo(() => {
    const topHour = stats.topWinHours[0];
    const bottomHour = stats.bottomWinHours[0];
    const topSetup = stats.topWinSetups[0];

    let comment = `${pairLabel}は`;

    if (topHour) {
      comment += `${topHour.hour}時台に取引が多く、勝率${topHour.winRate.toFixed(1)}%と好調です。`;
    }

    if (topSetup) {
      comment += ` 特に${topSetup.setup}戦略で利益が出ています。`;
    }

    if (bottomHour && bottomHour.count >= 3) {
      comment += ` 一方、${bottomHour.hour}時台は勝率${bottomHour.winRate.toFixed(1)}%と苦戦しています。`;
    }

    return comment || `${pairLabel}の取引データを分析中です。`;
  }, [stats, pairLabel]);

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
          maxWidth: 600,
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
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        <div style={{ padding: '24px' }}>
          {/* ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: getAccentColor(), margin: '0 0 4px 0' }}>
                {pairLabel} 詳細分析
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>この通貨ペアの取引傾向分析</p>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
              <Card title="取引回数" helpText="この通貨ペアの総取引回数">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>
                  {stats.tradeCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </Card>
              <Card title="勝率" helpText="勝ちトレードの割合">
                <div style={{ fontSize: 28, fontWeight: 700, color: stats.winRate >= 50 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.winRate.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>%</span>
                </div>
              </Card>
              <Card title="平均損益(EV)" helpText="1取引あたりの期待値">
                <div style={{ fontSize: 28, fontWeight: 700, color: stats.avgPnL >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.avgPnL >= 0 ? '+' : ''}{Math.round(stats.avgPnL).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </Card>
              <Card title="平均pips" helpText="平均pips幅">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>
                  {stats.avgPips.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>pips</span>
                </div>
              </Card>
            </div>
            <Card title="プロフィットファクター(PF)" helpText="総利益÷総損失">
              <div style={{ fontSize: 28, fontWeight: 700, color: stats.pf >= 1 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.pf === Infinity ? '∞' : stats.pf.toFixed(2)}
              </div>
            </Card>
          </section>

          {/* ブロックB：取引の偏り */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>取引の偏り</h3>

            {/* 時間帯別取引回数 */}
            <Card title="時間帯別 取引回数" helpText="24時間の取引分布" style={{ marginBottom: 16 }}>
              <div style={{ height: 200 }}>
                <Bar
                  data={{
                    labels: stats.hourLabels,
                    datasets: [
                      {
                        label: '勝ち取引',
                        data: stats.hourWins,
                        backgroundColor: getLongColor(),
                        stack: 'stack',
                      },
                      {
                        label: '負け取引',
                        data: stats.hourLosses,
                        backgroundColor: getLossColor(),
                        stack: 'stack',
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: true, position: 'top' as const },
                    },
                    scales: {
                      x: { grid: { color: getGridLineColor() }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } },
                      y: { beginAtZero: true, grid: { color: getGridLineColor() }, stacked: true }
                    }
                  }}
                />
              </div>
            </Card>

            {/* 曜日別取引回数 */}
            <Card title="曜日別 取引回数" helpText="曜日ごとの取引分布" style={{ marginBottom: 16 }}>
              <div style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: stats.weekdayLabels,
                    datasets: [{
                      label: '取引回数',
                      data: stats.weekdayCounts,
                      backgroundColor: stats.weekdayProfits.map(p => p >= 0 ? getLongColor() : getLossColor()),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { color: getGridLineColor() } },
                      y: { beginAtZero: true, grid: { color: getGridLineColor() } }
                    }
                  }}
                />
              </div>
            </Card>

            {/* 戦略別取引回数 */}
            <Card title="戦略別 取引回数" helpText="戦略ごとの取引分布" style={{ marginBottom: 16 }}>
              <div style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: stats.setupData.map(s => s[0]),
                    datasets: [{
                      label: '取引回数',
                      data: stats.setupData.map(s => s[1]),
                      backgroundColor: getAccentColor(),
                    }]
                  }}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { beginAtZero: true, grid: { color: getGridLineColor() } },
                      y: { grid: { color: getGridLineColor() } }
                    }
                  }}
                />
              </div>
            </Card>

            {/* 売り vs 買い */}
            <Card title="売り vs 買い" helpText="ロングとショートの取引割合">
              <div style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                    plugins: { legend: { position: 'bottom' as const } }
                  }}
                />
              </div>
            </Card>
          </section>

          {/* ブロックC：儲かりやすい条件 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>儲かりやすい条件</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
              {stats.topWinHours.map((hour, i) => (
                <Card key={i} title={`勝ちやすい時間帯 ${i + 1}`} helpText={`${hour.count}回取引`}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gain)' }}>
                    {hour.hour}時台
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    勝率 {hour.winRate.toFixed(1)}%
                  </div>
                </Card>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
              {stats.bottomWinHours.map((hour, i) => (
                <Card key={i} title={`負けやすい時間帯 ${i + 1}`} helpText={`${hour.count}回取引`}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--loss)' }}>
                    {hour.hour}時台
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    勝率 {hour.winRate.toFixed(1)}%
                  </div>
                </Card>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {stats.topWinSetups.map((setup, i) => (
                <Card key={i} title={`勝ちやすい戦略 ${i + 1}`} helpText={`${setup.count}回取引`}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gain)' }}>
                    {setup.setup}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    勝率 {setup.winRate.toFixed(1)}%
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* ブロックD：AIコメント */}
          <section style={{ marginBottom: 24 }}>
            <Card title="AIコメント" helpText="取引傾向の自動分析">
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
                {aiComment}
              </div>
            </Card>
          </section>

          {/* ブロックE：トレード一覧 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>直近のトレード</h3>
            <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)' }}>
                    <th style={{ padding: 10, textAlign: 'left', fontWeight: 'bold', color: 'var(--muted)' }}>日時</th>
                    <th style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', color: 'var(--muted)' }}>方向</th>
                    <th style={{ padding: 10, textAlign: 'left', fontWeight: 'bold', color: 'var(--muted)' }}>戦略</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 'bold', color: 'var(--muted)' }}>損益</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 'bold', color: 'var(--muted)' }}>pips</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTrades.map((trade, i) => {
                    const date = parseDateTime(trade.datetime || trade.time);
                    const dateStr = !isNaN(date.getTime())
                      ? `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                      : '-';
                    const profit = getProfit(trade);

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: 10, color: 'var(--muted)' }}>{dateStr}</td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: trade.side === 'LONG' ? getLongColor(0.1) : getShortColor(0.1),
                            color: trade.side === 'LONG' ? getLongColor() : getShortColor(),
                          }}>
                            {trade.side === 'LONG' ? '買' : '売'}
                          </span>
                        </td>
                        <td style={{ padding: 10, fontSize: 12, color: 'var(--muted)' }}>{trade.setup || '-'}</td>
                        <td style={{
                          padding: 10,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: profit >= 0 ? 'var(--gain)' : 'var(--loss)'
                        }}>
                          {profit >= 0 ? '+' : ''}{Math.round(profit).toLocaleString('ja-JP')}円
                        </td>
                        <td style={{ padding: 10, textAlign: 'right', color: 'var(--muted)' }}>
                          {trade.pips?.toFixed(1) || '-'}
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
                  display: 'inline-block',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: getAccentColor(),
                  textDecoration: 'none',
                  border: `1px solid ${getAccentColor()}`,
                  borderRadius: 8,
                }}
              >
                取引一覧ページへ →
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
