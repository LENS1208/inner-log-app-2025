import React, { useEffect, useMemo, useState } from "react";
import { getGridLineColor, getAccentColor, getLossColor, getWarningColor, getGreenColor } from "../../lib/chartColors";
import { Bar, Line, Scatter } from "react-chartjs-2";
import { useDataset } from "../../lib/dataset.context";
import { parseCsvText } from "../../lib/csv";
import type { Trade } from "../../lib/types";
import { filterTrades, getTradeProfit, getTradeTime, isValidCurrencyPair } from "../../lib/filterTrades";
import { supabase } from "../../lib/supabase";
import { HelpIcon } from "../../components/common/HelpIcon";
import Card from "../../components/common/Card";
import WeekdayBreakdownPanel from "../../components/WeekdayBreakdownPanel";
import TimeOfDayBreakdownPanel from "../../components/TimeOfDayBreakdownPanel";
import DailyProfitBreakdownPanel from "../../components/DailyProfitBreakdownPanel";
import MonthlyProfitBreakdownPanel from "../../components/MonthlyProfitBreakdownPanel";
import HoldingTimeBreakdownPanel from "../../components/HoldingTimeBreakdownPanel";
import WeeklyDetailDrawer from "../../components/reports/WeeklyDetailDrawer";

type DayOfWeek = "日" | "月" | "火" | "水" | "木" | "金" | "土";
type MetricType = "profit" | "winRate" | "pf" | "avgProfit";

const dayNames: DayOfWeek[] = ["日", "月", "火", "水", "木", "金", "土"];

type SegmentTab = "曜日" | "時間帯" | "週別" | "月別";

