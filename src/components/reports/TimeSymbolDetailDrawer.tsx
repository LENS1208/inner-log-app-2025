import { useEffect, useState, useMemo } from 'react';
import { Trade } from '../../lib/types';
import { Bar, Pie } from 'react-chartjs-2';
import { getAccentColor, getLossColor, getLongColor, getShortColor } from '../../lib/chartColors';
import { getTradeProfit, getTradeTime } from '../../lib/filterTrades';

interface TimeSymbolDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  timeSlot: {
    label: string;
    start: number;
    end: number;
  } | null;
  symbol: string | null;
  trades: Trade[];
}

interface Stats {
  tradeCount: number;
  winRate: number;
  avgProfit: number;
  avgPips: number;
  profitFactor: number;
  totalProfit: number;
}

interface DirectionStats {
  buy: { count: number; profit: number };
  sell: { count: number; profit: number };
}

interface SetupStats {
  setup: string;
  profit: number;
  count: number;
}

export default function TimeSymbolDetailDrawer({ isOpen, onClose, timeSlot, symbol, trades }: TimeSymbolDetailDrawerProps) {
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [directionStats, setDirectionStats] = useState<DirectionStats | null>(null);
  const [setupStats, setSetupStats] = useState<SetupStats[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: number; profit: number }[]>([]);

  useEffect(() => {
    console.log('TimeSymbolDetailDrawer useEffect:', { isOpen, timeSlot, symbol, tradesCount: trades.length });
    if (!isOpen || !timeSlot || !symbol) return;

    const filtered = trades.filter(t => {
      if (t.pair !== symbol) return false;

      const date = new Date(getTradeTime(t));
      let hour = date.getHours();

      if (timeSlot.start === 22 && hour >= 0 && hour < 6) {
        hour += 24;
      }

      if (timeSlot.start < timeSlot.end) {
        return hour >= timeSlot.start && hour < timeSlot.end;
      } else if (timeSlot.start === 22) {
        return hour >= 22 && hour < 26;
      } else {
        return hour >= timeSlot.start || hour < timeSlot.end;
      }
    });

    console.log('Filtered trades for time-symbol:', filtered.length);
    setFilteredTrades(filtered);

    if (filtered.length === 0) {
      setStats(null);
      setDirectionStats(null);
      setSetupStats([]);
      setHourlyData([]);
      return;
    }

    const wins = filtered.filter(t => getTradeProfit(t) > 0).length;
    const totalProfit = filtered.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const totalWins = filtered.filter(t => getTradeProfit(t) > 0).reduce((sum, t) => sum + getTradeProfit(t), 0);
    const totalLosses = Math.abs(filtered.filter(t => getTradeProfit(t) < 0).reduce((sum, t) => sum + getTradeProfit(t), 0));
    const avgPips = filtered.reduce((sum, t) => sum + (t.pips || 0), 0) / filtered.length;

    setStats({
      tradeCount: filtered.length,
      winRate: (wins / filtered.length) * 100,
      avgProfit: totalProfit / filtered.length,
      avgPips,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0,
      totalProfit,
    });

    const buyTrades = filtered.filter(t => t.type?.toLowerCase() === 'buy');
    const sellTrades = filtered.filter(t => t.type?.toLowerCase() === 'sell');

    setDirectionStats({
      buy: {
        count: buyTrades.length,
        profit: buyTrades.reduce((sum, t) => sum + getTradeProfit(t), 0),
      },
      sell: {
        count: sellTrades.length,
        profit: sellTrades.reduce((sum, t) => sum + getTradeProfit(t), 0),
      },
    });

    const setupMap = new Map<string, { profit: number; count: number }>();
    filtered.forEach(t => {
      const setup = t.setup || '未分類';
      const current = setupMap.get(setup) || { profit: 0, count: 0 };
      setupMap.set(setup, {
        profit: current.profit + getTradeProfit(t),
        count: current.count + 1,
      });
    });

    const setupArray = Array.from(setupMap.entries())
      .map(([setup, data]) => ({ setup, ...data }))
      .sort((a, b) => b.profit - a.profit);
    setSetupStats(setupArray);

    const hourMap = new Map<number, number>();
    for (let h = timeSlot.start; h < timeSlot.start + (timeSlot.end > timeSlot.start ? timeSlot.end - timeSlot.start : 24); h++) {
      const realHour = h % 24;
      hourMap.set(realHour, 0);
    }

    filtered.forEach(t => {
      const date = new Date(getTradeTime(t));
      const hour = date.getHours();
      const profit = getTradeProfit(t);
      hourMap.set(hour, (hourMap.get(hour) || 0) + profit);
    });

    const hourArray = Array.from(hourMap.entries())
      .map(([hour, profit]) => ({ hour, profit }))
      .sort((a, b) => a.hour - b.hour);
    setHourlyData(hourArray);

  }, [isOpen, timeSlot, symbol, trades]);

  if (!isOpen) return null;

  const timeSlotStr = timeSlot ? `${String(timeSlot.start).padStart(2, '0')}-${String(timeSlot.end % 24).padStart(2, '0')}` : '';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-600px',
        width: 600,
        maxWidth: '90vw',
        height: '100vh',
        background: 'var(--surface)',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
        zIndex: 1000,
        transition: 'right 0.3s ease',
        overflowY: 'auto',
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
            {symbol} × {timeSlot?.label} 詳細分析
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>
            この時間帯・この通貨ペアのトレード傾向
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
          }}
        >
          ×
        </button>
      </div>

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>取引回数</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{stats.tradeCount}件</div>
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
                {stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>売買方向</h3>
              <div style={{ height: 150 }}>
                {directionStats && (directionStats.buy.count + directionStats.sell.count > 0) ? (
                  <Pie
                    data={{
                      labels: ['買い', '売り'],
                      datasets: [{
                        data: [directionStats.buy.count, directionStats.sell.count],
                        backgroundColor: [getLongColor(), getShortColor()],
                        borderWidth: 0,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' as const },
                      },
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-light)' }}>
                    データなし
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>戦略別損益</h3>
              <div style={{ height: 150 }}>
                {setupStats.length > 0 ? (
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
                      indexAxis: 'y' as const,
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        x: { beginAtZero: true },
                      },
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-light)' }}>
                    データなし
                  </div>
                )}
              </div>
            </div>
          </div>

          {directionStats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-light)', marginBottom: 4 }}>買い平均損益</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: directionStats.buy.profit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {directionStats.buy.count > 0
                    ? `${directionStats.buy.profit >= 0 ? '+' : ''}${Math.round(directionStats.buy.profit / directionStats.buy.count).toLocaleString()}円`
                    : 'N/A'}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-light)', marginBottom: 4 }}>売り平均損益</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: directionStats.sell.profit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {directionStats.sell.count > 0
                    ? `${directionStats.sell.profit >= 0 ? '+' : ''}${Math.round(directionStats.sell.profit / directionStats.sell.count).toLocaleString()}円`
                    : 'N/A'}
                </div>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>時間帯内の時刻別損益</h3>
            <div style={{ height: 180 }}>
              {hourlyData.length > 0 ? (
                <Bar
                  data={{
                    labels: hourlyData.map(h => `${h.hour}時`),
                    datasets: [{
                      label: '損益',
                      data: hourlyData.map(h => h.profit),
                      backgroundColor: hourlyData.map(h => h.profit >= 0 ? getAccentColor() : getLossColor()),
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-light)' }}>
                  データなし
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>AIコメント</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>
              {symbol} × {timeSlot?.label}では
              勝率{stats.winRate.toFixed(1)}%・PF{stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toFixed(2)}
              {stats.totalProfit >= 0 ? 'とプラス収支のゾーンです。' : 'でマイナス収支となっています。'}
              {hourlyData.length > 0 && (() => {
                const worstHour = hourlyData.reduce((min, h) => h.profit < min.profit ? h : min, hourlyData[0]);
                return worstHour.profit < 0 ? ` ${worstHour.hour}時台で損失が出やすい傾向があります。` : '';
              })()}
            </p>
          </div>

          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>該当トレード一覧</h3>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
                  <tr>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-light)' }}>日時</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-light)' }}>方向</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-light)' }}>戦略</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--ink-light)' }}>損益</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--ink-light)' }}>pips</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.slice(0, 20).map((trade, idx) => {
                    const profit = getTradeProfit(trade);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '8px 4px', color: 'var(--ink)' }}>
                          {new Date(getTradeTime(trade)).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                        </td>
                        <td style={{ padding: '8px 4px', color: 'var(--ink)' }}>{trade.type || '-'}</td>
                        <td style={{ padding: '8px 4px', color: 'var(--ink)' }}>{trade.setup || '-'}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', color: profit >= 0 ? 'var(--gain)' : 'var(--loss)', fontWeight: 600 }}>
                          {profit >= 0 ? '+' : ''}{Math.round(profit).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--ink)' }}>
                          {trade.pips?.toFixed(1) || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTrades.length > 20 && (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--ink-light)', fontSize: 12 }}>
                  他 {filteredTrades.length - 20} 件
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!stats && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-light)' }}>
          該当するトレードがありません
        </div>
      )}
    </div>
  );
}
