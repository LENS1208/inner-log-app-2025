import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { Trade } from '../../lib/types';
import { getTradeProfit, getTradeTime } from '../../lib/filterTrades';
import { getAccentColor, getLossColor, getGridLineColor } from '../../lib/chartColors';
import { HelpIcon } from '../common/HelpIcon';
import { AiCoachMessage } from '../common/AiCoachMessage';
import { generateTimeSlotLossStreakComment } from '../../lib/aiCoachGenerator';
import { useDataset } from '../../lib/dataset.context';

interface LossStreakTimeDetailDrawerProps {
  timeSlot: number;
  allTrades: Trade[];
  onClose: () => void;
}

interface LossStreakSequence {
  id: number;
  startDate: string;
  endDate: string;
  count: number;
  totalLoss: number;
  trades: Trade[];
}

const TIME_SLOT_NAMES: { [key: number]: string } = {
  6: 'アジア朝（06〜10）',
  10: 'アジア昼（10〜14）',
  14: '欧州前場（14〜18）',
  18: '欧州後場（18〜22）',
  22: 'NY前場（22〜02）',
  2: 'NY後場（02〜06）',
};

const getTimeSlotName = (hour: number): string => {
  if (hour >= 6 && hour < 10) return TIME_SLOT_NAMES[6];
  if (hour >= 10 && hour < 14) return TIME_SLOT_NAMES[10];
  if (hour >= 14 && hour < 18) return TIME_SLOT_NAMES[14];
  if (hour >= 18 && hour < 22) return TIME_SLOT_NAMES[18];
  if (hour >= 22 || hour < 2) return TIME_SLOT_NAMES[22];
  return TIME_SLOT_NAMES[2];
};

