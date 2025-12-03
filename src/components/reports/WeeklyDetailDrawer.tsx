import { useEffect, useState, useRef } from 'react';
import { Trade } from '../../lib/types';
import { Bar } from 'react-chartjs-2';

interface WeeklyDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  weekData: {
    startDate: string;
    endDate: string;
    weekIndex: number;
    year: number;
    month: number;
  } | null;
  trades: Trade[];
}

interface WeeklyStats {
  totalProfit: number;
  winRate: number;
  tradeCount: number;
  profitFactor: number;
  avgProfit: number;
}

interface DayStats {
  day: string;
  profit: number;
  winRate: number;
  count: number;
}

interface HourStats {
  hour: string;
  profit: number;
  count: number;
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

export default function WeeklyDetailDrawer({ isOpen, onClose, weekData, trades }: WeeklyDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [weeklyTrades, setWeeklyTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isOpen]);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [dayStats, setDayStats] = useState<DayStats[]>([]);
  const [hourStats, setHourStats] = useState<HourStats[]>([]);
  const [pairStats, setPairStats] = useState<PairStats[]>([]);
  const [strategyStats, setStrategyStats] = useState<StrategyStats[]>([]);

  useEffect(() => {
    console.log('WeeklyDetailDrawer useEffect:', { isOpen, weekData, tradesCount: trades.length });
    if (!isOpen || !weekData) return;

    const filtered = trades.filter(t => {
      const tradeDate = new Date(t.closeTime || t.datetime);
      const start = new Date(weekData.startDate);
      const end = new Date(weekData.endDate);
      return tradeDate >= start && tradeDate <= end;
    });

    console.log('Filtered trades for week:', filtered.length);

    setWeeklyTrades(filtered);

    const wins = filtered.filter(t => t.profitYen > 0).length;
    const totalProfit = filtered.reduce((sum, t) => sum + t.profitYen, 0);
    const totalWins = filtered.filter(t => t.profitYen > 0).reduce((sum, t) => sum + t.profitYen, 0);
    const totalLosses = Math.abs(filtered.filter(t => t.profitYen < 0).reduce((sum, t) => sum + t.profitYen, 0));

    setStats({
      totalProfit,
      winRate: filtered.length > 0 ? (wins / filtered.length) * 100 : 0,
      tradeCount: filtered.length,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0,
      avgProfit: filtered.length > 0 ? totalProfit / filtered.length : 0,
    });

    const dayMap = new Map<string, { profit: number; wins: number; count: number }>();
    const hourMap = new Map<string, { profit: number; count: number }>();
    const pairMap = new Map<string, { profit: number; count: number }>();
    const strategyMap = new Map<string, { profit: number; count: number }>();

    filtered.forEach(t => {
      const date = new Date(t.closeTime || t.datetime);
      const dayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
      const hour = String(date.getHours()).padStart(2, '0') + ':00';

      const dayData = dayMap.get(dayName) || { profit: 0, wins: 0, count: 0 };
      dayData.profit += t.profitYen;
      if (t.profitYen > 0) dayData.wins++;
      dayData.count++;
      dayMap.set(dayName, dayData);

      const hourData = hourMap.get(hour) || { profit: 0, count: 0 };
      hourData.profit += t.profitYen;
      hourData.count++;
      hourMap.set(hour, hourData);

      const pairData = pairMap.get(t.pair) || { profit: 0, count: 0 };
      pairData.profit += t.profitYen;
      pairData.count++;
      pairMap.set(t.pair, pairData);

      const strategy = (t as any).setup || (t as any).strategy || '未分類';
      const strategyData = strategyMap.get(strategy) || { profit: 0, count: 0 };
      strategyData.profit += t.profitYen;
      strategyData.count++;
      strategyMap.set(strategy, strategyData);
    });

    setDayStats(
      Array.from(dayMap.entries()).map(([day, data]) => ({
        day,
        profit: data.profit,
        winRate: (data.wins / data.count) * 100,
        count: data.count,
      }))
    );

    setHourStats(
      Array.from(hourMap.entries())
        .map(([hour, data]) => ({ hour, profit: data.profit, count: data.count }))
        .sort((a, b) => a.hour.localeCompare(b.hour))
    );

    setPairStats(
      Array.from(pairMap.entries())
        .map(([pair, data]) => ({ pair, profit: data.profit, count: data.count }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 3)
    );

    setStrategyStats(
      Array.from(strategyMap.entries())
        .map(([strategy, data]) => ({ strategy, profit: data.profit, count: data.count }))
        .sort((a, b) => b.profit - a.profit)
    );
  }, [isOpen, weekData, trades]);

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

  console.log('WeeklyDetailDrawer render:', { isOpen, weekData });
  if (!isOpen || !weekData) return null;

  const bestDay = dayStats.length > 0 ? dayStats.reduce((a, b) => a.profit > b.profit ? a : b) : null;
  const worstDay = dayStats.length > 0 ? dayStats.reduce((a, b) => a.profit < b.profit ? a : b) : null;
  const bestHour = hourStats.length > 0 ? hourStats.reduce((a, b) => a.profit > b.profit ? a : b) : null;
  const worstHour = hourStats.length > 0 ? hourStats.reduce((a, b) => a.profit < b.profit ? a : b) : null;

  const aiComment = generateAIComment(stats, bestDay, worstDay, pairStats, strategyStats);

  const dayChartData = {
    labels: ['日', '月', '火', '水', '木', '金', '土'],
    datasets: [{
      label: '損益',
      data: ['日', '月', '火', '水', '木', '金', '土'].map(day => {
        const stat = dayStats.find(s => s.day === day);
        return stat ? stat.profit : 0;
      }),
      backgroundColor: ['日', '月', '火', '水', '木', '金', '土'].map(day => {
        const stat = dayStats.find(s => s.day === day);
        return stat && stat.profit >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      }),
    }]
  };

  const hourChartData = {
    labels: hourStats.map(h => h.hour),
    datasets: [{
      label: '損益',
      data: hourStats.map(h => h.profit),
      backgroundColor: hourStats.map(h => h.profit >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
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
        ref={drawerRef}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '40%',
          minWidth: 400,
          maxWidth: 800,
          background: 'var(--surface)',
          boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflowY: 'auto',
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
                {weekData.year}/{String(weekData.month).padStart(2, '0')} 第{weekData.weekIndex}週 詳細分析
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                この週の時間軸・通貨ペア・戦略の内訳
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                {weekData.startDate} 〜 {weekData.endDate}
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

        <div style={{ padding: 16 }}>
          {stats && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>週の基本KPI</h3>
              <div className="kpi-cards-grid-compact">
                <div className="kpi-card">
                  <div className="kpi-title">週合計損益</div>
                  <div className="kpi-value" style={{ color: stats.totalProfit >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>
                    {stats.totalProfit >= 0 ? '+' : ''}{Math.round(stats.totalProfit).toLocaleString()}円
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">勝率</div>
                  <div className="kpi-value">{stats.winRate.toFixed(1)}%</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">取引回数</div>
                  <div className="kpi-value">{stats.tradeCount}回</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">PF</div>
                  <div className="kpi-value">{stats.profitFactor.toFixed(2)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">平均損益</div>
                  <div className="kpi-value" style={{ color: stats.avgProfit >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>
                    {stats.avgProfit >= 0 ? '+' : ''}{Math.round(stats.avgProfit).toLocaleString()}円
                  </div>
                </div>
              </div>
            </div>
          )}

          {dayStats.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>曜日別内訳</h3>
              <div style={{ height: 200, marginBottom: 12 }}>
                <Bar data={dayChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {bestDay && (
                  <div style={{ flex: 1, padding: 8, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>ベスト曜日</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-2)' }}>
                      {bestDay.day}曜日 +{Math.round(bestDay.profit).toLocaleString()}円
                    </div>
                  </div>
                )}
                {worstDay && (
                  <div style={{ flex: 1, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>ワースト曜日</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--loss)' }}>
                      {worstDay.day}曜日 {Math.round(worstDay.profit).toLocaleString()}円
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {hourStats.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>時間帯別内訳</h3>
              <div style={{ height: 200, marginBottom: 12 }}>
                <Bar data={hourChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {bestHour && (
                  <div style={{ flex: 1, padding: 8, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>ベスト時間帯</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-2)' }}>
                      {bestHour.hour} +{Math.round(bestHour.profit).toLocaleString()}円
                    </div>
                  </div>
                )}
                {worstHour && (
                  <div style={{ flex: 1, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>ワースト時間帯</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--loss)' }}>
                      {worstHour.hour} {Math.round(worstHour.profit).toLocaleString()}円
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(pairStats.length > 0 || strategyStats.length > 0) && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>通貨ペア・戦略構成</h3>
              <div className="dash-row-2">
                {pairStats.length > 0 && (
                  <div className="kpi-card">
                    <div className="kpi-title">通貨ペア別損益（上位3つ）</div>
                    <div style={{ marginTop: 8 }}>
                      {pairStats.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < pairStats.length - 1 ? '1px solid var(--line)' : 'none' }}>
                          <span style={{ fontSize: 13, color: 'var(--ink)' }}>{p.pair} ({p.count}回)</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: p.profit >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>
                            {p.profit >= 0 ? '+' : ''}{Math.round(p.profit).toLocaleString()}円
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {strategyStats.length > 0 && (
                  <div className="kpi-card">
                    <div className="kpi-title">戦略別損益</div>
                    <div style={{ marginTop: 8 }}>
                      {strategyStats.slice(0, 3).map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
                          <span style={{ fontSize: 13, color: 'var(--ink)' }}>{s.strategy} ({s.count}回)</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: s.profit >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>
                            {s.profit >= 0 ? '+' : ''}{Math.round(s.profit).toLocaleString()}円
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

          {weeklyTrades.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>代表トレード一覧</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>日時</th>
                      <th>通貨ペア</th>
                      <th>戦略</th>
                      <th>損益</th>
                      <th>pips</th>
                      <th>売買</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyTrades.slice(0, 10).map((t, i) => (
                      <tr key={i}>
                        <td>{new Date(t.closeTime || t.datetime).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{t.pair}</td>
                        <td>{(t as any).setup || (t as any).strategy || '—'}</td>
                        <td style={{ color: t.profitYen >= 0 ? 'var(--accent-2)' : 'var(--loss)', fontWeight: 700 }}>
                          {t.profitYen >= 0 ? '+' : ''}{Math.round(t.profitYen).toLocaleString()}
                        </td>
                        <td>{t.pips.toFixed(1)}</td>
                        <td style={{ color: t.side === 'LONG' ? 'var(--accent-2)' : 'var(--loss)' }}>{t.side}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {weeklyTrades.length > 10 && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <a
                    href="#/trades"
                    style={{ color: 'var(--accent-2)', fontSize: 13, textDecoration: 'underline' }}
                    onClick={onClose}
                  >
                    この週の全トレードを見る（取引一覧へ）
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

function generateAIComment(
  stats: WeeklyStats | null,
  bestDay: DayStats | null,
  worstDay: DayStats | null,
  pairStats: PairStats[],
  strategyStats: StrategyStats[]
): string {
  if (!stats) return '';

  const parts: string[] = [];

  if (bestDay && pairStats.length > 0) {
    const topPair = pairStats[0];
    const topStrategy = strategyStats.length > 0 ? strategyStats[0] : null;
    parts.push(`${bestDay.day}曜日の${topPair.pair}${topStrategy ? topStrategy.strategy : ''}が主力でした。`);
  }

  if (worstDay && worstDay.profit < 0) {
    parts.push(`${worstDay.day}曜日は苦戦しており、この曜日の取引は慎重に検討すると安定しやすいです。`);
  }

  if (stats.winRate < 40) {
    parts.push('勝率が低めなので、エントリー基準の見直しをおすすめします。');
  } else if (stats.winRate > 60 && stats.totalProfit > 0) {
    parts.push('高勝率かつプラスで好調です。このペースを維持しましょう。');
  }

  return parts.join(' ') || 'この週の取引パターンを分析し、次週に活かしましょう。';
}
