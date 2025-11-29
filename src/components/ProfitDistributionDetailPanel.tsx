import React, { useMemo } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { Bar, Pie } from 'react-chartjs-2';
import Card from './common/Card';

type TradeWithProfit = {
  profitYen?: number;
  profitJPY?: number;
  datetime?: string;
  time?: number;
  openTime?: string;
  closeTime?: string;
  pair?: string;
  symbol?: string;
  side?: 'LONG' | 'SHORT';
  openPrice?: number;
  closePrice?: number;
  pips?: number;
  volume?: number;
  setup?: string;
  ticket?: string;
  rMultiple?: number;
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

function calculateHoldingTime(trade: TradeWithProfit): number | null {
  const openTime = parseDateTime(trade.openTime || trade.datetime || trade.time);
  const closeTime = parseDateTime(trade.closeTime);

  if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
    return null;
  }

  return (closeTime.getTime() - openTime.getTime()) / (1000 * 60 * 60);
}

interface ProfitDistributionDetailPanelProps {
  trades: TradeWithProfit[];
  onClose: () => void;
}

export default function ProfitDistributionDetailPanel({ trades, onClose }: ProfitDistributionDetailPanelProps) {
  const stats = useMemo(() => {
    const winTrades = trades.filter(t => getProfit(t) > 0);
    const lossTrades = trades.filter(t => getProfit(t) < 0);

    const avgProfit = winTrades.length > 0
      ? winTrades.reduce((sum, t) => sum + getProfit(t), 0) / winTrades.length
      : 0;

    const avgLoss = lossTrades.length > 0
      ? lossTrades.reduce((sum, t) => sum + getProfit(t), 0) / lossTrades.length
      : 0;

    const rrr = avgLoss !== 0 ? Math.abs(avgProfit / avgLoss) : 0;

    // 損益分布（ヒストグラム用）
    const profitRanges = [
      { label: '-50,000以下', min: -Infinity, max: -50000 },
      { label: '-50,000~-30,000', min: -50000, max: -30000 },
      { label: '-30,000~-20,000', min: -30000, max: -20000 },
      { label: '-20,000~-10,000', min: -20000, max: -10000 },
      { label: '-10,000~0', min: -10000, max: 0 },
      { label: '0~10,000', min: 0, max: 10000 },
      { label: '10,000~20,000', min: 10000, max: 20000 },
      { label: '20,000~30,000', min: 20000, max: 30000 },
      { label: '30,000~50,000', min: 30000, max: 50000 },
      { label: '50,000以上', min: 50000, max: Infinity },
    ];

    const profitHistogram = profitRanges.map(range => ({
      label: range.label,
      count: trades.filter(t => {
        const profit = getProfit(t);
        return profit > range.min && profit <= range.max;
      }).length,
      range,
    }));

    // R-Multiple 分布
    const rRanges = [
      { label: '-3R以下', min: -Infinity, max: -3 },
      { label: '-3R~-2R', min: -3, max: -2 },
      { label: '-2R~-1R', min: -2, max: -1 },
      { label: '-1R~0R', min: -1, max: 0 },
      { label: '0R~1R', min: 0, max: 1 },
      { label: '1R~2R', min: 1, max: 2 },
      { label: '2R~3R', min: 2, max: 3 },
      { label: '3R以上', min: 3, max: Infinity },
    ];

    const rMultipleHistogram = rRanges.map(range => ({
      label: range.label,
      count: trades.filter(t => {
        const r = t.rMultiple || 0;
        return r > range.min && r <= range.max;
      }).length,
    }));

    // 保有時間計算
    const winHoldingTimes = winTrades
      .map(calculateHoldingTime)
      .filter((t): t is number => t !== null);

    const lossHoldingTimes = lossTrades
      .map(calculateHoldingTime)
      .filter((t): t is number => t !== null);

    const avgWinHoldingTime = winHoldingTimes.length > 0
      ? winHoldingTimes.reduce((sum, t) => sum + t, 0) / winHoldingTimes.length
      : 0;

    const avgLossHoldingTime = lossHoldingTimes.length > 0
      ? lossHoldingTimes.reduce((sum, t) => sum + t, 0) / lossHoldingTimes.length
      : 0;

    // 最大損失の頻度（-3R以下）
    const bigLosses = trades.filter(t => (t.rMultiple || 0) < -3);
    const bigLossFrequency = bigLosses.length;

    // 損失集中レンジ（最も損失が多いレンジ）
    const lossRanges = profitHistogram.filter(h => h.range.max <= 0);
    const maxLossRange = lossRanges.reduce((max, curr) =>
      curr.count > max.count ? curr : max
    , lossRanges[0] || profitHistogram[0]);

    // 直近20件
    const recentTrades = [...trades]
      .sort((a, b) => {
        const dateA = parseDateTime(a.datetime || a.time).getTime();
        const dateB = parseDateTime(b.datetime || b.time).getTime();
        return dateB - dateA;
      })
      .slice(0, 20);

    return {
      winCount: winTrades.length,
      lossCount: lossTrades.length,
      avgProfit,
      avgLoss,
      rrr,
      profitHistogram,
      rMultipleHistogram,
      avgWinHoldingTime,
      avgLossHoldingTime,
      bigLossFrequency,
      maxLossRange,
      recentTrades,
    };
  }, [trades]);

  // AIコメント生成
  const aiComment = useMemo(() => {
    let comment = '';

    if (stats.maxLossRange) {
      comment += `損失の大半が ${stats.maxLossRange.label}円 の範囲に集中しており、`;
    }

    if (Math.abs(stats.avgLoss) > 0) {
      const consistency = stats.rrr > 1.5 ? '損切りの一貫性が高い' : '損切りのバラつきがある';
      comment += consistency;
    }

    if (stats.bigLossFrequency > 0) {
      const frequency = trades.length > 0 ? Math.ceil(trades.length / stats.bigLossFrequency) : 0;
      comment += `。一方、-3R以上の大損が約${frequency}回に1回発生しています`;
    }

    if (stats.avgLossHoldingTime > stats.avgWinHoldingTime * 1.5) {
      comment += `。負けトレードの保有時間が長い傾向があります`;
    }

    return comment || '損益分布を分析中です。';
  }, [stats, trades]);

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
                損益分布 詳細分析
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>損益の構造を可視化</p>
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
              <Card title="勝ち取引数" helpText="利益が出た取引の回数">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gain)' }}>
                  {stats.winCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </Card>
              <Card title="負け取引数" helpText="損失が出た取引の回数">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--loss)' }}>
                  {stats.lossCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </Card>
              <Card title="平均利益" helpText="勝ちトレードの平均金額">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gain)' }}>
                  +{Math.round(stats.avgProfit).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </Card>
              <Card title="平均損失" helpText="負けトレードの平均金額">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--loss)' }}>
                  {Math.round(stats.avgLoss).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </Card>
            </div>
            <Card title="RRR (リスクリワードレシオ)" helpText="平均利益÷平均損失">
              <div style={{ fontSize: 28, fontWeight: 700, color: stats.rrr >= 1 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.rrr.toFixed(2)}
              </div>
            </Card>
          </section>

          {/* ブロックB：損益構造 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>損益構造</h3>

            {/* ヒストグラム（損益分布） */}
            <Card title="損益分布（ヒストグラム）" helpText="金額帯別の取引回数" style={{ marginBottom: 16 }}>
              <div style={{ height: 200 }}>
                <Bar
                  data={{
                    labels: stats.profitHistogram.map(h => h.label),
                    datasets: [{
                      label: '取引回数',
                      data: stats.profitHistogram.map(h => h.count),
                      backgroundColor: stats.profitHistogram.map(h =>
                        h.range.max <= 0 ? getLossColor() : getAccentColor()
                      ),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { color: getGridLineColor() }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } },
                      y: { beginAtZero: true, grid: { color: getGridLineColor() }, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </Card>

            {/* R-Multiple 分布 */}
            <Card title="R-Multiple 分布" helpText="リスク倍率別の取引回数" style={{ marginBottom: 16 }}>
              <div style={{ height: 200 }}>
                <Bar
                  data={{
                    labels: stats.rMultipleHistogram.map(h => h.label),
                    datasets: [{
                      label: '取引回数',
                      data: stats.rMultipleHistogram.map(h => h.count),
                      backgroundColor: stats.rMultipleHistogram.map((h, i) =>
                        i < 4 ? getLossColor() : getAccentColor()
                      ),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { color: getGridLineColor() }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } },
                      y: { beginAtZero: true, grid: { color: getGridLineColor() }, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </Card>

            {/* 勝ち負け 円グラフ */}
            <Card title="勝ち負け構成比" helpText="勝ち取引と負け取引の割合" style={{ marginBottom: 16 }}>
              <div style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Pie
                  data={{
                    labels: ['勝ち', '負け'],
                    datasets: [{
                      data: [stats.winCount, stats.lossCount],
                      backgroundColor: [getAccentColor(), getLossColor()],
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

            {/* 平均保有時間 */}
            <Card title="平均保有時間（勝ち/負け別）" helpText="勝ち取引と負け取引の保有時間比較" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>勝ちトレード</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gain)' }}>
                    {stats.avgWinHoldingTime.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>時間</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>負けトレード</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--loss)' }}>
                    {stats.avgLossHoldingTime.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>時間</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* AIコメント */}
            <Card title="AIコメント" helpText="損益構造の自動分析">
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
                {aiComment}
              </div>
            </Card>
          </section>

          {/* ブロックC：詳細リスト */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>直近のトレード</h3>
            <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)' }}>
                    <th style={{ padding: 10, textAlign: 'left', fontWeight: 'bold', color: 'var(--muted)' }}>日時</th>
                    <th style={{ padding: 10, textAlign: 'left', fontWeight: 'bold', color: 'var(--muted)' }}>通貨</th>
                    <th style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', color: 'var(--muted)' }}>方向</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 'bold', color: 'var(--muted)' }}>損益</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 'bold', color: 'var(--muted)' }}>R倍率</th>
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
                        <td style={{ padding: 10, fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                          {trade.pair || trade.symbol || '-'}
                        </td>
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
                        <td style={{
                          padding: 10,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: profit >= 0 ? 'var(--gain)' : 'var(--loss)'
                        }}>
                          {profit >= 0 ? '+' : ''}{Math.round(profit).toLocaleString('ja-JP')}円
                        </td>
                        <td style={{
                          padding: 10,
                          textAlign: 'right',
                          color: 'var(--muted)',
                          fontSize: 12,
                        }}>
                          {trade.rMultiple ? `${trade.rMultiple.toFixed(1)}R` : '-'}
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