export default function LossStreakTimeDetailDrawer({ timeSlot, allTrades, onClose }: LossStreakTimeDetailDrawerProps) {
  const { userSettings } = useDataset();

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter trades for this time slot
  const timeSlotTrades = useMemo(() => {
    return allTrades.filter(trade => {
      const time = getTradeTime(trade);
      const date = new Date(time);
      const hour = date.getHours();

      if (timeSlot >= 6 && timeSlot < 10) return hour >= 6 && hour < 10;
      if (timeSlot >= 10 && timeSlot < 14) return hour >= 10 && hour < 14;
      if (timeSlot >= 14 && timeSlot < 18) return hour >= 14 && hour < 18;
      if (timeSlot >= 18 && timeSlot < 22) return hour >= 18 && hour < 22;
      if (timeSlot >= 22) return hour >= 22 || hour < 2;
      if (timeSlot < 6) return hour >= 2 && hour < 6;
      return false;
    });
  }, [allTrades, timeSlot]);

  // Calculate loss streak sequences
  const lossStreakSequences = useMemo((): LossStreakSequence[] => {
    if (timeSlotTrades.length === 0) return [];

    const sortedTrades = [...timeSlotTrades].sort((a, b) => {
      const timeA = new Date(getTradeTime(a)).getTime();
      const timeB = new Date(getTradeTime(b)).getTime();
      return timeA - timeB;
    });

    const sequences: LossStreakSequence[] = [];
    let currentSequence: Trade[] = [];
    let sequenceId = 1;

    sortedTrades.forEach((trade, index) => {
      const profit = getTradeProfit(trade);

      if (profit < 0) {
        currentSequence.push(trade);
      } else {
        if (currentSequence.length > 0) {
          const totalLoss = currentSequence.reduce((sum, t) => sum + getTradeProfit(t), 0);
          sequences.push({
            id: sequenceId++,
            startDate: getTradeTime(currentSequence[0]),
            endDate: getTradeTime(currentSequence[currentSequence.length - 1]),
            count: currentSequence.length,
            totalLoss,
            trades: [...currentSequence],
          });
        }
        currentSequence = [];
      }
    });

    // Handle trailing sequence
    if (currentSequence.length > 0) {
      const totalLoss = currentSequence.reduce((sum, t) => sum + getTradeProfit(t), 0);
      sequences.push({
        id: sequenceId++,
        startDate: getTradeTime(currentSequence[0]),
        endDate: getTradeTime(currentSequence[currentSequence.length - 1]),
        count: currentSequence.length,
        totalLoss,
        trades: [...currentSequence],
      });
    }

    return sequences.sort((a, b) => Math.abs(b.totalLoss) - Math.abs(a.totalLoss));
  }, [timeSlotTrades]);

  // Get all loss trades from sequences
  const allLossTrades = useMemo(() => {
    const trades: Trade[] = [];
    lossStreakSequences.forEach(seq => {
      trades.push(...seq.trades);
    });
    return trades;
  }, [lossStreakSequences]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalTrades = timeSlotTrades.length;
    const sequenceCount = lossStreakSequences.length;
    const maxStreak = lossStreakSequences.length > 0 ? Math.max(...lossStreakSequences.map(s => s.count)) : 0;
    const totalLoss = allLossTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const avgLoss = allLossTrades.length > 0 ? totalLoss / allLossTrades.length : 0;

    // Calculate PF for loss streaks
    const wins = allLossTrades.filter(t => getTradeProfit(t) > 0);
    const losses = allLossTrades.filter(t => getTradeProfit(t) < 0);
    const grossProfit = wins.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + getTradeProfit(t), 0));
    const pf = grossLoss > 0 ? grossProfit / grossLoss : 0;

    return {
      totalTrades,
      sequenceCount,
      maxStreak,
      totalLoss,
      avgLoss,
      pf,
    };
  }, [timeSlotTrades, lossStreakSequences, allLossTrades]);

  // Pair breakdown
  const pairBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    allLossTrades.forEach(trade => {
      const pair = trade.pair || trade.symbol || 'Unknown';
      const loss = getTradeProfit(trade);
      map.set(pair, (map.get(pair) || 0) + loss);
    });
    return Array.from(map.entries())
      .map(([pair, loss]) => ({ pair, loss }))
      .sort((a, b) => a.loss - b.loss)
      .slice(0, 8);
  }, [allLossTrades]);

  // Strategy breakdown
  const strategyBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    allLossTrades.forEach(trade => {
      const strategy = (trade as any).setup || (trade as any).strategy || 'その他';
      const loss = getTradeProfit(trade);
      map.set(strategy, (map.get(strategy) || 0) + loss);
    });
    return Array.from(map.entries())
      .map(([strategy, loss]) => ({ strategy, loss }))
      .sort((a, b) => a.loss - b.loss)
      .slice(0, 8);
  }, [allLossTrades]);

  // Weekday breakdown
  const weekdayBreakdown = useMemo(() => {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const map = new Map<string, number>();

    allLossTrades.forEach(trade => {
      const time = getTradeTime(trade);
      const date = new Date(time);
      const weekday = weekdays[date.getDay()];
      const loss = getTradeProfit(trade);
      map.set(weekday, (map.get(weekday) || 0) + loss);
    });

    return weekdays
      .map(day => ({ weekday: day, loss: map.get(day) || 0 }))
      .filter(item => item.loss < 0);
  }, [allLossTrades]);

  // Calculate average holding time during streaks
  const avgHoldingTime = useMemo(() => {
    if (allLossTrades.length === 0) return 0;

    const totalMinutes = allLossTrades.reduce((sum, trade) => {
      const openTime = new Date(trade.openTime || getTradeTime(trade)).getTime();
      const closeTime = new Date(trade.closeTime || getTradeTime(trade)).getTime();
      const minutes = (closeTime - openTime) / (1000 * 60);
      return sum + minutes;
    }, 0);

    return totalMinutes / allLossTrades.length;
  }, [allLossTrades]);

  // AI Coach Comment
  const aiComment = useMemo(() => {
    const coachType = (userSettings?.coach_avatar_preset || 'teacher') as 'teacher' | 'beginner' | 'advanced';
    return generateTimeSlotLossStreakComment(
      {
        timeSlotName: getTimeSlotName(timeSlot),
        totalTrades: kpis.totalTrades,
        sequenceCount: kpis.sequenceCount,
        maxStreak: kpis.maxStreak,
        totalLoss: kpis.totalLoss,
        topPair: pairBreakdown[0]?.pair || '',
        topStrategy: strategyBreakdown[0]?.strategy || '',
        topWeekday: weekdayBreakdown[0]?.weekday || '',
      },
      coachType
    );
  }, [timeSlot, kpis, pairBreakdown, strategyBreakdown, weekdayBreakdown, userSettings]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}分`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}時間${mins}分`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          animation: 'fadeIn 0.2s',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
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
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              連敗詳細：{getTimeSlotName(timeSlot)}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              この時間帯の連敗パターン
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

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {/* Block A: Basic KPIs */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              基本指標
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>トレード回数</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{kpis.totalTrades}回</div>
              </div>
              <div style={{ background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>連敗発生回数</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: getLossColor() }}>{kpis.sequenceCount}回</div>
              </div>
              <div style={{ background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>最大連敗数</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: getLossColor() }}>{kpis.maxStreak}連敗</div>
              </div>
              <div style={{ background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>連敗時の合計損失</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: getLossColor() }}>
                  {kpis.totalLoss.toLocaleString()}円
                </div>
              </div>
              <div style={{ background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>連敗時の平均損失</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: getLossColor() }}>
                  {Math.round(kpis.avgLoss).toLocaleString()}円
                </div>
              </div>
              <div style={{ background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>連敗中PF</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{kpis.pf.toFixed(2)}</div>
              </div>
            </div>
          </section>

          {/* Block B: Structure Analysis */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              連敗の構造分析
            </h3>

            {/* Pair breakdown */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                通貨ペア別 連敗損失
                <HelpIcon text="どの通貨ペアで連敗しているかを示します" />
              </h4>
              <div style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: pairBreakdown.map(d => d.pair),
                    datasets: [{
                      data: pairBreakdown.map(d => d.loss),
                      backgroundColor: getLossColor(),
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.parsed.y.toLocaleString()}円`,
                        },
                      },
                    },
                    scales: {
                      x: { grid: { color: getGridLineColor() } },
                      y: {
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value) => `${Number(value).toLocaleString()}円`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Strategy breakdown */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                戦略タグ別 連敗損失
                <HelpIcon text="どの戦略で連敗しているかを示します" />
              </h4>
              <div style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: strategyBreakdown.map(d => d.strategy),
                    datasets: [{
                      data: strategyBreakdown.map(d => d.loss),
                      backgroundColor: getLossColor(),
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.parsed.y.toLocaleString()}円`,
                        },
                      },
                    },
                    scales: {
                      x: { grid: { color: getGridLineColor() } },
                      y: {
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value) => `${Number(value).toLocaleString()}円`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Weekday breakdown */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                曜日別 連敗損失
                <HelpIcon text="連敗しやすい曜日を示します" />
              </h4>
              <div style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: weekdayBreakdown.map(d => d.weekday),
                    datasets: [{
                      data: weekdayBreakdown.map(d => d.loss),
                      backgroundColor: getLossColor(),
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.parsed.y.toLocaleString()}円`,
                        },
                      },
                    },
                    scales: {
                      x: { grid: { color: getGridLineColor() } },
                      y: {
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value) => `${Number(value).toLocaleString()}円`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </section>

          {/* Block C: Loss Streak Sequences */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              連敗シーケンスのパターン
            </h3>

            {/* Top 3 sequences */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                代表連敗シーケンス（上位3件）
              </h4>
              <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--chip)', borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: 8, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>シーケンス</th>
                      <th style={{ padding: 8, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>連敗数</th>
                      <th style={{ padding: 8, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>期間</th>
                      <th style={{ padding: 8, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>合計損失</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lossStreakSequences.slice(0, 3).map((seq) => (
                      <tr key={seq.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: 8, fontSize: 13 }}>#{seq.id}</td>
                        <td style={{ padding: 8, fontSize: 13, color: getLossColor(), fontWeight: 600 }}>
                          {seq.count}連敗
                        </td>
                        <td style={{ padding: 8, fontSize: 12, color: 'var(--muted)' }}>
                          {formatDate(seq.startDate)} 〜 {formatDate(seq.endDate)}
                        </td>
                        <td style={{ padding: 8, fontSize: 13, textAlign: 'right', color: getLossColor(), fontWeight: 600 }}>
                          {seq.totalLoss.toLocaleString()}円
                        </td>
                      </tr>
                    ))}
                    {lossStreakSequences.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                          連敗シーケンスがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  連敗中の平均保有時間
                  <HelpIcon text="連敗トレードの平均保有時間" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  {formatTime(avgHoldingTime)}
                </div>
              </div>
            </div>
          </section>

          {/* Block D: AI Coach Comment */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              AIコーチからのアドバイス
            </h3>
            <AiCoachMessage
              icon="💡"
              title="気づき"
              message={aiComment.insight}
              variant="info"
            />
            <div style={{ marginTop: 12 }}>
              <AiCoachMessage
                icon="⚠️"
                title="注意点"
                message={aiComment.warning}
                variant="warning"
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <AiCoachMessage
                icon="→"
                title="次の一手"
                message={aiComment.nextStep}
                variant="success"
              />
            </div>
          </section>

          {/* Block E: Trade List */}
          <section>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              該当トレード一覧（連敗関連）
            </h3>
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--chip)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: 8, textAlign: 'left', fontSize: 11, fontWeight: 600 }}>日時</th>
                      <th style={{ padding: 8, textAlign: 'left', fontSize: 11, fontWeight: 600 }}>通貨</th>
                      <th style={{ padding: 8, textAlign: 'left', fontSize: 11, fontWeight: 600 }}>売買</th>
                      <th style={{ padding: 8, textAlign: 'left', fontSize: 11, fontWeight: 600 }}>戦略</th>
                      <th style={{ padding: 8, textAlign: 'right', fontSize: 11, fontWeight: 600 }}>損益</th>
                      <th style={{ padding: 8, textAlign: 'right', fontSize: 11, fontWeight: 600 }}>pips</th>
                      <th style={{ padding: 8, textAlign: 'right', fontSize: 11, fontWeight: 600 }}>保有時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLossTrades.slice(0, 20).map((trade, idx) => {
                      const openTime = new Date(trade.openTime || getTradeTime(trade)).getTime();
                      const closeTime = new Date(trade.closeTime || getTradeTime(trade)).getTime();
                      const holdingMinutes = (closeTime - openTime) / (1000 * 60);

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: 8, fontSize: 12, color: 'var(--muted)' }}>
                            {formatDate(getTradeTime(trade))}
                          </td>
                          <td style={{ padding: 8, fontSize: 12 }}>{trade.pair || trade.symbol}</td>
                          <td style={{ padding: 8, fontSize: 12 }}>{trade.side}</td>
                          <td style={{ padding: 8, fontSize: 12 }}>
                            {(trade as any).setup || (trade as any).strategy || '-'}
                          </td>
                          <td style={{ padding: 8, fontSize: 12, textAlign: 'right', color: getLossColor(), fontWeight: 600 }}>
                            {getTradeProfit(trade).toLocaleString()}
                          </td>
                          <td style={{ padding: 8, fontSize: 12, textAlign: 'right' }}>
                            {trade.pips?.toFixed(1) || '-'}
                          </td>
                          <td style={{ padding: 8, fontSize: 12, textAlign: 'right', color: 'var(--muted)' }}>
                            {formatTime(holdingMinutes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {allLossTrades.length > 20 && (
              <div style={{ textAlign: 'center', padding: 12 }}>
                <a
                  href="#/trades"
                  style={{
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  この時間帯の連敗トレードをすべて見る（取引一覧へ）→
                </a>
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
