import React, { useEffect, useMemo, useState } from "react";
import { useDataset } from "../lib/dataset.context";
import { filterTrades, isValidCurrencyPair } from "../lib/filterTrades";
import type { Trade as FilteredTrade } from "../lib/types";
import { parseCsvText } from "../lib/csv";
import { Line } from 'react-chartjs-2';
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

  return { count, gross, avg, winRate, profitFactor, maxDD, avgPips, sharpeRatio, peak, tradePeriod };
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
  const topWeekday = Array.from(weekdayMap.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)[0];

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
  const topHour = Array.from(hourMap.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)[0];

  // 通貨ペア別
  const pairMap = new Map<string, { pnl: number; count: number }>();
  tradingOnly.forEach(t => {
    const pair = t.pair || t.symbol || 'UNKNOWN';
    if (pair !== 'UNKNOWN') {
      const current = pairMap.get(pair) || { pnl: 0, count: 0 };
      pairMap.set(pair, { pnl: current.pnl + getProfit(t), count: current.count + 1 });
    }
  });
  const topPair = Array.from(pairMap.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)[0];

  return { topWeekday, topHour, topPair };
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
      {/* タイトル */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 8 }}>パフォーマンスサマリー</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>全体の成績を一瞬で把握</p>
      </div>

      {/* 主要KPI（8個） */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            合計損益
            <HelpIcon text="全取引の合計損益" />
          </div>
          <div className="kpi-value" style={{ color: metrics.gross < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
            {metrics.gross >= 0 ? '+' : ''}{Math.round(metrics.gross).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: metrics.gross < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>円</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            勝率
            <HelpIcon text="利益が出た取引の割合" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--ink)' }}>
            {(metrics.winRate * 100).toFixed(1)} <span className="kpi-unit" style={{ color: 'var(--muted)' }}>%</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            プロフィットファクター
            <HelpIcon text="総利益÷総損失" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--ink)' }}>
            {Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            最大DD
            <HelpIcon text="最大ドローダウン" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--loss)' }}>
            -{Math.round(metrics.maxDD).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--loss)' }}>円</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            平均損益
            <HelpIcon text="1取引あたりの平均" />
          </div>
          <div className="kpi-value" style={{ color: metrics.avg < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
            {metrics.avg >= 0 ? '+' : ''}{Math.round(metrics.avg).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: metrics.avg < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>円</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            平均pips
            <HelpIcon text="1取引あたりの平均獲得pips" />
          </div>
          <div className="kpi-value" style={{ color: metrics.avgPips < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
            {metrics.avgPips >= 0 ? '+' : ''}{metrics.avgPips.toFixed(1)} <span className="kpi-unit" style={{ color: metrics.avgPips < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>pips</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            シャープレシオ
            <HelpIcon text="リスク1単位あたりのリターン" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--ink)' }}>
            {metrics.sharpeRatio.toFixed(2)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            期間情報
            <HelpIcon text="分析対象期間" />
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>
            {metrics.count} <span style={{ fontSize: 12, color: 'var(--muted)' }}>回</span>
            {metrics.tradePeriod && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                {metrics.tradePeriod}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equity CurveとDD Curve */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="dash-card">
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Equity Curve（累積損益）</h3>
          <div style={{ height: 300 }}>
            {equityChartData.labels.length ? <Line data={equityChartData} options={chartOptions} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>データがありません</div>}
          </div>
        </div>
        <div className="dash-card">
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>DD推移（ドローダウン）</h3>
          <div style={{ height: 300 }}>
            {ddChartData.labels.length ? <Line data={ddChartData} options={ddOptions} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>データがありません</div>}
          </div>
        </div>
      </div>

      {/* 主要傾向TOP1 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>主要傾向 TOP1</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {trends.topWeekday && (
            <div className="kpi-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>最も稼げる曜日</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-2)' }}>{trends.topWeekday[0]}曜日</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                {trends.topWeekday[1].pnl >= 0 ? '+' : ''}{Math.round(trends.topWeekday[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.topWeekday[1].count}回)</span>
              </div>
            </div>
          )}
          {trends.topHour && (
            <div className="kpi-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>最も稼げる時間帯</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-2)' }}>{trends.topHour[0]}時台</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                {trends.topHour[1].pnl >= 0 ? '+' : ''}{Math.round(trends.topHour[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.topHour[1].count}回)</span>
              </div>
            </div>
          )}
          {trends.topPair && (
            <div className="kpi-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>最も稼げる通貨ペア</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-2)' }}>{trends.topPair[0]}</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                {trends.topPair[1].pnl >= 0 ? '+' : ''}{Math.round(trends.topPair[1].pnl).toLocaleString('ja-JP')}円 <span style={{ fontSize: 12, color: 'var(--muted)' }}>({trends.topPair[1].count}回)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI総括（簡易版） */}
      <div className="dash-card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>AI総括</h3>
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
          {metrics.gross >= 0
            ? `良好なパフォーマンスを維持しています。勝率${(metrics.winRate * 100).toFixed(1)}%、PF${Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}で安定した取引を継続してください。`
            : `改善の余地があります。最大DD${Math.round(metrics.maxDD).toLocaleString('ja-JP')}円に注意し、リスク管理を見直してください。`
          }
          {trends.topWeekday && ` ${trends.topWeekday[0]}曜日のパフォーマンスが特に優れています。`}
        </p>
      </div>

      {/* 詳細分析ページへのリンク */}
      <div className="dash-card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>詳細分析ページ</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>各項目をクリックしてさらに深掘りした分析をご覧ください</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
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
            時間軸分析
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
            通貨ペア分析
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
            戦略分析
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
        </div>
      </div>
    </div>
  );
};

export default PerformanceSummaryPage;