function SegmentDetailsTabs({
  dayOfWeekData,
  hourData,
  weeklyDataForTable,
  monthlyData,
  filteredTrades,
  onWeekdayClick,
  onTimeClick,
  onMonthlyClick
}: {
  dayOfWeekData: any[];
  hourData: any[];
  weeklyDataForTable: any[];
  monthlyData: any[];
  filteredTrades: any[];
  onWeekdayClick?: (weekdayLabel: string, trades: any[]) => void;
  onTimeClick?: (timeLabel: string, trades: any[]) => void;
  onMonthlyClick?: (monthLabel: string, trades: any[]) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<SegmentTab>("曜日");

  const tabs: SegmentTab[] = ["曜日", "時間帯", "週別", "月別"];

  const renderTable = () => {
    let data: any[] = [];
    let labelKey = "";
    let segmentLabel = "";

    switch (activeTab) {
      case "曜日":
        data = dayOfWeekData;
        labelKey = "day";
        segmentLabel = "曜日";
        break;
      case "時間帯":
        data = hourData;
        labelKey = "label";
        segmentLabel = "時間帯";
        break;
      case "週別":
        data = weeklyDataForTable;
        labelKey = "week";
        segmentLabel = "週";
        break;
      case "月別":
        data = monthlyData;
        labelKey = "month";
        segmentLabel = "月";
        break;
    }

    return (
      <div style={{ width: "100%", position: "relative" }}>
        <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", position: "relative", zIndex: 1 }}>
          <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", position: "relative" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)" }}>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 13, fontWeight: "bold", color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {segmentLabel}
                </th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 13, fontWeight: "bold", color: "var(--muted)", whiteSpace: "nowrap" }}>取引<br/>回数</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 13, fontWeight: "bold", color: "var(--muted)", whiteSpace: "nowrap" }}>平均損<br/>益</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 13, fontWeight: "bold", color: "var(--muted)", whiteSpace: "nowrap" }}>勝<br/>率</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>PF</th>
                <th style={{ padding: "10px 8px", textAlign: "right", fontSize: 13, fontWeight: "bold", color: "var(--muted)", whiteSpace: "nowrap" }}>合計損益</th>
              </tr>
            </thead>
          <tbody style={{ position: "relative", zIndex: 1 }}>
          {data.map((item, index) => {
            const label = activeTab === "曜日"
              ? `${item[labelKey]}曜日`
              : item[labelKey];

            const handleRowClick = () => {
                  console.log('=== ROW CLICK START ===');
                  console.log('Active tab:', activeTab);
                  console.log('Item label:', item[labelKey]);
                  console.log('onWeekdayClick exists:', !!onWeekdayClick);
                  console.log('onTimeClick exists:', !!onTimeClick);
                  console.log('onMonthlyClick exists:', !!onMonthlyClick);

                  if (activeTab === "曜日" && onWeekdayClick) {
                    const weekdayTrades = filteredTrades.filter((t: any) => {
                      const date = new Date(getTradeTime(t));
                      return dayNames[date.getDay()] === item[labelKey];
                    });
                    console.log('Calling onWeekdayClick with trades:', weekdayTrades.length);
                    onWeekdayClick(`${item[labelKey]}曜日`, weekdayTrades);
                    console.log('onWeekdayClick called successfully');
                  } else if (activeTab === "時間帯" && onTimeClick) {
                    const parts = item[labelKey].split("〜");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] === "00" ? 24 : parseInt(parts[1], 10);
                    const timeTrades = filteredTrades.filter((t: any) => {
                      const hour = new Date(getTradeTime(t)).getHours();
                      return hour >= start && hour < end;
                    });
                    console.log('Calling onTimeClick with trades:', timeTrades.length);
                    onTimeClick(item[labelKey], timeTrades);
                    console.log('onTimeClick called successfully');
                  } else if (activeTab === "月別" && onMonthlyClick) {
                    const monthTrades = filteredTrades.filter((t: any) => {
                      const date = new Date(getTradeTime(t));
                      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      return yearMonth === item[labelKey];
                    });
                    console.log('Calling onMonthlyClick with trades:', monthTrades.length);
                    onMonthlyClick(item[labelKey], monthTrades);
                    console.log('onMonthlyClick called successfully');
                  } else {
                    console.log('No matching handler found!');
                  }
                  console.log('=== ROW CLICK END ===');
            };

            return (
              <tr
                key={index}
                style={{
                  borderBottom: "1px solid var(--line)",
                  height: 44,
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 10
                }}
                onClick={handleRowClick}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--chip)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td
                  style={{ padding: "8px 8px", fontSize: 13, whiteSpace: "nowrap" }}
                  onClick={handleRowClick}
                >{label}</td>
                <td style={{ padding: "8px 8px", textAlign: "center", fontSize: 13, color: "var(--muted)" }} onClick={handleRowClick}>{item.count} <span style={{ fontSize: 11, color: "var(--muted)" }}>回</span></td>
                <td
                  style={{
                    padding: "8px 8px",
                    textAlign: "right",
                    fontSize: 13,
                    fontWeight: 700,
                    color: (item.avgProfit || 0) >= 0 ? "var(--gain)" : "var(--loss)",
                    whiteSpace: "nowrap"
                  }}
                  onClick={handleRowClick}
                >
                  {(item.avgProfit || 0) >= 0 ? '+' : ''}{Math.round(item.avgProfit || 0).toLocaleString("ja-JP")} <span style={{ fontSize: 11, color: (item.avgProfit || 0) >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
                </td>
                <td style={{ padding: "8px 8px", textAlign: "center", fontSize: 13, color: "var(--muted)" }} onClick={handleRowClick}>{(item.winRate || 0).toFixed(0)} <span style={{ fontSize: 11, color: "var(--muted)" }}>%</span></td>
                <td style={{ padding: "8px 8px", textAlign: "center", fontSize: 13, color: "var(--muted)" }} onClick={handleRowClick}>{(item.pf || 0).toFixed(2)}</td>
                <td
                  style={{
                    padding: "8px 8px",
                    textAlign: "right",
                    fontSize: 14,
                    fontWeight: 700,
                    color: item.profit >= 0 ? "var(--gain)" : "var(--loss)",
                    whiteSpace: "nowrap"
                  }}
                  onClick={handleRowClick}
                >
                  {item.profit >= 0 ? '+' : ''}{Math.round(item.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 12, color: item.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              console.log('Tab clicked:', tab);
              setActiveTab(tab);
            }}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "var(--accent)" : "var(--ink)",
              background: activeTab === tab ? "var(--chip)" : "transparent",
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
      {renderTable()}
    </div>
  );
}

export default function ReportsTimeAxis() {
  const { dataset, filters, useDatabase, isInitialized } = useDataset();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const metric: MetricType = "profit";

  // ドリルダウンパネルの状態管理
  const [weekdayPanel, setWeekdayPanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);
  const [timeOfDayPanel, setTimeOfDayPanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);
  const [dailyPanel, setDailyPanel] = useState<{ dateLabel: string; trades: any[] } | null>(null);
  const [monthlyPanel, setMonthlyPanel] = useState<{ monthLabel: string; trades: any[] } | null>(null);
  const [holdingTimePanel, setHoldingTimePanel] = useState<{ rangeLabel: string; trades: any[] } | null>(null);

  // 週別詳細Drawerの状態管理
  const [weeklyDrawer, setWeeklyDrawer] = useState<{
    startDate: string;
    endDate: string;
    weekIndex: number;
    year: number;
    month: number;
  } | null>(null);

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

  const filteredTrades = useMemo(() => {
    return filterTrades(trades, filters);
  }, [trades, filters]);

  const dayOfWeekData = useMemo(() => {
    const map = new Map<DayOfWeek, { profit: number; count: number; wins: number }>();
    filteredTrades.forEach((t) => {
      const date = new Date(getTradeTime(t));
      const dow = dayNames[date.getDay()];
      const profit = getTradeProfit(t);
      const current = map.get(dow) || { profit: 0, count: 0, wins: 0 };
      map.set(dow, {
        profit: current.profit + profit,
        count: current.count + 1,
        wins: current.wins + (profit > 0 ? 1 : 0),
      });
    });
    return dayNames.map((day) => {
      const data = map.get(day) || { profit: 0, count: 0, wins: 0 };
      const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
      const grossProfit = filteredTrades
        .filter((t) => dayNames[new Date(getTradeTime(t)).getDay()] === day && getTradeProfit(t) > 0)
        .reduce((sum, t) => sum + getTradeProfit(t), 0);
      const grossLoss = Math.abs(
        filteredTrades
          .filter((t) => dayNames[new Date(getTradeTime(t)).getDay()] === day && getTradeProfit(t) < 0)
          .reduce((sum, t) => sum + getTradeProfit(t), 0)
      );
      const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
      const avgProfit = data.count > 0 ? data.profit / data.count : 0;
      return { day, ...data, winRate, pf, avgProfit };
    });
  }, [filteredTrades]);

  const hourData = useMemo(() => {
    const ranges = [
      { label: "00〜02", start: 0, end: 2 },
      { label: "02〜04", start: 2, end: 4 },
      { label: "04〜06", start: 4, end: 6 },
      { label: "06〜08", start: 6, end: 8 },
      { label: "08〜10", start: 8, end: 10 },
      { label: "10〜12", start: 10, end: 12 },
      { label: "12〜14", start: 12, end: 14 },
      { label: "14〜16", start: 14, end: 16 },
      { label: "16〜18", start: 16, end: 18 },
      { label: "18〜20", start: 18, end: 20 },
      { label: "20〜22", start: 20, end: 22 },
      { label: "22〜00", start: 22, end: 24 },
    ];

    return ranges.map((range) => {
      const rangeTrades = filteredTrades.filter((t) => {
        const hour = new Date(getTradeTime(t)).getHours();
        return hour >= range.start && hour < range.end;
      });
      const profit = rangeTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
      const count = rangeTrades.length;
      const wins = rangeTrades.filter((t) => getTradeProfit(t) > 0).length;
      const winRate = count > 0 ? (wins / count) * 100 : 0;
      const grossProfit = rangeTrades.filter((t) => getTradeProfit(t) > 0).reduce((sum, t) => sum + getTradeProfit(t), 0);
      const grossLoss = Math.abs(rangeTrades.filter((t) => getTradeProfit(t) < 0).reduce((sum, t) => sum + getTradeProfit(t), 0));
      const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
      const avgProfit = count > 0 ? profit / count : 0;
      return { label: range.label, profit, count, wins, winRate, pf, avgProfit };
    });
  }, [filteredTrades]);

  const dailyData = useMemo(() => {
    const map = new Map<string, { profit: number; count: number; wins: number }>();
    filteredTrades.forEach((t) => {
      const date = getTradeTime(t).split(" ")[0];
      const profit = getTradeProfit(t);
      const current = map.get(date) || { profit: 0, count: 0, wins: 0 };
      map.set(date, {
        profit: current.profit + profit,
        count: current.count + 1,
        wins: current.wins + (profit > 0 ? 1 : 0),
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTrades]);

  const weeklyData = useMemo(() => {
    const map = new Map<string, { profit: number; count: number; wins: number }>();
    filteredTrades.forEach((t) => {
      const date = new Date(getTradeTime(t));
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      const profit = getTradeProfit(t);
      const current = map.get(weekKey) || { profit: 0, count: 0, wins: 0 };
      map.set(weekKey, {
        profit: current.profit + profit,
        count: current.count + 1,
        wins: current.wins + (profit > 0 ? 1 : 0)
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);
  }, [filteredTrades]);

  const weeklyDataForTable = useMemo(() => {
    const map = new Map<string, { profit: number; count: number; wins: number }>();
    filteredTrades.forEach((t) => {
      const date = new Date(getTradeTime(t));
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      const profit = getTradeProfit(t);
      const current = map.get(weekKey) || { profit: 0, count: 0, wins: 0 };
      map.set(weekKey, {
        profit: current.profit + profit,
        count: current.count + 1,
        wins: current.wins + (profit > 0 ? 1 : 0)
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, data]) => {
        const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
        const weekTrades = filteredTrades.filter(t => {
          const date = new Date(getTradeTime(t));
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split("T")[0] === week;
        });
        const grossProfit = weekTrades.filter(t => getTradeProfit(t) > 0).reduce((sum, t) => sum + getTradeProfit(t), 0);
        const grossLoss = Math.abs(weekTrades.filter(t => getTradeProfit(t) < 0).reduce((sum, t) => sum + getTradeProfit(t), 0));
        const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
        const avgProfit = data.count > 0 ? data.profit / data.count : 0;
        return { week, ...data, winRate, pf, avgProfit };
      });
  }, [filteredTrades]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { profit: number; count: number; wins: number }>();
    filteredTrades.forEach((t) => {
      const date = new Date(getTradeTime(t));
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const profit = getTradeProfit(t);
      const current = map.get(monthKey) || { profit: 0, count: 0, wins: 0 };
      map.set(monthKey, {
        profit: current.profit + profit,
        count: current.count + 1,
        wins: current.wins + (profit > 0 ? 1 : 0)
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => {
        const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
        const monthTrades = filteredTrades.filter(t => {
          const date = new Date(getTradeTime(t));
          const year = date.getFullYear();
          const m = date.getMonth() + 1;
          return `${year}-${String(m).padStart(2, '0')}` === month;
        });
        const grossProfit = monthTrades.filter(t => getTradeProfit(t) > 0).reduce((sum, t) => sum + getTradeProfit(t), 0);
        const grossLoss = Math.abs(monthTrades.filter(t => getTradeProfit(t) < 0).reduce((sum, t) => sum + getTradeProfit(t), 0));
        const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
        const avgProfit = data.count > 0 ? data.profit / data.count : 0;
        return { month, ...data, winRate, pf, avgProfit };
      });
  }, [filteredTrades]);

  const holdTimeDistribution = useMemo(() => {
    const ranges = [
      { label: "0〜10分", min: 0, max: 10 },
      { label: "10〜30分", min: 10, max: 30 },
      { label: "30〜60分", min: 30, max: 60 },
      { label: "1〜2h", min: 60, max: 120 },
      { label: "2〜6h", min: 120, max: 360 },
      { label: "6h+", min: 360, max: Infinity },
    ];
    return ranges.map((range) => {
      const count = filteredTrades.filter((t) => {
        const mins = t.holdTimeMin || 0;
        return mins >= range.min && mins < range.max;
      }).length;
      return { label: range.label, count };
    });
  }, [filteredTrades]);

  const scatterTimeProfit = useMemo(() => {
    return filteredTrades.map((t) => {
      const time = getTradeTime(t);
      const hour = new Date(time).getHours() + new Date(time).getMinutes() / 60;
      return { x: hour, y: getTradeProfit(t) };
    });
  }, [filteredTrades]);

  const scatterHoldTimeProfit = useMemo(() => {
    return filteredTrades.map((t) => ({
      x: t.holdTimeMin || 0,
      y: getTradeProfit(t),
    }));
  }, [filteredTrades]);

  const topDayOfWeek = useMemo(() => {
    const sorted = [...dayOfWeekData].sort((a, b) => b.profit - a.profit);
    return sorted[0] || { day: "-", profit: 0, winRate: 0, count: 0 };
  }, [dayOfWeekData]);

  const bottomDayOfWeek = useMemo(() => {
    const sorted = [...dayOfWeekData].sort((a, b) => a.profit - b.profit);
    return sorted[0] || { day: "-", profit: 0, winRate: 0, count: 0 };
  }, [dayOfWeekData]);

  const topHour = useMemo(() => {
    const sorted = [...hourData].sort((a, b) => b.profit - a.profit);
    return sorted[0] || { label: "-", profit: 0, winRate: 0, count: 0 };
  }, [hourData]);

  const bottomHour = useMemo(() => {
    const sorted = [...hourData].sort((a, b) => a.profit - b.profit);
    return sorted[0] || { label: "-", profit: 0, winRate: 0, count: 0 };
  }, [hourData]);

  const topDay = useMemo(() => {
    if (dailyData.length === 0) return { date: "-", profit: 0, winRate: 0, count: 0, wins: 0 };
    const best = dailyData.reduce((best, curr) => curr[1].profit > best[1].profit ? curr : best);
    return {
      date: best[0],
      profit: best[1].profit,
      winRate: best[1].count > 0 ? (best[1].wins / best[1].count) * 100 : 0,
      count: best[1].count,
      wins: best[1].wins
    };
  }, [dailyData]);

  const bottomDay = useMemo(() => {
    if (dailyData.length === 0) return { date: "-", profit: 0, winRate: 0, count: 0, wins: 0 };
    const worst = dailyData.reduce((worst, curr) => curr[1].profit < worst[1].profit ? curr : worst);
    return {
      date: worst[0],
      profit: worst[1].profit,
      winRate: worst[1].count > 0 ? (worst[1].wins / worst[1].count) * 100 : 0,
      count: worst[1].count,
      wins: worst[1].wins
    };
  }, [dailyData]);

  const getMetricValue = (item: any) => {
    switch (metric) {
      case "profit":
        return item.profit;
      case "winRate":
        return item.winRate;
      case "pf":
        return item.pf;
      case "avgProfit":
        return item.avgProfit;
      default:
        return item.profit;
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

  const formatDateJapanese = (dateString: string) => {
    if (dateString === "-") return "-";
    const parts = dateString.split("-");
    if (parts.length < 3) return dateString;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}月${day}日`;
  };

  const formatHoldTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}分`;
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
    }
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}日${hours}時間` : `${days}日`;
  };

  // 取引スタイル別統計
  const tradeStyleData = useMemo(() => {
    const styles = [
      { label: "スキャルピング", min: 0, max: 30 },
      { label: "デイトレード", min: 30, max: 480 },
      { label: "スイング", min: 480, max: 10080 },
      { label: "長期投資", min: 10080, max: Infinity },
    ];

    return styles.map((style) => {
      const styleTrades = filteredTrades.filter((t) => {
        const mins = t.holdTimeMin || 0;
        return mins >= style.min && mins < style.max;
      });

      const profit = styleTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
      const wins = styleTrades.filter((t) => getTradeProfit(t) > 0).length;
      const losses = styleTrades.filter((t) => getTradeProfit(t) < 0).length;
      const winRate = styleTrades.length > 0 ? (wins / styleTrades.length) * 100 : 0;
      const ev = styleTrades.length > 0 ? profit / styleTrades.length : 0;
      const avgHoldTime = styleTrades.length > 0
        ? styleTrades.reduce((sum, t) => sum + (t.holdTimeMin || 0), 0) / styleTrades.length
        : 0;

      return {
        label: style.label,
        count: styleTrades.length,
        profit,
        wins,
        losses,
        winRate,
        ev,
        avgHoldTime,
        trades: styleTrades,
      };
    });
  }, [filteredTrades]);

  // 保有時間統計
  const holdTimeStats = useMemo(() => {
    const winTrades = filteredTrades.filter((t) => getTradeProfit(t) > 0);
    const lossTrades = filteredTrades.filter((t) => getTradeProfit(t) < 0);

    const avgWinHoldTime = winTrades.length > 0
      ? winTrades.reduce((sum, t) => sum + (t.holdTimeMin || 0), 0) / winTrades.length
      : 0;

    const avgLossHoldTime = lossTrades.length > 0
      ? lossTrades.reduce((sum, t) => sum + (t.holdTimeMin || 0), 0) / lossTrades.length
      : 0;

    const maxHoldTime = filteredTrades.reduce((max, t) => Math.max(max, t.holdTimeMin || 0), 0);
    const minHoldTime = filteredTrades.reduce((min, t) => {
      const time = t.holdTimeMin || 0;
      return time > 0 ? Math.min(min, time) : min;
    }, Infinity);

    const maxLossHoldTime = lossTrades.reduce((max, t) => Math.max(max, t.holdTimeMin || 0), 0);
    const minLossHoldTime = lossTrades.reduce((min, t) => {
      const time = t.holdTimeMin || 0;
      return time > 0 ? Math.min(min, time) : min;
    }, Infinity);

    return {
      avgWinHoldTime,
      avgLossHoldTime,
      maxHoldTime,
      minHoldTime: minHoldTime === Infinity ? 0 : minHoldTime,
      maxLossHoldTime,
      minLossHoldTime: minLossHoldTime === Infinity ? 0 : minLossHoldTime,
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card title="勝ち取引平均保有時間" helpText="勝った取引のポジション平均保有時間">
          <div className="kpi-value" style={{ color: "var(--gain)" }}>
            {formatHoldTime(holdTimeStats.avgWinHoldTime)}
          </div>
        </Card>

        <Card title="負け取引平均保有時間" helpText="負けた取引のポジション平均保有時間">
          <div className="kpi-value" style={{ color: "var(--loss)" }}>
            {formatHoldTime(holdTimeStats.avgLossHoldTime)}
          </div>
        </Card>

        <Card title="最長保有時間" helpText="最も長くポジションを保有した取引の時間">
          <div className="kpi-value" style={{ color: "var(--accent)" }}>
            {formatHoldTime(holdTimeStats.maxHoldTime)}
          </div>
        </Card>

        <Card title="最短保有時間" helpText="最も短くポジションを保有した取引の時間">
          <div className="kpi-value" style={{ color: "var(--accent)" }}>
            {formatHoldTime(holdTimeStats.minHoldTime)}
          </div>
        </Card>
      </div>

      {/* これまでの推移 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          これまでの推移
        </h3>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card title="日別推移" helpText="日ごとの累積損益の推移グラフ">
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>ベスト</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: topDay.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {formatDateJapanese(topDay.date)}：{topDay.profit >= 0 ? '+' : ''}{Math.round(topDay.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: topDay.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                勝率 {topDay.winRate.toFixed(0)}% | 取引 {topDay.count}件
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>ワースト</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: bottomDay.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {formatDateJapanese(bottomDay.date)}：{bottomDay.profit >= 0 ? '+' : ''}{Math.round(bottomDay.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: bottomDay.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                勝率 {bottomDay.winRate.toFixed(0)}% | 取引 {bottomDay.count}件
              </div>
            </div>
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: dailyData.map(([date]) => date.substring(5)),
                datasets: [
                  {
                    data: dailyData.map(([_, d]) => d.profit),
                    backgroundColor: dailyData.map(([_, d]) =>
                      d.profit >= 0 ? getAccentColor() : getLossColor()
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
                    const [dateStr] = dailyData[index];
                    console.log('Daily chart clicked:', dateStr);

                    const dayTrades = filteredTrades.filter((t: any) => {
                      const tradeDate = new Date(getTradeTime(t)).toISOString().split('T')[0];
                      return tradeDate === dateStr;
                    });

                    console.log('Setting daily panel with trades:', dayTrades.length);
                    setDailyPanel({ dateLabel: dateStr, trades: dayTrades });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = context.parsed.y;
                        return `損益: ${(value as number).toLocaleString()}円`;
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
        </Card>
        <Card title="週別推移" helpText="週ごとの累積損益の推移グラフ（バーをクリックで詳細表示）">
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: weeklyData.map(([date]) => date.substring(5)),
                datasets: [
                  {
                    data: weeklyData.map(([_, d]) => d.profit),
                    backgroundColor: weeklyData.map(([_, d]) =>
                      d.profit >= 0 ? getAccentColor() : getLossColor()
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
                    const [startDate] = weeklyData[index];
                    const weekStart = new Date(startDate);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);

                    const year = weekStart.getFullYear();
                    const month = weekStart.getMonth() + 1;

                    const firstDayOfMonth = new Date(year, month - 1, 1);
                    const weekIndex = Math.floor((weekStart.getTime() - firstDayOfMonth.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

                    setWeeklyDrawer({
                      startDate: startDate,
                      endDate: weekEnd.toISOString().split('T')[0],
                      weekIndex,
                      year,
                      month,
                    });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        const dateStr = weeklyData[context[0].dataIndex][0];
                        const [year, month, day] = dateStr.split('-');
                        return `${year}年${parseInt(month)}月${parseInt(day)}日 週`;
                      },
                      label: (context) => {
                        const value = context.parsed.y;
                        return `損益: ${(value as number).toLocaleString()}円`;
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
        </Card>
        <Card title="日別勝率" helpText="日ごとの勝率の推移グラフ">
          <div style={{ height: 180 }}>
            <Line
              data={{
                labels: dailyData.map(([date]) => date.substring(5)),
                datasets: [
                  {
                    data: dailyData.map(([_, d]) => (d.count > 0 ? (d.wins / d.count) * 100 : 0)),
                    borderColor: getAccentColor(1),
                    backgroundColor: getAccentColor(0.1),
                    fill: true,
                    tension: 0.1,
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
                      label: (context) => {
                        const value = context.parsed.y;
                        return `勝率: ${value.toFixed(1)}%`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    min: 0,
                    max: 100,
                    ticks: { callback: (value) => `${value}%` },
                  },
                },
              }}
            />
          </div>
        </Card>
      </div>

      {/* あなたの傾向 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          あなたの傾向
        </h3>
      </div>
      <Card
        title="保有時間別の統計"
        helpText="ポジション保有時間の長さで分類した統計"
        annotation="スキャルピング(0〜30分) | デイトレード(30分〜8時間) | スイング(8時間〜7日) | 長期投資(7日以上)"
        style={{ marginBottom: 16 }}
      >

        <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: "1 1 400px", minWidth: 0, maxHeight: "60vh", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--line)" }}>
                  <th style={{ padding: 10, textAlign: "left", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>スタイル</th>
                  <th style={{ padding: 10, textAlign: "right", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>取引回数</th>
                  <th style={{ padding: 10, textAlign: "right", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>勝率</th>
                  <th style={{ padding: 10, textAlign: "right", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>平均損益(EV)</th>
                  <th style={{ padding: 10, textAlign: "right", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>平均保有時間</th>
                  <th style={{ padding: 10, textAlign: "right", fontSize: 13, fontWeight: "bold", color: "var(--muted)" }}>合計損益</th>
                </tr>
              </thead>
              <tbody>
                {tradeStyleData.map((style) => {
                  const handleStyleClick = () => {
                    console.log('Holding time style clicked:', style.label);
                    setHoldingTimePanel({ rangeLabel: style.label, trades: style.trades });
                  };

                  return (
                    <tr
                      key={style.label}
                      style={{
                        borderBottom: "1px solid var(--line)",
                        height: 44,
                        cursor: "pointer",
                      }}
                      onClick={handleStyleClick}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--chip)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: 10, fontSize: 13, fontWeight: 600 }}>{style.label}</td>
                      <td style={{ padding: 10, textAlign: "right", fontSize: 13 }}>{style.count}回</td>
                      <td style={{ padding: 10, textAlign: "right", fontSize: 13 }}>{style.winRate.toFixed(1)}%</td>
                      <td style={{ padding: 10, textAlign: "right", fontSize: 13, fontWeight: 700, color: style.ev >= 0 ? "var(--gain)" : "var(--loss)" }}>
                        {style.ev >= 0 ? '+' : ''}{Math.round(style.ev).toLocaleString()}円
                      </td>
                      <td style={{ padding: 10, textAlign: "right", fontSize: 13 }}>{formatHoldTime(style.avgHoldTime)}</td>
                      <td style={{ padding: 10, textAlign: "right", fontSize: 15, fontWeight: 700, color: style.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                        {style.profit >= 0 ? '+' : ''}{Math.round(style.profit).toLocaleString()} <span style={{ fontSize: 13, color: style.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ flex: "1 1 400px", minWidth: 0, height: 220 }}>
            <Bar
              data={{
                labels: tradeStyleData.map((s) => s.label),
                datasets: [
                  {
                    type: 'bar' as const,
                    label: '勝ち取引',
                    data: tradeStyleData.map((s) => s.wins),
                    backgroundColor: getAccentColor(),
                    yAxisID: 'y',
                    stack: 'stack1',
                    order: 2,
                  },
                  {
                    type: 'bar' as const,
                    label: '負け取引',
                    data: tradeStyleData.map((s) => s.losses),
                    backgroundColor: getLossColor(),
                    yAxisID: 'y',
                    stack: 'stack1',
                    order: 2,
                  },
                  {
                    type: 'line' as const,
                    label: '勝率(%)',
                    data: tradeStyleData.map((s) => s.winRate),
                    borderColor: getGreenColor(),
                    backgroundColor: getGreenColor(0.1),
                    yAxisID: 'y1',
                    tension: 0.1,
                    pointRadius: 5,
                    pointBackgroundColor: getGreenColor(),
                    order: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const index = elements[0].index;
                    const style = tradeStyleData[index];
                    console.log('Holding time chart clicked:', style.label);
                    setHoldingTimePanel({ rangeLabel: style.label, trades: style.trades });
                  }
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom' as const,
                  },
                },
                scales: {
                  y: {
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: '取引回数',
                    },
                    stacked: true,
                  },
                  y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    min: 0,
                    max: 100,
                    title: {
                      display: true,
                      text: '勝率(%)',
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                  x: {
                    stacked: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card title="曜日別" helpText="曜日ごとの損益を比較したグラフです。週間パターンを視覚的に把握できます。">
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>ベスト</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: topDayOfWeek.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {topDayOfWeek.day}曜日：{topDayOfWeek.profit >= 0 ? '+' : ''}{Math.round(topDayOfWeek.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: topDayOfWeek.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                勝率 {topDayOfWeek.winRate.toFixed(0)} <span style={{ fontSize: 11 }}>%</span> | 取引 {topDayOfWeek.count} <span style={{ fontSize: 11 }}>件</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>ワースト</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: bottomDayOfWeek.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {bottomDayOfWeek.day}曜日：{bottomDayOfWeek.profit >= 0 ? '+' : ''}{Math.round(bottomDayOfWeek.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: bottomDayOfWeek.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                勝率 {bottomDayOfWeek.winRate.toFixed(0)} <span style={{ fontSize: 11 }}>%</span> | 取引 {bottomDayOfWeek.count} <span style={{ fontSize: 11 }}>件</span>
              </div>
            </div>
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: dayOfWeekData.map((d) => d.day),
                datasets: [
                  {
                    data: dayOfWeekData.map(getMetricValue),
                    backgroundColor: dayOfWeekData.map((d) =>
                      d.profit >= 0 ? getAccentColor() : getLossColor()
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
                    const day = dayOfWeekData[index];
                    console.log('Weekday chart clicked:', day.day);

                    const weekdayTrades = filteredTrades.filter((t: any) => {
                      const date = new Date(getTradeTime(t));
                      return dayNames[date.getDay()] === day.day;
                    });

                    console.log('Setting weekday panel with trades:', weekdayTrades.length);
                    setWeekdayPanel({ rangeLabel: `${day.day}曜日`, trades: weekdayTrades });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = context.parsed.y;
                        const day = dayOfWeekData[context.dataIndex];
                        return [
                          `損益: ${formatValue(value, "profit")}`,
                          `勝率: ${day.winRate.toFixed(0)}%`,
                          `取引: ${day.count}件`
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
        </Card>
        <Card title="時間帯別" helpText="時間帯ごとの損益を比較したグラフです1日の中で有利な時間が分かります。">
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>ベスト</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: topHour.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {topHour.label}時：{topHour.profit >= 0 ? '+' : ''}{Math.round(topHour.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: topHour.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                勝率 {topHour.winRate.toFixed(0)}% | 取引 {topHour.count}件
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>ワースト</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: bottomHour.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {bottomHour.label}時：{bottomHour.profit >= 0 ? '+' : ''}{Math.round(bottomHour.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: bottomHour.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                勝率 {bottomHour.winRate.toFixed(0)}% | 取引 {bottomHour.count}件
              </div>
            </div>
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: hourData.map((h) => h.label),
                datasets: [
                  {
                    data: hourData.map(getMetricValue),
                    backgroundColor: hourData.map((h) => (h.profit >= 0 ? getAccentColor() : getLossColor())),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const index = elements[0].index;
                    const hour = hourData[index];
                    console.log('Time chart clicked:', hour.label);

                    const timeTrades = filteredTrades.filter((t: any) => {
                      const tradeHour = new Date(getTradeTime(t)).getHours();
                      return tradeHour === parseInt(hour.label, 10);
                    });

                    console.log('Setting time panel with trades:', timeTrades.length);
                    setTimeOfDayPanel({ rangeLabel: `${hour.label}時台`, trades: timeTrades });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = context.parsed.y;
                        const hour = hourData[context.dataIndex];
                        return [
                          `損益: ${formatValue(value, "profit")}`,
                          `勝率: ${hour.winRate.toFixed(0)}%`,
                          `取引: ${hour.count}件`
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
        </Card>
        <Card title="日別推移" helpText="日ごとの累積損益の推移グラフです。短期的な成績の変動を追跡できます。">
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>ベスト</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: topDay.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {formatDateJapanese(topDay.date)}：{topDay.profit >= 0 ? '+' : ''}{Math.round(topDay.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: topDay.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                勝率 {topDay.winRate.toFixed(0)}% | 取引 {topDay.count}件
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>ワースト</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: bottomDay.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {formatDateJapanese(bottomDay.date)}：{bottomDay.profit >= 0 ? '+' : ''}{Math.round(bottomDay.profit).toLocaleString("ja-JP")} <span style={{ fontSize: 13, color: bottomDay.profit >= 0 ? "var(--gain)" : "var(--loss)" }}>円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                勝率 {bottomDay.winRate.toFixed(0)}% | 取引 {bottomDay.count}件
              </div>
            </div>
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: dailyData.map(([date]) => date.substring(5)),
                datasets: [
                  {
                    data: dailyData.map(([_, d]) => d.profit),
                    backgroundColor: dailyData.map(([_, d]) =>
                      d.profit >= 0 ? getAccentColor() : getLossColor()
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
                    const [dateStr] = dailyData[index];
                    console.log('Daily chart 2 clicked:', dateStr);

                    const dayTrades = filteredTrades.filter((t: any) => {
                      const tradeDate = new Date(getTradeTime(t)).toISOString().split('T')[0];
                      return tradeDate === dateStr;
                    });

                    console.log('Setting daily panel with trades:', dayTrades.length);
                    setDailyPanel({ dateLabel: dateStr, trades: dayTrades });
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = context.parsed.y;
                        return `損益: ${(value as number).toLocaleString()}円`;
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
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card title="週別推移" helpText="週ごとの累積損益の推移グラフです。中期的なパフォーマンストレンドを確認できます。">
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: weeklyData.map(([date]) => date.substring(5)),
                datasets: [
                  {
                    data: weeklyData.map(([_, d]) => d.profit),
                    backgroundColor: weeklyData.map(([_, d]) =>
                      d.profit >= 0 ? getAccentColor() : getLossColor()
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
                        const dateStr = weeklyData[context[0].dataIndex][0];
                        const [year, month, day] = dateStr.split('-');
                        return `${year}年${parseInt(month)}月${parseInt(day)}日 週`;
                      },
                      label: (context) => {
                        const value = context.parsed.y;
                        return `損益: ${(value as number).toLocaleString()}円`;
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
        </Card>
        <Card title="保有時間分布" helpText="勝ち負け別のポジション保有時間を比較">
          <div style={{ height: 180 }}>
            <Bar
              data={{
                labels: holdTimeDistribution.map((h) => h.label),
                datasets: [
                  {
                    data: holdTimeDistribution.map((h) => h.count),
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
                      label: (context) => {
                        const value = context.parsed.y;
                        return `取引数: ${value}件`;
                      }
                    }
                  }
                },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              }}
            />
          </div>
        </Card>
      </div>

      {/* 改善ポイント */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          改善ポイント
        </h3>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card title="連敗ヒート（時間帯）" helpText="曜日×時間帯ごとの連敗発生頻度をヒートマップで表示">
          <LossStreakHeatmap trades={filteredTrades} />
        </Card>
        <Card title="散布図：時刻×損益" helpText="エントリー時刻と損益の関係を点で表したグラフ">
          <div style={{ height: 180 }}>
            <Scatter
              data={{
                datasets: [
                  {
                    data: scatterTimeProfit,
                    backgroundColor: scatterTimeProfit.map((p) =>
                      p.y >= 0 ? getAccentColor() : getLossColor()
                    ),
                    pointRadius: 4,
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
                      label: (context) => {
                        const point = context.raw as { x: number; y: number };
                        return [
                          `時刻: ${Math.floor(point.x)}時`,
                          `損益: ${point.y.toLocaleString()}円`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  x: { title: { display: true, text: "時刻" }, min: 0, max: 24 },
                  y: { title: { display: true, text: "損益" } },
                },
              }}
            />
          </div>
        </Card>
        <Card title="散布図：保有時間×損益" helpText="保有期間と損益の関係を点で表したグラフ">
          <div style={{ height: 180 }}>
            <Scatter
              data={{
                datasets: [
                  {
                    data: scatterHoldTimeProfit,
                    backgroundColor: scatterHoldTimeProfit.map((p) =>
                      p.y >= 0 ? getAccentColor() : getLossColor()
                    ),
                    pointRadius: 4,
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
                      label: (context) => {
                        const point = context.raw as { x: number; y: number };
                        return [
                          `保有時間: ${Math.round(point.x)}分`,
                          `損益: ${point.y.toLocaleString()}円`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  x: { title: { display: true, text: "保有時間（分）" } },
                  y: { title: { display: true, text: "損益" } },
                },
              }}
            />
          </div>
        </Card>
      </div>

      {/* 次のアクション */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          次のアクション
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            勝率が低い時間帯を避ける
          </div>
        </div>
        <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            得意な曜日に取引を集中
          </div>
        </div>
        <div style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            保有時間のバランスを見直す
          </div>
        </div>
      </div>

      {/* 参考情報 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          参考情報
        </h3>
      </div>

      <Card
        title="時間帯×銘柄 勝率分析"
        helpText="各時間帯における通貨ペアごとの勝率を分析"
        style={{ marginBottom: 16 }}
      >
        <TimeSymbolAnalysis trades={filteredTrades} />
      </Card>

      <Card title="セグメント別" helpText="全曜日・時間帯の詳細データテーブル">
        <SegmentDetailsTabs
          dayOfWeekData={dayOfWeekData}
          hourData={hourData}
          weeklyDataForTable={weeklyDataForTable}
          monthlyData={monthlyData}
          filteredTrades={filteredTrades}
          onWeekdayClick={(weekdayLabel, trades) => {
            console.log('Setting weekday panel:', weekdayLabel, trades.length);
            setWeekdayPanel({ rangeLabel: weekdayLabel, trades });
          }}
          onTimeClick={(timeLabel, trades) => {
            console.log('Setting time panel:', timeLabel, trades.length);
            setTimeOfDayPanel({ rangeLabel: timeLabel, trades });
          }}
          onMonthlyClick={(monthLabel, trades) => {
            console.log('Setting monthly panel:', monthLabel, trades.length);
            setMonthlyPanel({ monthLabel, trades });
          }}
        />
      </Card>

      {/* ドリルダウンパネル */}
      {weekdayPanel && (
        <>
          {console.log('Rendering WeekdayBreakdownPanel')}
          <WeekdayBreakdownPanel
            trades={weekdayPanel.trades}
            rangeLabel={weekdayPanel.rangeLabel}
            onClose={() => setWeekdayPanel(null)}
          />
        </>
      )}

      {timeOfDayPanel && (
        <>
          {console.log('Rendering TimeOfDayBreakdownPanel')}
          <TimeOfDayBreakdownPanel
            trades={timeOfDayPanel.trades}
            rangeLabel={timeOfDayPanel.rangeLabel}
            onClose={() => setTimeOfDayPanel(null)}
          />
        </>
      )}

      {dailyPanel && (
        <>
          {console.log('Rendering DailyProfitBreakdownPanel')}
          <DailyProfitBreakdownPanel
            trades={dailyPanel.trades}
            dateLabel={dailyPanel.dateLabel}
            onClose={() => setDailyPanel(null)}
          />
        </>
      )}

      {monthlyPanel && (
        <>
          {console.log('Rendering MonthlyProfitBreakdownPanel')}
          <MonthlyProfitBreakdownPanel
            trades={monthlyPanel.trades}
            monthLabel={monthlyPanel.monthLabel}
            onClose={() => setMonthlyPanel(null)}
          />
        </>
      )}

      {holdingTimePanel && (
        <>
          {console.log('Rendering HoldingTimeBreakdownPanel')}
          <HoldingTimeBreakdownPanel
            trades={holdingTimePanel.trades}
            rangeLabel={holdingTimePanel.rangeLabel}
            onClose={() => setHoldingTimePanel(null)}
          />
        </>
      )}

      <WeeklyDetailDrawer
        isOpen={!!weeklyDrawer}
        onClose={() => setWeeklyDrawer(null)}
        weekData={weeklyDrawer}
        trades={filteredTrades}
      />
    </div>
  );
}

function TimeSymbolAnalysis({ trades }: { trades: Trade[] }) {
  const timeRanges = [
    { label: "アジア朝(06〜10)", start: 6, end: 10 },
    { label: "アジア昼(10〜14)", start: 10, end: 14 },
    { label: "欧州前場(14〜18)", start: 14, end: 18 },
    { label: "欧州後場(18〜22)", start: 18, end: 22 },
    { label: "NY前場(22〜02)", start: 22, end: 26 },
    { label: "NY後場(02〜06)", start: 2, end: 6 },
  ];

  const analysisData = useMemo(() => {
    const symbolSet = new Set<string>();
    trades.forEach((t) => {
      if (isValidCurrencyPair(t.pair)) {
        symbolSet.add(t.pair);
      }
    });
    const symbols = Array.from(symbolSet).sort();

    const data = timeRanges.map((range) => {
      const symbolData: Record<string, { wins: number; total: number; profit: number }> = {};

      symbols.forEach((symbol) => {
        symbolData[symbol] = { wins: 0, total: 0, profit: 0 };
      });

      trades.forEach((t) => {
        const date = new Date(getTradeTime(t));
        let hour = date.getHours();
        if (range.start === 22 && hour >= 0 && hour < 6) {
          hour += 24;
        }

        if (
          (range.start < range.end && hour >= range.start && hour < range.end) ||
          (range.start > range.end && (hour >= range.start || hour < range.end)) ||
          (range.start === 22 && hour >= 22 && hour < 26)
        ) {
          const profit = getTradeProfit(t);
          if (symbolData[t.pair]) {
            symbolData[t.pair].total++;
            symbolData[t.pair].profit += profit;
            if (profit > 0) symbolData[t.pair].wins++;
          }
        }
      });

      return { range: range.label, symbolData };
    });

    return { data, symbols };
  }, [trades]);

  const getCellBackgroundColor = (winRate: number) => {
    const t = winRate / 100;
    const lightBlue = { r: 173, g: 216, b: 230 };
    const midBlue = { r: 0, g: 132, b: 199 };
    const darkBlue = { r: 0, g: 86, b: 130 };

    let r: number, g: number, b: number;

    if (t <= 0.5) {
      const localT = t * 2;
      r = Math.round(lightBlue.r + (midBlue.r - lightBlue.r) * localT);
      g = Math.round(lightBlue.g + (midBlue.g - lightBlue.g) * localT);
      b = Math.round(lightBlue.b + (midBlue.b - midBlue.b) * localT);
    } else {
      const localT = (t - 0.5) * 2;
      r = Math.round(midBlue.r + (darkBlue.r - midBlue.r) * localT);
      g = Math.round(midBlue.g + (darkBlue.g - midBlue.g) * localT);
      b = Math.round(midBlue.b + (darkBlue.b - midBlue.b) * localT);
    }

    return `rgb(${r}, ${g}, ${b})`;
  };

  if (trades.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
        データがありません
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead>
          <tr>
            <th style={{ padding: 7, textAlign: "left", fontSize: 13, fontWeight: "bold", color: "var(--muted)", position: "sticky", left: 0, background: "var(--bg)", zIndex: 2 }}>
              通貨ペア
            </th>
            {analysisData.data.map((item) => (
              <th key={item.range} style={{ padding: 7, textAlign: "center", fontSize: 13, fontWeight: "bold", color: "var(--muted)", minWidth: 100 }}>
                {item.range}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {analysisData.symbols.map((symbol) => (
            <tr key={symbol}>
              <td style={{ padding: 7, fontSize: 13, fontWeight: 600, position: "sticky", left: 0, background: "var(--bg)", zIndex: 1, color: "var(--fg)" }}>
                {symbol}
              </td>
              {analysisData.data.map((item) => {
                const data = item.symbolData[symbol];
                const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
                const hasData = data.total > 0;

                return (
                  <td
                    key={item.range}
                    style={{
                      padding: 6,
                      textAlign: "center",
                      fontSize: 12,
                      background: hasData ? getCellBackgroundColor(winRate) : "var(--chip)",
                      cursor: "default",
                      position: "relative",
                      height: 20,
                    }}
                    onMouseEnter={(e) => {
                      if (hasData) {
                        const tooltip = document.createElement('div');
                        tooltip.id = 'cell-tooltip';
                        tooltip.style.cssText = `
                          position: fixed;
                          background: var(--bg);
                          border: 1px solid var(--line);
                          padding: 8px 12px;
                          border-radius: 6px;
                          font-size: 12px;
                          z-index: 1000;
                          pointer-events: none;
                          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        `;
                        tooltip.innerHTML = `
                          <div style="font-weight: 600; margin-bottom: 4px;">${symbol} ${item.range}</div>
                          <div>${data.wins}勝 ${data.total - data.wins}敗 (${data.total}戦)</div>
                          <div style="color: ${data.profit >= 0 ? 'var(--gain)' : 'var(--loss)'}">損益: ${data.profit >= 0 ? '+' : ''}${Math.round(data.profit).toLocaleString()}円</div>
                        `;
                        document.body.appendChild(tooltip);

                        const rect = e.currentTarget.getBoundingClientRect();
                        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
                      }
                    }}
                    onMouseLeave={() => {
                      const tooltip = document.getElementById('cell-tooltip');
                      if (tooltip) tooltip.remove();
                    }}
                  >
                    {hasData ? (
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#ffffff",
                        }}
                      >
                        {winRate.toFixed(0)}%
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "var(--muted)", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 16, height: 16, background: "rgb(0, 86, 130)", borderRadius: 2 }}></div>
          <span>優秀 (75%以上)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 16, height: 16, background: "rgb(0, 132, 199)", borderRadius: 2 }}></div>
          <span>良好 (50-74%)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 16, height: 16, background: "rgb(87, 174, 215)", borderRadius: 2 }}></div>
          <span>普通 (25-49%)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 16, height: 16, background: "rgb(173, 216, 230)", borderRadius: 2 }}></div>
          <span>要改善 (25%未満)</span>
        </div>
      </div>
    </div>
  );
}

function LossStreakHeatmap({ trades }: { trades: Trade[] }) {
  const heatmapData = useMemo(() => {
    if (trades.length === 0) return [];

    const hourBuckets: Map<number, number[]> = new Map();
    for (let h = 0; h < 24; h++) {
      hourBuckets.set(h, []);
    }

    const sortedTrades = [...trades].sort((a, b) => {
      const timeA = new Date(getTradeTime(a)).getTime();
      const timeB = new Date(getTradeTime(b)).getTime();
      return timeA - timeB;
    });

    let currentStreak = 0;
    sortedTrades.forEach((trade) => {
      const profit = getTradeProfit(trade);
      const time = getTradeTime(trade);
      const date = new Date(time);
      const hour = date.getHours();

      if (profit < 0) {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          hourBuckets.get(hour)?.push(currentStreak);
        }
        currentStreak = 0;
      }
    });

    const result = [];
    for (let h = 0; h < 24; h++) {
      const streaks = hourBuckets.get(h) || [];
      const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;
      const avgStreak = streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;
      result.push({ hour: h, maxStreak, avgStreak, count: streaks.length });
    }

    return result;
  }, [trades]);

  const maxValue = Math.max(...heatmapData.map((d) => d.maxStreak), 1);

  const getColor = (value: number) => {
    if (value === 0) return "rgba(200, 200, 200, 0.2)";
    const intensity = Math.min(value / maxValue, 1);
    return `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;
  };

  if (trades.length === 0) {
    return (
      <div
        style={{
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: 12,
        }}
      >
        データがありません
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 4,
          marginBottom: 8,
        }}
      >
        {heatmapData.map((item) => (
          <div
            key={item.hour}
            style={{
              background: getColor(item.maxStreak),
              border: "1px solid var(--line)",
              borderRadius: 4,
              padding: "8px 4px",
              textAlign: "center",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title={`${item.hour}時: 最大連敗${item.maxStreak}回, 平均${item.avgStreak.toFixed(1)}回 (${item.count}回発生)`}
          >
            <div style={{ fontWeight: "bold", marginBottom: 2 }}>{item.hour}時</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>
              {item.maxStreak > 0 ? `${item.maxStreak}連敗` : "-"}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)" }}>
        <span>色の濃さ = 連敗の深刻度</span>
        <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
          <div style={{ width: 12, height: 12, background: "rgba(200, 200, 200, 0.2)", border: "1px solid var(--line)" }}></div>
          <span style={{ fontSize: 10 }}>なし</span>
          <div style={{ width: 12, height: 12, background: "rgba(239, 68, 68, 0.4)", border: "1px solid var(--line)", marginLeft: 4 }}></div>
          <span style={{ fontSize: 10 }}>中</span>
          <div style={{ width: 12, height: 12, background: getLossColor(), border: "1px solid var(--line)", marginLeft: 4 }}></div>
          <span style={{ fontSize: 10 }}>高</span>
        </div>
      </div>
    </div>
  );
}
