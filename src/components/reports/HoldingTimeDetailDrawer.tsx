import { useEffect, useState, useMemo } from 'react';
import { Trade } from '../../lib/types';
import { Bar, Pie, Scatter } from 'react-chartjs-2';

interface HoldingTimeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rangeData: {
    label: string;
    minDuration: number;
    maxDuration: number;
  } | null;
  trades: Trade[];
}

interface RangeStats {
  tradeCount: number;
  winRate: number;
  avgProfit: number;
  avgPips: number;
  profitFactor: number;
}

interface PairStats {
  pair: string;
  profit: number;
  count: number;
}

interface StrategyStats {
  strategy: string;
  profit: number;
  count: number;
}

interface SideStats {
  side: string;
  count: number;
  profit: number;
}

interface HourStats {
  hour: number;
  count: number;
  profit: number;
}

export default function HoldingTimeDetailDrawer({ isOpen, onClose, rangeData, trades }: HoldingTimeDetailDrawerProps) {
  const [rangeTrades, setRangeTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<RangeStats | null>(null);
  const [pairStats, setPairStats] = useState<PairStats[]>([]);
  const [strategyStats, setStrategyStats] = useState<StrategyStats[]>([]);
  const [sideStats, setSideStats] = useState<SideStats[]>([]);
  const [hourStats, setHourStats] = useState<HourStats[]>([]);

  useEffect(() => {
    console.log('HoldingTimeDetailDrawer useEffect:', { isOpen, rangeData, tradesCount: trades.length });
    if (!isOpen || !rangeData) return;

    const filtered = trades.filter(t => {
      const holdTime = t.holdTimeMin || 0;
      if (rangeData.maxDuration === Infinity) {
        return holdTime >= rangeData.minDuration;
      }
      return holdTime >= rangeData.minDuration && holdTime < rangeData.maxDuration;
    });

    console.log('Filtered trades for holding time range:', filtered.length);
    setRangeTrades(filtered);

    const wins = filtered.filter(t => t.profitYen > 0).length;
    const totalProfit = filtered.reduce((sum, t) => sum + t.profitYen, 0);
    const totalWins = filtered.filter(t => t.profitYen > 0).reduce((sum, t) => sum + t.profitYen, 0);
    const totalLosses = Math.abs(filtered.filter(t => t.profitYen < 0).reduce((sum, t) => sum + t.profitYen, 0));
    const totalPips = filtered.reduce((sum, t) => sum + t.pips, 0);

    setStats({
      tradeCount: filtered.length,
      winRate: filtered.length > 0 ? (wins / filtered.length) * 100 : 0,
      avgProfit: filtered.length > 0 ? totalProfit / filtered.length : 0,
      avgPips: filtered.length > 0 ? totalPips / filtered.length : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0,
    });

    const pairMap = new Map<string, { profit: number; count: number }>();
    const strategyMap = new Map<string, { profit: number; count: number }>();
    const sideMap = new Map<string, { profit: number; count: number }>();
    const hourMap = new Map<number, { profit: number; count: number }>();

    filtered.forEach(t => {
      const pairData = pairMap.get(t.pair) || { profit: 0, count: 0 };
      pairData.profit += t.profitYen;
      pairData.count++;
      pairMap.set(t.pair, pairData);

      const strategy = (t as any).setup || (t as any).strategy || '未分類';
      const strategyData = strategyMap.get(strategy) || { profit: 0, count: 0 };
      strategyData.profit += t.profitYen;
      strategyData.count++;
      strategyMap.set(strategy, strategyData);

      const sideData = sideMap.get(t.side) || { profit: 0, count: 0 };
      sideData.profit += t.profitYen;
      sideData.count++;
      sideMap.set(t.side, sideData);

      const date = new Date(t.closeTime || t.datetime);
      const hour = date.getHours();
      const hourData = hourMap.get(hour) || { profit: 0, count: 0 };
      hourData.profit += t.profitYen;
      hourData.count++;
      hourMap.set(hour, hourData);
    });

    setPairStats(
      Array.from(pairMap.entries())
        .map(([pair, data]) => ({ pair, profit: data.profit, count: data.count }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5)
    );

    setStrategyStats(
      Array.from(strategyMap.entries())
        .map(([strategy, data]) => ({ strategy, profit: data.profit, count: data.count }))
        .sort((a, b) => b.profit - a.profit)
    );

    setSideStats(
      Array.from(sideMap.entries())
        .map(([side, data]) => ({ side, profit: data.profit, count: data.count }))
    );

    setHourStats(
      Array.from(hourMap.entries())
        .map(([hour, data]) => ({ hour, profit: data.profit, count: data.count }))
        .sort((a, b) => a.hour - b.hour)
    );
  }, [isOpen, rangeData, trades]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const aiComment = useMemo(() => {
    if (!stats || !rangeData) return '';

    const parts: string[] = [];
    const rangeLabel = rangeData.label;

    if (stats.winRate < 45) {
      parts.push(`${rangeLabel}の勝率は${stats.winRate.toFixed(1)}%と低めです。`);
    } else if (stats.winRate > 60) {
      parts.push(`${rangeLabel}の勝率は${stats.winRate.toFixed(1)}%と高水準です。`);
    }

    if (stats.avgProfit < 0) {
      const worstPair = pairStats.find(p => p.profit < 0);
      const worstHour = hourStats.reduce((a, b) => a.profit < b.profit ? a : b, hourStats[0]);
      if (worstPair && worstHour) {
        parts.push(`平均損益がマイナスで、${worstPair.pair}や${worstHour.hour}時台のエントリーが損失要因になっています。`);
      } else {
        parts.push(`平均損益がマイナスとなっており、エントリー判断の見直しが必要です。`);
      }
    } else if (stats.avgProfit > 1000) {
      parts.push(`平均損益が${Math.round(stats.avgProfit).toLocaleString()}円と良好です。`);
    }

    if (stats.profitFactor < 1) {
      parts.push('プロフィットファクターが1を下回っており、改善の余地があります。');
    }

    return parts.join(' ') || `${rangeLabel}のトレード傾向を確認し、次回の取引判断に活かしましょう。`;
  }, [stats, rangeData, pairStats, hourStats]);

  console.log('HoldingTimeDetailDrawer render:', { isOpen, rangeData });
  if (!isOpen || !rangeData) return null;

  const pairChartData = {
    labels: pairStats.map(p => p.pair),
    datasets: [{
      label: '損益',
      data: pairStats.map(p => p.profit),
      backgroundColor: pairStats.map(p => p.profit >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
    }]
  };

  const strategyChartData = {
    labels: strategyStats.map(s => s.strategy),
    datasets: [{
      label: '損益',
      data: strategyStats.map(s => s.profit),
      backgroundColor: strategyStats.map(s => s.profit >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
    }]
  };

  const sideChartData = {
    labels: sideStats.map(s => s.side === 'LONG' ? 'ロング' : 'ショート'),
    datasets: [{
      data: sideStats.map(s => s.count),
      backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'],
    }]
  };

  const hourHeatmapData = Array.from({ length: 24 }, (_, i) => {
    const hourData = hourStats.find(h => h.hour === i);
    return hourData ? hourData.count : 0;
  });

  const scatterData = {
    datasets: [{
      label: 'トレード',
      data: rangeTrades.slice(0, 50).map(t => ({
        x: t.holdTimeMin || 0,
        y: t.profitYen,
      })),
      backgroundColor: rangeTrades.slice(0, 50).map(t => t.profitYen >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
    }]
  };

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
          zIndex: 999,
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
          minWidth: 600,
          maxWidth: 800,
          background: 'var(--surface)',
          boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflowY: 'auto',
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: 16, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                保有時間 {rangeData.label} の詳細分析
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                この保有時間帯のトレード傾向
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: 'var(--muted)',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {stats && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>基本KPI</h3>
              <div className="kpi-cards-grid-compact">
                <div className="kpi-card">
                  <div className="kpi-title">取引回数</div>
                  <div className="kpi-value">{stats.tradeCount}回</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">勝率</div>
                  <div className="kpi-value">{stats.winRate.toFixed(1)}%</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">平均損益</div>
                  <div className="kpi-value" style={{ color: stats.avgProfit >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>
                    {stats.avgProfit >= 0 ? '+' : ''}{Math.round(stats.avgProfit).toLocaleString()}円
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">平均pips</div>
                  <div className="kpi-value">{stats.avgPips.toFixed(1)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">PF</div>
                  <div className="kpi-value">{stats.profitFactor.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {(pairStats.length > 0 || strategyStats.length > 0 || sideStats.length > 0) && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>通貨・戦略・売買構成</h3>

              {pairStats.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>通貨ペア別損益</h4>
                  <div style={{ height: 200 }}>
                    <Bar data={pairChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                  </div>
                </div>
              )}

              {strategyStats.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>戦略別損益</h4>
                  <div style={{ height: 150 }}>
                    <Bar data={strategyChartData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }} />
                  </div>
                </div>
              )}

              {sideStats.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>売り vs 買い</h4>
                  <div style={{ height: 200 }}>
                    <Pie data={sideChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {hourStats.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>エントリー時間帯別分布</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
                {hourHeatmapData.map((count, hour) => {
                  const maxCount = Math.max(...hourHeatmapData);
                  const intensity = maxCount > 0 ? count / maxCount : 0;
                  const bgColor = count === 0 ? 'rgba(200, 200, 200, 0.1)' : `rgba(0, 132, 199, ${0.2 + intensity * 0.6})`;
                  return (
                    <div
                      key={hour}
                      style={{
                        background: bgColor,
                        border: '1px solid var(--line)',
                        borderRadius: 4,
                        padding: '8px 4px',
                        textAlign: 'center',
                        fontSize: 11,
                      }}
                      title={`${hour}時: ${count}件`}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{hour}時</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{count}件</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rangeTrades.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>保有時間×損益（散布図）</h3>
              <div style={{ height: 250 }}>
                <Scatter
                  data={scatterData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { title: { display: true, text: '保有時間（分）' } },
                      y: { title: { display: true, text: '損益（円）' } },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {aiComment && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>AIコメント</h3>
              <div style={{ padding: 12, background: 'rgba(0, 132, 199, 0.05)', border: '1px solid rgba(0, 132, 199, 0.2)', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{aiComment}</p>
              </div>
            </div>
          )}

          {rangeTrades.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>トレード一覧</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>日時</th>
                      <th>通貨ペア</th>
                      <th>戦略</th>
                      <th>損益</th>
                      <th>pips</th>
                      <th>ロット</th>
                      <th>保有時間</th>
                      <th>売買</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangeTrades.slice(0, 20).map((t, i) => (
                      <tr key={i}>
                        <td>{new Date(t.closeTime || t.datetime).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{t.pair}</td>
                        <td>{(t as any).setup || (t as any).strategy || '—'}</td>
                        <td style={{ color: t.profitYen >= 0 ? 'var(--accent-2)' : 'var(--loss)', fontWeight: 700 }}>
                          {t.profitYen >= 0 ? '+' : ''}{Math.round(t.profitYen).toLocaleString()}
                        </td>
                        <td>{t.pips.toFixed(1)}</td>
                        <td>{t.volume.toFixed(2)}</td>
                        <td>{t.holdTimeMin ? `${t.holdTimeMin}分` : '—'}</td>
                        <td style={{ color: t.side === 'LONG' ? 'var(--accent-2)' : 'var(--loss)' }}>{t.side}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rangeTrades.length > 20 && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <a
                    href="#/trades"
                    style={{ color: 'var(--accent-2)', fontSize: 13, textDecoration: 'underline' }}
                    onClick={onClose}
                  >
                    この保有時間帯の全トレードを見る（取引一覧へ）
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
