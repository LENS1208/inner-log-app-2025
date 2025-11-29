import React, { useEffect, useMemo, useState } from "react";
import { useDataset } from "../lib/dataset.context";
import { filterTrades, isValidCurrencyPair } from "../lib/filterTrades";
import type { Trade as FilteredTrade } from "../lib/types";
import { parseCsvText } from "../lib/csv";
import { Line, Doughnut } from 'react-chartjs-2';
import { ja } from 'date-fns/locale';
import { getAccentColor, getLossColor, createProfitGradient, createDrawdownGradient } from '../lib/chartColors';
import { HelpIcon } from '../components/common/HelpIcon';
import "../lib/dashboard.css";

type TradeWithProfit = {
  profitYen?: number;
  profitJPY?: number;
  datetime?: string;
  time?: number;
  pair?: string;
  symbol?: string;
  side?: 'LONG' | 'SHORT';
  pips?: number;
  type?: string;
  openTime?: string;
}

function getProfit(t: TradeWithProfit): number {
  return t.profitYen ?? t.profitJPY ?? 0;
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN);
  if (typeof datetime === 'number') return new Date(datetime);
  let dt = String(datetime).trim();
  if (!dt) return new Date(NaN);
  dt = dt.replace(/\./g, '-').replace(' ', 'T');
  return new Date(dt);
}

function computeMetrics(trades: TradeWithProfit[]) {
  const tradingOnly = trades.filter(t => !(t as any).type || (t as any).type?.toLowerCase() !== 'balance');
  const count = tradingOnly.length;
  const gross = tradingOnly.reduce((a, b) => a + getProfit(b), 0);
  const avg = count ? gross / count : 0;
  const wins = tradingOnly.filter(t => getProfit(t) > 0).length;
  const losses = tradingOnly.filter(t => getProfit(t) < 0).length;
  const winRate = count ? wins / count : 0;

  const totalProfit = tradingOnly.filter(t => getProfit(t) > 0).reduce((a, b) => a + getProfit(b), 0);
  const totalLoss = Math.abs(tradingOnly.filter(t => getProfit(t) < 0).reduce((a, b) => a + getProfit(b), 0));
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);

  const validTrades = tradingOnly.filter(t => {
    const date = parseDateTime(t.datetime || t.time);
    return !isNaN(date.getTime());
  });

  const sortedTrades = [...validTrades].sort((a, b) => parseDateTime(a.datetime || a.time).getTime() - parseDateTime(b.datetime || b.time).getTime());

  let equity = 0;
  let peak = 0;
  let maxDD = 0;
  sortedTrades.forEach(t => {
    equity += getProfit(t);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  });

  const tradesWithPips = tradingOnly.filter(t => typeof t.pips === 'number');
  const avgPips = tradesWithPips.length > 0 ? tradesWithPips.reduce((sum, t) => sum + (t.pips || 0), 0) / tradesWithPips.length : 0;

  // 勝ち平均・負け平均
  const winTrades = tradingOnly.filter(t => getProfit(t) > 0);
  const lossTrades = tradingOnly.filter(t => getProfit(t) < 0);
  const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + getProfit(t), 0) / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((sum, t) => sum + getProfit(t), 0) / lossTrades.length : 0;

  // 勝ち平均pips・負け平均pips
  const winTradesWithPips = winTrades.filter(t => typeof t.pips === 'number');
  const lossTradesWithPips = lossTrades.filter(t => typeof t.pips === 'number');
  const avgWinPips = winTradesWithPips.length > 0 ? winTradesWithPips.reduce((sum, t) => sum + (t.pips || 0), 0) / winTradesWithPips.length : 0;
  const avgLossPips = lossTradesWithPips.length > 0 ? lossTradesWithPips.reduce((sum, t) => sum + (t.pips || 0), 0) / lossTradesWithPips.length : 0;

  const profits = tradingOnly.map(t => getProfit(t));
  const variance = profits.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / (profits.length > 1 ? profits.length - 1 : 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avg / stdDev : 0;

  const dates = trades
    .map(t => {
      const dateStr = t.openTime || t.datetime;
      if (!dateStr) return null;
      try {
        return new Date(dateStr);
      } catch {
        return null;
      }
    })
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const tradePeriod = dates.length > 0
    ? `${dates[0].getFullYear()}年${dates[0].getMonth() + 1}月${dates[0].getDate()}日〜${dates[dates.length - 1].getFullYear()}年${dates[dates.length - 1].getMonth() + 1}月${dates[dates.length - 1].getDate()}日`
    : null;

  return { count, gross, avg, winRate, profitFactor, maxDD, avgPips, sharpeRatio, peak, tradePeriod, totalWins: totalProfit, totalLosses: -totalLoss, avgWin, avgLoss, avgWinPips, avgLossPips, wins, losses };
}

