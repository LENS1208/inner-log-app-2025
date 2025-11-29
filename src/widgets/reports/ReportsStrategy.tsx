import React, { useEffect, useMemo, useState } from "react";
import { getGridLineColor, getAccentColor, getLossColor, getWarningColor, getOrangeColor, getGreenColor } from "../../lib/chartColors";
import { Bar, Doughnut, Scatter } from "react-chartjs-2";
import { useDataset } from "../../lib/dataset.context";
import { parseCsvText } from "../../lib/csv";
import type { Trade } from "../../lib/types";
import { filterTrades, getTradeProfit, getTradeSide, getTradePair, isValidCurrencyPair } from "../../lib/filterTrades";
import { supabase } from "../../lib/supabase";
import { HelpIcon } from "../../components/common/HelpIcon";
import Card from "../../components/common/Card";
import SetupDetailPanel from "../../components/SetupDetailPanel";

type MetricType = "profit" | "winRate" | "pf" | "avgProfit";

type StrategySegmentTab = "戦略" | "ポジション";

function StrategySegmentTabs({
  setupData,
  sideData
}: {
  setupData: any[];
  sideData: any;
}) {
  const [activeTab, setActiveTab] = React.useState<StrategySegmentTab>("戦略");

  const tabs: StrategySegmentTab[] = ["戦略", "ポジション"];

  const renderTable = () => {
    let data: any[] = [];
    let segmentLabel = "";

    switch (activeTab) {
      case "戦略":
        data = setupData.map(s => ({
          label: s.setup,
          count: s.count,
          profit: s.profit,
          winRate: s.winRate,
          pf: s.pf,
          avgProfit: s.avgProfit
        }));
        segmentLabel = "戦略";
        break;
      case "ポジション":
        data = [
          {
            label: "買い",
            count: sideData.long.count,
            profit: sideData.long.profit,
            winRate: sideData.long.winRate,
            pf: sideData.long.pf,
            avgProfit: sideData.long.avgProfit
          },
          {
            label: "売り",
            count: sideData.short.count,
            profit: sideData.short.profit,
            winRate: sideData.short.winRate,
            pf: sideData.short.pf,
            avgProfit: sideData.short.avgProfit
          }
        ];
        segmentLabel = "ポジション";
        break;
    }

    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--line)" }}>
            <th style={{ padding: 10, textAlign: "left", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>
              {segmentLabel}
            </th>
            <th style={{ padding: 10, textAlign: "right", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>取引回数</th>
            <th style={{ padding: 10, textAlign: "right", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>平均損益</th>
            <th style={{ padding: 10, textAlign: "right", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>勝率</th>
            <th style={{ padding: 10, textAlign: "right", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>PF</th>
            <th style={{ padding: 10, textAlign: "right", fontSize: 15, fontWeight: "bold", color: "var(--muted)" }}>合計損益</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              style={{
                borderBottom: "1px solid var(--line)",
                height: 44,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--chip)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: 10, fontSize: 13 }}>{item.label}</td>
              <td style={{ padding: 10, textAlign: "right", fontSize: 13, color: "var(--muted)" }}>{item.count} <span style={{ fontSize: 11, color: "var(--muted)" }}>回</span></td>
              <td
                style={{
                  padding: 10,
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 600,
                  color: item.avgProfit >= 0 ? "var(--gain)" : "var(--loss)",
                }}
              >
                {item.avgProfit >= 0 ? '+' : ''}{Math.round(item.avgProfit).toLocaleString("ja-JP")} <span style={{ fontSize: 11, color: item.avgProfit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </td>
              <td style={{ padding: 10, textAlign: "right", fontSize: 13, color: "var(--muted)" }}>{item.winRate.toFixed(0)} <span style={{ fontSize: 11, color: "var(--muted)" }}>%</span></td>
              <td style={{ padding: 10, textAlign: "right", fontSize: 13, color: "var(--muted)" }}>{item.pf.toFixed(2)}</td>
              <td
                style={{
                  padding: 10,
                  textAlign: "right",
                  fontSize: 15,
                  fontWeight: 700,
                  color: item.profit >= 0 ? "var(--gain)" : "var(--loss)",
                }}
              >
                {item.profit >= 0 ? '+' : ''}{Math.round(item.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: item.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </td>
            </tr>
          ))}
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
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {renderTable()}
      </div>
    </div>
  );
}

export default function ReportsStrategy() {
  const { dataset, filters, useDatabase, isInitialized } = useDataset();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const metric: MetricType = "profit";
  const [setupDetailPanel, setSetupDetailPanel] = useState<{ setupLabel: string; trades: any[] } | null>(null);

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

          const { data: notesData } = await supabase
            .from('trade_notes')
            .select('ticket, entry_basis');

          const notesMap = new Map(
            (notesData || []).map((n: any) => [
              n.ticket,
              n.entry_basis?.setup || ''
            ])
          );

          const normalizeSide = (side: string): 'LONG' | 'SHORT' => {
            const s = side?.toUpperCase();
            if (s === 'BUY' || s === 'LONG') return 'LONG';
            if (s === 'SELL' || s === 'SHORT') return 'SHORT';
            return 'LONG';
          };

          const calculateHoldTime = (openTime: string, closeTime: string): number | undefined => {
            try {
              const openMs = new Date(openTime).getTime();
              const closeMs = new Date(closeTime).getTime();
              if (!isNaN(openMs) && !isNaN(closeMs)) {
                return Math.round((closeMs - openMs) / 60000);
              }
            } catch {
              return undefined;
            }
            return undefined;
          };

          const mapped: Trade[] = (data || [])
            .filter((t: any) => isValidCurrencyPair(t.item))
            .map((t: any) => {
              const setup = notesMap.get(t.ticket) || '';
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
                comment: setup ? setup : (t.comment || ''),
                memo: t.memo || '',
                holdTimeMin: calculateHoldTime(openTime, closeTime),
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

  // 戦略タグ抽出（comment または memo から）
  const extractSetup = (t: Trade): string => {
    const text = (t.comment || t.memo || "").toLowerCase();
    if (text.includes("breakout") || text.includes("ブレイクアウト")) return "ブレイクアウト";
    if (text.includes("pullback") || text.includes("プルバック")) return "プルバック";
    if (text.includes("reversal") || text.includes("反転")) return "反転";
    if (text.includes("trend") || text.includes("トレンド")) return "トレンド";
    if (text.includes("range") || text.includes("レンジ")) return "レンジ";
    if (text.includes("scalp") || text.includes("スキャルプ")) return "スキャルピング";
    return "未登録";
  };

  const setupData = useMemo(() => {
    const map = new Map<string, { profit: number; count: number; wins: number; avgHoldTime: number }>();
    filteredTrades.forEach((t) => {
      const setup = extractSetup(t);
      const profit = getTradeProfit(t);
      const current = map.get(setup) || { profit: 0, count: 0, wins: 0, avgHoldTime: 0 };
      map.set(setup, {
        profit: current.profit + profit,
        count: current.count + 1,
        wins: current.wins + (profit > 0 ? 1 : 0),
        avgHoldTime: current.avgHoldTime + (t.holdTimeMin || 0),
      });
    });
    return Array.from(map.entries())
      .map(([setup, data]) => {
        const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
        const avgProfit = data.count > 0 ? data.profit / data.count : 0;
        const avgHoldTime = data.count > 0 ? data.avgHoldTime / data.count : 0;
        const grossProfit = filteredTrades
          .filter((t) => extractSetup(t) === setup && getTradeProfit(t) > 0)
          .reduce((sum, t) => sum + getTradeProfit(t), 0);
        const grossLoss = Math.abs(
          filteredTrades
            .filter((t) => extractSetup(t) === setup && getTradeProfit(t) < 0)
            .reduce((sum, t) => sum + getTradeProfit(t), 0)
        );
        const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
        return { setup, ...data, winRate, avgProfit, avgHoldTime, pf };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [filteredTrades]);

  const sideData = useMemo(() => {
    const longTrades = filteredTrades.filter((t) => getTradeSide(t) === "LONG");
    const shortTrades = filteredTrades.filter((t) => getTradeSide(t) === "SHORT");

    const calcStats = (trades: Trade[]) => {
      const profit = trades.reduce((sum, t) => sum + getTradeProfit(t), 0);
      const wins = trades.filter((t) => getTradeProfit(t) > 0).length;
      const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
      const grossProfit = trades.filter((t) => getTradeProfit(t) > 0).reduce((sum, t) => sum + getTradeProfit(t), 0);
      const grossLoss = Math.abs(trades.filter((t) => getTradeProfit(t) < 0).reduce((sum, t) => sum + getTradeProfit(t), 0));
      const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
      const avgProfit = trades.length > 0 ? profit / trades.length : 0;
      return { count: trades.length, profit, wins, winRate, pf, avgProfit };
    };

    return {
      long: calcStats(longTrades),
      short: calcStats(shortTrades),
    };
  }, [filteredTrades]);

  const avgWinLoss = useMemo(() => {
    const winTrades = filteredTrades.filter((t) => getTradeProfit(t) > 0);
    const lossTrades = filteredTrades.filter((t) => getTradeProfit(t) < 0);
    const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + getTradeProfit(t), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((sum, t) => sum + getTradeProfit(t), 0) / lossTrades.length : 0;
    return { avgWin, avgLoss };
  }, [filteredTrades]);

  const setupCrossData = useMemo(() => {
    const data: { setup: string; long: number; short: number }[] = [];
    setupData.forEach((s) => {
      const longProfit = filteredTrades
        .filter((t) => extractSetup(t) === s.setup && getTradeSide(t) === "LONG")
        .reduce((sum, t) => sum + getTradeProfit(t), 0);
      const shortProfit = filteredTrades
        .filter((t) => extractSetup(t) === s.setup && getTradeSide(t) === "SHORT")
        .reduce((sum, t) => sum + getTradeProfit(t), 0);
      data.push({ setup: s.setup, long: longProfit, short: shortProfit });
    });
    return data;
  }, [setupData, filteredTrades]);

  const topSetup = setupData[0] || { setup: "-", profit: 0, winRate: 0, count: 0 };
  const bottomSetup = setupData[setupData.length - 1] || { setup: "-", profit: 0, winRate: 0, count: 0 };

  const getMetricValue = (item: any) => {
    switch (metric) {
      case "profit": return item.profit;
      case "winRate": return item.winRate;
      case "pf": return item.pf || 0;
      case "avgProfit": return item.avgProfit;
      default: return item.profit;
    }
  };

  const formatValue = (value: number, type: MetricType) => {
    switch (type) {
      case "profit":
      case "avgProfit":
        const sign = value >= 0 ? "+" : "";
        return `${sign}${Math.round(value).toLocaleString("ja-JP")}円`;
      case "winRate":
        return `${value.toFixed(1)}%`;
      case "pf":
        return value.toFixed(2);
      default:
        return value.toString();
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}分`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  };

  // 決済効率分析
  const exitEfficiencyData = useMemo(() => {
    const tradesWithPotential = filteredTrades.filter(t => t.pips !== undefined && t.openPrice && t.closePrice);

    const efficiencies = tradesWithPotential.map(t => {
      const pips = Math.abs(t.pips || 0);
      const profit = getTradeProfit(t);

      // 最大可能利益を推定（実際のpips移動量の2倍と仮定）
      const maxPotentialPips = pips * 2;
      const maxPotentialProfit = profit > 0 ? profit * 2 : Math.abs(profit);

      // 決済効率 = 実現利益 / 最大可能利益
      const efficiency = maxPotentialProfit > 0 ? (profit / maxPotentialProfit) * 100 : 0;

      return {
        trade: t,
        efficiency: Math.max(-100, Math.min(100, efficiency)),
        profit,
        pips,
        maxPotential: maxPotentialProfit,
      };
    });

    const avgEfficiency = efficiencies.length > 0
      ? efficiencies.reduce((sum, e) => sum + e.efficiency, 0) / efficiencies.length
      : 0;

    const earlyExits = efficiencies.filter(e => e.profit > 0 && e.efficiency < 30).length;
    const holdRatio = efficiencies.filter(e => e.efficiency > 50).length / efficiencies.length * 100;

    // 決済効率分布
    const ranges = [
      { label: "-100~-50%", min: -100, max: -50 },
      { label: "-50~0%", min: -50, max: 0 },
      { label: "0~25%", min: 0, max: 25 },
      { label: "25~50%", min: 25, max: 50 },
      { label: "50~75%", min: 50, max: 75 },
      { label: "75~100%", min: 75, max: 100 },
    ];

    const distribution = ranges.map(range => ({
      label: range.label,
      count: efficiencies.filter(e => e.efficiency >= range.min && e.efficiency < range.max).length,
    }));

    // 決済戦略ランキング（最も損失が大きいパターン）
    const setupExitMap = new Map<string, { totalLoss: number; count: number; avgEfficiency: number }>();
    efficiencies.filter(e => e.profit < 0).forEach(e => {
      const setup = extractSetup(e.trade);
      const current = setupExitMap.get(setup) || { totalLoss: 0, count: 0, avgEfficiency: 0 };
      setupExitMap.set(setup, {
        totalLoss: current.totalLoss + Math.abs(e.profit),
        count: current.count + 1,
        avgEfficiency: current.avgEfficiency + e.efficiency,
      });
    });

    const exitRanking = Array.from(setupExitMap.entries())
      .map(([setup, data]) => ({
        setup,
        totalLoss: data.totalLoss,
        count: data.count,
        avgEfficiency: data.avgEfficiency / data.count,
      }))
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .slice(0, 10);

    return {
      avgEfficiency,
      earlyExits,
      holdRatio,
      distribution,
      efficiencies,
      exitRanking,
    };
  }, [filteredTrades]);

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

      <div className="kpi-cards-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-title">
            戦略タグ ベスト
            <HelpIcon text="最も稼げている取引パターン（戦略タグ）です。この戦略を中心に取り組むと良いでしょう。" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: topSetup.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
            {topSetup.setup}：{topSetup.profit >= 0 ? '+' : ''}{Math.round(topSetup.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: topSetup.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            勝率 {topSetup.winRate.toFixed(0)} <span style={{ fontSize: 11 }}>%</span> / 取引 {topSetup.count} <span style={{ fontSize: 11 }}>件</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            戦略タグ ワースト
            <HelpIcon text="最も損失が出ている取引パターン（戦略タグ）です。この戦略を見直すと良いでしょう。" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: bottomSetup.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
            {bottomSetup.setup}：{bottomSetup.profit >= 0 ? '+' : ''}{Math.round(bottomSetup.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: bottomSetup.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            勝率 {bottomSetup.winRate.toFixed(0)} <span style={{ fontSize: 11 }}>%</span> / 取引 {bottomSetup.count} <span style={{ fontSize: 11 }}>件</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            ポジション比較
            <HelpIcon text="ロング（買い）とショート（売り）の損益比較です。どちらのポジションが得意か把握できます。" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: sideData.long.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
              買い：{sideData.long.profit >= 0 ? '+' : ''}{Math.round(sideData.long.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: sideData.long.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: sideData.short.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
              売り：{sideData.short.profit >= 0 ? '+' : ''}{Math.round(sideData.short.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: sideData.short.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            PF {sideData.long.pf.toFixed(2)} / {sideData.short.pf.toFixed(2)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            平均勝ち / 平均負け
            <HelpIcon text="全戦略タグの平均損益です。1回の取引で平均的にどれくらい稼げているか分かります。" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gain)" }}>
              勝ち：+{Math.round(avgWinLoss.avgWin).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: "var(--gain)" }}>円</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--loss)" }}>
              負け：{Math.round(avgWinLoss.avgLoss).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: "var(--loss)" }}>円</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>各戦略横断の平均</div>
        </div>
      </div>

      {setupData.length > 0 && setupData.every(s => s.setup === "未登録") && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
          トレード日記に「取引ごとの戦略」を記録すると分析データが反映されます。
        </div>
      )}

      {/* あなたの傾向 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          あなたの傾向
        </h3>
      </div>

      <div
        className="dash-row-2"
        style={{ marginBottom: 16 }}
      >
        <div className="kpi-card">
          <div className="kpi-title">
            戦略タグ別（上位6）
            <HelpIcon text="主要6戦略タグの損益を比較したグラフです。得意な戦略と苦手な戦略を一目で把握できます。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: setupData.slice(0, 6).map((s) => s.setup),
                datasets: [
                  {
                    data: setupData.slice(0, 6).map(getMetricValue),
                    backgroundColor: setupData.slice(0, 6).map((s) =>
                      s.profit >= 0 ? getAccentColor() : getLossColor()
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
                    const setup = setupData.slice(0, 6)[index];
                    const setupTrades = filteredTrades.filter(t => {
                      const tradeSetup = (t as any).setup || '';
                      return tradeSetup === setup.setup;
                    });
                    console.log('[戦略タグ別] Opening SetupDetailPanel for:', setup.setup, 'trades:', setupTrades.length);
                    setSetupDetailPanel({ setupLabel: setup.setup, trades: setupTrades });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return setupData.slice(0, 6)[context[0].dataIndex].setup;
                      },
                      label: (context) => {
                        const dataIndex = context.dataIndex;
                        const s = setupData.slice(0, 6)[dataIndex];
                        return [
                          `損益: ${s.profit.toLocaleString()}円`,
                          `勝率: ${s.winRate.toFixed(1)}%`,
                          `取引回数: ${s.count}回`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => formatValue(value as number, "profit") },
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            売り vs 買い
            <HelpIcon text="ロング（買い）とショート（売り）の取引回数を比較します。ポジションの偏りを確認できます。" />
          </div>
          <div style={{ height: 180 }}>
            <Doughnut
              data={{
                labels: ["買い", "売り"],
                datasets: [
                  {
                    data: [sideData.long.count, sideData.short.count],
                    backgroundColor: [getGreenColor(), getOrangeColor()],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    reverse: true
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed;
                        const data = label === '買い' ? sideData.long : sideData.short;
                        return [
                          `${label}: ${value}回`,
                          `損益: ${data.profit.toLocaleString()}円`,
                          `勝率: ${data.winRate.toFixed(1)}%`
                        ];
                      }
                    }
                  }
                },
              }}
            />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            戦略タグ別 平均保有時間
            <HelpIcon text="戦略タグごとの平均ポジション保有期間です。どの戦略タグが時間効率が良いか分かります。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: setupData.slice(0, 6).map((s) => s.setup),
                datasets: [
                  {
                    data: setupData.slice(0, 6).map((s) => s.avgHoldTime),
                    backgroundColor: getAccentColor(),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return setupData.slice(0, 6)[context[0].dataIndex].setup;
                      },
                      label: (context) => {
                        const mins = context.parsed.y;
                        return `平均保有時間: ${formatMinutes(mins)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => formatMinutes(value as number) },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="dash-row-2"
        style={{ marginBottom: 16 }}
      >
        <div className="kpi-card">
          <div className="kpi-title">
            戦略タグ別 勝率
            <HelpIcon text="戦略タグごとの勝率を比較したグラフです。確率論的にどの戦略タグが優れているか把握できます。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: setupData.slice(0, 6).map((s) => s.setup),
                datasets: [
                  {
                    data: setupData.slice(0, 6).map((s) => s.winRate),
                    backgroundColor: getAccentColor(),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return setupData.slice(0, 6)[context[0].dataIndex].setup;
                      },
                      label: (context) => {
                        const s = setupData.slice(0, 6)[context.dataIndex];
                        return [
                          `勝率: ${s.winRate.toFixed(1)}%`,
                          `取引回数: ${s.count}回`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: (value) => `${value}%` },
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            戦略タグ別 PF
            <HelpIcon text="戦略タグごとのプロフィットファクター（総利益÷総損失）です。1.0以上なら利益が損失を上回っています。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: setupData.slice(0, 6).map((s) => s.setup),
                datasets: [
                  {
                    data: setupData.slice(0, 6).map((s) => Math.min(s.pf, 5)),
                    backgroundColor: setupData.slice(0, 6).map((s) =>
                      s.pf >= 1 ? getAccentColor() : getLossColor()
                    ),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return setupData.slice(0, 6)[context[0].dataIndex].setup;
                      },
                      label: (context) => {
                        const s = setupData.slice(0, 6)[context.dataIndex];
                        return [
                          `PF: ${s.pf.toFixed(2)}`,
                          `取引回数: ${s.count}回`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => (value as number).toFixed(1) },
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">
            ポジション×戦略（クロス）
            <HelpIcon text="ポジションと戦略の組み合わせ分析です。最適な組み合わせを見つけられます。" />
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: setupCrossData.slice(0, 5).map((d) => d.setup),
                datasets: [
                  {
                    label: "売り",
                    data: setupCrossData.slice(0, 5).map((d) => d.short),
                    backgroundColor: getOrangeColor(),
                  },
                  {
                    label: "買い",
                    data: setupCrossData.slice(0, 5).map((d) => d.long),
                    backgroundColor: getGreenColor(),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    reverse: false
                  },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return setupCrossData.slice(0, 5)[context[0].dataIndex].setup;
                      },
                      label: (context) => {
                        const direction = context.dataset.label;
                        const value = context.parsed.y;
                        return `${direction}: ${value.toLocaleString()}円`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: { callback: (value) => `${(value as number).toLocaleString()}円` },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          決済タイミングの分析
          <HelpIcon text="決済タイミングの傾向を分析します。早期決済や遅すぎる決済の問題を発見できます。" />
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>平均決済効率</h4>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
              {exitEfficiencyData.avgEfficiency.toFixed(1)} <span style={{ fontSize: 14, color: "var(--accent)" }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>実現利益/最大可能利益</div>
          </div>

          <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>早期決済回数</h4>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--loss)" }}>
              {exitEfficiencyData.earlyExits} <span style={{ fontSize: 14, color: "var(--loss)" }}>件</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>効率30%未満の勝ちトレード</div>
          </div>

          <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>保有率実績</h4>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gain)" }}>
              {exitEfficiencyData.holdRatio.toFixed(1)} <span style={{ fontSize: 14, color: "var(--gain)" }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>効率50%以上の割合</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: "bold", color: "var(--muted)", display: "flex", alignItems: "center" }}>
            決済効率分布
            <HelpIcon text="決済タイミングの傾向を分析します。早期決済や遅すぎる決済の問題を発見できます。" />
          </h4>
            <div style={{ height: 180 }}>
              <Bar
                data={{
                  labels: exitEfficiencyData.distribution.map(d => d.label),
                  datasets: [
                    {
                      data: exitEfficiencyData.distribution.map(d => d.count),
                      backgroundColor: exitEfficiencyData.distribution.map((d, idx) =>
                        idx < 2 ? getLossColor() :
                        idx < 4 ? getWarningColor() :
                        getAccentColor()
                      ),
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (context) => {
                          return exitEfficiencyData.distribution[context[0].dataIndex].label;
                        },
                        label: (context) => {
                          return `取引回数: ${context.parsed.y}回`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                  },
                }}
              />
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: "bold", color: "var(--muted)", display: "flex", alignItems: "center" }}>
            決済戦略ランキング（損失大）
            <HelpIcon text="早期決済で損失を拡大した取引リストです。決済ルールを見直すポイントが分かります。" />
          </h4>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, color: "var(--muted)" }}>順位</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, color: "var(--muted)" }}>戦略</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", fontSize: 11, color: "var(--muted)" }}>損失額</th>
                    <th style={{ padding: "6px 8px", textAlign: "right", fontSize: 11, color: "var(--muted)" }}>回数</th>
                  </tr>
                </thead>
                <tbody>
                  {exitEfficiencyData.exitRanking.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "6px 8px" }}>{idx + 1}</td>
                      <td style={{ padding: "6px 8px" }}>{item.setup}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--loss)" }}>
                        {Math.round(item.totalLoss).toLocaleString()}円
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            セグメント別
            <HelpIcon text="全戦略タグとポジションの詳細データテーブルです。細かい数値を確認して戦略を調整できます。" />
        </h3>
        <StrategySegmentTabs
          setupData={setupData}
          sideData={sideData}
        />
      </div>

      {/* ドリルダウンパネル */}
      {setupDetailPanel && (
        <SetupDetailPanel
          setupLabel={setupDetailPanel.setupLabel}
          trades={setupDetailPanel.trades}
          onClose={() => setSetupDetailPanel(null)}
        />
      )}
    </div>
  );
}
