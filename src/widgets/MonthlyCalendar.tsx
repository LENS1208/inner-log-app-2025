import React, { useEffect, useMemo, useState } from "react";
import { getGridLineColor, getAccentColor, getLossColor } from "../lib/chartColors";
import type { Trade } from "../lib/types";
import { parseCsvText } from "../lib/csv";
import { useDataset } from "../lib/dataset.context";
import { UI_TEXT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import InsightsSection from "../components/calendar/InsightsSection";
import { HelpIcon } from "../components/common/HelpIcon";
import { filterTrades } from "../lib/filterTrades";
import { MonthlyReviewService, type MonthlyReviewData } from '../services/monthlyReview.service';
import { MonthlyReviewDrawer } from '../components/monthly-review/MonthlyReviewDrawer';
import { useCoachAvatar } from '../lib/coachAvatar.context';
import { showToast } from '../lib/toast';

type DayData = {
  date: string;
  dayOfMonth: number;
  profitYen: number;
  tradeCount: number;
  isCurrentMonth: boolean;
};

type WeekSummary = {
  weekNum: number;
  profitYen: number;
};

function loadData(ds: "A" | "B" | "C"): Promise<Trade[]> {
  if (ds === "A" || ds === "B" || ds === "C") {
    const cacheBuster = `?t=${Date.now()}`;
    return fetch(`/demo/${ds}.csv${cacheBuster}`)
      .then((r) => r.text())
      .then((text) => parseCsvText(text));
  }
  return Promise.resolve([]);
}

function getWeekNumber(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();
  return Math.ceil((dayOfMonth + dayOfWeek) / 7);
}

function normalizeDate(dateStr: string): string {
  // "2025.09.18 08:06:00" or "2025-09-18" => "2025-09-18"
  const normalized = dateStr.replace(/\./g, "-").trim();
  const datePart = normalized.split(" ")[0]; // Remove time part if exists
  return datePart;
}

function formatDateLocal(year: number, month: number, day: number): string {
  // month is 0-based (0=January, 8=September)
  // Convert to 1-based for display: month=8 => "09"
  const y = String(year);
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateSafe(dateStr: string): Date {
  const normalized = dateStr.replace(/\./g, "-").trim();
  const parts = normalized.split(" ");
  const datePart = parts[0];
  const timePart = parts[1] || "00:00:00";

  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr, secondStr] = timePart.split(":");

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10) || 0;
  const minute = parseInt(minuteStr, 10) || 0;
  const second = parseInt(secondStr, 10) || 0;

  return new Date(year, month, day, hour, minute, second);
}

