import React, { useEffect, useMemo, useState } from "react";
import { getGridLineColor, getAccentColor, getLossColor, getWarningColor, createDrawdownGradient } from "../../lib/chartColors";
import { Bar, Line } from "react-chartjs-2";
import { ja } from 'date-fns/locale';
import { useDataset } from "../../lib/dataset.context";
import { parseCsvText } from "../../lib/csv";
import type { Trade } from "../../lib/types";
import { filterTrades, getTradeProfit, getTradePair, isValidCurrencyPair } from "../../lib/filterTrades";
import { supabase } from "../../lib/supabase";
import { HelpIcon } from "../../components/common/HelpIcon";
import Card from "../../components/common/Card";
import ProfitDistributionDetailPanel from "../../components/ProfitDistributionDetailPanel";
import ProfitDistributionDetailDrawer from "../../components/reports/ProfitDistributionDetailDrawer";
import RMultipleDetailDrawer from "../../components/reports/RMultipleDetailDrawer";
import DDContributionDetailDrawer from "../../components/reports/DDContributionDetailDrawer";
import DDEventDetailDrawer from "../../components/reports/DDEventDetailDrawer";
import AiCoachMessage from "../../components/common/AiCoachMessage";
import { MetricSectionCard } from "../../components/common/MetricSectionCard";
import { KpiCard } from "../../components/common/KpiCard";

type UnitType = "yen" | "r";

type TailEventTab = "最大損失" | "最大利益" | "連敗ピーク" | "連勝ピーク";

