import React, { useEffect, useState, useMemo } from "react";
import { TopBar } from "./daily/TopBar";
import { KpiGrid } from "./daily/KpiGrid";
import { DayJournalCard } from "./daily/DayJournalCard";
import { DayTradesTable } from "./daily/DayTradesTable";
import { LinkedNotesTable } from "./daily/LinkedNotesTable";
import { AiAdviceBlock } from "./daily/AiAdviceBlock";
import type { DailyNotePageProps } from "./daily/types";
import { supabase } from "../lib/supabase";
import { useDataset } from "../lib/dataset.context";
import "./dailyNote.css";

const DUMMY_DATA: DailyNotePageProps = {
  kpi: {
    winRate: 66.7,
    tradeCount: 6,
    winCount: 4,
    lossCount: 2,
    avgPnLPerTradeYen: 1250,
    profitFactor: 2.15,
    totalPips: 42.3,
    dayTotalYen: 7500,
    dateJst: "2025-10-04",
    weekdayJp: "土",
  },
  trades: [
    { time: "08:12", symbol: "USDJPY", sideJp: "買い", pnlYen: 3200, ticket: "100123" },
    { time: "10:45", symbol: "EURUSD", sideJp: "売り", pnlYen: -1800, ticket: "100124" },
    { time: "13:30", symbol: "GBPJPY", sideJp: "買い", pnlYen: 2400, ticket: "100125" },
    { time: "15:20", symbol: "USDJPY", sideJp: "売り", pnlYen: 1900, ticket: "100126" },
    { time: "17:05", symbol: "AUDUSD", sideJp: "買い", pnlYen: -950, ticket: "100127" },
    { time: "19:40", symbol: "EURUSD", sideJp: "買い", pnlYen: 2750, ticket: "100128" },
  ],
  linkedNotes: [
    {
      title: "2025-10-04（土）｜日次ノート",
      kind: "日次",
      updatedAt: "2025/10/04 20:15",
    },
    {
      title: "USDJPY 買いポジション #100123",
      kind: "取引",
      updatedAt: "2025/10/04 08:30",
    },
  ],
  advice: {
    items: [
      "今日の勝率は66.7%と良好です。引き続き慎重なエントリーを心がけましょう。",
      "EURUSDで2回取引していますが、1勝1敗です。通貨ペアごとのパターンを見直してみましょう。",
      "損切りが適切に機能しています。この調子でリスク管理を継続してください。",
      "午前中の取引が好調です。時間帯ごとの傾向を分析してみると良いでしょう。",
    ],
    lastUpdated: "2025/10/04 20:30",
    pinned: false,
  },
};

