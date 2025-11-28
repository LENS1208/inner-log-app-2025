import React, { useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { HelpIcon } from "../common/HelpIcon";
import { getLossColor, getAccentColor } from "../../lib/chartColors";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Trade = {
  id: string;
  symbol: string;
  side: "long" | "short";
  entry: string;
  exit: string;
  pnl: number;
};

type ChartPoint = { name: string; pnl: number };

export type InsightsSectionProps = {
  weeklySummary: ChartPoint[];
  weekdayPerformance: ChartPoint[];
  hourlyPerformance: ChartPoint[];
  durationPerformance: ChartPoint[];
  weekendTrades: Trade[];
  overnightTrades: Trade[];
  initialTab?: "weekend" | "overnight";
  pageSize?: number;
  bestDay?: { date: string; pnl: number } | null;
  worstDay?: { date: string; pnl: number } | null;
  maxDailyDD?: number | null;
  allSymbols: { symbol: string; pnl: number; count: number; winrate: number; avgPnl: number; pf: number }[];
  topTags: { tag: string; pnl: number; winrate: number }[];
  expectationRows: {
    label: string;
    count: number;
    avgPnl: number;
    winrate?: number | null;
    pf?: number | null;
  }[];
};

const currencyJPY = (n: number) => {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${Math.round(n).toLocaleString("ja-JP")}円`;
};

const formatJapaneseDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  const date = new Date(dateStr);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
};

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hour}:${min}`;
};

export default function InsightsSection(props: InsightsSectionProps) {
  const {
    weeklySummary,
    weekdayPerformance,
    hourlyPerformance,
    durationPerformance,
    weekendTrades,
    overnightTrades,
    initialTab = "weekend",
    pageSize = 10,
    bestDay,
    worstDay,
    maxDailyDD,
    allSymbols,
    topTags,
    expectationRows,
  } = props;

  const [activeTab, setActiveTab] = useState<"weekend" | "overnight">(initialTab);
  const [currentPage, setCurrentPage] = useState(0);

  const currentTrades = activeTab === "weekend" ? weekendTrades : overnightTrades;
  const totalPages = Math.ceil(currentTrades.length / pageSize);
  const paginatedTrades = useMemo(() => {
    const start = currentPage * pageSize;
    return currentTrades.slice(start, start + pageSize);
  }, [currentTrades, currentPage, pageSize]);

  const tradesStats = useMemo(() => {
    const count = currentTrades.length;
    const sumPnl = currentTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgHrs =
      currentTrades.length > 0
        ? currentTrades.reduce((sum, t) => {
            const entryMs = new Date(t.entry).getTime();
            const exitMs = new Date(t.exit).getTime();
            return sum + (exitMs - entryMs) / (1000 * 60 * 60);
          }, 0) / currentTrades.length
        : 0;
    return { count, sumPnl, avgHrs };
  }, [currentTrades]);

  const createBarChartData = (data: ChartPoint[]) => ({
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: data.map((d) => d.pnl),
        backgroundColor: data.map((d) => (d.pnl >= 0 ? '#0084C7' : '#EF4444')),
      },
    ],
  });

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => currencyJPY(context.parsed.y),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${Math.round(value).toLocaleString()}円`,
        },
      },
    },
  };

  const handleTabChange = (tab: "weekend" | "overnight") => {
    setActiveTab(tab);
    setCurrentPage(0);
  };

  return (
    <section className="insights-section" style={{ marginTop: 24, width: "100%" }}>
      <style>{`
        .insights-section {
          --card-padding: 16px;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
          min-width: 0;
        }

        .insights-grid > div {
          min-width: 0;
          overflow: hidden;
        }

        .insight-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: var(--card-padding);
        }

        @media (min-width: 640px) {
          .insights-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .insights-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .insights-grid-full-width {
          grid-column: 1 / -1;
        }

        .insights-grid-secondary {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
          min-width: 0;
          margin-top: 16px;
        }

        @media (min-width: 640px) {
          .insights-grid-secondary {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .insights-grid-secondary {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .insights-section {
            --card-padding: 12px;
          }

          .insights-grid {
            gap: 12px;
          }
        }
      `}</style>

      <div className="insights-grid">
        {/* 1) 週別サマリー */}
        <div className="insight-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            週別サマリー
            <HelpIcon text="各週の損益" />
          </div>
          <div style={{ height: 300 }}>
            <Bar data={createBarChartData(weeklySummary)} options={barOptions} />
          </div>
        </div>

        {/* 2) 曜日別パフォーマンス */}
        <div className="insight-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            曜日別パフォーマンス
            <HelpIcon text="曜日ごとの損益" />
          </div>
          <div style={{ height: 300 }}>
            <Bar data={createBarChartData(weekdayPerformance)} options={barOptions} />
          </div>
        </div>

        {/* 3) 時間帯パフォーマンス */}
        <div className="insight-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            時間帯パフォーマンス
            <HelpIcon text="時間帯ごとの損益" />
          </div>
          <div style={{ height: 300 }}>
            <Bar data={createBarChartData(hourlyPerformance)} options={barOptions} />
          </div>
        </div>

        {/* 4) 保有時間レンジ */}
        <div className="insight-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>
            保有時間レンジ
            <HelpIcon text="保有時間ごとの損益" />
          </div>
          <div style={{ height: 300 }}>
            <Bar data={createBarChartData(durationPerformance)} options={barOptions} />
          </div>
        </div>
      </div>

      {/* あなたの傾向 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          あなたの傾向
        </h3>
      </div>

      <div className="insights-grid-secondary">
        {/* 6) 曜日ごとの損益 */}
        <div className="insight-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>
            曜日ごとの損益
            <HelpIcon text="曜日別の詳細データ" />
          </div>
          <div style={{ overflowX: "auto", width: "100%", minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(80px, 1fr) minmax(60px, 80px) minmax(80px, 90px) minmax(60px, 70px) minmax(50px, 60px) minmax(100px, 1fr)",
              gap: 8,
              fontSize: 15,
              color: "var(--muted)",
              fontWeight: "bold",
              paddingBottom: 8,
              borderBottom: "1px solid var(--line)",
              minWidth: "550px",
            }}
          >
            <div>曜日</div>
            <div style={{ textAlign: "right" }}>取引回数</div>
            <div style={{ textAlign: "right" }}>平均損益</div>
            <div style={{ textAlign: "right" }}>勝率</div>
            <div style={{ textAlign: "right" }}>PF</div>
            <div style={{ textAlign: "right" }}>合計損益</div>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, minWidth: "550px" }}>
            {expectationRows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(80px, 1fr) minmax(60px, 80px) minmax(80px, 90px) minmax(60px, 70px) minmax(50px, 60px) minmax(100px, 1fr)",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--ink)",
                  alignItems: "center",
                  paddingBottom: 6,
                  borderBottom: i < expectationRows.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                <div>{row.label}</div>
                <div style={{ textAlign: "right", color: "var(--muted)" }}>{row.count}回</div>
                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 600,
                    color: row.avgPnl >= 0 ? "var(--gain)" : "var(--loss)",
                  }}
                >
                  {currencyJPY(row.avgPnl)}
                </div>
                <div style={{ textAlign: "right", color: "var(--muted)" }}>
                  {row.winrate !== null && row.winrate !== undefined ? `${Math.round(row.winrate * 100)}%` : "—"}
                </div>
                <div style={{ textAlign: "right", color: "var(--muted)" }}>
                  {row.pf !== null && row.pf !== undefined ? (row.pf === Infinity ? '∞' : row.pf.toFixed(1)) : "—"}
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 600,
                    fontSize: 18,
                    color: row.totalPnl >= 0 ? "var(--gain)" : "var(--loss)",
                  }}
                >
                  {currencyJPY(row.totalPnl)}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* 7) 通貨ペアごとの損益 */}
        <div className="insight-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>
            通貨ペアごとの損益
            <HelpIcon text="通貨ペア別の詳細データ" />
          </div>
          <div style={{ overflowX: "auto", width: "100%", minWidth: 0 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(80px, 1fr) minmax(60px, 80px) minmax(80px, 90px) minmax(60px, 70px) minmax(50px, 60px) minmax(100px, 1fr)",
                gap: 8,
                fontSize: 15,
                color: "var(--muted)",
                fontWeight: "bold",
                paddingBottom: 8,
                borderBottom: "1px solid var(--line)",
                minWidth: "550px",
              }}
            >
              <div>通貨ペア</div>
              <div style={{ textAlign: "right" }}>取引回数</div>
              <div style={{ textAlign: "right" }}>平均損益</div>
              <div style={{ textAlign: "right" }}>勝率</div>
              <div style={{ textAlign: "right" }}>PF</div>
              <div style={{ textAlign: "right" }}>合計損益</div>
            </div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, minWidth: "550px" }}>
              {allSymbols.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  データがありません
                </div>
              ) : (
                allSymbols.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(80px, 1fr) minmax(60px, 80px) minmax(80px, 90px) minmax(60px, 70px) minmax(50px, 60px) minmax(100px, 1fr)",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--ink)",
                      alignItems: "center",
                      paddingBottom: 6,
                      borderBottom: i < allSymbols.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <div>{s.symbol}</div>
                    <div style={{ textAlign: "right", color: "var(--muted)" }}>{s.count}回</div>
                    <div style={{
                      textAlign: "right",
                      fontWeight: 600,
                      color: s.avgPnl >= 0 ? "var(--gain)" : "var(--loss)"
                    }}>{currencyJPY(s.avgPnl)}</div>
                    <div style={{ textAlign: "right", color: "var(--muted)" }}>{Math.round(s.winrate)}%</div>
                    <div style={{ textAlign: "right", color: "var(--muted)" }}>{s.pf === Infinity ? '∞' : s.pf.toFixed(2)}</div>
                    <div
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        fontSize: 18,
                        color: s.pnl >= 0 ? "var(--gain)" : "var(--loss)",
                      }}
                    >
                      {currencyJPY(s.pnl)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 8) タグ / Mini Expectation */}
        <div className="insight-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>
            戦略タグ別期待値
            <HelpIcon text="戦略ごとの損益" />
          </div>
          <div style={{ overflowX: "auto", width: "100%", minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(100px, 2fr) minmax(80px, 1fr) minmax(60px, 1fr) 60px",
              gap: 8,
              fontSize: 15,
              color: "var(--muted)",
              fontWeight: "bold",
              paddingBottom: 8,
              borderBottom: "1px solid var(--line)",
              minWidth: "400px",
            }}
          >
            <div>戦略</div>
            <div style={{ textAlign: "right" }}>損益</div>
            <div style={{ textAlign: "right" }}>勝率</div>
            <div style={{ textAlign: "right" }}>注目</div>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8, minWidth: "400px" }}>
            {topTags.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                データがありません
              </div>
            ) : (
              topTags.map((tag, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(100px, 2fr) minmax(80px, 1fr) minmax(60px, 1fr) 60px",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--ink)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tag.tag}</div>
                  <div
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      color: tag.pnl >= 0 ? "var(--gain)" : "var(--loss)",
                    }}
                  >
                    {currencyJPY(tag.pnl)}
                  </div>
                  <div style={{ textAlign: "right" }}>{Math.round(tag.winrate * 100)}%</div>
                  <div style={{ textAlign: "right", fontWeight: 600 }}>
                    {tag.winrate >= 0.6 ? "◎" : tag.winrate >= 0.5 ? "○" : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        </div>

        {/* 9) ベスト/ワーストデイ */}
        <div className="insight-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>
            ベスト/ワーストデイ
            <HelpIcon text="最も良い日と悪い日" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <div
              style={{
                borderRadius: 12,
                padding: 12,
                background: "rgba(0, 132, 199, 0.1)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Best Day</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{formatJapaneseDate(bestDay?.date)}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gain)" }}>
                  {bestDay ? currencyJPY(bestDay.pnl) : "—"}
                </div>
              </div>
            </div>
            <div
              style={{
                borderRadius: 12,
                padding: 12,
                background: "rgba(239, 68, 68, 0.1)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Worst Day</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{formatJapaneseDate(worstDay?.date)}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--loss)" }}>
                  {worstDay ? currencyJPY(worstDay.pnl) : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 参考情報 */}
      <div style={{ marginBottom: 16, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          参考情報
        </h3>
      </div>

      {/* ロールオーバーしたポジション一覧（週またぎ / 日またぎ） full width */}
      <div className="insight-card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>
            ロールオーバーしたポジション一覧（週またぎ / 日またぎ）
            <HelpIcon text="週末や翌日をまたいだ取引" />
          </div>
          <div
            role="tablist"
            aria-label="週またぎ/日またぎ切替"
            style={{ display: "inline-flex", borderRadius: 8, border: "1px solid var(--line)", overflow: "hidden" }}
          >
            <button
              role="tab"
              aria-selected={activeTab === "weekend"}
              onClick={() => handleTabChange("weekend")}
              style={{
                padding: "6px 12px",
                fontSize: 13,
                border: "none",
                background: activeTab === "weekend" ? "var(--accent)" : "transparent",
                color: activeTab === "weekend" ? "#fff" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              週またぎ
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "overnight"}
              onClick={() => handleTabChange("overnight")}
              style={{
                padding: "6px 12px",
                fontSize: 13,
                border: "none",
                background: activeTab === "overnight" ? "var(--accent)" : "transparent",
                color: activeTab === "overnight" ? "#fff" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              日またぎ
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, alignItems: "center", color: "var(--muted)" }}>
          <div>
            件数 <span style={{ fontWeight: 600 }}>{tradesStats.count}</span>
          </div>
          <div>
            合計損益 <span style={{ fontWeight: 600 }}>{currencyJPY(tradesStats.sumPnl)}</span>
          </div>
          <div>
            平均保有時間 <span style={{ fontWeight: 600 }}>{tradesStats.avgHrs.toFixed(1)}</span>h
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              style={{
                padding: "4px 8px",
                border: "1px solid var(--line)",
                borderRadius: 4,
                background: "var(--surface)",
                cursor: currentPage === 0 ? "not-allowed" : "pointer",
                fontSize: 12,
                opacity: currentPage === 0 ? 0.5 : 1,
              }}
              aria-label="前のページ"
            >
              前へ
            </button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {currentPage + 1} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              style={{
                padding: "4px 8px",
                border: "1px solid var(--line)",
                borderRadius: 4,
                background: "var(--surface)",
                cursor: currentPage >= totalPages - 1 ? "not-allowed" : "pointer",
                fontSize: 12,
                opacity: currentPage >= totalPages - 1 ? 0.5 : 1,
              }}
              aria-label="次のページ"
            >
              次へ
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto", width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 80px minmax(200px, 2fr) 140px 100px",
              gap: 8,
              fontSize: 15,
              color: "var(--muted)",
              fontWeight: "bold",
              paddingBottom: 8,
              borderBottom: "1px solid var(--line)",
              minWidth: "600px",
            }}
          >
            <div>通貨ペア</div>
            <div>ポジション</div>
            <div>エントリー日時 → 決済日時</div>
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>ポジション保有時間</div>
            <div style={{ textAlign: "right" }}>損益</div>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {paginatedTrades.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                データがありません
              </div>
            ) : (
              paginatedTrades.map((t, idx) => {
                const entryMs = new Date(t.entry).getTime();
                const exitMs = new Date(t.exit).getTime();
                const hrs = ((exitMs - entryMs) / (1000 * 60 * 60)).toFixed(1);
                return (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "100px 80px minmax(200px, 2fr) 140px 100px",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--ink)",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #f3f4f6",
                      minWidth: "600px",
                    }}
                  >
                    <div>{t.symbol || 'N/A'}</div>
                    <div>{t.side === "long" ? "買い" : "売り"}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {formatDateTime(t.entry)} → {formatDateTime(t.exit)}
                    </div>
                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>{hrs}h</div>
                    <div
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color: t.pnl >= 0 ? "var(--gain)" : "var(--loss)",
                      }}
                    >
                      {currencyJPY(t.pnl)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