function TailEventTabs({
  riskMetrics,
  streakData,
  formatDate,
  getTradePair,
  extractSetup
}: {
  riskMetrics: any;
  streakData: any;
  formatDate: (date: string) => string;
  getTradePair: (trade: any) => string;
  extractSetup: (trade: any) => string;
}) {
  const [activeTab, setActiveTab] = React.useState<TailEventTab>("最大損失");

  const tabs: TailEventTab[] = ["最大損失", "最大利益", "連敗ピーク", "連勝ピーク"];

  const renderTable = () => {
    let data: any = null;
    let type = "";

    switch (activeTab) {
      case "最大損失":
        if (!riskMetrics.maxLossTrade) return <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>データがありません</div>;
        data = {
          type: "最大損失",
          date: formatDate(riskMetrics.maxLossTrade.openTime),
          pair: getTradePair(riskMetrics.maxLossTrade),
          setup: extractSetup(riskMetrics.maxLossTrade),
          r: `${(riskMetrics.maxLoss / Math.abs(riskMetrics.avgLoss)).toFixed(1)} R`,
          profit: riskMetrics.maxLoss,
          color: "var(--loss)"
        };
        break;
      case "最大利益":
        if (!riskMetrics.maxProfitTrade) return <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>データがありません</div>;
        data = {
          type: "最大利益",
          date: formatDate(riskMetrics.maxProfitTrade.openTime),
          pair: getTradePair(riskMetrics.maxProfitTrade),
          setup: extractSetup(riskMetrics.maxProfitTrade),
          r: `+${(riskMetrics.maxProfit / Math.abs(riskMetrics.avgLoss)).toFixed(1)} R`,
          profit: riskMetrics.maxProfit,
          color: "var(--gain)"
        };
        break;
      case "連敗ピーク":
        if (!streakData.maxLossStreakDate) return <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>データがありません</div>;
        data = {
          type: "連敗ピーク",
          date: formatDate(streakData.maxLossStreakDate),
          pair: "—",
          setup: "—",
          r: "—",
          profit: `${streakData.maxLossStreak}連敗`,
          color: "var(--loss)",
          isStreak: true
        };
        break;
      case "連勝ピーク":
        if (!streakData.maxWinStreakDate) return <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>データがありません</div>;
        data = {
          type: "連勝ピーク",
          date: formatDate(streakData.maxWinStreakDate),
          pair: "—",
          setup: "—",
          r: "—",
          profit: `${streakData.maxWinStreak}連勝`,
          color: "var(--gain)",
          isStreak: true
        };
        break;
    }

    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--line)" }}>
            <th style={{ padding: 10, textAlign: "left", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>タイプ</th>
            <th style={{ padding: 10, textAlign: "left", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>日付</th>
            <th style={{ padding: 10, textAlign: "left", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>通貨</th>
            <th style={{ padding: 10, textAlign: "left", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>セットアップ</th>
            <th style={{ padding: 10, textAlign: "right", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>R</th>
            <th style={{ padding: 10, textAlign: "right", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>損益</th>
          </tr>
        </thead>
        <tbody>
          <tr
            style={{
              borderBottom: "1px solid var(--line)",
              height: 44,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--chip)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <td style={{ padding: 10, fontSize: 13 }}>{data.type}</td>
            <td style={{ padding: 10, fontSize: 13 }}>{data.date}</td>
            <td style={{ padding: 10, fontSize: 13 }}>{data.pair}</td>
            <td style={{ padding: 10, fontSize: 13 }}>{data.setup}</td>
            <td style={{ padding: 10, textAlign: "right", fontSize: 13 }}>{data.r}</td>
            <td
              style={{
                padding: 10,
                textAlign: "right",
                fontSize: 15,
                fontWeight: 700,
                color: data.color,
              }}
            >
              {data.isStreak ? data.profit : `${data.profit > 0 ? '+' : ''}${Math.round(data.profit).toLocaleString("ja-JP")}円`}
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "var(--fg)" : "var(--muted)",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: "40vh", overflowY: "auto" }}>
        {renderTable()}
      </div>
    </div>
  );
}

export default function ReportsRisk() {
  const { dataset, filters, useDatabase, isInitialized } = useDataset();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const unit: UnitType = "yen";
  const [profitDistributionPanel, setProfitDistributionPanel] = useState<{ trades: any[] } | null>(null);
  const [profitDistributionDrawer, setProfitDistributionDrawer] = useState<{ rangeLabel: string; minProfit: number; maxProfit: number; trades: Trade[] } | null>(null);
  const [rMultipleDrawer, setRMultipleDrawer] = useState<{ rangeLabel: string; minR: number; maxR: number; trades: Trade[] } | null>(null);
  const [ddContributionDrawer, setDdContributionDrawer] = useState<{ type: 'weekday' | 'symbol'; key: string; trades: Trade[] } | null>(null);
  const [ddEventDrawer, setDdEventDrawer] = useState<{ clickedDate: string; allTrades: Trade[] } | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!isMounted) return;

      if (!isInitialized) {
        return;
      }

      setIsLoading(true);
      try {
        if (useDatabase) {
          const { getAllTrades } = await import('../../lib/db.service');
          const data = await getAllTrades(dataset);

          const normalizeSide = (side: string): 'LONG' | 'SHORT' => {
            const s = side?.toUpperCase();
            if (s === 'BUY' || s === 'LONG') return 'LONG';
            if (s === 'SELL' || s === 'SHORT') return 'SHORT';
            return 'LONG';
          };

          const mapped: Trade[] = (data || [])
            .filter((t: any) => isValidCurrencyPair(t.item))
            .map((t: any) => {
              const openTime = typeof t.open_time === 'string' ? t.open_time : new Date(t.open_time).toISOString();
              const closeTime = typeof t.close_time === 'string' ? t.close_time : new Date(t.close_time).toISOString();

              return {
                id: t.ticket,
                datetime: closeTime,
                pair: t.item,
                side: normalizeSide(t.side),
                volume: Number(t.size),
                profitYen: Number(t.profit),
                pips: Number(t.pips || 0),
                openTime: openTime,
                openPrice: Number(t.open_price),
                closePrice: Number(t.close_price),
                stopPrice: t.sl ? Number(t.sl) : undefined,
                targetPrice: t.tp ? Number(t.tp) : undefined,
                commission: Number(t.commission || 0),
                swap: Number(t.swap || 0),
                symbol: t.item,
                action: normalizeSide(t.side),
                profit: Number(t.profit),
                comment: t.comment || '',
                memo: t.memo || '',
              };
            });
          if (isMounted) {
            setTrades(mapped);
          }
        } else {
          if (!dataset) {
            if (isMounted) {
              setTrades([]);
            }
            return;
          }
          const res = await fetch(`/demo/${dataset}.csv?t=${Date.now()}`, { cache: "no-store" });
          if (!isMounted) return;
          if (!res.ok) {
            console.warn('Failed to fetch CSV:', res.status);
            if (isMounted) {
              setTrades([]);
            }
            return;
          }
          const text = await res.text();
          if (!isMounted) return;
          const parsed = parseCsvText(text);
          if (isMounted) {
            setTrades(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load trades:", err);
        if (isMounted) {
          setTrades([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [dataset, useDatabase, isInitialized]);

  const filteredTrades = useMemo(() => filterTrades(trades, filters), [trades, filters]);

  const extractSetup = (t: Trade): string => {
    const text = (t.comment || t.memo || "").toLowerCase();
    if (text.includes("breakout") || text.includes("ブレイクアウト")) return "Breakout";
    if (text.includes("pullback") || text.includes("プルバック")) return "Pullback";
    if (text.includes("reversal") || text.includes("反転")) return "Reversal";
    if (text.includes("trend") || text.includes("トレンド")) return "Trend";
    if (text.includes("range") || text.includes("レンジ")) return "Range";
    if (text.includes("scalp") || text.includes("スキャルプ")) return "Scalp";
    return "Other";
  };

  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => a.openTime.localeCompare(b.openTime));
  }, [filteredTrades]);

  const drawdownData = useMemo(() => {
    let peak = 0;
    let cumulative = 0;
    let maxDD = 0;
    let maxDDStart = "";
    let maxDDBottom = "";
    const ddSeries: number[] = [];

    sortedTrades.forEach((t) => {
      cumulative += getTradeProfit(t);
      if (cumulative > peak) {
        peak = cumulative;
      }
      const dd = peak - cumulative;
      if (dd > maxDD) {
        maxDD = dd;
        maxDDBottom = t.openTime;
      }
      ddSeries.push(dd);
    });

    return { maxDD, series: ddSeries, maxDDStart, maxDDBottom, trades: sortedTrades };
  }, [sortedTrades]);

  // ドローダウンチャート（詳細版 - ReportsBalanceと同じ）
  const drawdownChartData = useMemo(() => {
    if (filteredTrades.length === 0) return null;

    const sorted = [...filteredTrades].sort((a, b) => {
      const timeA = new Date(a.closeTime || a.openTime || 0).getTime();
      const timeB = new Date(b.closeTime || b.openTime || 0).getTime();
      return timeA - timeB;
    });

    const validTrades = sorted.filter(t => {
      const time = new Date(t.closeTime || t.openTime || 0).getTime();
      return !isNaN(time) && time > 0;
    });

    if (validTrades.length === 0) return null;

    const labels = validTrades.map(t => new Date(t.closeTime || t.openTime || 0).getTime());
    let equity = 0;
    let peak = 0;
    const dd: number[] = [];

    for (const t of validTrades) {
      const profit = getTradeProfit(t);
      equity += profit;
      if (equity > peak) peak = equity;
      dd.push(peak - equity);
    }

    return {
      labels,
      validTrades,
      datasets: [{
        label: 'ドローダウン（円）',
        data: dd,
        borderWidth: 2.5,
        borderColor: getLossColor(1),
        pointRadius: 0,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return getLossColor(0.1);
          return createDrawdownGradient(ctx, chartArea);
        },
        tension: 0.1,
      }]
    };
  }, [filteredTrades]);

  const streakData = useMemo(() => {
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let maxWinStreakDate = "";
    let maxLossStreakDate = "";

    sortedTrades.forEach((t) => {
      const profit = getTradeProfit(t);
      if (profit > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
          maxWinStreakDate = t.openTime;
        }
      } else if (profit < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
          maxLossStreakDate = t.openTime;
        }
      }
    });

    return { maxWinStreak, maxLossStreak, maxWinStreakDate, maxLossStreakDate };
  }, [sortedTrades]);

  const riskMetrics = useMemo(() => {
    const profits = filteredTrades.map((t) => getTradeProfit(t));
    if (profits.length === 0) return { maxProfit: 0, maxLoss: 0, avgWin: 0, avgLoss: 0, rMultipleAvg: 0, maxProfitTrade: null, maxLossTrade: null };

    const winTrades = filteredTrades.filter((t) => getTradeProfit(t) > 0);
    const lossTrades = filteredTrades.filter((t) => getTradeProfit(t) < 0);

    const maxProfit = Math.max(...profits);
    const maxLoss = Math.min(...profits);
    const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + getTradeProfit(t), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((sum, t) => sum + getTradeProfit(t), 0) / lossTrades.length : 0;

    const maxProfitTrade = filteredTrades.find((t) => getTradeProfit(t) === maxProfit) || null;
    const maxLossTrade = filteredTrades.find((t) => getTradeProfit(t) === maxLoss) || null;

    const avgRisk = Math.abs(avgLoss);
    const rMultipleAvg = avgRisk > 0 ? (profits.reduce((sum, p) => sum + p, 0) / profits.length) / avgRisk : 0;

    return { maxProfit, maxLoss, avgWin, avgLoss, rMultipleAvg, maxProfitTrade, maxLossTrade };
  }, [filteredTrades]);

  const profitDistribution = useMemo(() => {
    const ranges = [
      { label: "-20k以下", min: -Infinity, max: -20000 },
      { label: "-20k~-10k", min: -20000, max: -10000 },
      { label: "-10k~-5k", min: -10000, max: -5000 },
      { label: "-5k~0", min: -5000, max: 0 },
      { label: "0~5k", min: 0, max: 5000 },
      { label: "5k~10k", min: 5000, max: 10000 },
      { label: "10k~20k", min: 10000, max: 20000 },
      { label: "20k以上", min: 20000, max: Infinity },
    ];

    const data = ranges.map((range) => {
      const rangeTrades = filteredTrades.filter((t) => {
        const profit = getTradeProfit(t);
        return profit >= range.min && profit < range.max;
      });
      return {
        label: range.label,
        min: range.min,
        max: range.max,
        count: rangeTrades.length,
        trades: rangeTrades
      };
    });

    return { labels: data.map((d) => d.label), counts: data.map((d) => d.count), data };
  }, [filteredTrades]);

  const rMultipleDistribution = useMemo(() => {
    const avgRisk = Math.abs(riskMetrics.avgLoss);
    if (avgRisk === 0) return { labels: [], counts: [], data: [], avgLoss: 0 };

    const ranges = [
      { label: "-3R以下", min: -Infinity, max: -3 },
      { label: "-3R~-2R", min: -3, max: -2 },
      { label: "-2R~-1R", min: -2, max: -1 },
      { label: "-1R~0R", min: -1, max: 0 },
      { label: "0R~1R", min: 0, max: 1 },
      { label: "1R~2R", min: 1, max: 2 },
      { label: "2R~3R", min: 2, max: 3 },
      { label: "3R以上", min: 3, max: Infinity },
    ];

    const data = ranges.map((range) => {
      const rangeTrades = filteredTrades.filter((t) => {
        const profit = getTradeProfit(t);
        const r = profit / avgRisk;
        return r >= range.min && r < range.max;
      });
      return {
        label: range.label,
        min: range.min,
        max: range.max,
        count: rangeTrades.length,
        trades: rangeTrades
      };
    });

    return {
      labels: data.map((d) => d.label),
      counts: data.map((d) => d.count),
      data,
      avgLoss: riskMetrics.avgLoss
    };
  }, [filteredTrades, riskMetrics.avgLoss]);

  const ddContributionByDay = useMemo(() => {
    const dayMap = new Map<string, { loss: number; count: number; trades: Trade[] }>();
    filteredTrades.forEach((t) => {
      const profit = getTradeProfit(t);
      if (profit < 0) {
        try {
          const date = new Date(t.openTime);
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const day = dayNames[date.getDay()];
          const current = dayMap.get(day) || { loss: 0, count: 0, trades: [] };
          dayMap.set(day, {
            loss: current.loss + Math.abs(profit),
            count: current.count + 1,
            trades: [...current.trades, t]
          });
        } catch (err) {
          console.error("Date parse error:", err);
        }
      }
    });
    return Array.from(dayMap.entries())
      .map(([day, data]) => ({ day, loss: data.loss, count: data.count, trades: data.trades }))
      .sort((a, b) => b.loss - a.loss);
  }, [filteredTrades]);

  const ddContributionByPair = useMemo(() => {
    const pairMap = new Map<string, { loss: number; count: number; trades: Trade[] }>();
    filteredTrades.forEach((t) => {
      const profit = getTradeProfit(t);
      if (profit < 0) {
        const pair = getTradePair(t);
        const current = pairMap.get(pair) || { loss: 0, count: 0, trades: [] };
        pairMap.set(pair, {
          loss: current.loss + Math.abs(profit),
          count: current.count + 1,
          trades: [...current.trades, t]
        });
      }
    });
    return Array.from(pairMap.entries())
      .map(([pair, data]) => ({ pair, loss: data.loss, count: data.count, trades: data.trades }))
      .sort((a, b) => b.loss - a.loss);
  }, [filteredTrades]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr.substring(0, 10);
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr.substring(0, 10);
    }
  };

  // ロット分析
  const lotAnalysis = useMemo(() => {
    const lots = filteredTrades.map(t => t.volume).filter(v => v > 0).sort((a, b) => a - b);
    if (lots.length === 0) return { q1: 0, q2: 0, q3: 0, q4: 0, min: 0, max: 0 };

    const q1 = lots[Math.floor(lots.length * 0.25)];
    const q2 = lots[Math.floor(lots.length * 0.5)];
    const q3 = lots[Math.floor(lots.length * 0.75)];
    const q4 = lots[lots.length - 1];
    const min = lots[0];
    const max = lots[lots.length - 1];

    return { q1, q2, q3, q4, min, max };
  }, [filteredTrades]);

  const actualRR = useMemo(() => {
    const avgWin = riskMetrics.avgWin;
    const avgLoss = Math.abs(riskMetrics.avgLoss);

    if (avgLoss === 0) return 0;
    return avgWin / avgLoss;
  }, [riskMetrics]);

  // シャープレシオ（簡易版）
  const sharpeRatio = useMemo(() => {
    const profits = filteredTrades.map(t => getTradeProfit(t));
    if (profits.length < 2) return 0;

    const avgProfit = profits.reduce((sum, p) => sum + p, 0) / profits.length;
    const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / (profits.length - 1);
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgProfit / stdDev : 0;
  }, [filteredTrades]);

  if (filteredTrades.length === 0) {
    return (
      <div style={{ width: "100%", padding: 40, textAlign: "center" }}>
        <p style={{ fontSize: 16, color: "var(--muted)" }}>データがありません。フィルター条件を変更してください。</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div className="reports-container">

      {/* 現在の状態 */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          現在の状態
        </h3>
      </div>

      <MetricSectionCard title={<>ロット設計とリスク指標<HelpIcon text="取引ロット数とリスク指標の関係を分析します。ポジションサイズの適切性を確認できます。" /></>}>
        <div style={{ marginBottom: 16 }}>

        <div className="kpi-cards-grid" style={{ marginBottom: 16 }}>
          <KpiCard
            label="リスクリワード比（RR）"
            tooltip="平均利益÷平均損失の比率です。2.0以上が優秀、1.0以上が良好、1.0未満は要改善です。"
            value={
              <span style={{ color: actualRR >= 2.0 ? "var(--gain)" : actualRR >= 1.0 ? "var(--accent)" : "var(--loss)" }}>
                {actualRR > 0 ? actualRR.toFixed(2) : '—'}
              </span>
            }
            subtext="平均利益 / 平均損失"
          />

          <KpiCard
            label="シャープレシオ"
            tooltip="リスク1単位あたりのリターンです。1.0以上が良好、0以上が普通、マイナスは損失状態です。"
            value={
              <span style={{ color: sharpeRatio >= 1 ? "var(--gain)" : sharpeRatio >= 0 ? "var(--accent)" : "var(--loss)" }}>
                {sharpeRatio.toFixed(3)}
              </span>
            }
            subtext="リターン/リスク比率（1.0以上が良好）"
          />

          <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 500, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.375 }}>
              ボラティリティ
              <HelpIcon text="収益の変動率です。30%未満は低リスク、30-100%は中リスク、100%以上は高リスクです。" />
            </h4>
            <div style={{ fontSize: 20, fontWeight: 700, color: (() => {
              const profits = filteredTrades.map(t => getTradeProfit(t));
              if (profits.length < 2) return "var(--accent)";

              const avgProfit = profits.reduce((sum, p) => sum + p, 0) / profits.length;
              const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / (profits.length - 1);
              const stdDev = Math.sqrt(variance);
              const avgAbsProfit = profits.reduce((sum, p) => sum + Math.abs(p), 0) / profits.length;
              const volatility = avgAbsProfit > 0 ? (stdDev / avgAbsProfit) * 100 : 0;

              if (volatility < 30) return "var(--gain)";
              if (volatility < 100) return "var(--accent)";
              return "var(--loss)";
            })() }}>
              {(() => {
                const profits = filteredTrades.map(t => getTradeProfit(t));
                if (profits.length < 2) return '—';

                // 各取引の損益の平均と標準偏差を計算
                const avgProfit = profits.reduce((sum, p) => sum + p, 0) / profits.length;
                const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / (profits.length - 1);
                const stdDev = Math.sqrt(variance);

                // 平均絶対損益を基準とする（取引サイズの代理指標）
                const avgAbsProfit = profits.reduce((sum, p) => sum + Math.abs(p), 0) / profits.length;

                // ボラティリティ = 標準偏差 / 平均絶対損益 × 100
                const volatility = avgAbsProfit > 0 ? (stdDev / avgAbsProfit) * 100 : 0;

                return volatility.toFixed(2) + '%';
              })()}
            </div>
            <div className="kpi-desc">収益の変動性</div>
          </div>

          <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 500, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.375 }}>
              カルマー比
              <HelpIcon text="年率リターン÷最大ドローダウンの比率です。1.0以上が優秀、0以上が合格、マイナスは損失状態です。" />
            </h4>
            <div style={{ fontSize: 20, fontWeight: 700, color: (() => {
              if (filteredTrades.length === 0) return "var(--accent)";

              const totalProfit = filteredTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
              const dates = filteredTrades.map(t => new Date(t.closeTime || t.openTime)).sort((a, b) => a.getTime() - b.getTime());
              const firstDate = dates[0];
              const lastDate = dates[dates.length - 1];
              const daysInPeriod = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
              const yearsInPeriod = Math.max(daysInPeriod / 365, 0.01);
              const annualReturn = totalProfit / yearsInPeriod;
              const maxDD = drawdownData.maxDD;

              if (maxDD === 0) return "var(--accent)";
              const calmarRatio = annualReturn / maxDD;

              if (calmarRatio >= 1.0) return "var(--gain)";
              if (calmarRatio >= 0) return "var(--accent)";
              return "var(--loss)";
            })() }}>
              {(() => {
                if (filteredTrades.length === 0) return '—';

                // 総損益を計算
                const totalProfit = filteredTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);

                // 運用期間を計算（年数）
                const dates = filteredTrades.map(t => new Date(t.closeTime || t.openTime)).sort((a, b) => a.getTime() - b.getTime());
                const firstDate = dates[0];
                const lastDate = dates[dates.length - 1];
                const daysInPeriod = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
                const yearsInPeriod = Math.max(daysInPeriod / 365, 0.01); // 最小0.01年（約3.6日）

                // 年率リターンを計算
                const annualReturn = totalProfit / yearsInPeriod;

                // 最大ドローダウン（絶対値）
                const maxDD = drawdownData.maxDD;

                // カルマー比 = 年率リターン / 最大DD
                if (maxDD === 0) return '—';
                const calmarRatio = annualReturn / maxDD;

                return calmarRatio.toFixed(2);
              })()}
            </div>
            <div className="kpi-desc">年率リターン÷最大DD</div>
          </div>
        </div>

        <div>
          <h4 style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 500, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.375 }}>
            ロット分布（四分位点）
            <HelpIcon text="取引で使用したロット数の分布です。リスク管理の一貫性を確認できます。" />
          </h4>
          <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-around", padding: "16px 0" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Min</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{lotAnalysis.min.toFixed(2)}</div>
            </div>
            <div style={{ height: 40, width: 1, background: "var(--line)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Q1 (25%)</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{lotAnalysis.q1.toFixed(2)}</div>
            </div>
            <div style={{ height: 40, width: 1, background: "var(--line)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Q2 (50%)</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>{lotAnalysis.q2.toFixed(2)}</div>
            </div>
            <div style={{ height: 40, width: 1, background: "var(--line)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Q3 (75%)</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{lotAnalysis.q3.toFixed(2)}</div>
            </div>
            <div style={{ height: 40, width: 1, background: "var(--line)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Max</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{lotAnalysis.max.toFixed(2)}</div>
            </div>
          </div>
        </div>
        </div>
      </MetricSectionCard>

      <div className="dash-row-2" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            最大ドローダウン
            <HelpIcon text="資産の最大下落幅です。この数値が大きいほど、リスク耐性が必要です。" />
          </div>
          <div className="kpi-value" style={{ color: "var(--loss)" }}>
            最大DD：{Math.round(drawdownData.maxDD).toLocaleString("ja-JP")} <span className="kpi-unit" style={{ color: "var(--loss)" }}>円</span>
          </div>
          <div className="kpi-desc">損益ベースの最大下落幅</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            連敗（最大）
            <HelpIcon text="連続で負けた最大回数です。精神的耐久力が求められます。" />
          </div>
          <div className="kpi-value" style={{ color: "var(--loss)" }}>
            連敗：{streakData.maxLossStreak} <span className="kpi-unit" style={{ color: "var(--loss)" }}>回</span>
          </div>
          <div className="kpi-desc">連続での負け数</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            連勝（最大）
            <HelpIcon text="連続で勝った最大回数です。最高記録を確認できます。" />
          </div>
          <div className="kpi-value" style={{ color: "var(--gain)" }}>
            連勝：{streakData.maxWinStreak} <span className="kpi-unit" style={{ color: "var(--gain)" }}>回</span>
          </div>
          <div className="kpi-desc">連続での勝ち数</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            最大損失
            <HelpIcon text="1取引で出た最大の損失額です。リスク管理の上限を確認できます。" />
          </div>
          <div className="kpi-value" style={{ color: "var(--loss)" }}>
            最大損失：{Math.round(riskMetrics.maxLoss).toLocaleString("ja-JP")} <span className="kpi-unit" style={{ color: "var(--loss)" }}>円</span>
          </div>
          <div className="kpi-desc">最悪1件の損失</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            最大利益
            <HelpIcon text="1取引で出た最大の利益額です。最高パフォーマンスを確認できます。" />
          </div>
          <div className="kpi-value" style={{ color: "var(--gain)" }}>
            最大利益：+{Math.round(riskMetrics.maxProfit).toLocaleString("ja-JP")} <span className="kpi-unit" style={{ color: "var(--gain)" }}>円</span>
          </div>
          <div className="kpi-desc">最高1件の利益</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            平均勝ち / 平均負け
            <HelpIcon text="勝ちと負けの平均額です。利益と損失のバランスを確認できます。" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="kpi-value" style={{ color: "var(--gain)" }}>
              勝ち：+{Math.round(riskMetrics.avgWin).toLocaleString()} <span className="kpi-unit" style={{ color: "var(--gain)" }}>円</span>
            </div>
            <div className="kpi-value" style={{ color: "var(--loss)" }}>
              負け：{Math.round(riskMetrics.avgLoss).toLocaleString()} <span className="kpi-unit" style={{ color: "var(--loss)" }}>円</span>
            </div>
          </div>
          <div className="kpi-desc">分布の歪み把握</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            R-multiple 平均
            <HelpIcon text="リスク1単位あたりのリターンです。1.5以上が優秀、1.0以上が良好です。" />
          </div>
          <div className="kpi-value">
            {riskMetrics.rMultipleAvg.toFixed(2)} <span className="kpi-unit">R/件</span>
          </div>
          <div className="kpi-desc">損益をRで正規化</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            取引回数
            <HelpIcon text="分析対象の取引件数です。データが多いほど統計の信頼性が高まります。" />
          </div>
          <div className="kpi-value">
            {filteredTrades.length} <span className="kpi-unit">回</span>
          </div>
          <div className="kpi-desc">フィルター適用後</div>
        </div>
      </div>

      {/* これまでの推移 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          これまでの推移
        </h3>
      </div>

      <div className="dash-row-2" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.375 }}>
            最大下落幅の推移（DD）
            <HelpIcon text="資産のピークからの下落幅です。リスク管理に重要な指標です。" />
          </div>
          <div className="kpi-desc" style={{ marginBottom: 12 }}>エクイティカーブの最大下落幅</div>
          {drawdownChartData ? (
            <div style={{ height: 320 }}>
              <Line
                data={drawdownChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  spanGaps: true,
                  interaction: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                  onClick: (event: any, elements: any) => {
                    console.log('DDイベントクリック:', elements);
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      const validTrades = drawdownChartData.validTrades;
                      console.log('DDイベント - index:', index, 'validTrades.length:', validTrades.length);
                      if (index < validTrades.length) {
                        const clickedTrade = validTrades[index];
                        const clickedTime = new Date(clickedTrade.closeTime || clickedTrade.openTime || 0);
                        const dateStr = clickedTime.toISOString().split('T')[0];
                        console.log('DDイベント - 開く:', dateStr, 'allTrades:', validTrades.length);
                        setDdEventDrawer({ clickedDate: dateStr, allTrades: validTrades });
                      }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items: any) => items[0]?.parsed?.x ? new Date(items[0].parsed.x).toLocaleString('ja-JP') : '',
                        label: (item: any) => `DD: ${new Intl.NumberFormat('ja-JP').format(item.parsed.y)} 円`
                      }
                    }
                  },
                  scales: {
                    x: {
                      type: 'time' as const,
                      adapters: { date: { locale: ja } },
                      grid: { color: getGridLineColor() },
                      ticks: { font: { size: 11 }, maxRotation: 0 },
                      time: { tooltipFormat: 'yyyy/MM/dd HH:mm' }
                    },
                    y: {
                      beginAtZero: true,
                      reverse: true,
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (v: any) => new Intl.NumberFormat('ja-JP').format(v) + ' 円'
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>
      </div>

      {/* あなたの傾向 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          あなたの傾向
        </h3>
      </div>

      <div className="dash-row-2" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title">
            損益分布（ヒストグラム）
            <HelpIcon text="損益を金額帯別に分類したグラフです。損益の偏りを把握できます。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: profitDistribution.labels,
                datasets: [
                  {
                    data: profitDistribution.counts,
                    backgroundColor: profitDistribution.labels.map((label) =>
                      label.includes("~0") || label.includes("以下") || label.startsWith("-")
                        ? getLossColor()
                        : getAccentColor()
                    ),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const index = elements[0].index;
                    const rangeData = profitDistribution.data[index];
                    console.log('[損益分布ヒストグラム] Opening ProfitDistributionDetailDrawer for:', rangeData.label, 'trades:', rangeData.trades.length);
                    setProfitDistributionDrawer({
                      rangeLabel: rangeData.label,
                      minProfit: rangeData.min,
                      maxProfit: rangeData.max,
                      trades: rangeData.trades
                    });
                  } else {
                    console.log('[損益分布ヒストグラム] Opening ProfitDistributionDetailPanel (fallback)');
                    setProfitDistributionPanel({ trades: filteredTrades });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return profitDistribution.labels[context[0].dataIndex];
                      },
                      label: (context) => {
                        return `取引回数: ${context.parsed.y}回`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            R-multiple 分布
            <HelpIcon text="損益をR倍数で分類したグラフです。リスクリワード比の分布を確認できます。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: rMultipleDistribution.labels,
                datasets: [
                  {
                    data: rMultipleDistribution.counts,
                    backgroundColor: rMultipleDistribution.labels.map((label) =>
                      label.includes("~0R") || label.includes("以下") || label.startsWith("-")
                        ? getLossColor()
                        : getAccentColor()
                    ),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const index = elements[0].index;
                    const rangeData = rMultipleDistribution.data[index];
                    console.log('[R-multiple分布] Opening RMultipleDetailDrawer for:', rangeData.label, 'trades:', rangeData.trades.length);
                    setRMultipleDrawer({
                      rangeLabel: rangeData.label,
                      minR: rangeData.min,
                      maxR: rangeData.max,
                      trades: rangeData.trades
                    });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return rMultipleDistribution.labels[context[0].dataIndex];
                      },
                      label: (context) => {
                        return `取引回数: ${context.parsed.y}回`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: { callback: (value) => `${value}回` },
                  },
                  x: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* 改善ポイント */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          改善ポイント
        </h3>
      </div>

      <div className="dash-row-2" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title">
            DD寄与：曜日
            <HelpIcon text="曜日別のドローダウンへの影響度です。リスクが高い曜日を特定できます。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: ddContributionByDay.slice(0, 7).map((d) => d.day),
                datasets: [
                  {
                    data: ddContributionByDay.slice(0, 7).map((d) => d.loss),
                    backgroundColor: getLossColor(),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const index = elements[0].index;
                    const dayData = ddContributionByDay.slice(0, 7)[index];
                    console.log('[DD寄与：曜日] Opening DDContributionDetailDrawer for:', dayData.day);
                    setDdContributionDrawer({
                      type: 'weekday',
                      key: dayData.day,
                      trades: dayData.trades
                    });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return ddContributionByDay.slice(0, 7)[context[0].dataIndex].day;
                      },
                      label: (context) => {
                        const d = ddContributionByDay.slice(0, 7)[context.dataIndex];
                        return [
                          `損失額: ${d.loss.toLocaleString()}円`,
                          `負け回数: ${d.count}回`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => `${(value as number).toLocaleString()}円` },
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            DD寄与：通貨ペア
            <HelpIcon text="通貨ペア別のドローダウンへの影響度です。リスクが高い通貨ペアを特定できます。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: ddContributionByPair.slice(0, 6).map((d) => d.pair),
                datasets: [
                  {
                    data: ddContributionByPair.slice(0, 6).map((d) => d.loss),
                    backgroundColor: getLossColor(),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const index = elements[0].index;
                    const pairData = ddContributionByPair.slice(0, 6)[index];
                    console.log('[DD寄与：通貨ペア] Opening DDContributionDetailDrawer for:', pairData.pair);
                    setDdContributionDrawer({
                      type: 'symbol',
                      key: pairData.pair,
                      trades: pairData.trades
                    });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return ddContributionByPair.slice(0, 6)[context[0].dataIndex].pair;
                      },
                      label: (context) => {
                        const d = ddContributionByPair.slice(0, 6)[context.dataIndex];
                        return [
                          `損失額: ${d.loss.toLocaleString()}円`,
                          `負け回数: ${d.count}回`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => `${(value as number).toLocaleString()}円` },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* 参考情報 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          参考情報
        </h3>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: "bold", color: "var(--muted)", display: "flex", alignItems: "center" }}>
          セグメント別
          <HelpIcon text="極端に大きな損益を記録した取引リストです。異常な取引を確認して改善できます。" />
        </h3>
        <TailEventTabs
          riskMetrics={riskMetrics}
          streakData={streakData}
          formatDate={formatDate}
          getTradePair={getTradePair}
          extractSetup={extractSetup}
        />
      </div>

      {/* ドリルダウンパネル */}
      {profitDistributionPanel && (
        <ProfitDistributionDetailPanel
          trades={profitDistributionPanel.trades}
          onClose={() => setProfitDistributionPanel(null)}
        />
      )}

      {/* 損益分布詳細Drawer */}
      <ProfitDistributionDetailDrawer
        isOpen={!!profitDistributionDrawer}
        onClose={() => setProfitDistributionDrawer(null)}
        rangeLabel={profitDistributionDrawer?.rangeLabel || ''}
        minProfit={profitDistributionDrawer?.minProfit || 0}
        maxProfit={profitDistributionDrawer?.maxProfit || 0}
        trades={profitDistributionDrawer?.trades || []}
      />

      {/* R-multiple詳細Drawer */}
      <RMultipleDetailDrawer
        isOpen={!!rMultipleDrawer}
        onClose={() => setRMultipleDrawer(null)}
        rangeLabel={rMultipleDrawer?.rangeLabel || ''}
        minR={rMultipleDrawer?.minR || 0}
        maxR={rMultipleDrawer?.maxR || 0}
        trades={rMultipleDrawer?.trades || []}
        avgLoss={rMultipleDistribution.avgLoss}
      />

      {/* DD寄与詳細Drawer */}
      <DDContributionDetailDrawer
        isOpen={!!ddContributionDrawer}
        onClose={() => setDdContributionDrawer(null)}
        type={ddContributionDrawer?.type || 'weekday'}
        key={ddContributionDrawer?.key || ''}
        trades={ddContributionDrawer?.trades || []}
        avgLoss={riskMetrics.avgLoss}
      />

      {/* DDイベント詳細Drawer */}
      {ddEventDrawer && (
        <DDEventDetailDrawer
          clickedDate={ddEventDrawer.clickedDate}
          allTrades={ddEventDrawer.allTrades}
          onClose={() => setDdEventDrawer(null)}
        />
      )}

      {/* AIコーチメッセージ */}
      <div style={{ marginTop: 32 }}>
        <AiCoachMessage
          comment={{
            insight: (() => {
              const winRate = riskMetrics.winRate || 0;
              const pf = riskMetrics.profitFactor || 0;
              const rrr = riskMetrics.rewardToRisk || 0;
              const maxDD = riskMetrics.maxDrawdown || 0;
              return `勝率${winRate.toFixed(1)}%、プロフィットファクター${pf.toFixed(2)}、リスクリワード比${rrr.toFixed(2)}で運用できています。最大ドローダウン${Math.round(maxDD).toLocaleString()}円を記録していますが、リスク管理の基準が明確です。`;
            })(),
            attention: (() => {
              const maxDD = riskMetrics.maxDrawdown || 0;
              const maxLoss = riskMetrics.maxLoss || 0;
              const avgLoss = Math.abs(riskMetrics.avgLoss || 1);
              const lossMultiple = Math.abs(maxLoss / avgLoss);
              if (lossMultiple > 3) {
                return `最大損失が平均損失の${lossMultiple.toFixed(1)}倍（${Math.round(maxLoss).toLocaleString()}円）に達しています。損切りルールの徹底が必要です。最大ドローダウン${Math.round(maxDD).toLocaleString()}円にも注意してください。`;
              }
              return `最大ドローダウン${Math.round(maxDD).toLocaleString()}円に注意が必要です。連敗時の資金管理を徹底し、感情的な取引を避けましょう。`;
            })(),
            nextAction: (() => {
              const rrr = riskMetrics.rewardToRisk || 0;
              const pf = riskMetrics.profitFactor || 0;
              if (rrr < 1.5 && pf < 1.5) {
                return `リスクリワード比とプロフィットファクターの改善が急務です。利確目標を見直し、損小利大の原則を徹底しましょう。R倍数分布とテールイベント分析を活用してください。`;
              }
              if (rrr < 1.5) {
                return `リスクリワード比が低めです。利確目標を引き上げるか、損切り位置を最適化してRRRを改善しましょう。損益分布の分析が役立ちます。`;
              }
              return `現在のリスク管理を維持しつつ、R倍数分布を確認して極端な損失を避ける戦略を強化しましょう。曜日・時間帯別のDD寄与度も分析してください。`;
            })()
          }}
        />
      </div>
    </div>
  );
}
