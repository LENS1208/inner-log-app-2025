import React, { useEffect, useMemo, useState } from "react";
import { useDataset } from "../lib/dataset.context";
import { supabase } from "../lib/supabase";
import { filterTrades } from "../lib/filterTrades";
import type { Trade as FilteredTrade } from "../lib/types";
import { parseCsvText } from "../lib/csv";
import DashboardKPI from "./DashboardKPI";
import { HelpIcon } from '../components/common/HelpIcon';
import {
  EquityChart,
  DrawdownChart,
  DailyProfitChart,
  MonthlyProfitChart,
  RecentTradesTable,
  MonthCalendar,
  SegmentCharts,
  SetupChart,
  ProfitDistributionChart,
  HoldingTimeDistributionChart
} from "./DashboardSections";
import ProfitBreakdownPanel from "../components/ProfitBreakdownPanel";
import HoldingTimeBreakdownPanel from "../components/HoldingTimeBreakdownPanel";
import WeekdayBreakdownPanel from "../components/WeekdayBreakdownPanel";
import TimeOfDayBreakdownPanel from "../components/TimeOfDayBreakdownPanel";
import CurrencyPairBreakdownPanel from "../components/CurrencyPairBreakdownPanel";
import SetupBreakdownPanel from "../components/SetupBreakdownPanel";
import MonthlyProfitBreakdownPanel from "../components/MonthlyProfitBreakdownPanel";
import DailyProfitBreakdownPanel from "../components/DailyProfitBreakdownPanel";
import "../lib/dashboard.css";
const EquityCurvePage: React.FC = () => {
  const { filters, useDatabase, dataset: contextDataset, isInitialized } = useDataset();
  console.log("🔄 EquityCurvePage render", { isInitialized, useDatabase, contextDataset });

  const [trades, setTrades] = useState<FilteredTrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [breakdownPanel, setBreakdownPanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);
  const [holdingTimePanel, setHoldingTimePanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);
  const [weekdayPanel, setWeekdayPanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);
  const [timeOfDayPanel, setTimeOfDayPanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);
  const [currencyPairPanel, setCurrencyPairPanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);
  const [setupPanel, setSetupPanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);
  const [monthlyPanel, setMonthlyPanel] = useState<{ monthLabel: string; trades: any[] } | null>(null);
  const [dailyPanel, setDailyPanel] = useState<{ dateLabel: string; trades: any[] } | null>(null);

  useEffect(() => {
    const loadTrades = async () => {
      if (!isInitialized) {
        console.log('⏳ Waiting for initialization...');
        return;
      }

      setIsLoading(true);

      try {
        if (useDatabase) {
          // データベースから読み込む
          console.log('📊 Loading trades from database...', { dataset: contextDataset });
          const { getAllTrades } = await import('../lib/db.service');
          const data = await getAllTrades(contextDataset || null);

          const dbTrades: FilteredTrade[] = (data || []).map((t: any) => {
            const size = Number(t.size) || 0;
            const item = t.item || t.symbol || 'UNKNOWN';
            // balance型の判定: size=0 または item に 'ECS' が含まれる
            const isBalance = size === 0 || item.includes('ECS');

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

          console.log(`✅ Loaded ${dbTrades.length} trades from database`);
          setTrades(dbTrades);
        } else {
          // CSVから読み込む
          console.log(`📄 Loading demo data ${contextDataset}...`);
          const cacheBuster = `?t=${Date.now()}`;
          const res = await fetch(`/demo/${contextDataset}.csv${cacheBuster}`, { cache: "no-store" });
          if (!res.ok) {
            console.log('❌ Failed to load CSV');
            setTrades([]);
            return;
          }
          const text = await res.text();
          const parsedTrades = parseCsvText(text);
          console.log(`✅ Loaded ${parsedTrades.length} trades from CSV`);
          setTrades(parsedTrades);
        }
      } catch (e) {
        console.error('Exception loading trades:', e);
        setTrades([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrades();
  }, [useDatabase, contextDataset, isInitialized]);
  // フィルタ適用（filterTradesを使用）
  const filteredTrades = useMemo(() => {
    console.log(`🔍 Computing filteredTrades - input trades.length: ${trades.length}`);
    const result = filterTrades(trades, filters);
    console.log(`✅ Filtered trades result: ${result.length} trades`);
    return result;
  }, [trades, filters]);

  // 累積損益計算は不要（DashboardSectionsコンポーネント内で計算される）

  // ---- UI ----
  if (isLoading) {
    return (
      <div style={{
        width: "100%",
        height: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>データを読み込んでいます...</div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>しばらくお待ちください</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <div style={{ width: "100%", maxWidth: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, width: "100%", maxWidth: "100%" }}>
          <div>
            {/* ダッシュボードKPI */}
            <DashboardKPI trades={filteredTrades} />

            {/* 1. 累積損益とドローダウン（最重要：全体のパフォーマンス推移） */}
            <section className="dash-row-2" style={{ marginBottom: 16 }}>
              <div className="dash-card">
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  累積損益
                  <HelpIcon text="取引ごとに利益や損失を積み上げたグラフです。右肩上がりなら口座残高が増えています。" />
                </h3>
                <EquityChart trades={filteredTrades as any} />
              </div>
              <div className="dash-card">
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ドローダウン
                  <HelpIcon text="資産のピークからの下落幅を示します。リスク管理に重要な指標です。" />
                </h3>
                <DrawdownChart trades={filteredTrades as any} />
              </div>
            </section>

            {/* 2. セグメント分析（曜日別・時間帯別・通貨ペア別） */}
            <section style={{ marginBottom: 16 }}>
              <SegmentCharts
                trades={filteredTrades as any}
                onWeekdayClick={(weekdayLabel, weekdayTrades) => {
                  setWeekdayPanel({ rangeLabel: weekdayLabel, trades: weekdayTrades });
                }}
                onTimeClick={(timeLabel, timeTrades) => {
                  setTimeOfDayPanel({ rangeLabel: timeLabel, trades: timeTrades });
                }}
                onPairClick={(pairLabel, pairTrades) => {
                  setCurrencyPairPanel({ rangeLabel: pairLabel, trades: pairTrades });
                }}
              />
            </section>

            {/* 3. 月別・日次損益（時系列パフォーマンス） */}
            <section className="dash-row-2" style={{ marginBottom: 16 }}>
              <div className="dash-card">
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  月別損益
                  <HelpIcon text="月ごとの損益合計を棒グラフで表示します。クリックで詳細分析を開きます。" />
                </h3>
                <MonthlyProfitChart
                  trades={filteredTrades as any}
                  onMonthClick={(monthLabel, monthTrades) => {
                    setMonthlyPanel({ monthLabel, trades: monthTrades });
                  }}
                />
              </div>
              <div className="dash-card">
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  日次損益
                  <HelpIcon text="日ごとの損益合計を棒グラフで表示します。クリックで詳細分析を開きます。" />
                </h3>
                <DailyProfitChart
                  trades={filteredTrades as any}
                  onDayClick={(dateLabel, dayTrades) => {
                    setDailyPanel({ dateLabel, trades: dayTrades });
                  }}
                />
              </div>
            </section>

            {/* 4. 今月の取引カレンダー */}
            <section style={{ marginBottom: 16 }}>
              <div className="dash-card">
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  今月の取引
                  <HelpIcon text="カレンダー形式で今月の取引状況を表示します。日ごとの損益と取引回数が分かります。" />
                </h3>
                <MonthCalendar trades={filteredTrades as any} />
              </div>
            </section>

            {/* 5. 損益分布と保有時間分布（取引の特性分析） */}
            <section className="dash-row-2" style={{ marginBottom: 16 }}>
              <ProfitDistributionChart
                trades={filteredTrades as any}
                onRangeClick={(rangeLabel, rangeTrades) => {
                  setBreakdownPanel({ rangeLabel, trades: rangeTrades });
                }}
              />
              <HoldingTimeDistributionChart
                trades={filteredTrades as any}
                onRangeClick={(rangeLabel, rangeTrades) => {
                  setHoldingTimePanel({ rangeLabel, trades: rangeTrades });
                }}
              />
            </section>

            {/* 6. 戦略タグ別とベスト/ワースト取引（戦略分析と個別取引） */}
            <section className="dash-row-2" style={{ marginBottom: 16 }}>
              <SetupChart
                trades={filteredTrades as any}
                onSetupClick={(setupLabel, setupTrades) => {
                  setSetupPanel({ rangeLabel: setupLabel, trades: setupTrades });
                }}
              />
              <div className="dash-card">
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  直近の取引（上位/下位）
                  <HelpIcon text="損益の絶対値が大きい取引トップ5を表示します。勝ち取引と負け取引の傾向を把握できます。" />
                </h3>
                <RecentTradesTable trades={filteredTrades as any} />
              </div>
            </section>
          </div>
        </div>
      </div>

      {breakdownPanel && (
        <ProfitBreakdownPanel
          trades={breakdownPanel.trades}
          rangeLabel={breakdownPanel.rangeLabel}
          onClose={() => setBreakdownPanel(null)}
        />
      )}

      {holdingTimePanel && (
        <HoldingTimeBreakdownPanel
          trades={holdingTimePanel.trades}
          rangeLabel={holdingTimePanel.rangeLabel}
          onClose={() => setHoldingTimePanel(null)}
        />
      )}

      {weekdayPanel && (
        <WeekdayBreakdownPanel
          trades={weekdayPanel.trades}
          rangeLabel={weekdayPanel.rangeLabel}
          onClose={() => setWeekdayPanel(null)}
        />
      )}

      {timeOfDayPanel && (
        <TimeOfDayBreakdownPanel
          trades={timeOfDayPanel.trades}
          rangeLabel={timeOfDayPanel.rangeLabel}
          onClose={() => setTimeOfDayPanel(null)}
        />
      )}

      {currencyPairPanel && (
        <CurrencyPairBreakdownPanel
          trades={currencyPairPanel.trades}
          pairLabel={currencyPairPanel.rangeLabel}
          onClose={() => setCurrencyPairPanel(null)}
        />
      )}

      {setupPanel && (
        <SetupBreakdownPanel
          trades={setupPanel.trades}
          setupLabel={setupPanel.rangeLabel}
          onClose={() => setSetupPanel(null)}
        />
      )}

      {monthlyPanel && (
        <MonthlyProfitBreakdownPanel
          trades={monthlyPanel.trades}
          monthLabel={monthlyPanel.monthLabel}
          onClose={() => setMonthlyPanel(null)}
        />
      )}

      {dailyPanel && (
        <DailyProfitBreakdownPanel
          trades={dailyPanel.trades}
          dateLabel={dailyPanel.dateLabel}
          onClose={() => setDailyPanel(null)}
        />
      )}
    </div>
  );
};

export default EquityCurvePage;