function computeTopTrends(trades: TradeWithProfit[]) {
  const tradingOnly = trades.filter(t => !(t as any).type || (t as any).type?.toLowerCase() !== 'balance');

  // 曜日別
  const weekdayMap = new Map<string, { pnl: number; count: number }>();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  tradingOnly.forEach(t => {
    const date = parseDateTime(t.datetime || t.time);
    if (!isNaN(date.getTime())) {
      const dow = weekdays[date.getDay()];
      const current = weekdayMap.get(dow) || { pnl: 0, count: 0 };
      weekdayMap.set(dow, { pnl: current.pnl + getProfit(t), count: current.count + 1 });
    }
  });
  const weekdayEntries = Array.from(weekdayMap.entries()).sort((a, b) => b[1].pnl - a[1].pnl);
  const bestWeekday = weekdayEntries[0];
  const worstWeekday = weekdayEntries[weekdayEntries.length - 1];

  // 時間帯別
  const hourMap = new Map<number, { pnl: number; count: number }>();
  tradingOnly.forEach(t => {
    const date = parseDateTime(t.datetime || t.time);
    if (!isNaN(date.getTime())) {
      const hour = date.getHours();
      const current = hourMap.get(hour) || { pnl: 0, count: 0 };
      hourMap.set(hour, { pnl: current.pnl + getProfit(t), count: current.count + 1 });
    }
  });
  const hourEntries = Array.from(hourMap.entries()).sort((a, b) => b[1].pnl - a[1].pnl);
  const bestHour = hourEntries[0];
  const worstHour = hourEntries[hourEntries.length - 1];

  // 通貨ペア別
  const pairMap = new Map<string, { pnl: number; count: number }>();
  tradingOnly.forEach(t => {
    const pair = t.pair || t.symbol || 'UNKNOWN';
    if (pair !== 'UNKNOWN') {
      const current = pairMap.get(pair) || { pnl: 0, count: 0 };
      pairMap.set(pair, { pnl: current.pnl + getProfit(t), count: current.count + 1 });
    }
  });
  const pairEntries = Array.from(pairMap.entries()).sort((a, b) => b[1].pnl - a[1].pnl);
  const bestPair = pairEntries[0];
  const worstPair = pairEntries[pairEntries.length - 1];

  return { bestWeekday, worstWeekday, bestHour, worstHour, bestPair, worstPair };
}

function computePreviousPeriodComparison(trades: TradeWithProfit[]) {
  const tradingOnly = trades.filter(t => !(t as any).type || (t as any).type?.toLowerCase() !== 'balance');
  const validTrades = tradingOnly.filter(t => !isNaN(parseDateTime(t.datetime || t.time).getTime()));
  const sorted = [...validTrades].sort((a, b) => parseDateTime(a.datetime || a.time).getTime() - parseDateTime(b.datetime || b.time).getTime());

  if (sorted.length === 0) {
    return { profitChange: 0, profitChangePercent: 0, pfCurrent: 0, pfPrevious: 0, winRateCurrent: 0, winRatePrevious: 0 };
  }

  const midpoint = Math.floor(sorted.length / 2);
  const previousPeriod = sorted.slice(0, midpoint);
  const currentPeriod = sorted.slice(midpoint);

  const calcMetrics = (trades: TradeWithProfit[]) => {
    const gross = trades.reduce((a, b) => a + getProfit(b), 0);
    const wins = trades.filter(t => getProfit(t) > 0).length;
    const winRate = trades.length ? wins / trades.length : 0;
    const totalProfit = trades.filter(t => getProfit(t) > 0).reduce((a, b) => a + getProfit(b), 0);
    const totalLoss = Math.abs(trades.filter(t => getProfit(t) < 0).reduce((a, b) => a + getProfit(b), 0));
    const pf = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);
    return { gross, winRate, pf };
  };

  const prev = calcMetrics(previousPeriod);
  const curr = calcMetrics(currentPeriod);

  const profitChange = curr.gross - prev.gross;
  const profitChangePercent = prev.gross !== 0 ? (profitChange / Math.abs(prev.gross)) * 100 : 0;

  return {
    profitChange,
    profitChangePercent,
    pfCurrent: curr.pf,
    pfPrevious: prev.pf,
    winRateCurrent: curr.winRate,
    winRatePrevious: prev.winRate
  };
}