export default function MonthlyCalendar() {
  const { dataset, useDatabase, uiFilters } = useDataset();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState<MonthlyReviewData | null>(null);
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false);
  const [generatingReview, setGeneratingReview] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { coachAvatarPreset } = useCoachAvatar();

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true);
      try {
        if (useDatabase) {
          const { getAllTrades } = await import('../lib/db.service');
          const data = await getAllTrades(dataset);

          const mappedTrades: Trade[] = (data || []).map((t: any) => {
            // Convert UTC to JST (UTC+9)
            const closeTimeUTC = new Date(t.close_time);
            const openTimeUTC = new Date(t.open_time);
            const closeTimeJST = new Date(closeTimeUTC.getTime() + (9 * 60 * 60 * 1000));
            const openTimeJST = new Date(openTimeUTC.getTime() + (9 * 60 * 60 * 1000));

            return {
              id: t.id || t.ticket,
              datetime: closeTimeJST.toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, '.'),
              ticket: t.ticket,
              item: t.item,
              pair: t.item,
              side: t.side,
              volume: t.size || 0,
              size: t.size,
              openTime: openTimeJST.toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, '.'),
              openPrice: t.open_price,
              closeTime: closeTimeJST.toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, '.'),
              closePrice: t.close_price,
              commission: t.commission,
              swap: t.swap,
              profitYen: t.profit,
              sl: t.sl,
              tp: t.tp,
              pips: t.pips,
              setup: t.setup,
            };
          });
            setTrades(mappedTrades);

            if (mappedTrades.length > 0) {
              const latestTrade = mappedTrades.reduce((latest, trade) => {
                const tradeDate = parseDateSafe(trade.datetime);
                const latestDate = parseDateSafe(latest.datetime);
                return tradeDate > latestDate ? trade : latest;
              });
              const latestDate = parseDateSafe(latestTrade.datetime);
              setCurrentDate(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
            }
        } else {
          const data = await loadData(dataset);
          setTrades(data);

          if (data.length > 0) {
            const latestTrade = data.reduce((latest, trade) => {
              const tradeDate = parseDateSafe(trade.datetime);
              const latestDate = parseDateSafe(latest.datetime);
              return tradeDate > latestDate ? trade : latest;
            });
            const latestDate = parseDateSafe(latestTrade.datetime);
            setCurrentDate(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
          }
        }
      } catch (e) {
        console.error('Exception loading trades:', e);
        setTrades([]);
      } finally {
        setLoading(false);
      }
    };
    loadTrades();
  }, [dataset, useDatabase]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const filteredTrades = useMemo(() => {
    return filterTrades(trades, uiFilters);
  }, [trades, uiFilters]);

  const totalTradesInMonth = useMemo(() => {
    return filteredTrades.filter((t) => {
      const tradeDate = parseDateSafe(t.datetime);
      return !isNaN(tradeDate.getTime()) && tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
    }).length;
  }, [filteredTrades, year, month]);

  const { calendarDays, weekSummaries, monthTotal } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const prevMonthLastDay = new Date(year, month, 0);
    const daysInPrevMonth = prevMonthLastDay.getDate();

    const days: DayData[] = [];

    // Adjust for Monday start (0=Sun, 1=Mon, ..., 6=Sat)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    for (let i = adjustedStartDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        date: formatDateLocal(year, month - 1, day),
        dayOfMonth: day,
        profitYen: 0,
        tradeCount: 0,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateLocal(year, month, day);

      const dayTrades = filteredTrades.filter((t) => {
        const tradeDateStr = normalizeDate(t.datetime);
        return tradeDateStr === dateStr;
      });
      const profitYen = dayTrades.reduce((sum, t) => sum + t.profitYen, 0);

      const dayData = {
        date: dateStr,
        dayOfMonth: day,
        profitYen,
        tradeCount: dayTrades.length,
        isCurrentMonth: true,
      };

      if (dayTrades.length > 0) {
        console.log(`Day ${day}: date=${dateStr}, trades=${dayTrades.length}`);
      }

      days.push(dayData);
    }

    const remainingCells = 35 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        date: formatDateLocal(year, month + 1, day),
        dayOfMonth: day,
        profitYen: 0,
        tradeCount: 0,
        isCurrentMonth: false,
      });
    }

    const weeks = new Map<number, number>();
    filteredTrades.forEach((t) => {
      const tradeDate = parseDateSafe(t.datetime);
      if (!isNaN(tradeDate.getTime()) && tradeDate.getFullYear() === year && tradeDate.getMonth() === month) {
        const weekNum = getWeekNumber(tradeDate);
        weeks.set(weekNum, (weeks.get(weekNum) || 0) + t.profitYen);
      }
    });

    const weekSummaries: WeekSummary[] = [];
    let monthTotal = 0;
    for (let i = 1; i <= 5; i++) {
      const profit = weeks.get(i) || 0;
      monthTotal += profit;
      weekSummaries.push({
        weekNum: i,
        profitYen: profit,
      });
    }

    return { calendarDays: days, weekSummaries, monthTotal };
  }, [filteredTrades, year, month]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToThisMonth = () => {
    setCurrentDate(new Date());
  };

  const handleGenerateReview = async () => {
    if (!userId) {
      showToast('ユーザーが認証されていません', 'error');
      return;
    }

    if (monthlyStats.totalTrades === 0) {
      showToast('この月にトレードデータがありません', 'error');
      return;
    }

    setGeneratingReview(true);
    try {
      const monthString = `${year}-${String(month + 1).padStart(2, '0')}`;
      console.log('📅 Generating review for month:', monthString);
      console.log('🤖 Coach avatar:', coachAvatarPreset);

      const review = await MonthlyReviewService.generateMonthlyReview(
        userId,
        monthString,
        coachAvatarPreset as 'teacher' | 'beginner' | 'strategist'
      );

      console.log('✅ Generated review:', review);
      setReviewData(review);
      setIsReviewDrawerOpen(true);
      showToast('月次レビューを生成しました', 'success');
    } catch (error) {
      console.error('❌ Error generating review:', error);
      showToast('レビューの生成に失敗しました', 'error');
    } finally {
      setGeneratingReview(false);
    }
  };

  const monthName = currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  const monthlyStats = useMemo(() => {
    const monthFilteredTrades = filteredTrades.filter((t) => {
      const tradeDate = parseDateSafe(t.datetime);
      return !isNaN(tradeDate.getTime()) && tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
    });

    const totalTrades = monthFilteredTrades.length;
    const winTrades = monthFilteredTrades.filter(t => t.profitYen > 0).length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    const totalProfit = monthFilteredTrades.reduce((sum, t) => sum + (t.profitYen > 0 ? t.profitYen : 0), 0);
    const totalLoss = Math.abs(monthFilteredTrades.reduce((sum, t) => sum + (t.profitYen < 0 ? t.profitYen : 0), 0));
    const pf = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    const avgProfit = totalTrades > 0 ? monthTotal / totalTrades : 0;

    let maxDD = 0;
    let peak = 0;
    let cumulative = 0;
    monthFilteredTrades
      .sort((a, b) => parseDateSafe(a.datetime).getTime() - parseDateSafe(b.datetime).getTime())
      .forEach(t => {
        cumulative += t.profitYen;
        if (cumulative > peak) {
          peak = cumulative;
        }
        const dd = peak - cumulative;
        if (dd > maxDD) {
          maxDD = dd;
        }
      });

    return {
      totalTrades,
      winRate,
      pf,
      avgProfit,
      maxDD,
      totalProfit,
      totalLoss
    };
  }, [filteredTrades, year, month, monthTotal]);

  const insightsData = useMemo(() => {
    const monthFilteredTrades = filteredTrades.filter((t) => {
      const tradeDate = parseDateSafe(t.datetime);
      return !isNaN(tradeDate.getTime()) && tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
    });

    const weeklySummary = weekSummaries.map((ws) => ({
      name: `${ws.weekNum}週目`,
      pnl: ws.profitYen,
    }));

    const weekdayNames = ["月", "火", "水", "木", "金", "土", "日"];
    const weekdayMap = new Map<number, number>();
    monthFilteredTrades.forEach((t) => {
      const tradeDate = parseDateSafe(t.datetime);
      const dow = tradeDate.getDay();
      const adjustedDow = dow === 0 ? 6 : dow - 1;
      weekdayMap.set(adjustedDow, (weekdayMap.get(adjustedDow) || 0) + t.profitYen);
    });
    const weekdayPerformance = weekdayNames.map((name, i) => ({
      name,
      pnl: weekdayMap.get(i) || 0,
    }));

    const hourlyMap = new Map<number, number>();
    monthFilteredTrades.forEach((t) => {
      const tradeDate = parseDateSafe(t.datetime);
      const hour = tradeDate.getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + t.profitYen);
    });
    const hourlyPerformance = Array.from({ length: 24 }, (_, i) => ({
      name: `${i}:00`,
      pnl: hourlyMap.get(i) || 0,
    }));

    const durationRanges = [
      { name: "0-15m", min: 0, max: 15 },
      { name: "15-30m", min: 15, max: 30 },
      { name: "30-60m", min: 30, max: 60 },
      { name: "60-120m", min: 60, max: 120 },
      { name: ">120m", min: 120, max: Infinity },
    ];
    const durationPerformance = durationRanges.map((range) => {
      const rangeSum = monthFilteredTrades
        .filter((t) => {
          const openTime = parseDateSafe(t.openTime || t.datetime);
          const closeTime = parseDateSafe(t.datetime);
          const mins = (closeTime.getTime() - openTime.getTime()) / (1000 * 60);
          return mins >= range.min && mins < range.max;
        })
        .reduce((sum, t) => sum + t.profitYen, 0);
      return { name: range.name, pnl: rangeSum };
    });

    const weekendTrades = monthFilteredTrades
      .filter((t) => {
        const openTime = parseDateSafe(t.openTime || t.datetime);
        const closeTime = parseDateSafe(t.datetime);

        const openDow = openTime.getDay();
        const closeDow = closeTime.getDay();

        if (closeDow === 0 || closeDow === 6) return false;

        let currentDate = new Date(openTime);
        let crossedWeekend = false;

        while (currentDate < closeTime) {
          const dow = currentDate.getDay();
          if (dow === 6 || dow === 0) {
            crossedWeekend = true;
            break;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        return crossedWeekend;
      })
      .slice(0, 50)
      .map((t) => ({
        id: t.ticket,
        symbol: t.item || t.pair || t.symbol || 'N/A',
        side: (t.side?.toLowerCase() === "buy" || t.side?.toLowerCase() === "long" ? "long" : "short") as "long" | "short",
        entry: t.openTime || t.datetime,
        exit: t.datetime,
        pnl: t.profitYen,
      }));

    const overnightTrades = monthFilteredTrades
      .filter((t) => {
        const openTime = parseDateSafe(t.openTime || t.datetime);
        const closeTime = parseDateSafe(t.datetime);
        return openTime.toDateString() !== closeTime.toDateString();
      })
      .slice(0, 50)
      .map((t) => ({
        id: t.ticket,
        symbol: t.item || t.pair || t.symbol || 'N/A',
        side: (t.side?.toLowerCase() === "buy" || t.side?.toLowerCase() === "long" ? "long" : "short") as "long" | "short",
        entry: t.openTime || t.datetime,
        exit: t.datetime,
        pnl: t.profitYen,
      }));

    const dayProfits = new Map<string, number>();
    monthFilteredTrades.forEach((t) => {
      const dateStr = normalizeDate(t.datetime);
      dayProfits.set(dateStr, (dayProfits.get(dateStr) || 0) + t.profitYen);
    });
    const sortedDays = Array.from(dayProfits.entries()).sort((a, b) => b[1] - a[1]);
    const bestDay = sortedDays.length > 0 ? { date: sortedDays[0][0], pnl: sortedDays[0][1] } : null;
    const worstDay = sortedDays.length > 0 ? { date: sortedDays[sortedDays.length - 1][0], pnl: sortedDays[sortedDays.length - 1][1] } : null;
    const maxDailyDD = worstDay ? worstDay.pnl : null;

    const symbolMap = new Map<string, { pnl: number; count: number; wins: number; totalProfit: number; totalLoss: number }>();
    monthFilteredTrades.forEach((t) => {
      const symbol = t.item || t.pair || t.symbol || 'N/A';
      if (symbol && symbol !== 'N/A') {
        const current = symbolMap.get(symbol) || { pnl: 0, count: 0, wins: 0, totalProfit: 0, totalLoss: 0 };
        symbolMap.set(symbol, {
          pnl: current.pnl + t.profitYen,
          count: current.count + 1,
          wins: current.wins + (t.profitYen > 0 ? 1 : 0),
          totalProfit: current.totalProfit + (t.profitYen > 0 ? t.profitYen : 0),
          totalLoss: current.totalLoss + (t.profitYen < 0 ? Math.abs(t.profitYen) : 0)
        });
      }
    });
    const allSymbols = Array.from(symbolMap.entries())
      .map(([symbol, data]) => {
        const avgPnl = data.count > 0 ? data.pnl / data.count : 0;
        const pf = data.totalLoss > 0 ? data.totalProfit / data.totalLoss : (data.totalProfit > 0 ? Infinity : 0);
        return {
          symbol,
          pnl: data.pnl,
          count: data.count,
          winrate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
          avgPnl,
          pf
        };
      })
      .sort((a, b) => b.pnl - a.pnl);

    const setupMap = new Map<string, { pnl: number; count: number; wins: number }>();
    monthFilteredTrades.forEach((t) => {
      const setup = t.setup || 'その他';
      if (setup && setup !== 'その他') {
        const current = setupMap.get(setup) || { pnl: 0, count: 0, wins: 0 };
        setupMap.set(setup, {
          pnl: current.pnl + t.profitYen,
          count: current.count + 1,
          wins: current.wins + (t.profitYen > 0 ? 1 : 0)
        });
      }
    });
    const topTags = Array.from(setupMap.entries())
      .map(([tag, data]) => ({
        tag,
        pnl: data.pnl,
        winrate: data.count > 0 ? data.wins / data.count : 0
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    const expectationWeekdayMap = new Map<string, { pnl: number; count: number; wins: number; totalProfit: number; totalLoss: number }>();
    const expectationWeekdayNames: { [key: number]: string } = {
      0: '日曜日',
      1: '月曜日',
      2: '火曜日',
      3: '水曜日',
      4: '木曜日',
      5: '金曜日',
      6: '土曜日'
    };
    monthFilteredTrades.forEach((t) => {
      const date = new Date(t.datetime);
      const dayOfWeek = expectationWeekdayNames[date.getDay()];
      const current = expectationWeekdayMap.get(dayOfWeek) || { pnl: 0, count: 0, wins: 0, totalProfit: 0, totalLoss: 0 };
      expectationWeekdayMap.set(dayOfWeek, {
        pnl: current.pnl + t.profitYen,
        count: current.count + 1,
        wins: current.wins + (t.profitYen > 0 ? 1 : 0),
        totalProfit: current.totalProfit + (t.profitYen > 0 ? t.profitYen : 0),
        totalLoss: current.totalLoss + (t.profitYen < 0 ? Math.abs(t.profitYen) : 0)
      });
    });

    const durationMap = new Map<string, { pnl: number; count: number; wins: number; totalProfit: number; totalLoss: number }>();
    monthFilteredTrades.forEach((t) => {
      if (t.holdingMinutes !== undefined && t.holdingMinutes !== null) {
        let bucket = '';
        if (t.holdingMinutes < 30) bucket = '30分未満';
        else if (t.holdingMinutes < 60) bucket = '30〜60分';
        else if (t.holdingMinutes < 120) bucket = '1〜2時間';
        else if (t.holdingMinutes < 240) bucket = '2〜4時間';
        else bucket = '4時間以上';

        const current = durationMap.get(bucket) || { pnl: 0, count: 0, wins: 0, totalProfit: 0, totalLoss: 0 };
        durationMap.set(bucket, {
          pnl: current.pnl + t.profitYen,
          count: current.count + 1,
          wins: current.wins + (t.profitYen > 0 ? 1 : 0),
          totalProfit: current.totalProfit + (t.profitYen > 0 ? t.profitYen : 0),
          totalLoss: current.totalLoss + (t.profitYen < 0 ? Math.abs(t.profitYen) : 0)
        });
      }
    });

    const expectationRows = Array.from(expectationWeekdayMap.entries()).map(([label, data]) => ({
      label: label,
      count: data.count,
      avgPnl: data.count > 0 ? data.pnl / data.count : 0,
      winrate: data.count > 0 ? data.wins / data.count : 0,
      pf: data.totalLoss > 0 ? data.totalProfit / data.totalLoss : (data.totalProfit > 0 ? Infinity : 0),
      totalPnl: data.pnl
    })).sort((a, b) => b.totalPnl - a.totalPnl);

    return {
      weeklySummary,
      weekdayPerformance,
      hourlyPerformance,
      durationPerformance,
      weekendTrades,
      overnightTrades,
      bestDay,
      worstDay,
      maxDailyDD,
      allSymbols,
      topTags,
      expectationRows,
    };
  }, [filteredTrades, year, month, weekSummaries]);

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        .calendar-header-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 2px;
          margin-bottom: 2px;
        }

        .calendar-week-row {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 2px;
          min-height: 110px;
        }

        .week-summary-cell {
          display: flex;
        }

        @media (max-width: 1023px) {
          .calendar-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            min-height: auto !important;
          }

          .calendar-header h1 {
            font-size: 18px !important;
          }

          .calendar-header-right {
            width: 100% !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }

          .month-total-display {
            width: 100% !important;
            justify-content: space-between !important;
          }

          .week-summary-cell {
            display: none !important;
          }

          .calendar-header-grid {
            grid-template-columns: repeat(7, 1fr) !important;
          }

          .calendar-week-row {
            grid-template-columns: repeat(7, 1fr) !important;
          }
        }

        @media (max-width: 640px) {
          .calendar-day {
            padding: 2px !important;
            min-height: 60px !important;
          }

          .calendar-day-number {
            font-size: 10px !important;
            margin-bottom: 2px !important;
          }

          .calendar-day-profit {
            font-size: 10px !important;
            margin-bottom: 1px !important;
          }

          .calendar-day-trades {
            font-size: 8px !important;
          }

          .day-header {
            font-size: 10px !important;
            padding: 2px !important;
            height: 24px !important;
          }

          .week-summary {
            padding: 4px !important;
            min-height: 60px !important;
          }

          .week-summary-label {
            font-size: 9px !important;
          }

          .week-summary-value {
            font-size: 11px !important;
          }

          .calendar-grid {
            gap: 1px !important;
          }

          .calendar-wrapper {
            padding: 8px !important;
          }

          .nav-button {
            padding: 6px 10px !important;
            font-size: 16px !important;
          }

          .month-total-label {
            font-size: 11px !important;
          }

          .month-total-value {
            font-size: 18px !important;
          }
        }

        @media (min-width: 1024px) {
          .calendar-header-grid {
            grid-template-columns: repeat(8, 1fr) !important;
          }

          .calendar-week-row {
            grid-template-columns: repeat(8, 1fr) !important;
          }

          .week-summary-cell {
            display: flex !important;
          }
        }
      `}</style>

      <div className="calendar-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)", minHeight: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <button
            onClick={goToPrevMonth}
            className="nav-button"
            style={{
              background: "var(--chip)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ‹
          </button>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{monthName}</h1>
          <button
            onClick={goToNextMonth}
            className="nav-button"
            style={{
              background: "var(--chip)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ›
          </button>
        </div>
        <div className="calendar-header-right" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div className="month-total-display" style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
            <div className="month-total-label" style={{ fontSize: 13, color: "var(--muted)" }}>{UI_TEXT.monthlyTotal}</div>
            <div className="month-total-value" style={{
              fontSize: 24,
              fontWeight: 700,
              color: monthTotal >= 0 ? "var(--gain)" : "var(--loss)"
            }}>
              {monthTotal >= 0 ? "+" : ""}{Math.round(monthTotal).toLocaleString('ja-JP')}円
            </div>
          </div>
          <button
            onClick={goToThisMonth}
            style={{
              background: "var(--chip)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            今月
          </button>
        </div>
      </div>

      <div className="calendar-wrapper" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "var(--space-3)", marginBottom: 16 }}>
        <div className="calendar-header-grid">
          {["月", "火", "水", "木", "金", "土", "日", "週合計"].map((day, idx) => (
            <div
              key={day}
              className={`day-header ${idx === 7 ? 'week-summary-cell' : ''}`}
              style={{
                textAlign: "center",
                fontWeight: "bold",
                fontSize: 15,
                color: "var(--muted)",
                padding: "var(--space-1)",
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {Array.from({ length: 5 }).map((_, weekIndex) => {
            const weekDays = calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7);
            const weekProfit = weekSummaries[weekIndex].profitYen;
            return (
              <div key={weekIndex} className="calendar-week-row">
                {weekDays.map((day, idx) => {
                  const hasTradesValue = day.isCurrentMonth && day.tradeCount > 0;
                  const bgColor = hasTradesValue
                    ? day.profitYen >= 0
                      ? getAccentColor(0.1)
                      : getLossColor(0.1)
                    : day.isCurrentMonth
                    ? "var(--surface)"
                    : "var(--chip)";

                  const borderColor = hasTradesValue
                    ? day.profitYen >= 0
                      ? getAccentColor(0.3)
                      : getLossColor(0.3)
                    : "var(--line)";

                  const dayDate = day.date;
                  const dayOfMonth = day.dayOfMonth;

                  return (
                    <div
                      key={idx}
                      className="calendar-day"
                      onClick={() => {
                        if (hasTradesValue) {
                          console.log('Calendar day clicked:', {
                            dayOfMonth,
                            dayDate,
                            tradeCount: day.tradeCount,
                            profitYen: day.profitYen
                          });
                          location.hash = `/calendar/day/${dayDate}`;
                        }
                      }}
                      style={{
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 8,
                        padding: 8,
                        cursor: hasTradesValue ? "pointer" : "default",
                        opacity: day.isCurrentMonth ? 1 : 0.4,
                        transition: "all 0.15s ease",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (hasTradesValue) {
                          e.currentTarget.style.transform = "scale(1.02)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (hasTradesValue) {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      <div className="calendar-day-number" style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: day.isCurrentMonth ? "var(--ink)" : "var(--muted)", textAlign: "center" }}>
                        {day.dayOfMonth}
                      </div>
                      {hasTradesValue ? (
                        <>
                          <div
                            className="calendar-day-profit"
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: day.profitYen >= 0 ? "var(--gain)" : "var(--loss)",
                              marginBottom: 2,
                              textAlign: "center",
                            }}
                          >
                            {day.profitYen >= 0 ? "+" : ""}{Math.round(day.profitYen).toLocaleString('ja-JP')}円
                          </div>
                          <div className="calendar-day-trades" style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>取引：{day.tradeCount}</div>
                        </>
                      ) : day.isCurrentMonth ? (
                        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: "auto", marginBottom: "auto" }}>取引なし</div>
                      ) : null}
                    </div>
                  );
                })}
                <div
                  className="week-summary week-summary-cell"
                  style={{
                    background: "var(--chip)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: 8,
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {weekProfit !== 0 ? (
                    <>
                      <div className="week-summary-label" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{weekIndex + 1}週目</div>
                      <div
                        className="week-summary-value"
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: weekProfit >= 0 ? "var(--gain)" : "var(--loss)",
                        }}
                      >
                        {weekProfit >= 0 ? "+" : ""}{Math.round(weekProfit).toLocaleString('ja-JP')}円
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="week-summary-label" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{weekIndex + 1}週目</div>
                      <div className="week-summary-value" style={{ fontSize: 16, color: "var(--muted)" }}>0円</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 現在の状態 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          現在の状態
        </h3>
      </div>

      <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            取引回数
            <HelpIcon text="この月に実行した取引の回数です。データが多いほど統計的に信頼できる分析結果が得られます。" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{monthlyStats.totalTrades}<span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>回</span></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            勝率
            <HelpIcon text="利益が出た取引の割合です。50%以上なら半分以上の取引で勝っています。" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{monthlyStats.winRate.toFixed(1)}<span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>%</span></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            PF
            <HelpIcon text="総利益÷総損失の比率です。1.0以上なら利益が損失を上回っています。" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{monthlyStats.pf === Infinity ? '∞' : monthlyStats.pf.toFixed(2)}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            平均損益
            <HelpIcon text="1回の取引あたりの平均的な損益" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: monthlyStats.avgProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
            {monthlyStats.avgProfit >= 0 ? '+' : ''}{Math.round(monthlyStats.avgProfit).toLocaleString()}<span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>円</span>
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            最大DD
            <HelpIcon text="資金が最も減った金額です。この数値が大きいほど、大きな含み損に耐える必要があります。" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--loss)' }}>
            {Math.round(monthlyStats.maxDD).toLocaleString()}<span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>円</span>
          </div>
        </div>
      </div>

      {/* これまでの推移 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          これまでの推移
        </h3>
      </div>

      <InsightsSection
        weeklySummary={insightsData.weeklySummary}
        weekdayPerformance={insightsData.weekdayPerformance}
        hourlyPerformance={insightsData.hourlyPerformance}
        durationPerformance={insightsData.durationPerformance}
        weekendTrades={insightsData.weekendTrades}
        overnightTrades={insightsData.overnightTrades}
        bestDay={insightsData.bestDay}
        worstDay={insightsData.worstDay}
        maxDailyDD={insightsData.maxDailyDD}
        allSymbols={insightsData.allSymbols}
        topTags={insightsData.topTags}
        expectationRows={insightsData.expectationRows}
      />

      {/* 月次レビューボタン */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleGenerateReview}
          disabled={generatingReview || !userId || monthlyStats.totalTrades === 0}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            background: generatingReview ? 'var(--muted)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: generatingReview || !userId || monthlyStats.totalTrades === 0 ? 'not-allowed' : 'pointer',
            opacity: generatingReview || !userId || monthlyStats.totalTrades === 0 ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!generatingReview && userId && monthlyStats.totalTrades > 0) {
              e.currentTarget.style.background = 'var(--accent-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!generatingReview && userId && monthlyStats.totalTrades > 0) {
              e.currentTarget.style.background = 'var(--accent)';
            }
          }}
        >
          {generatingReview ? 'AIが分析中...' : 'AIの月次レビューを見る'}
        </button>
      </div>

      {/* 月次レビュードロワー */}
      {reviewData && (
        <MonthlyReviewDrawer
          isOpen={isReviewDrawerOpen}
          onClose={() => setIsReviewDrawerOpen(false)}
          review={reviewData}
        />
      )}
    </div>
  );
}
