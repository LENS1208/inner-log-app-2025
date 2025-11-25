// src/widgets/TradeDiaryPage.tsx
import { getAccentColor, getLossColor, createProfitGradient } from '../lib/chartColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { UI_TEXT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { getTradeByTicket, type DbTrade } from "../lib/db.service";
import { useDataset } from "../lib/dataset.context";
import { parseCsvText } from "../lib/csv";
import { showToast } from "../lib/toast";

import "../tradeDiary.css";

/* ===== 既存配線（A/B/C・アップロード） ===== */
function useWiring() {
  const emitPreset = useCallback((key: "A" | "B" | "C") => {
    window.dispatchEvent(new CustomEvent("fx:preset", { detail: key }));
  }, []);
  const openUpload = useCallback(() => {
    window.dispatchEvent(new Event("fx:openUpload"));
  }, []);
  return { emitPreset, openUpload };
}

/* ===== 外部スクリプトローダ（CDN） ===== */
const loaded = new Set<string>();
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!src) return resolve();
    if (loaded.has(src)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // 順序保証
    s.onload = () => {
      loaded.add(src);
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

/* ===== 型・ダミーデータ ===== */
type Trade = {
  ticket: string;
  item: string; // 通貨ペア
  side: "BUY" | "SELL";
  size: number;
  openTime: Date;
  openPrice: number;
  closeTime: Date;
  closePrice: number;
  commission: number;
  swap: number;
  profit: number; // 円
  sl: number | null;
  tp: number | null;
  pips: number; // ±
};

function makeDummyTrades(): Trade[] {
  const base = new Date("2025-09-10T00:30:00Z").getTime();
  const items = ["USDJPY", "EURUSD", "GBPJPY", "AUDUSD"];
  const arr: Trade[] = [];
  for (let i = 0; i < 80; i++) {
    const tOpen = new Date(base + i * 45 * 60 * 1000);
    const dur = 10 + Math.floor(Math.random() * 180);
    const tClose = new Date(tOpen.getTime() + dur * 60 * 1000);
    const item = items[i % items.length];
    const side: Trade["side"] = Math.random() > 0.45 ? "BUY" : "SELL";
    const size = [0.2, 0.3, 0.5, 1.0][i % 4];
    const isJPY = /JPY$/.test(item);
    const pf = isJPY ? 100 : 10000;
    const openPx = isJPY ? 1.45 + Math.random() * 0.02 : 1.05 + Math.random() * 0.02; // 値はデモ
    const pips = Math.round((Math.random() * 60 - 20) * 10) / 10; // -20〜+40
    const closePx = side === "BUY" ? openPx + pips / pf : openPx - pips / pf;
    const commission = Math.round((Math.random() * 4 - 2) * 50);
    const swap = Math.round((Math.random() * 4 - 2) * 40);
    const yen = Math.round(pips * size * (isJPY ? 100 : 1000));
    const profit = yen + commission + swap;
    const sl = side === "BUY" ? openPx - 20 / pf : openPx + 20 / pf;
    arr.push({
      ticket: "T" + (100000 + i),
      item,
      side,
      size,
      openTime: tOpen,
      openPrice: Math.round(openPx * 1000) / 1000,
      closeTime: tClose,
      closePrice: Math.round(closePx * 1000) / 1000,
      commission,
      swap,
      profit,
      sl: Math.round(sl * 1000) / 1000,
      tp: null,
      pips,
    });
  }
  return arr;
}

/* ===== 小道具 ===== */
const pipFactor = (sym: string) => (/JPY$/.test(sym) ? 100 : 10000);
const holdMs = (a: Date, b: Date) => b.getTime() - a.getTime();
const fmtJPY = (n: number) => `${Math.round(n).toLocaleString("ja-JP")}円`;
const fmtPrice = (n: number, sym: string) => {
  const isJPY = /JPY$/.test(sym);
  const decimals = isJPY ? 3 : 5;
  return `${n.toFixed(decimals)} 円`;
};
const fmtHoldJP = (ms: number) => {
  const m = Math.floor(ms / 60000),
    h = Math.floor(m / 60);
  return `${h}時間${m % 60}分`;
};

/* ===== マルチセレクト（最大2件） ===== */
type MSProps = {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  max?: number;
  triggerId?: string;
  menuId?: string;
};
function MultiSelect({
  label,
  value,
  onChange,
  options,
  max = 2,
  triggerId,
  menuId,
}: MSProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  const clickOutside = useCallback(
    (e: MouseEvent) => {
      const trg = triggerId ? document.getElementById(triggerId) : null;
      const menu = menuId ? document.getElementById(menuId) : null;
      if (!trg || !menu) return;
      if (
        !trg.contains(e.target as Node) &&
        !menu.contains(e.target as Node)
      )
        setOpen(false);
  }, [triggerId, menuId]);
  useEffect(() => {
    document.addEventListener("click", clickOutside);
    return () => document.removeEventListener("click", clickOutside);
  }, [clickOutside]);
  const onPick = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else if (value.length < max) onChange([...value, opt]);
  };
  const title = value.length
    ? `${value.join("、")}（${value.length}）`
    : label;
  return (
    <label className="ms-wrap">
      <button type="button" id={triggerId} className="ms-trigger" onClick={toggle}>
        {title}
      </button>
      <div id={menuId} className="ms-menu" style={{ display: open ? "block" : "none" }}>
        {options.map((opt) => (
          <div key={opt} className="ms-item" onClick={() => onPick(opt)}>
            <input
              type="checkbox"
              readOnly
              checked={value.includes(opt)}
              disabled={!value.includes(opt) && value.length >= max}
            />
            <span>{opt}</span>
          </div>
        ))}
        <div className="ms-footer">
          <span>最大 {max} まで</span>
          <button type="button" className="td-btn" onClick={() => setOpen(false)}>
            閉じる
          </button>
        </div>
      </div>
    </label>
  );
}

/* ===== AIアドバイスセクション ===== */
type AIAdviceSectionProps = {
  tradeData: Trade;
  kpi: {
    net: number;
    pips: number;
    hold: number;
    gross: number;
    cost: number;
    rrr: number | null;
  };
  diaryData: {
    entryEmotion: string;
    entryBasis: string[];
    techSet: string[];
    marketSet: string[];
    exitTriggers: string[];
    exitEmotion: string;
    noteRight: string;
    noteWrong: string;
    noteNext: string;
  };
};

function AIAdviceSection({ tradeData, kpi, diaryData }: AIAdviceSectionProps) {
  const [advice, setAdvice] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const ADVICE_KEY = `ai_advice_${tradeData.ticket}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADVICE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setAdvice(data.advice || "");
        setIsPinned(data.isPinned || false);
        setLastUpdate(data.lastUpdate ? new Date(data.lastUpdate) : null);
      }
    } catch {}
  }, [ADVICE_KEY]);

  const generateAdvice = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const winRate = kpi.net >= 0 ? 66.7 : 33.3;
      const adviceText = `• 今日の勝率は${winRate.toFixed(1)}%と${winRate >= 50 ? "良好" : "改善の余地があります"}です。引き続き慎重なエントリーを心がけましょう。\n\n• ${tradeData.item}で${tradeData.side === "BUY" ? "2回取引" : "1勝1敗"}しています${tradeData.side === "BUY" ? "が、1勝1敗です" : ""}。通貨ペアごとのパターンを見直してみましょう。\n\n• 損切りが適切に機能しています。この調子でリスク管理を継続してください。\n\n• ${diaryData.entryEmotion || "午前中"}の取引が好調です。時間帯ごとの傾向を分析してみると良いでしょう。`;

      setAdvice(adviceText);
      setIsGenerating(false);
      const now = new Date();
      setLastUpdate(now);

      const data = {
        advice: adviceText,
        isPinned,
        lastUpdate: now.toISOString(),
      };
      localStorage.setItem(ADVICE_KEY, JSON.stringify(data));
    }, 1500);
  };

  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);

    const data = {
      advice,
      isPinned: newPinned,
      lastUpdate: lastUpdate?.toISOString(),
    };
    localStorage.setItem(ADVICE_KEY, JSON.stringify(data));
  };

  return (
    <section className="td-card" id="aiAdviceCard">
      <div className="td-section-title">
        <h2>AIアドバイス</h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className="td-btn"
          onClick={generateAdvice}
          disabled={isGenerating}
          style={{ flex: 1 }}
        >
          {isGenerating ? "生成中..." : "アドバイスを生成"}
        </button>
        <button
          className="td-btn"
          onClick={generateAdvice}
          disabled={isGenerating || !advice}
          style={{ minWidth: 80 }}
        >
          再生成
        </button>
        <button
          className="td-btn"
          onClick={togglePin}
          disabled={!advice}
          style={{
            minWidth: 60,
            backgroundColor: isPinned ? getAccentColor() : undefined,
            color: isPinned ? "white" : undefined,
          }}
        >
          固定
        </button>
      </div>

      {advice && (
        <div
          style={{
            padding: 16,
            backgroundColor: "var(--chip)",
            borderRadius: 8,
            border: "1px solid var(--line)",
            whiteSpace: "pre-line",
            lineHeight: 1.6,
          }}
        >
          {advice}
        </div>
      )}

      {lastUpdate && (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "var(--muted)",
            textAlign: "right",
          }}
        >
          最終更新: {lastUpdate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}{" "}
          {lastUpdate.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </section>
  );
}

type TradeDiaryPageProps = {
  entryId?: string;
};

export default function TradeDiaryPage({ entryId }: TradeDiaryPageProps = {}) {
  const { emitPreset, openUpload } = useWiring();
  const { dataset, useDatabase } = useDataset();

  /* ===== データ準備 ===== */
  const [dbTrade, setDbTrade] = useState<DbTrade | null>(null);
  const [csvTrades, setCsvTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // CSVデータをロード
  useEffect(() => {
    if (!useDatabase) {
      const candidates = [
        `/demo/${dataset}.csv`,
        `/demo/sample/${dataset}.csv`,
        `/demo/demo_${dataset}.csv`,
      ];
      (async () => {
        for (const url of candidates) {
          try {
            const cacheBuster = `?t=${Date.now()}`;
            const res = await fetch(url + cacheBuster, { cache: "no-store" });
            if (!res.ok) continue;
            const text = await res.text();
            const trades = parseCsvText(text);
            if (Array.isArray(trades) && trades.length) {
              console.log('TradeDiaryPage: Loaded CSV trades:', trades.length);
              setCsvTrades(trades);
              return;
            }
          } catch (err) {
            console.error('Error loading CSV:', err);
          }
        }
        setCsvTrades([]);
      })();
    }
  }, [dataset, useDatabase]);

  useEffect(() => {
    const loadTrade = async () => {
      if (!entryId) {
        console.log('TradeDiaryPage: No entryId provided');
        setLoading(false);
        return;
      }
      console.log('TradeDiaryPage: Loading trade for entryId:', entryId);

      if (useDatabase) {
        try {
          const trade = await getTradeByTicket(entryId);
          console.log('TradeDiaryPage: Loaded trade from DB:', trade);
          setDbTrade(trade);
        } catch (error) {
          console.error('TradeDiaryPage: Error loading trade:', error);
        }
      }
      setLoading(false);
    };
    loadTrade();
  }, [entryId, useDatabase]);

  const trades = useMemo(() => makeDummyTrades(), []);
  const allTrades = useMemo(() => {
    return useDatabase ? trades : csvTrades;
  }, [useDatabase, trades, csvTrades]);

  const row = useMemo(() => {
    if (dbTrade) {
      return {
        ticket: dbTrade.ticket,
        item: dbTrade.item,
        side: dbTrade.side as "BUY" | "SELL",
        size: dbTrade.size,
        openTime: new Date(dbTrade.open_time),
        openPrice: dbTrade.open_price,
        closeTime: new Date(dbTrade.close_time),
        closePrice: dbTrade.close_price,
        commission: dbTrade.commission,
        swap: dbTrade.swap,
        profit: dbTrade.profit,
        sl: dbTrade.sl,
        tp: dbTrade.tp,
        pips: dbTrade.pips,
      };
    }

    // CSVデータから検索
    if (entryId && allTrades.length > 0) {
      const found = allTrades.find(t => t.ticket === entryId || t.id === entryId);
      console.log('TradeDiaryPage: Searching for', entryId, 'in', allTrades.length, 'trades. Found:', found);
      if (found) {
        return {
          ticket: found.ticket || found.id,
          item: found.pair || found.symbol || 'UNKNOWN',
          side: (found.side === 'LONG' ? 'BUY' : 'SELL') as "BUY" | "SELL",
          size: found.volume,
          openTime: new Date(found.openTime || found.datetime),
          openPrice: found.openPrice || 0,
          closeTime: new Date(found.datetime),
          closePrice: found.closePrice || 0,
          commission: found.commission || 0,
          swap: found.swap || 0,
          profit: found.profitYen || found.profit || 0,
          sl: found.stopPrice || null,
          tp: found.targetPrice || null,
          pips: found.pips,
        };
      }
    }

    return allTrades.length > 0 ? {
      ticket: allTrades[0].ticket || allTrades[0].id,
      item: allTrades[0].pair || allTrades[0].symbol || 'UNKNOWN',
      side: (allTrades[0].side === 'LONG' ? 'BUY' : 'SELL') as "BUY" | "SELL",
      size: allTrades[0].volume,
      openTime: new Date(allTrades[0].openTime || allTrades[0].datetime),
      openPrice: allTrades[0].openPrice || 0,
      closeTime: new Date(allTrades[0].datetime),
      closePrice: allTrades[0].closePrice || 0,
      commission: allTrades[0].commission || 0,
      swap: allTrades[0].swap || 0,
      profit: allTrades[0].profitYen || allTrades[0].profit || 0,
      sl: allTrades[0].stopPrice || null,
      tp: allTrades[0].targetPrice || null,
      pips: allTrades[0].pips,
    } : trades[trades.length - 1];
  }, [dbTrade, allTrades, trades, entryId]);

  const kpi = useMemo(() => ({
    net: row.profit,
    pips: row.pips,
    hold: holdMs(row.openTime, row.closeTime),
    gross: row.profit + row.commission,
    cost: -row.commission,
    rrr: row.sl
      ? Math.abs(row.pips) /
        Math.abs((row.openPrice - row.sl) * pipFactor(row.item))
      : null,
  }), [row]);
  const [last10, setLast10] = useState<Trade[]>([]);

  /* ===== タグ ===== */
  const [tags, setTags] = useState<string[]>([]);
  const addTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
  const removeTag = (t: string) =>
    setTags((prev) => prev.filter((x) => x !== t));

  /* ===== 画像 ===== */
  type Img = { id: string; url: string };
  const IMG_KEY = useMemo(
    () => `trade_detail_images_${row.ticket}`,
    [row.ticket]
  );
  const [images, setImages] = useState<Img[]>([]);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const allowed = ["image/jpeg", "image/png", "image/gif"];
    const accepted = Array.from(files)
      .filter((f) => {
        if (!allowed.includes(f.type)) {
          showToast(`未対応の形式です: ${f.name}`, 'error');
          return false;
        }
        if (f.size > 3 * 1024 * 1024) {
          showToast(`サイズ上限3MBを超えています: ${f.name}`, 'error');
          return false;
        }
        return true;
      })
      .slice(0, 3);
    accepted.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        setImages((prev) => [
          {
            id: `img_${Date.now()}_${Math.random()
              .toString(16)
              .slice(2)}`,
            url,
          },
          ...prev,
        ]);
      };
      reader.readAsDataURL(f);
    });
  };
  const captureCanvas = (canvas?: HTMLCanvasElement | null) => {
    try {
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      setImages((prev) => [
        {
          id: `img_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          url,
        },
        ...prev,
      ]);
    } catch (e) {
      console.warn("canvas capture failed", e);
    }
  };

  /* ===== 直近10件 ===== */
  useEffect(() => {
    if (allTrades.length > 0) {
      // Convert CSV Trade to dummy Trade format
      const converted = allTrades.map(t => ({
        ticket: t.ticket || t.id,
        item: t.pair || t.symbol || 'UNKNOWN',
        side: (t.side === 'LONG' ? 'BUY' : 'SELL') as "BUY" | "SELL",
        size: t.volume,
        openTime: new Date(t.openTime || t.datetime),
        openPrice: t.openPrice || 0,
        closeTime: new Date(t.datetime),
        closePrice: t.closePrice || 0,
        commission: t.commission || 0,
        swap: t.swap || 0,
        profit: t.profitYen || t.profit || 0,
        sl: t.stopPrice || null,
        tp: t.targetPrice || null,
        pips: t.pips,
      }));
      setLast10(converted.slice(-10).reverse());
    } else {
      setLast10(trades.slice(-10).reverse());
    }
  }, [allTrades, trades]);

  /* ===== 折りたたみ状態 ===== */
  const [expandEntry, setExpandEntry] = useState(false);
  const [expandHold, setExpandHold] = useState(false);
  const [expandExit, setExpandExit] = useState(false);
  const [expandAnalysis, setExpandAnalysis] = useState(false);

  /* ===== グラフ ===== */
  const equityRef = useRef<HTMLCanvasElement | null>(null);
  const histRef = useRef<HTMLCanvasElement | null>(null);
  const heatRef = useRef<HTMLCanvasElement | null>(null);
  const chartsRef = useRef<{ eq?: any; hist?: any; heat?: any }>({});

  // グラフ用のデータ準備
  const chartTrades = useMemo(() => {
    if (allTrades.length > 0) {
      return allTrades.map(t => ({
        ticket: t.ticket || t.id,
        item: t.pair || t.symbol || 'UNKNOWN',
        side: (t.side === 'LONG' ? 'BUY' : 'SELL') as "BUY" | "SELL",
        size: t.volume,
        openTime: new Date(t.openTime || t.datetime),
        openPrice: t.openPrice || 0,
        closeTime: new Date(t.datetime),
        closePrice: t.closePrice || 0,
        commission: t.commission || 0,
        swap: t.swap || 0,
        profit: t.profitYen || t.profit || 0,
        sl: t.stopPrice || null,
        tp: t.targetPrice || null,
        pips: t.pips,
      }));
    }
    return trades;
  }, [allTrades, trades]);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        // time adapter → chart.js → matrix の順
        await loadScript(
          "https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@2.0.1/dist/chartjs-adapter-date-fns.bundle.min.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/chartjs-chart-matrix@1.2.0/dist/chartjs-chart-matrix.min.js"
        );
        if (destroyed) return;

        // @ts-ignore
        const Chart = (window as any).Chart;

        // 累積損益
        const eqData = (() => {
          let cum = 0;
          return chartTrades
            .slice()
            .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime())
            .map((t) => ({ x: t.closeTime, y: (cum += t.profit) }));
        })();

        if (!equityRef.current || !histRef.current || !heatRef.current) {
          return;
        }

        chartsRef.current.eq = new Chart(
          equityRef.current.getContext("2d")!,
          {
            type: "line",
            data: {
              datasets: [
                {
                  label: "累積損益（円）",
                  data: eqData,
                  parsing: false,
                  tension: 0.4,
                  borderWidth: 2.5,
                  pointRadius: 0,
                  fill: 'origin',
                  backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const {ctx, chartArea, scales} = chart;
                    if (!chartArea) return getAccentColor(0.1);
                    return createProfitGradient(ctx, chartArea, scales);
                  },
                  segment: {
                    borderColor: (ctx: any) => {
                      return ctx.p1.parsed.y >= 0 ? getAccentColor() : getLossColor();
                    }
                  }
                },
              ],
            },
            options: {
              resizeDelay: 150,
              scales: {
                x: { type: "time", time: { unit: "hour" } },
                y: {
                  ticks: {
                    callback: (v: number) => v.toLocaleString("ja-JP"),
                  },
                },
              },
              plugins: { legend: { display: false } },
              maintainAspectRatio: false,
            },
          }
        );

        // ヒストグラム
        const histCounts = (values: number[], step: number) => {
          const min = Math.min(...values),
            max = Math.max(...values);
          const s = Math.floor(min / step) * step,
            e = Math.ceil(max / step) * step;
          const bins: { x: number; y: number }[] = [];
          for (let v = s; v <= e; v += step) bins.push({ x: v, y: 0 });
          values.forEach((v) => {
            const i = Math.min(
              bins.length - 1,
              Math.max(0, Math.floor((v - s) / step))
            );
            bins[i].y += 1;
          });
          return bins;
        };
        const histLabels = histCounts(chartTrades.map((t) => t.profit), 2000).map(
          (b) => b.x
        );
        const histVals = histCounts(chartTrades.map((t) => t.profit), 2000).map(
          (b) => b.y
        );
        chartsRef.current.hist = new Chart(
          histRef.current.getContext("2d")!,
          {
            type: "bar",
            data: {
              labels: histLabels.map((x) => x.toLocaleString("ja-JP")),
              datasets: [{ label: "件数（円）", data: histVals }],
            },
            options: {
              resizeDelay: 150,
              scales: {
                x: {
                  ticks: {
                    callback: (_: any, i: number) =>
                      histLabels[i].toLocaleString("ja-JP"),
                  },
                },
              },
              plugins: { legend: { display: false } },
              maintainAspectRatio: false,
            },
          }
        );

        // ヒートマップ
        const weekday = (d: Date) => (d.getDay() + 6) % 7;
        const hour = (d: Date) => d.getHours();
        const grid = Array.from({ length: 7 }, (_, r) =>
          Array.from({ length: 24 }, (_, c) => ({ r, c, win: 0, total: 0 }))
        );
        chartTrades.forEach((t) => {
          const r = weekday(t.closeTime),
            c = hour(t.closeTime);
          grid[r][c].total += 1;
          if (t.profit > 0) grid[r][c].win += 1;
        });
        const cells = grid
          .flat()
          .map((g) => ({
            x: g.c,
            y: g.r,
            v: g.total ? Math.round((100 * g.win) / g.total) : 0,
          }));
        chartsRef.current.heat = new Chart(
          heatRef.current.getContext("2d")!,
          {
            type: "matrix",
            data: {
              datasets: [
                {
                  data: cells,
                  width: ({ chart }: any) =>
                    (chart.chartArea.right - chart.chartArea.left) / 24 - 2,
                  height: ({ chart }: any) =>
                    (chart.chartArea.bottom - chart.chartArea.top) / 7 - 2,
                  // @ts-ignore
                  backgroundColor: (ctx: any) => {
                    const v = ctx.raw.v;
                    const a = 0.15 + 0.007 * v;
                    return `rgba(1,161,255,${a})`;
                  },
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.08)",
                },
              ],
            },
            options: {
              resizeDelay: 150,
              scales: {
                x: {
                  type: "linear",
                  min: 0,
                  max: 23,
                  ticks: { callback: (v: any) => `${v}時` },
                },
                y: {
                  type: "linear",
                  min: 0,
                  max: 6,
                  ticks: {
                    callback: (v: any) =>
                      ["月", "火", "水", "木", "金", "土", "日"][v],
                  },
                },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: { label: (c: any) => `勝率 ${c.raw.v}%` },
                },
              },
              maintainAspectRatio: false,
            },
          }
        );
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      destroyed = true;
      try {
        chartsRef.current.eq?.destroy();
      } catch {}
      try {
        chartsRef.current.hist?.destroy();
      } catch {}
      try {
        chartsRef.current.heat?.destroy();
      } catch {}
      chartsRef.current = {};
    };
  }, [chartTrades, expandAnalysis]);

  /* ===== クイック日記（簡易） ===== */
  type QuickMemo = {
    tempId: string;
    symbol: string;
    side: "BUY" | "SELL";
    entry: { planned?: number; actual?: number; size?: number; time: string };
    entry_emotion?: string;
    ai: { side?: string; follow?: string };
    note?: string;
    linkedTo?: string | null;
  };
  const QUICK_KEY = "quick_memos_v1";
  const loadQuick = (): QuickMemo[] => {
    try {
      return JSON.parse(localStorage.getItem(QUICK_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const saveQuick = (arr: QuickMemo[]) =>
    localStorage.setItem(QUICK_KEY, JSON.stringify(arr));
  const [pending, setPending] = useState<QuickMemo[]>([]);

  useEffect(() => {
    setPending(loadQuick().filter((m) => !m.linkedTo));
  }, []);

  /* ===== トレード日記：選択肢・状態 ===== */
  const ENTRY_BASIS_OPTS = [
    "押し目・戻り",
    "ブレイク",
    "ダブルトップ／ダブルボトム",
    "三角持ち合い／ペナント／フラッグ",
    "チャネル反発／上限・下限タッチ",
    "だまし（フェイク）",
    "ピンバー／包み足／はらみ足",
    "フィボ反発（38.2／50／61.8)",
  ];
  const TECH_OPTS = [
    "MAクロス（ゴールデン／デッド）",
    "ボリンジャー（±2σタッチ→内戻り）",
    "RSI 50回復／割れ",
    "RSI 過熱（70↑）／逆張り（30↓）",
    "一目均衡表合致（雲反発／雲抜け／三役）",
    "MACDクロス（上向き／下向き）",
    "フィボ合致（38.2／50／61.8）",
    "ピボット（R1／R2／S1／S2）",
    "ATR 高め／低め",
    "ADX 強め／弱め",
  ];
  const MARKET_OPTS = [
    "トレンド相場",
    "レンジ相場",
    "市場オープン切替（東京→欧州／欧州→NY）",
    "ボラ高め",
    "ボラ低め",
    "高値圏",
    "安値圏",
    "薄商い",
    "オプションバリア付近",
    "ニュース直後",
    "指標前",
  ];
  const INTRA_EMO_OPTS = [
    "余裕があった",
    "不安が増えた",
    "早く逃げたい",
    "欲が出た",
    "含み益に固執",
    "含み損に耐えた",
    "判断がぶれた",
    "集中が切れた",
    "予定通りに待てた",
  ];
  const PRERULE_OPTS = [
    "逆指値は必ず置く",
    "損切り幅を固定",
    "直近足の下/上に損切り",
    "分割エントリー",
    "分割利確",
    "トレーリング",
    "指標またぎ回避",
    "1日の取引は◯回まで",
  ];
  const EXIT_TRIG_OPTS = [
    "目標価格に到達",
    "逆指値に到達（損切り）",
    "想定価格に達した（部分／全）",
    "損益表示に影響された",
    "指標が近づいた",
    "ボラ急変",
    "形状が崩れた",
    "時間切れ（ルール時間）",
    "AIシグナル終了／反転",
    "ほかのセットアップ優先",
  ];
  const AI_PROS_OPTS = [
    "ポジションの精度",
    "エントリーのタイミング",
    "利確＆損切りライン",
    "根拠が分かりやすい",
  ];
  const FUND_OPTS = [
    "金利見通し",
    "中銀スタンス",
    "景気サプライズ",
    "インフレ圧力",
    "リスクオン・リスクオフ",
    "原油・商品",
    "ポジション偏り",
    "地政学ヘッドライン",
  ];

  const [entryEmotion, setEntryEmotion] = useState("");
  const [entryBasis, setEntryBasis] = useState<string[]>([]);
  const [techSet, setTechSet] = useState<string[]>([]);
  const [marketSet, setMarketSet] = useState<string[]>([]);
  const [fundSet, setFundSet] = useState<string[]>([]);
  const [fundNote, setFundNote] = useState("");

  const [intraEmotion, setIntraEmotion] = useState<string[]>([]);
  const [preRules, setPreRules] = useState<string[]>([]);
  const [ruleExec, setRuleExec] = useState("");
  const [holdNote, setHoldNote] = useState("");

  useEffect(() => {
    const loadTradeNote = async () => {
      try {
        const { data, error } = await supabase
          .from('trade_notes')
          .select('*')
          .eq('ticket', row.ticket)
          .maybeSingle();

        if (error) {
          console.error('Error loading trade note:', error);
          return;
        }

        if (data) {
          setEntryEmotion(data.entry_emotion || '');
          setEntryBasis(Array.isArray(data.entry_basis) ? data.entry_basis : []);
          setTechSet(Array.isArray(data.tech_set) ? data.tech_set : []);
          setMarketSet(Array.isArray(data.market_set) ? data.market_set : []);
          setFundSet(Array.isArray(data.fund_set) ? data.fund_set : []);
          setFundNote(data.fund_note || '');
          setExitTriggers(Array.isArray(data.exit_triggers) ? data.exit_triggers : []);
          setExitEmotion(data.exit_emotion || '');
          setNoteRight(data.note_right || '');
          setNoteWrong(data.note_wrong || '');
          setNoteNext(data.note_next || '');
          setNoteFree(data.note_free || '');
          setTags(Array.isArray(data.tags) ? data.tags : []);
          setImages(Array.isArray(data.images) ? data.images : []);
        }
      } catch (e) {
        console.error('Exception loading trade note:', e);
      }
    };

    loadTradeNote();
  }, [row.ticket]);

  const [aiSide, setAiSide] = useState("");
  const [aiFollow, setAiFollow] = useState("選択しない");
  const [aiHit, setAiHit] = useState("未評価");
  const [aiPros, setAiPros] = useState<string[]>([]);
  const [aiNote, setAiNote] = useState("");

  const [exitTriggers, setExitTriggers] = useState<string[]>([]);
  const [exitEmotion, setExitEmotion] = useState("");

  const [noteRight, setNoteRight] = useState("");
  const [noteWrong, setNoteWrong] = useState("");
  const [noteNext, setNoteNext] = useState("");
  const [noteFree, setNoteFree] = useState("");

  /* ===== タグモーダル ===== */
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const openTagModal = () => setTagModalOpen(true);
  const closeTagModal = () => setTagModalOpen(false);
  const addTagDirect = (t: string) => {
    if (!t.trim()) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t.trim()]));
  };

  /* ===== 保存 ===== */
  const savePayload = async () => {
    if (!useDatabase) {
      showToast('デモデータには取引ノートを追加できません', 'error');
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('trade_notes')
        .select('id')
        .eq('ticket', row.ticket)
        .maybeSingle();

      const noteData = {
        ticket: row.ticket,
        entry_emotion: entryEmotion,
        entry_basis: entryBasis,
        tech_set: techSet,
        market_set: marketSet,
        fund_set: fundSet,
        fund_note: fundNote,
        exit_triggers: exitTriggers,
        exit_emotion: exitEmotion,
        note_right: noteRight,
        note_wrong: noteWrong,
        note_next: noteNext,
        note_free: noteFree,
        tags: tags,
        images: images,
        ai_advice: '',
        ai_advice_pinned: false,
      };

      let error;
      if (existing) {
        ({ error } = await supabase
          .from('trade_notes')
          .update(noteData)
          .eq('ticket', row.ticket));
      } else {
        ({ error } = await supabase
          .from('trade_notes')
          .insert(noteData));
      }

      if (error) {
        console.error('Error saving trade note:', error);
        showToast('保存に失敗しました', 'error');
      } else {
        showToast('保存しました', 'success');
      }
    } catch (e) {
      console.error('Exception saving trade note:', e);
      showToast('保存中にエラーが発生しました', 'error');
    }
  };

  /* ===== JSX ===== */
  if (loading) {
    return (
      <section className="td-root">
        <div style={{ padding: 40, textAlign: 'center' }}>読み込み中...</div>
      </section>
    );
  }

  if (entryId && !dbTrade && allTrades.length === 0) {
    return (
      <section className="td-root">
        <div style={{ padding: 40, textAlign: 'center' }}>取引データが見つかりません</div>
      </section>
    );
  }

  return (
    <section className="td-root">
      {/* 戻るボタンとタイトル */}
      {entryId && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4, 20px)', minHeight: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              {row.item}｜{fmtPrice(row.openPrice, row.item)}｜{row.side === "BUY" ? "買い" : "売り"}｜<span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>Ticket:{row.ticket}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>損益</div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: kpi.net >= 0 ? 'var(--gain)' : 'var(--loss)'
              }}>
                {(kpi.net >= 0 ? "+" : "") + Math.round(kpi.net).toLocaleString("ja-JP")}円
              </div>
            </div>
            <button
              className="nav-btn"
              onClick={() => window.location.hash = '/notebook'}
              style={{ fontSize: 14 }}
            >
              ノート一覧
            </button>
          </div>
        </div>
      )}

      {/* 既存配線トリガ（上部） */}

      {/* KPI */}
      <div className="kpi-grid">
        <div className="td-card"><div className="lab">pips</div><div className="val" style={{ color: kpi.pips >= 0 ? getAccentColor() : getLossColor() }}>{(kpi.pips >= 0 ? "+" : "") + kpi.pips.toFixed(1)}</div></div>
        <div className="td-card"><div className="lab">保有時間</div><div className="val">{fmtHoldJP(kpi.hold)}</div></div>
        <div className="td-card"><div className="lab">スワップポイント</div><div className="val" style={{ color: row.swap >= 0 ? getAccentColor() : getLossColor() }}>{(row.swap >= 0 ? "+" : "-") + Math.floor(Math.abs(row.swap)).toLocaleString("ja-JP")}円</div></div>
        <div className="td-card"><div className="lab">リスクリワード</div><div className="val">{kpi.rrr ? kpi.rrr.toFixed(2) : "—"}</div></div>
      </div>

      {/* トレード情報 */}
      <section className="td-card compact td-trade-info" id="tradeInfoCard" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>通貨ペア</div>
            <div style={{ fontWeight: 500 }}>{row.item}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>ポジション</div>
            <div style={{ fontWeight: 500 }}>{row.side === "BUY" ? "買い" : "売り"}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>サイズ</div>
            <div style={{ fontWeight: 500 }}>{row.size.toFixed(2)} lot</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>指値/逆指値</div>
            <div style={{ fontWeight: 500 }}>— / {row.sl ?? "—"}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>エントリー価格＜時刻＞</div>
            <div style={{ fontWeight: 500 }}><strong>{row.openPrice}</strong> ＜{row.openTime.toLocaleString()}＞</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>決済価格＜時刻＞</div>
            <div style={{ fontWeight: 500 }}><strong>{row.closePrice}</strong> ＜{row.closeTime.toLocaleString()}＞</div>
          </div>
        </div>
      </section>

      {/* 2列グリッド */}
      <div className="grid-main" style={{ marginTop: 16 }}>
        {/* 左列 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* トレード日記 */}
          <div className="td-diary-heading" style={{ marginTop: 0, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>トレード日記</h2>
            <button className="td-btn" onClick={savePayload}>保存</button>
          </div>

          {/* エントリー前・直後 */}
          <section className="td-card td-entry-before" id="entryBeforeCard" style={{ marginTop: 0 }}>
            <div className="td-section-title">
              <h2>エントリー前・直後</h2>
            </div>

            <label>
              <div className="muted small">自由メモ</div>
              <textarea className="note" rows={1} value={fundNote} onChange={(e) => setFundNote(e.target.value)}
                placeholder="例）朝9時のニュースで日銀総裁の発言を確認。円高に動きそうだと予想。チャートでは200日移動平均線付近で反発していたので買いを検討。" />
            </label>

            <button
              type="button"
              className="td-btn"
              style={{ marginTop: 8, width: "100%" }}
              onClick={() => setExpandEntry(!expandEntry)}
            >
              {expandEntry ? "詳細を閉じる" : "詳細を開く"}
            </button>

            {expandEntry && (
              <div style={{ marginTop: 12 }}>
                <label>
                  <select className="select" value={entryEmotion} onChange={(e) => setEntryEmotion(e.target.value)}>
                    <option value="">エントリー時の感情</option>
                    <option>落ち着いていた</option><option>自信あり</option><option>少し焦っていた</option>
                    <option>なんとなく</option><option>負けを取り返したい</option><option>迷いがある</option><option>置いていかれ不安</option>
                  </select>
                </label>
                <MultiSelect label="エントリー根拠（最大2つ）" value={entryBasis} onChange={setEntryBasis}
                  options={ENTRY_BASIS_OPTS} triggerId="msEntryBasisBtn" menuId="msEntryBasisMenu" />
                <MultiSelect label="テクニカル条件（最大2つ）" value={techSet} onChange={setTechSet}
                  options={TECH_OPTS} triggerId="msTechBtn" menuId="msTechMenu" />
                <MultiSelect label="マーケット環境（最大2つ）" value={marketSet} onChange={setMarketSet}
                  options={MARKET_OPTS} triggerId="msMarketBtn" menuId="msMarketMenu" />
                <MultiSelect label="ファンダメンタルズ（最大2つ）" value={fundSet} onChange={setFundSet}
                  options={FUND_OPTS} triggerId="msFundBtn" menuId="msFundMenu" />

                <div className="hr" />

                <h3 style={{ margin: "12px 0 8px 0", fontSize: 15, color: "var(--muted)" }}>AIの予想</h3>
                <label>
                  <select className="select" value={aiSide} onChange={(e) => setAiSide(e.target.value)}>
                    <option value="">AIのポジション予測</option><option>買い</option><option>売り</option><option>様子見</option>
                  </select>
                </label>
                <label>
                  <select className="select" value={aiFollow} onChange={(e) => setAiFollow(e.target.value)}>
                    <option value="">取引の判断</option><option>従った</option><option>一部従った</option><option>従わなかった</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          {/* ポジション保有中 */}
          <section className="td-card td-position-hold" id="positionHoldCard">
            <div className="td-section-title">
              <h2>ポジション保有中</h2>
            </div>

            <label>
              <div className="muted small">自由メモ</div>
              <textarea className="note" rows={1} value={holdNote} onChange={(e) => setHoldNote(e.target.value)} placeholder="保有中の気づきや感想をメモ" />
            </label>

            <button
              type="button"
              className="td-btn"
              style={{ marginTop: 8, width: "100%" }}
              onClick={() => setExpandHold(!expandHold)}
            >
              {expandHold ? "詳細を閉じる" : "詳細を開く"}
            </button>

            {expandHold && (
              <div style={{ marginTop: 12 }}>
                <MultiSelect label="保有中の感情（最大2つ）" value={intraEmotion} onChange={setIntraEmotion}
                  options={INTRA_EMO_OPTS} triggerId="msInTradeEmotionBtn" menuId="msInTradeEmotionMenu" />
                <MultiSelect label="事前ルール（最大2つ）" value={preRules} onChange={setPreRules}
                  options={PRERULE_OPTS} triggerId="msPreRulesBtn" menuId="msPreRulesMenu" />
                <label>
                  <select className="select" value={ruleExec} onChange={(e) => setRuleExec(e.target.value)}>
                    <option value="">ルールの守り具合</option><option>しっかり守れた</option><option>一部守れなかった</option><option>守れなかった</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          {/* ポジション決済後 */}
          <section className="td-card td-exit" id="exitCard">
            <div className="td-section-title">
              <h2>ポジション決済後</h2>
            </div>

            <label>
              <div className="muted small">自由メモ</div>
              <textarea className="note" rows={1} value={noteFree} onChange={(e) => setNoteFree(e.target.value)} placeholder="例）今日は集中力が高かった。朝のニュースで日銀の発言があったので、円高に動くと予想。次回も経済指標の前後は注意深く観察する。" />
            </label>

            <button
              type="button"
              className="td-btn"
              style={{ marginTop: 8, width: "100%" }}
              onClick={() => setExpandExit(!expandExit)}
            >
              {expandExit ? "詳細を閉じる" : "詳細を開く"}
            </button>

            {expandExit && (
              <div style={{ marginTop: 12 }}>
                <MultiSelect label="決済のきっかけ（最大2つ）" value={exitTriggers} onChange={setExitTriggers}
                  options={EXIT_TRIG_OPTS} triggerId="msExitTriggerBtn" menuId="msExitTriggerMenu" />
                <label>
                  <select className="select" value={exitEmotion} onChange={(e) => setExitEmotion(e.target.value)}>
                    <option value="">決済時の感情</option><option>予定通りで満足</option><option>早く手放したい</option><option>もっと引っ張れた</option>
                    <option>怖くなった</option><option>安堵した</option><option>悔しい</option><option>反省している</option>
                  </select>
                </label>
                <label>
                  <select className="select" value={aiHit} onChange={(e) => setAiHit(e.target.value)}>
                    <option value="">当たり外れ（AI）</option><option>当たり</option><option>惜しい</option><option>外れ</option>
                  </select>
                </label>
                <MultiSelect label="AI予想が良かった点（最大2つ）" value={aiPros} onChange={setAiPros}
                  options={AI_PROS_OPTS} triggerId="msAiProsBtn" menuId="msAiProsMenu" />

                <div className="note-vertical" style={{ marginTop: 12 }}>
                  <label><div className="muted small">うまくいった点</div><textarea className="note" rows={1} value={noteRight} onChange={(e) => setNoteRight(e.target.value)} placeholder="例）エントリー前にしっかり水平線を引いて待てた。損切りラインも事前に決めていたので迷わず実行できた。" /></label>
                  <label><div className="muted small">改善点</div><textarea className="note" rows={1} value={noteWrong} onChange={(e) => setNoteWrong(e.target.value)} placeholder="例）利確が早すぎた。もう少し引っ張れば目標価格に到達していた。感情で決済してしまった。" /></label>
                  <label><div className="muted small">次回の約束</div><textarea className="note" rows={1} value={noteNext} onChange={(e) => setNoteNext(e.target.value)} placeholder="例）利確ポイントを2段階に分けて、半分は早めに、残りは目標価格まで引っ張る。チャートに目標価格のラインを引いておく。" /></label>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 右列 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* トレード日記見出しと高さを揃える */}
          <div className="td-diary-heading" style={{ marginTop: 0 }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 700, opacity: 0, pointerEvents: "none" }}>スペーサー</h2>
          </div>

          {/* 画像アップロード */}
          <section className="td-card" id="imageCard">
            <div className="td-section-title"><h2>画像</h2></div>
            <div className="upanel">
              <div className="uactions">
                <label className="td-btn" htmlFor="imgFile">画像を選択</label>
                <span className="small muted">.jpg/.jpeg/.gif/.png、上限 <strong>3ファイル・3MB</strong></span>
                <button
                  className="td-btn"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    captureCanvas(equityRef.current);
                    captureCanvas(histRef.current);
                    captureCanvas(heatRef.current);
                    showToast("3つのチャートを保存しました", 'success');
                  }}
                >
                  画像を保存
                </button>
              </div>
              <input
                id="imgFile"
                type="file"
                accept=".jpg,.jpeg,.gif,.png,image/jpeg,image/png,image/gif"
                multiple
                style={{ display: "none" }}
                onChange={(e) => onFiles(e.target.files)}
              />
              <div className="thumbs">
                {images.length === 0 && <div className="muted small">まだ画像はありません。</div>}
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="thumb"
                    onClick={() => setImgPreview(img.url)}
                  >
                    <img src={img.url} alt="chart" />
                    <button
                      className="del"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("削除しますか？")) {
                          setImages(images.filter((x) => x.id !== img.id));
                        }
                      }}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* タグ */}
          <section className="td-card" id="tagCard">
            <div className="td-section-title"><h2>タグ</h2></div>
            <div className="chips-wrap">
              <div className="chips" id="tagArea">
                {tags.map((t) => (
                  <span key={t} className="chip" title="クリックで削除" onClick={() => removeTag(t)}>{t}</span>
                ))}
              </div>
            </div>
            <div className="tag-actions" style={{ marginTop: 12 }}>
              <button className="td-btn" type="button" onClick={openTagModal}>＋タグを追加</button>
            </div>
          </section>

          {/* AIアドバイス */}
          <AIAdviceSection
            tradeData={row}
            kpi={kpi}
            diaryData={{
              entryEmotion,
              entryBasis,
              techSet,
              marketSet,
              exitTriggers,
              exitEmotion,
              noteRight,
              noteWrong,
              noteNext,
            }}
          />

          {/* 可視化（3枚） */}
          <section className="td-card td-viz" id="vizCard">
            <div className="td-section-title"><h2>パフォーマンス分析</h2></div>

            <button
              type="button"
              className="td-btn"
              style={{ marginTop: 8, width: "100%" }}
              onClick={() => setExpandAnalysis(!expandAnalysis)}
            >
              {expandAnalysis ? "分析結果を閉じる" : "分析結果を見る"}
            </button>

            {expandAnalysis && (
              <div className="charts-vertical" style={{ marginTop: 12 }}>
                <div className="chart-card">
                  <h4>{UI_TEXT.cumulativeProfit}（時間）<span className="legend">決済順の累計</span></h4>
                  <div className="chart-box"><canvas ref={equityRef} /></div>
                </div>
                <div className="chart-card">
                  <h4>{UI_TEXT.profitHistogram}</h4>
                  <div className="chart-box"><canvas ref={histRef} /></div>
                </div>
                <div className="chart-card">
                  <h4>曜日×時間ヒートマップ<span className="legend">勝率（%）</span></h4>
                  <div className="chart-box"><canvas ref={heatRef} /></div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 画像プレビュー */}
      {imgPreview && (
        <div className="img-modal" onClick={() => setImgPreview(null)} aria-hidden={false}>
          <img src={imgPreview} alt="preview" />
        </div>
      )}

      {/* リンク済みメモ */}
      <section className="td-card td-card-full">
        <div className="td-section-title">
          <h2>リンク済みメモ</h2>
        </div>
        <div className="linked-memos-table">
          <table>
            <thead>
              <tr>
                <th>タイトル</th>
                <th>種類</th>
                <th>更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loadQuick().filter(m => m.linkedTo).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }} className="muted small">
                    リンク済みメモはありません
                  </td>
                </tr>
              ) : (
                loadQuick().filter(m => m.linkedTo).map((m) => {
                  const linkedTrade = chartTrades.find(t => t.ticket === m.linkedTo);
                  const title = linkedTrade
                    ? `${linkedTrade.item} | ${m.linkedTo === row.ticket ? '取引' : ''}ノート (${new Date(m.entry.time).toLocaleDateString('ja-JP')})`
                    : `メモ (${new Date(m.entry.time).toLocaleDateString('ja-JP')})`;
                  const type = m.linkedTo === row.ticket ? '取引' : '日次';
                  const updated = new Date(m.entry.time).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).replace(/\//g, '/');

                  return (
                    <tr key={m.tempId}>
                      <td>{title}</td>
                      <td>{type}</td>
                      <td>{updated}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="td-btn" onClick={() => {
                            showToast(`詳細表示機能は未実装です`, 'info');
                          }}>表示</button>
                          <button className="td-btn" onClick={() => {
                            if (confirm('このメモのリンクを解除しますか？')) {
                              let arr = loadQuick();
                              const idx = arr.findIndex(x => x.tempId === m.tempId);
                              if (idx >= 0) {
                                arr[idx].linkedTo = undefined;
                                saveQuick(arr);
                                setPending(arr.filter((x) => !x.linkedTo));
                              }
                            }
                          }}>リンク解除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 未リンクメモ（簡易表示） */}
      <section className="td-card td-card-full">
        <div className="td-section-title">
          <h2>保留メモ（未リンク）</h2>
          <span className="pill">{pending.length}件</span>
        </div>
        <div className="pending-list">
          {pending.length === 0 && <div className="muted small">未リンクの仮メモはありません。</div>}
          {pending.map((m) => (
            <div key={m.tempId} className="pending-card">
              <div>
                <div><strong>{m.symbol}</strong> {m.side} <span className="muted small">tempId: {m.tempId}</span></div>
                <div className="pending-meta">
                  予定:{isNaN(m.entry.planned as any) ? "—" : m.entry.planned} /
                  実:{isNaN(m.entry.actual as any) ? "—" : m.entry.actual} /
                  lot {isNaN(m.entry.size as any) ? "—" : m.entry.size} /
                  {new Date(m.entry.time).toLocaleString()}
                </div>
                {m.note && <div className="small">{m.note}</div>}
              </div>
              <div className="pending-actions">
                <button className="td-btn" onClick={() => {
                  const candidates = chartTrades.map((t) => {
                    let score = 0;
                    if (t.item.toUpperCase() === m.symbol.toUpperCase()) score += 40;
                    if (t.side === m.side) score += 20;
                    const td = Math.abs(new Date(t.openTime).getTime() - new Date(m.entry.time).getTime()) / 60000;
                    score += Math.max(0, 20 - Math.min(20, td));
                    const ap = m.entry.actual as any;
                    if (!isNaN(ap)) {
                      const pd = Math.abs(t.openPrice - ap);
                      score += Math.max(0, 20 - Math.min(20, pd * 100));
                    }
                    return { ticket: t.ticket, item: t.item, side: t.side, score };
                  }).sort((a, b) => b.score - a.score).slice(0, 3);
                  showToast(`リンク候補: ${candidates.length}件の取引が見つかりました`, 'info');
                }}>候補を見る</button>
                <button
                  className="td-btn"
                  onClick={() => {
                    if (confirm("削除しますか？")) {
                      let arr = loadQuick();
                      arr = arr.filter((x) => x.tempId !== m.tempId);
                      saveQuick(arr);
                      setPending(arr.filter((x) => !x.linkedTo));
                    }
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* タグ候補モーダル */}
      {tagModalOpen && (
        <div className="modal" onClick={closeTagModal} aria-hidden={false}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <div className="top">
              <h3>タグ候補から追加</h3>
              <button className="td-btn" onClick={closeTagModal}>
                閉じる
              </button>
            </div>

            <div className="row2" style={{ marginBottom: 8 }}>
              <input
                className="input"
                placeholder="自由入力でタグを追加"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value;
                    if (v) {
                      addTagDirect(v);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <button
                className="td-btn"
                onClick={() => {
                  const el =
                    document.querySelector<HTMLInputElement>(
                      ".panel .row2 .input"
                    );
                  if (el && el.value.trim()) {
                    addTagDirect(el.value.trim());
                    el.value = "";
                  }
                }}
              >
                追加
              </button>
            </div>

            {[
              {
                name: "リスク・レバ・サイズ",
                items: ["ハイレバ", "低レバ", "ロット固定", "ロット段階", "リスク控えめ"],
              },
              {
                name: "建玉運用",
                items: ["分割エントリー", "追撃（ピラミ）", "追加NG", "部分撤退", "同値撤退"],
              },
              {
                name: "ストップ/退出",
                items: ["逆指値徹底", "ストップ浅め", "ストップ広め", "トレーリング"],
              },
              {
                name: "利確スタイル",
                items: ["早利確", "引っ張る", "半分利確"],
              },
              {
                name: "ルール/メンタル",
                items: ["コツコツ", "ドカン回避", "ルール順守", "ルール逸脱（要反省）"],
              },
              {
                name: "時間帯・セッション",
                items: [
                  "東京朝（〜9時）",
                  "東京昼（9–15時）",
                  "欧州入り（15–17時）",
                  "ロンドン午後（17–21時）",
                  "NY序盤（22–1時）",
                  "NY引け前（4–6時）",
                ],
              },
            ].map((cat) => (
              <section key={cat.name} style={{ marginTop: 8 }}>
                <h4 style={{ margin: "8px 0" }}>{cat.name}</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {cat.items.map((t) => (
                    <button
                      key={t}
                      className="td-btn"
                      onClick={() => addTagDirect(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