function generateAIInsights(metrics: any, trends: any) {
  const goodPoints: string[] = [];
  const concerns: string[] = [];
  const nextSteps: string[] = [];

  // 良い点
  if (metrics.gross > 0) {
    goodPoints.push(`合計損益が${Math.round(metrics.gross).toLocaleString('ja-JP')}円とプラスを維持`);
  }
  if (metrics.winRate >= 0.5) {
    goodPoints.push(`勝率${(metrics.winRate * 100).toFixed(1)}%と安定`);
  }
  if (metrics.profitFactor >= 1.5) {
    goodPoints.push(`PF${metrics.profitFactor.toFixed(2)}で利益効率が高い`);
  }
  if (trends.bestWeekday && trends.bestWeekday[1].pnl > 0) {
    goodPoints.push(`${trends.bestWeekday[0]}曜日で${Math.round(trends.bestWeekday[1].pnl).toLocaleString('ja-JP')}円獲得`);
  }

  // 注意点
  if (metrics.maxDD > metrics.gross * 0.3) {
    concerns.push(`最大DD${Math.round(metrics.maxDD).toLocaleString('ja-JP')}円に注意`);
  }
  if (metrics.winRate < 0.4) {
    concerns.push(`勝率${(metrics.winRate * 100).toFixed(1)}%と低め`);
  }
  if (trends.worstWeekday && trends.worstWeekday[1].pnl < 0) {
    concerns.push(`${trends.worstWeekday[0]}曜日で${Math.round(trends.worstWeekday[1].pnl).toLocaleString('ja-JP')}円損失`);
  }
  if (metrics.profitFactor < 1.0) {
    concerns.push(`PF${metrics.profitFactor.toFixed(2)}で損失超過`);
  }

  // 次の一手
  if (trends.bestWeekday && trends.bestWeekday[1].pnl > 0) {
    nextSteps.push(`${trends.bestWeekday[0]}曜日・${trends.bestHour ? trends.bestHour[0] : ''}時台に集中`);
  }
  if (metrics.maxDD > metrics.gross * 0.3) {
    nextSteps.push(`ロット上限を現在の70%に固定してリスク管理`);
  }
  if (trends.worstPair && trends.worstPair[1].pnl < 0) {
    nextSteps.push(`${trends.worstPair[0]}の取引を一時停止`);
  }
  if (nextSteps.length === 0) {
    nextSteps.push(`現在の戦略を維持し、記録を継続`);
  }

  return {
    goodPoints: goodPoints.length > 0 ? goodPoints : ['データ蓄積中'],
    concerns: concerns.length > 0 ? concerns : ['特になし'],
    nextSteps: nextSteps.slice(0, 2)
  };
}

