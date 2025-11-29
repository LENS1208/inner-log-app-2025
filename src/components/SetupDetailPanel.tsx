import React, { useMemo } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { Bar } from 'react-chartjs-2';
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

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface SetupDetailPanelProps {
  trades: TradeWithProfit[];
  setupLabel: string;
  onClose: () => void;
}

export default function SetupDetailPanel({ trades, setupLabel, onClose }: SetupDetailPanelProps) {
  const stats = useMemo(() => {
    const winTrades = trades.filter(t => getProfit(t) > 0);
    const lossTrades = trades.filter(t => getProfit(t) < 0);

    const totalPnL = trades.reduce((sum, t) => sum + getProfit(t), 0);
    const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0;

    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;

    const grossProfit = winTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + getProfit(t), 0));
    const pf = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

    // 平均保有時間
    const holdingTimes = trades
      .map(calculateHoldingTime)
      .filter((t): t is number => t !== null);

    const avgHoldingTime = holdingTimes.length > 0
      ? holdingTimes.reduce((sum, t) => sum + t, 0) / holdingTimes.length
      : 0;

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

    // 時間帯別分析（0-23時）
    const hourMap = new Map<number, { wins: number; losses: number; total: number }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { wins: 0, losses: 0, total: 0 });
    }

    trades.forEach(t => {
      const date = parseDateTime(t.openTime || t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        const stat = hourMap.get(hour)!;
        stat.total++;
        if (getProfit(t) > 0) stat.wins++;
        else stat.losses++;
      }
    });

    const hourData = Array.from(hourMap.entries())
      .filter(([_, stat]) => stat.total > 0)
      .map(([hour, stat]) => ({
        hour,
        label: `${hour}時`,
        count: stat.total,
        winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 曜日別分析
    const weekdayMap = new Map<number, { wins: number; losses: number; total: number }>();
    for (let d = 0; d < 7; d++) {
      weekdayMap.set(d, { wins: 0, losses: 0, total: 0 });
    }

    trades.forEach(t => {
      const date = parseDateTime(t.openTime || t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const weekday = date.getDay();
        const stat = weekdayMap.get(weekday)!;
        stat.total++;
        if (getProfit(t) > 0) stat.wins++;
        else stat.losses++;
      }
    });

    const weekdayData = Array.from(weekdayMap.entries()).map(([weekday, stat]) => ({
      weekday,
      label: WEEKDAYS[weekday],
      count: stat.total,
      winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
    }));

    // 通貨ペア別 TOP3
    const pairMap = new Map<string, { wins: number; losses: number; total: number; profit: number }>();

    trades.forEach(t => {
      const pair = t.pair || t.symbol || '不明';
      if (!pairMap.has(pair)) {
        pairMap.set(pair, { wins: 0, losses: 0, total: 0, profit: 0 });
      }
      const stat = pairMap.get(pair)!;
      stat.total++;
      stat.profit += getProfit(t);
      if (getProfit(t) > 0) stat.wins++;
      else stat.losses++;
    });

    const pairData = Array.from(pairMap.entries())
      .map(([pair, stat]) => ({
        pair,
        count: stat.total,
        winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
        avgProfit: stat.total > 0 ? stat.profit / stat.total : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 最も成功する条件（時間帯 × 通貨ペア）
    const bestHour = hourData.length > 0 ? hourData[0] : null;
    const bestPair = pairData.length > 0 ? pairData[0] : null;
    const bestWeekday = weekdayData.reduce((max, curr) =>
      curr.winRate > max.winRate ? curr : max
    , weekdayData[0]);

    // 最も失敗する条件
    const worstWeekday = weekdayData.reduce((min, curr) =>
      curr.winRate < min.winRate && curr.count > 0 ? curr : min
    , weekdayData[0]);

    const worstPair = Array.from(pairMap.entries())
      .map(([pair, stat]) => ({
        pair,
        count: stat.total,
        winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
      }))
      .filter(p => p.count >= 3)
      .sort((a, b) => a.winRate - b.winRate)[0];

    // 戦略の性格判定
    const longCount = trades.filter(t => t.side === 'LONG').length;
    const shortCount = trades.filter(t => t.side === 'SHORT').length;
    const direction = longCount > shortCount ? '買い優勢' : shortCount > longCount ? '売り優勢' : 'バランス型';

    const optimalLot = avgHoldingTime > 12 ? 'スイング' : avgHoldingTime > 4 ? '中期' : '短期';

    const winPattern = winRate > 60 ? '高勝率型' : pf > 2 ? 'ハイリスク型' : '安定型';

    // 直近20件
    const recentTrades = [...trades]
      .sort((a, b) => {
        const dateA = parseDateTime(a.datetime || a.time).getTime();
        const dateB = parseDateTime(b.datetime || b.time).getTime();
        return dateB - dateA;
      })
      .slice(0, 20);

    return {
      count: trades.length,
      avgPnL,
      winRate,
      pf,
      avgHoldingTime,
      rMultipleHistogram,
      hourData,
      weekdayData,
      pairData,
      bestHour,
      bestPair,
      bestWeekday,
      worstWeekday,
      worstPair,
      direction,
      optimalLot,
      winPattern,
      recentTrades,
    };
  }, [trades]);

  // AIコメント生成
  const aiComment = useMemo(() => {
    let comment = `${setupLabel}戦略は`;

    if (stats.bestWeekday && stats.bestPair) {
      comment += `${stats.bestWeekday.label}曜日の${stats.bestPair.pair}で最も成功率が高く（勝率${stats.bestPair.winRate.toFixed(0)}%）`;
    }

    if (stats.bestHour) {
      comment += `、特に${stats.bestHour.label}台に優位性があります`;
    }

    if (stats.worstWeekday && stats.worstWeekday.count > 0) {
      comment += `。逆に${stats.worstWeekday.label}曜日は勝率${stats.worstWeekday.winRate.toFixed(0)}%と苦戦しやすい`;
    }

    if (stats.worstPair) {
      comment += `、${stats.worstPair.pair}では連敗しやすい傾向があります`;
    }

    comment += '。';

    return comment;
  }, [stats, setupLabel]);

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
                {setupLabel} 詳細分析
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>この戦略の再現性・得意条件を分析</p>
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
              <Card title="取引回数" helpText="この戦略での取引回数">
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
                  {stats.count} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </Card>
              <Card title="平均損益 (EV)" helpText="1取引あたりの期待値">
                <div style={{ fontSize: 28, fontWeight: 700, color: stats.avgPnL >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.avgPnL >= 0 ? '+' : ''}{Math.round(stats.avgPnL).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </Card>
              <Card title="勝率" helpText="勝ち取引の割合">
                <div style={{ fontSize: 28, fontWeight: 700, color: stats.winRate >= 50 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.winRate.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>%</span>
                </div>
              </Card>
              <Card title="PF" helpText="プロフィットファクター">
                <div style={{ fontSize: 28, fontWeight: 700, color: stats.pf >= 1 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.pf === Infinity ? '∞' : stats.pf.toFixed(2)}
                </div>
              </Card>
            </div>
            <Card title="平均保有時間" helpText="1取引あたりの保有時間">
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
                {stats.avgHoldingTime.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>時間</span>
              </div>
            </Card>
          </section>

          {/* ブロックB：戦略固有の分析 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>戦略固有の分析</h3>

            {/* R-Multiple 分布 */}
            <Card title="R-Multiple 分布" helpText="この戦略の再現性を判断する最強指標" style={{ marginBottom: 16 }}>
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

            {/* 戦略 × 時間帯 */}
            <Card title="戦略 × 時間帯" helpText="どの時間帯で効くかを見える化" style={{ marginBottom: 16 }}>
              <div style={{ height: 200 }}>
                <Bar
                  data={{
                    labels: stats.hourData.map(h => h.label),
                    datasets: [{
                      label: '取引回数',
                      data: stats.hourData.map(h => h.count),
                      backgroundColor: getAccentColor(),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { color: getGridLineColor() } },
                      y: { beginAtZero: true, grid: { color: getGridLineColor() }, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </Card>

            {/* 戦略 × 曜日 */}
            <Card title="戦略 × 曜日" helpText="曜日別のパフォーマンス" style={{ marginBottom: 16 }}>
              <div style={{ height: 160 }}>
                <Bar
                  data={{
                    labels: stats.weekdayData.map(w => w.label),
                    datasets: [{
                      label: '取引回数',
                      data: stats.weekdayData.map(w => w.count),
                      backgroundColor: getAccentColor(),
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { color: getGridLineColor() } },
                      y: { beginAtZero: true, grid: { color: getGridLineColor() }, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </Card>

            {/* 戦略 × 通貨ペア TOP3 */}
            <Card title="戦略 × 通貨ペア (TOP3)" helpText="この戦略と相性の良い通貨ペア" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                {stats.pairData.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--well)',
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: getAccentColor(),
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.pair}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {p.count}回
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: p.winRate >= 50 ? 'var(--gain)' : 'var(--loss)' }}>
                        勝率 {p.winRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 戦略の性格ミニカード */}
            <Card title="戦略の性格" helpText="この戦略の特性を要約" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>最適スタイル</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{stats.optimalLot}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>勝ちパターン</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{stats.winPattern}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>方向性</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{stats.direction}</span>
                </div>
                {stats.bestHour && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>ベスト時間帯</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--gain)' }}>{stats.bestHour.label}台</span>
                  </div>
                )}
                {stats.worstWeekday && stats.worstWeekday.count > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>注意曜日</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--loss)' }}>{stats.worstWeekday.label}曜日</span>
                  </div>
                )}
              </div>
            </Card>

            {/* AIコメント */}
            <Card title="AIコメント" helpText="戦略の特徴を自動分析">
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
                {aiComment}
              </div>
            </Card>
          </section>

          {/* ブロックC：該当トレード一覧 */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>該当トレード一覧</h3>
            <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)' }}>
                    <th style={{ padding: 10, textAlign: 'left', fontWeight: 'bold', color: 'var(--muted)' }}>日時</th>
                    <th style={{ padding: 10, textAlign: 'left', fontWeight: 'bold', color: 'var(--muted)' }}>通貨</th>
                    <th style={{ padding: 10, textAlign: 'center', fontWeight: 'bold', color: 'var(--muted)' }}>方向</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 'bold', color: 'var(--muted)' }}>損益</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 'bold', color: 'var(--muted)' }}>保有時間</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTrades.map((trade, i) => {
                    const date = parseDateTime(trade.datetime || trade.time);
                    const dateStr = !isNaN(date.getTime())
                      ? `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                      : '-';
                    const profit = getProfit(trade);
                    const holdingTime = calculateHoldingTime(trade);

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
                          {holdingTime !== null ? `${holdingTime.toFixed(1)}h` : '-'}
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