export default function DailyNotePage(props?: Partial<DailyNotePageProps>) {
  const { useDatabase } = useDataset();
  const [loading, setLoading] = useState(true);
  const [realKpi, setRealKpi] = useState<typeof DUMMY_DATA.kpi | null>(null);
  const [realTrades, setRealTrades] = useState<typeof DUMMY_DATA.trades>([]);

  const dateJst = props?.kpi?.dateJst || DUMMY_DATA.kpi.dateJst;

  useEffect(() => {
    if (!useDatabase) {
      setRealKpi(DUMMY_DATA.kpi);
      setRealTrades(DUMMY_DATA.trades);
      setLoading(false);
      return;
    }

    const loadDayData = async () => {
      setLoading(true);
      setRealKpi(null);
      setRealTrades([]);
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .gte('close_time', `${dateJst}T00:00:00Z`)
          .lt('close_time', `${dateJst}T23:59:59Z`)
          .order('close_time', { ascending: true });

        if (error) {
          console.error('Error loading trades:', error);
          setRealKpi(null);
          setRealTrades([]);
          return;
        }

        const dayTrades = data || [];
        const tradeCount = dayTrades.length;
        const winTrades = dayTrades.filter(t => t.profit > 0);
        const lossTrades = dayTrades.filter(t => t.profit < 0);
        const winCount = winTrades.length;
        const lossCount = lossTrades.length;
        const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
        const dayTotalYen = dayTrades.reduce((sum, t) => sum + Number(t.profit), 0);
        const avgPnLPerTradeYen = tradeCount > 0 ? dayTotalYen / tradeCount : 0;
        const grossProfit = winTrades.reduce((sum, t) => sum + Number(t.profit), 0);
        const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + Number(t.profit), 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);
        const totalPips = dayTrades.reduce((sum, t) => sum + Number(t.pips), 0);

        const dayOfWeek = new Date(dateJst).toLocaleDateString('ja-JP', { weekday: 'short' });

        setRealKpi({
          winRate,
          tradeCount,
          winCount,
          lossCount,
          avgPnLPerTradeYen,
          profitFactor,
          totalPips,
          dayTotalYen,
          dateJst,
          weekdayJp: dayOfWeek,
        });

        setRealTrades(
          dayTrades.map(t => ({
            time: new Date(t.close_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            symbol: t.item,
            sideJp: t.side === 'BUY' ? '買い' : '売り',
            pnlYen: Number(t.profit),
            ticket: t.ticket,
          }))
        );
      } catch (e) {
        console.error('Exception loading day data:', e);
        setRealKpi(null);
        setRealTrades([]);
      } finally {
        setLoading(false);
      }
    };

    loadDayData();
  }, [useDatabase, dateJst]);

  if (loading || !realKpi) {
    return (
      <div className="daily-note-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>読み込み中...</div>
      </div>
    );
  }

  const mergedProps = {
    ...DUMMY_DATA,
    ...props,
    kpi: realKpi,
    trades: realTrades,
  };

  const handlePrevDay = () => {
    const currentDate = new Date(dateJst);
    currentDate.setDate(currentDate.getDate() - 1);
    const newDate = currentDate.toISOString().slice(0, 10);
    location.hash = `/daily/${newDate}`;
  };
  const handleNextDay = () => {
    const currentDate = new Date(dateJst);
    currentDate.setDate(currentDate.getDate() + 1);
    const newDate = currentDate.toISOString().slice(0, 10);
    location.hash = `/daily/${newDate}`;
  };
  const handleToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    location.hash = `/daily/${today}`;
  };
  const handleSave = (payload: any) => {
    console.log("保存:", payload);
    if (mergedProps.onSave) mergedProps.onSave(payload);
  };
  const handleOpenTradesList = () => console.log("取引一覧を開く");
  const handleOpenNote = (title: string) => console.log("ノートを開く:", title);
  const handleGenerateAdvice = () => console.log("アドバイスを生成");
  const handleRegenerateAdvice = () => console.log("再生成");
  const handlePinAdvice = () => console.log("固定");

  return (
    <div className="daily-note-page">
      <TopBar
        kpi={mergedProps.kpi}
        onPrevDay={mergedProps.onPrevDay || handlePrevDay}
        onNextDay={mergedProps.onNextDay || handleNextDay}
        onToday={handleToday}
      />

      <KpiGrid kpi={mergedProps.kpi} />

      <div className="two-col-layout">
        <DayJournalCard
          dateKey={mergedProps.kpi.dateJst}
          onSave={mergedProps.onSave || handleSave}
        />

        <div className="right-panel">
          <div className="panel-card">
            <DayTradesTable
              trades={mergedProps.trades}
              onOpenTradesList={mergedProps.onOpenTradesList || handleOpenTradesList}
            />

            <LinkedNotesTable
              notes={mergedProps.linkedNotes}
              onOpenNote={mergedProps.onOpenNote || handleOpenNote}
            />

            <AiAdviceBlock
              advice={mergedProps.advice}
              onGenerateAdvice={mergedProps.onGenerateAdvice || handleGenerateAdvice}
              onRegenerateAdvice={mergedProps.onRegenerateAdvice || handleRegenerateAdvice}
              onPinAdvice={mergedProps.onPinAdvice || handlePinAdvice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