const PerformanceSummaryPage: React.FC = () => {
  const { filters, useDatabase, dataset: contextDataset, isInitialized } = useDataset();
  const [trades, setTrades] = useState<FilteredTrade[]>([]);

  useEffect(() => {
    const loadTrades = async () => {
      if (!isInitialized) return;
      try {
        if (useDatabase) {
          const { getAllTrades } = await import('../lib/db.service');
          const data = await getAllTrades(contextDataset || null);
          const dbTrades: FilteredTrade[] = (data || []).map((t: any) => {
            const size = Number(t.size) || 0;
            const item = t.item || t.symbol || 'UNKNOWN';
            const isBalance = size === 0 || !isValidCurrencyPair(item) || item.includes('ECS');
            return {
              id: String(t.ticket || t.id),
              datetime: t.close_time,
              openTime: t.open_time,
              pair: item,
              symbol: t.item || t.symbol,
              side: (t.side || 'LONG') as 'LONG' | 'SHORT',
              volume: size,
              profitYen: Number(t.profit),
              profit: Number(t.profit),
              pips: Number(t.pips) || 0,
              openPrice: Number(t.open_price),
              closePrice: Number(t.close_price),
              memo: t.memo || '',
              comment: t.comment || '',
              type: isBalance ? 'balance' : undefined,
            };
          });
          setTrades(dbTrades);
        } else {
          const cacheBuster = `?t=${Date.now()}`;
          const res = await fetch(`/demo/${contextDataset}.csv${cacheBuster}`, { cache: "no-store" });
          if (!res.ok) {
            setTrades([]);
            return;
          }
          const text = await res.text();
          const parsedTrades = parseCsvText(text);
          setTrades(parsedTrades);
        }
      } catch (e) {
        console.error('Exception loading trades:', e);
        setTrades([]);
      }
    };
    loadTrades();
  }, [useDatabase, contextDataset, isInitialized]);

  const filteredTrades = useMemo(() => {
    return filterTrades(trades, filters);
  }, [trades, filters]);

  const metrics = useMemo(() => computeMetrics(filteredTrades as any), [filteredTrades]);
  const trends = useMemo(() => computeTopTrends(filteredTrades as any), [filteredTrades]);
  const comparison = useMemo(() => computePreviousPeriodComparison(filteredTrades as any), [filteredTrades]);
  const aiInsights = useMemo(() => generateAIInsights(metrics, trends), [metrics, trends]);

  const equityChartData = useMemo(() => {
    const validTrades = (filteredTrades as TradeWithProfit[]).filter(t => {
      const date = parseDateTime(t.datetime || t.time);
      const isBalance = t.type?.toLowerCase() === 'balance';
      return !isNaN(date.getTime()) && !isBalance;
    });
    const sorted = [...validTrades].sort((a, b) => parseDateTime(a.datetime || a.time).getTime() - parseDateTime(b.datetime || b.time).getTime());
    const labels = sorted.map(t => parseDateTime(t.datetime || t.time).getTime());
    const equity: number[] = [];
    let acc = 0;
    for (const t of sorted) {
      acc += getProfit(t);
      equity.push(acc);
    }

    return {
      labels,
      datasets: [{
        label: '累積取引損益（円）',
        data: equity,
        borderWidth: 2.5,
        borderColor: (context: any) => {
          const dataIndex = context.dataIndex;
          if (dataIndex === undefined) return getAccentColor();
          const value = context.chart.data.datasets[0].data[dataIndex] as number;
          return value >= 0 ? getAccentColor(1) : getLossColor(1);
        },
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea, scales } = chart;
          if (!chartArea) return getAccentColor(0.1);
          return createProfitGradient(ctx, chartArea, scales);
        },
        pointRadius: 0,
        fill: 'origin',
        tension: 0.1,
        segment: {
          borderColor: (ctx: any) => {
            return ctx.p1.parsed.y >= 0 ? getAccentColor() : getLossColor();
          }
        }
      }]
    };
  }, [filteredTrades]);

  const ddChartData = useMemo(() => {
    const validTrades = (filteredTrades as TradeWithProfit[]).filter(t => {
      const date = parseDateTime(t.datetime || t.time);
      const isBalance = t.type?.toLowerCase() === 'balance';
      return !isNaN(date.getTime()) && !isBalance;
    });
    const sorted = [...validTrades].sort((a, b) => parseDateTime(a.datetime || a.time).getTime() - parseDateTime(b.datetime || b.time).getTime());
    const labels = sorted.map(t => parseDateTime(t.datetime || t.time).getTime());
    let equity = 0;
    let peak = 0;
    const dd: number[] = [];
    for (const t of sorted) {
      equity += getProfit(t);
      if (equity > peak) peak = equity;
      dd.push(peak - equity);
    }

    return {
      labels,
      datasets: [{
        label: 'ドローダウン（円）',
        data: dd,
        borderWidth: 2.5,
        borderColor: getLossColor(1),
        pointRadius: 0,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return getLossColor(0.1);
          return createDrawdownGradient(ctx, chartArea);
        },
        tension: 0.1,
      }]
    };
  }, [filteredTrades]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    spanGaps: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        type: 'time' as const,
        adapters: { date: { locale: ja } },
        ticks: { maxRotation: 0 },
        time: { tooltipFormat: 'yyyy/MM/dd HH:mm' }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v: any) => new Intl.NumberFormat('ja-JP').format(v) + ' 円'
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any) => items[0]?.parsed?.x ? new Date(items[0].parsed.x).toLocaleString('ja-JP') : '',
          label: (item: any) => `${new Intl.NumberFormat('ja-JP').format(item.parsed.y)} 円`
        }
      }
    }
  };

  const ddOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        beginAtZero: true,
        reverse: true,
        ticks: {
          callback: (v: any) => new Intl.NumberFormat('ja-JP').format(v) + ' 円'
        }
      }
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      {/* 主要KPI（8個） */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            合計損益
            <HelpIcon text="全取引の利益と損失を合計した最終的な損益です。プラスなら利益が出ています。" />
          </div>
          <div className="kpi-value" style={{ color: metrics.gross < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
            {metrics.gross >= 0 ? '+' : ''}{Math.round(metrics.gross).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: metrics.gross < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>円</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>全取引の合計損益</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            勝率
            <HelpIcon text="利益が出た取引の割合です。50%以上なら半分以上の取引で勝っています。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--ink)' }}>
            {(metrics.winRate * 100).toFixed(1)} <span className="kpi-unit" style={{ color: 'var(--muted)' }}>%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.85 }}>
            （勝ち:{metrics.wins}回｜負け:{metrics.losses}回）
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            プロフィットファクター
            <HelpIcon text="総利益÷総損失の比率です。1.0以上なら利益が損失を上回っています。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--ink)' }}>
            {Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>総利益 / 総損失（PF）</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            最大ドローダウン
            <HelpIcon text="資金が最も減った金額です。この数値が大きいほど、大きな含み損に耐える必要があります。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--loss)' }}>
            -{Math.round(metrics.maxDD).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--loss)' }}>円</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>損益ベースの最大下落幅（DD）</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            平均損益
            <HelpIcon text="1回の取引あたりの平均的な損益です。プラスなら平均的に利益が出ています。" />
          </div>
          <div className="kpi-value" style={{ color: metrics.avg < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
            {metrics.avg >= 0 ? '+' : ''}{Math.round(metrics.avg).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: metrics.avg < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>円</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.85 }}>
            （勝ち:+{Math.round(metrics.avgWin).toLocaleString('ja-JP')}円｜負け:{Math.round(metrics.avgLoss).toLocaleString('ja-JP')}円）
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            平均pips
            <HelpIcon text="1回の取引あたりの平均獲得pips数です。プラスなら平均的にpipsを獲得しています。" />
          </div>
          <div className="kpi-value" style={{ color: metrics.avgPips < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
            {metrics.avgPips >= 0 ? '+' : ''}{metrics.avgPips.toFixed(1)} <span className="kpi-unit" style={{ color: metrics.avgPips < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>pips</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.85 }}>
            （勝ち:+{metrics.avgWinPips.toFixed(1)} pips｜負け:{metrics.avgLossPips.toFixed(1)} pips）
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            シャープレシオ
            <HelpIcon text="リスク1単位あたりのリターンを示す指標です。1.0以上で良好、1.5以上で優秀とされます。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--ink)' }}>
            {metrics.sharpeRatio.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>リターン / リスク</div>
        </div>
      </div>

      {/* 期間情報 */}
      {metrics.tradePeriod && (
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16, marginBottom: 8, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 500 }}>集計期間：</span>{metrics.tradePeriod}（取引回数：{metrics.count}回）
        </div>
      )}

      {/* 前期間比較（差分カード） */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>前期間比較</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div className="kpi-card">
            <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
              損益の前期間比
              <HelpIcon text="期間を前半と後半に分けて、損益がどのくらい変化したかを示します。成長傾向や衰退傾向を把握できます。" />
            </div>
            <div className="kpi-value" style={{ color: comparison.profitChange >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>
              {comparison.profitChange >= 0 ? '+' : ''}{Math.round(comparison.profitChange).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: comparison.profitChange >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>円</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              ({comparison.profitChangePercent >= 0 ? '+' : ''}{comparison.profitChangePercent.toFixed(1)}%)
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
              PFの前期間比
              <HelpIcon text="プロフィットファクター（総利益÷総損失）を前半と後半で比較します。収益性の変化を確認できます。" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>
              {Number.isFinite(comparison.pfPrevious) ? comparison.pfPrevious.toFixed(2) : '∞'} → {Number.isFinite(comparison.pfCurrent) ? comparison.pfCurrent.toFixed(2) : '∞'}
            </div>
            <div style={{ fontSize: 12, color: comparison.pfCurrent >= comparison.pfPrevious ? 'var(--gain)' : 'var(--loss)', marginTop: 4 }}>
              {(() => {
                const diff = comparison.pfCurrent - comparison.pfPrevious;
                const isUp = diff >= 0;
                const absChange = Math.abs(diff);
                return isUp ? `↑ ${absChange.toFixed(2)}上昇` : `↓ ${absChange.toFixed(2)}下落`;
              })()}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
              勝率の前期間比
              <HelpIcon text="勝率を前半と後半で比較します。取引の精度が向上しているか低下しているかを確認できます。" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>
              {(comparison.winRatePrevious * 100).toFixed(1)}% → {(comparison.winRateCurrent * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: 12, color: comparison.winRateCurrent >= comparison.winRatePrevious ? 'var(--gain)' : 'var(--loss)', marginTop: 4 }}>
              {(() => {
                const diff = (comparison.winRateCurrent - comparison.winRatePrevious) * 100;
                const isUp = diff >= 0;
                const absChange = Math.abs(diff);
                return isUp ? `↑ ${absChange.toFixed(1)}%上昇` : `↓ ${absChange.toFixed(1)}%下落`;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve・DD Curve・勝ち負け集計 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="dash-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 12px' }}>
            エクイティカーブ（累積取引損益）
            <HelpIcon text="取引ごとの累積損益の推移を示すグラフです。右肩上がりの安定した成長が理想的です。" />
          </div>
          <div style={{ height: 300 }}>
            {equityChartData.labels.length ? <Line data={equityChartData} options={chartOptions} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>データがありません</div>}
          </div>
        </div>
        <div className="dash-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 12px' }}>
            最大下落幅の推移
            <HelpIcon text="資産のピークからの下落幅（ドローダウン）の推移を示します。値が小さいほどリスク管理が良好です。" />
          </div>
          <div style={{ height: 300 }}>
            {ddChartData.labels.length ? <Line data={ddChartData} options={ddOptions} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>データがありません</div>}
          </div>
        </div>
        <div className="dash-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 12px' }}>
            勝ち負け集計
            <HelpIcon text="全期間の勝ちトレードと負けトレードの損益額と回数の集計です。" />
          </div>
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 32 }}>
            <div style={{ width: 196, height: 196, position: 'relative', flexShrink: 0 }}>
              <Doughnut
                key={`doughnut-${trades.length}`}
                data={{
                  datasets: [
                    {
                      label: '損益額',
                      data: [metrics.totalWins, Math.abs(metrics.totalLosses)],
                      backgroundColor: ['#0084C7', '#EF4444'],
                      borderWidth: 0,
                      weight: 0.7,
                      spacing: 2,
                      winCount: trades.filter(t => (!(t as any).type || (t as any).type?.toLowerCase() !== 'balance') && getProfit(t) > 0).length,
                      lossCount: trades.filter(t => (!(t as any).type || (t as any).type?.toLowerCase() !== 'balance') && getProfit(t) < 0).length,
                    } as any,
                    {
                      label: '取引回数',
                      data: [
                        trades.filter(t => (!(t as any).type || (t as any).type?.toLowerCase() !== 'balance') && getProfit(t) > 0).length,
                        trades.filter(t => (!(t as any).type || (t as any).type?.toLowerCase() !== 'balance') && getProfit(t) < 0).length
                      ],
                      backgroundColor: ['rgba(0, 132, 199, 0.6)', 'rgba(239, 68, 68, 0.6)'],
                      borderWidth: 0,
                      weight: 0.49,
                      spacing: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  cutout: '65%',
                  spacing: 6,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          if (context.datasetIndex === 0) {
                            return context.dataIndex === 0 ? `総利益: +${Math.round(context.parsed).toLocaleString('ja-JP')}円` : `総損失: ${Math.round(context.parsed).toLocaleString('ja-JP')}円`;
                          } else {
                            return context.dataIndex === 0 ? `勝ち回数: ${context.parsed}回` : `負け回数: ${context.parsed}回`;
                          }
                        }
                      }
                    },
                  },
                }}
                plugins={[{
                  id: 'centerText',
                  afterDraw: (chart: any) => {
                    const ctx = chart.ctx;
                    const centerX = chart.width / 2;
                    const centerY = chart.height / 2;

                    const dataset = chart.data.datasets[0];
                    const winCount = dataset.winCount || 0;
                    const lossCount = dataset.lossCount || 0;
                    const totalCount = winCount + lossCount;
                    const actualWinRate = totalCount > 0 ? (winCount / totalCount * 100).toFixed(1) : '0.0';

                    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                    const textColor = isDarkMode ? '#e4e8f0' : '#0f172a';
                    const mutedColor = isDarkMode ? '#a0aec0' : '#64748b';

                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    ctx.fillStyle = textColor;
                    ctx.font = '700 28px system-ui, -apple-system, sans-serif';
                    ctx.fillText(actualWinRate, centerX - 12, centerY - 6);

                    ctx.fillStyle = mutedColor;
                    ctx.font = '400 16px system-ui, -apple-system, sans-serif';
                    ctx.fillText('%', centerX + 32, centerY - 6);

                    ctx.fillStyle = mutedColor;
                    ctx.font = '400 13px system-ui, -apple-system, sans-serif';
                    ctx.fillText('勝率', centerX, centerY + 18);

                    ctx.restore();
                  }
                }]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>損益額</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 3, borderRadius: 1, background: '#0084C7' }}></div>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>総利益</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#0084C7' }}>
                    +{Math.round(metrics.totalWins).toLocaleString('ja-JP')}円
                    <span style={{ fontSize: 12, marginLeft: 4, color: 'var(--muted)' }}>
                      ({((metrics.totalWins / (metrics.totalWins + Math.abs(metrics.totalLosses))) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 3, borderRadius: 1, background: '#EF4444' }}></div>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>総損失</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#EF4444' }}>
                    {Math.round(metrics.totalLosses).toLocaleString('ja-JP')}円
                    <span style={{ fontSize: 12, marginLeft: 4, color: 'var(--muted)' }}>
                      ({((Math.abs(metrics.totalLosses) / (metrics.totalWins + Math.abs(metrics.totalLosses))) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>取引回数</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 3, borderRadius: 1, background: 'rgba(0, 132, 199, 0.6)' }}></div>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>勝ち回数</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                    {trades.filter(t => (!(t as any).type || (t as any).type?.toLowerCase() !== 'balance') && getProfit(t) > 0).length}回
                    <span style={{ fontSize: 12, marginLeft: 4, color: 'var(--muted)' }}>
                      ({(metrics.winRate * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 3, borderRadius: 1, background: 'rgba(239, 68, 68, 0.6)' }}></div>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>負け回数</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                    {trades.filter(t => (!(t as any).type || (t as any).type?.toLowerCase() !== 'balance') && getProfit(t) < 0).length}回
                    <span style={{ fontSize: 12, marginLeft: 4, color: 'var(--muted)' }}>
                      ({((1 - metrics.winRate) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要傾向 ベスト & ワースト */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>主要傾向：ベスト & ワースト</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            {trends.bestWeekday && (
              <div className="kpi-card" style={{ background: 'var(--surface)', border: '2px solid var(--accent-border)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16 }}>✓</span> 最も稼げる曜日
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-2)' }}>{trends.bestWeekday[0]}曜日</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {trends.bestWeekday[1].pnl >= 0 ? '+' : ''}{Math.round(trends.bestWeekday[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.bestWeekday[1].count}回)</span>
                </div>
              </div>
            )}
            {trends.bestHour && (
              <div className="kpi-card" style={{ background: 'var(--surface)', border: '2px solid var(--accent-border)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16 }}>✓</span> 最も稼げる時間帯
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-2)' }}>{trends.bestHour[0]}時台</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {trends.bestHour[1].pnl >= 0 ? '+' : ''}{Math.round(trends.bestHour[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.bestHour[1].count}回)</span>
                </div>
              </div>
            )}
            {trends.bestPair && (
              <div className="kpi-card" style={{ background: 'var(--surface)', border: '2px solid var(--accent-border)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16 }}>✓</span> 最も稼げる通貨ペア
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-2)' }}>{trends.bestPair[0]}</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {trends.bestPair[1].pnl >= 0 ? '+' : ''}{Math.round(trends.bestPair[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.bestPair[1].count}回)</span>
                </div>
              </div>
            )}
            {trends.worstWeekday && (
              <div className="kpi-card" style={{ background: 'var(--surface)', border: '2px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16 }}>⚠</span> 最も負けている曜日
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--loss)' }}>{trends.worstWeekday[0]}曜日</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {trends.worstWeekday[1].pnl >= 0 ? '+' : ''}{Math.round(trends.worstWeekday[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.worstWeekday[1].count}回)</span>
                </div>
              </div>
            )}
            {trends.worstHour && (
              <div className="kpi-card" style={{ background: 'var(--surface)', border: '2px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16 }}>⚠</span> 最も負けている時間帯
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--loss)' }}>{trends.worstHour[0]}時台</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {trends.worstHour[1].pnl >= 0 ? '+' : ''}{Math.round(trends.worstHour[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.worstHour[1].count}回)</span>
                </div>
              </div>
            )}
            {trends.worstPair && (
              <div className="kpi-card" style={{ background: 'var(--surface)', border: '2px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16 }}>⚠</span> 最も負けている通貨ペア
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--loss)' }}>{trends.worstPair[0]}</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {trends.worstPair[1].pnl >= 0 ? '+' : ''}{Math.round(trends.worstPair[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.worstPair[1].count}回)</span>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* AI総括（3分割） */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>AI総括</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {/* 良い点 */}
          <div className="dash-card" style={{ background: 'rgba(0, 132, 199, 0.05)', border: '1px solid var(--accent-border)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--accent-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>✓</span> 良い点
            </h3>
            <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 15, lineHeight: 1.8, color: 'var(--ink)' }}>
              {aiInsights.goodPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>

          {/* 注意点 */}
          <div className="dash-card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--loss)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>⚠</span> 注意点
            </h3>
            <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 15, lineHeight: 1.8, color: 'var(--ink)' }}>
              {aiInsights.concerns.map((concern, i) => (
                <li key={i}>{concern}</li>
              ))}
            </ul>
          </div>

          {/* 次の一手 */}
          <div className="dash-card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>→</span> 次の一手
            </h3>
            <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 15, lineHeight: 1.8, color: 'var(--ink)' }}>
              {aiInsights.nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 詳細分析ページへのリンク */}
      <div className="dash-card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>詳細分析ページ</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>各項目をクリックしてさらに深掘りした分析をご覧ください</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <button
            onClick={() => window.location.hash = '/reports/balance'}
            style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
              textAlign: 'center'
            }}
          >
            資金管理
          </button>
          <button
            onClick={() => window.location.hash = '/reports/time'}
            style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
              textAlign: 'center'
            }}
          >
            時間軸
          </button>
          <button
            onClick={() => window.location.hash = '/reports/market'}
            style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
              textAlign: 'center'
            }}
          >
            通貨ペア
          </button>
          <button
            onClick={() => window.location.hash = '/reports/risk'}
            style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
              textAlign: 'center'
            }}
          >
            リスク管理
          </button>
          <button
            onClick={() => window.location.hash = '/reports/strategy'}
            style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
              textAlign: 'center'
            }}
          >
            トレード戦略
          </button>
          <button
            onClick={() => window.location.hash = '/calendar'}
            style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
              textAlign: 'center'
            }}
          >
            カレンダー
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceSummaryPage;
