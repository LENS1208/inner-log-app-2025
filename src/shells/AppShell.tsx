// src/shells/AppShell.tsx
import React, { useEffect, useRef, useState } from "react";
import { DatasetProvider, useDataset } from "../lib/dataset.context";
import { AICoachingProvider } from "../lib/aiCoaching.context";
import { CoachingNotification } from "../components/CoachingNotification";
import FiltersBar from "../components/FiltersBar";
import UserMenu from "../components/UserMenu";
import { useTheme } from "../lib/theme.context";
import logoImg from "../assets/inner_logo_1126.png";
import { parseCsvText } from "../lib/csv";
import { tradeToDb, insertTrades, getTradesCount, deleteAllTrades, upsertAccountSummary } from "../lib/db.service";
import { parseHtmlStatement, parseFullHtmlStatement, convertHtmlTradesToCsvFormat } from "../lib/html-parser";
import { showToast } from "../lib/toast";
import { supabase } from "../lib/supabase";

type MenuItem = { key: string; label: string; active?: boolean };
type Props = { children: React.ReactNode };

function shouldShowFilters(path: string): boolean {
  const k = path.split("/")[0];
  if (!k || k === "dashboard") return true;
  if (k === "calendar") return true;
  if (k === "trades") return true;
  if (k === "reports") return true;
  if (k === "ai-evaluation") return false;
  if (k === "forecast" || k === "ai-proposal") return false;
  if (k === "notebook") return false;
  if (k === "settings") return false;
  return false;
}

// ヘッダー（右カラムの上部）
function Header({
  onMenuToggle,
  onFilterToggle,
  showFilters,
  onUploadClick
}: {
  onMenuToggle: () => void;
  onFilterToggle: () => void;
  showFilters: boolean;
  onUploadClick: () => void;
}) {
  const { resetFilters, loading } = useDataset();
  const fullPath = location.hash.replace(/^#\//, "") || "dashboard";
  const showFilterBar = shouldShowFilters(fullPath);

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--bg)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="header-inner">
          {/* 1行目: タイトルとハンバーガー */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px var(--px-mobile)",
              minHeight: "var(--header-h)",
            }}
          >
            {/* ハンバーガーメニュー（モバイルのみ） */}
            <button
              onClick={onMenuToggle}
              className="mobile-only"
              style={{
                width: 40,
                height: 40,
                display: "none",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 5,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label="メニューを開く"
            >
              <span style={{ width: 24, height: 3, background: "var(--ink)", borderRadius: 2 }}></span>
              <span style={{ width: 24, height: 3, background: "var(--ink)", borderRadius: 2 }}></span>
              <span style={{ width: 24, height: 3, background: "var(--ink)", borderRadius: 2 }}></span>
            </button>

            <div style={{ fontSize: 22, fontWeight: 700 }} className="page-title">
              {(() => {
                const fullPath = location.hash.replace(/^#\//, "") || "dashboard";
                const k = fullPath.split("/")[0];
                if (!k || k === "dashboard") return "パフォーマンス分析";
                if (k === "calendar") return "カレンダー";
                if (k === "trades") return "取引一覧";
                if (k === "reports") {
                  const subPath = fullPath.split("/")[1];
                  if (subPath === "time") return "時間軸";
                  if (subPath === "market") return "通貨ペア";
                  if (subPath === "risk") return "リスク管理";
                  if (subPath === "strategy") return "トレード戦略";
                  return "レポート";
                }
                if (k === "ai-evaluation") return "プロファイル";
                if (k === "forecast" || k === "ai-proposal") return "相場スキャン";
                if (k === "notebook") return "トレード日記";
                if (k === "settings") return "設定";
                return "パフォーマンス分析";
              })()}
            </div>

            {/* フィルター表示/非表示トグルボタン（モバイルのみ） */}
            {showFilterBar && (
              <button
                onClick={onFilterToggle}
                className="mobile-only"
                style={{
                  width: 40,
                  height: 40,
                  display: "none",
                  justifyContent: "center",
                  alignItems: "center",
                  background: showFilters ? "var(--accent)" : "var(--surface)",
                  color: showFilters ? "#fff" : "var(--ink)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  cursor: "pointer",
                  padding: 0,
                  marginLeft: "auto",
                }}
                aria-label="フィルターを表示/非表示"
                title="フィルターを表示/非表示"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
              </button>
            )}

            {/* 大画面のみ：1行レイアウト */}
            <div className="header-oneline" style={{ marginLeft: "auto", display: "none", gap: 8, alignItems: "center" }}>
              {showFilterBar && (
                <>
                  {loading && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--muted)'
                    }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        border: '2px solid var(--line)',
                        borderTopColor: 'var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      <span>適用中...</span>
                    </div>
                  )}
                  <FiltersBar />
                  <button
                    onClick={resetFilters}
                    title="リセット"
                    style={{
                      height: 36,
                      padding: "0 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      borderRadius: 12,
                      background: "var(--accent)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "opacity 0.2s ease, transform 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    リセット
                  </button>
                </>
              )}
              <UserMenu />
            </div>
          </div>

          {/* 2行目: 中画面で2行レイアウト */}
          {showFilterBar && (
            <div className="header-twoline" style={{ display: "none", padding: "16px var(--px-desktop) 20px" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: "1 1 auto", minWidth: 0 }}>
                  <FiltersBar />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: "auto" }}>
                  {loading && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--muted)'
                    }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        border: '2px solid var(--line)',
                        borderTopColor: 'var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                    </div>
                  )}
                  <button
                    onClick={resetFilters}
                    title="リセット"
                    style={{
                      height: 36,
                      padding: "0 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      borderRadius: 12,
                      background: "var(--accent)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "opacity 0.2s ease, transform 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    リセット
                  </button>
                  <UserMenu />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* モバイルのみ：フィルター縦配置 */}
        {showFilterBar && showFilters && (
          <div className="mobile-only mobile-filters" style={{ display: "none", padding: "12px 16px", borderTop: "1px solid var(--line)", flexDirection: "column", gap: 10 }}>
            <FiltersBar />
            <div style={{ display: "flex", gap: 8, marginTop: 4, justifyContent: "flex-end" }}>
              <button
                onClick={resetFilters}
                title="リセット"
                style={{
                  height: 40,
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  borderRadius: 12,
                  background: "var(--accent)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease, transform 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.transform = "scale(0.98)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                リセット
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// 左メニュー（左上に固定）
function SideNav({ menu, activeKey, onUploadClick, logoImg, theme, toggleTheme }: { menu: MenuItem[]; activeKey: string; onUploadClick?: () => void; logoImg: string; theme: 'light' | 'dark'; toggleTheme: () => void }) {
  const { dataset, setDataset, useDatabase, dataCount, isInitialized } = useDataset();

  return (
    <aside
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <img src={logoImg} alt="inner log" style={{ display: "block", marginBottom: 12, width: "100%", height: "auto" }} />
      <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
        {menu.map((m) => {
          const getIcon = (key: string) => {
            const baseKey = key.split('/')[0];
            switch (baseKey) {
              case "dashboard":
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                );
              case "calendar":
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                );
              case "trades":
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                );
              case "reports":
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                );
              case "ai-evaluation":
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                );
              case "forecast":
              case "ai-proposal":
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7" cy="15" r="5"></circle>
                    <circle cx="17" cy="15" r="5"></circle>
                    <line x1="12" y1="15" x2="12" y2="13"></line>
                    <line x1="7" y1="10" x2="7" y2="7"></line>
                    <line x1="17" y1="10" x2="17" y2="7"></line>
                    <path d="M9 10C9 10 10 8 12 8C14 8 15 10 15 10"></path>
                  </svg>
                );
              case "notebook":
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                );
              case "settings":
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                  </svg>
                );
              default:
                return (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                );
            }
          };

          const isTrades = m.key === 'trades';

          return (
            <React.Fragment key={m.key}>
              <li style={{ listStyle: "none" }}>
                <a
                  href={`#/${m.key}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textDecoration: "none",
                    padding: "10px 12px",
                    borderRadius: 10,
                    color: "var(--ink)",
                    background: activeKey === m.key ? "rgba(59,130,246,.12)" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.history.replaceState(null, "", `#/${m.key}`);
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", opacity: 0.7 }}>{getIcon(m.key)}</span>
                  <span>{m.label}</span>
                </a>
              </li>
              {isTrades && (
                <>
                  <li style={{ margin: "8px 0" }}>
                    <div style={{ height: 1, background: "var(--line)" }} />
                  </li>
                  <li style={{ listStyle: "none" }}>
                    <button
                      onClick={toggleTheme}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textDecoration: "none",
                        padding: "10px 12px",
                        borderRadius: 10,
                        color: "var(--ink)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontFamily: "inherit",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", opacity: 0.7 }}>
                        {theme === 'dark' ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                          </svg>
                        )}
                      </span>
                      <span>カラーテーマ</span>
                    </button>
                  </li>
                </>
              )}
            </React.Fragment>
          );
        })}
      </ul>
      {/* デモデータボタン: アップロード済みデータがない場合のみ表示 */}
      {isInitialized && !useDatabase && (
        <div style={{ marginTop: 12, padding: "0 4px" }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, paddingLeft: 4 }}>
            デモデータ
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", padding: 4 }}>
            {(["A", "B", "C"] as const).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDataset(d);
                  window.dispatchEvent(new CustomEvent("fx:preset", { detail: d }));
                }}
                style={{
                  padding: "8px 4px",
                  height: 36,
                  background: dataset === d ? "var(--accent)" : "var(--surface)",
                  color: dataset === d ? "#fff" : "var(--ink)",
                  border: 0,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: dataset === d ? 600 : 400,
                  borderRadius: 4,
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "10px 12px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <polyline points="9 15 12 12 15 15"></polyline>
          </svg>
          取引履歴を追加
        </button>
      )}
    </aside>
  );
}

export default function AppShell({ children }: Props) {
  console.log("🔄 AppShell render");
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeKey, setActiveKey] = useState<string>("dashboard");
  const drawerRef = useRef<HTMLDivElement>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    console.log('📤 Header upload button clicked');
    console.log('🔍 fileInputRef.current:', fileInputRef.current);
    console.log('🔍 Current hash:', window.location.hash);

    const currentHash = window.location.hash;
    if (currentHash === '#/trades') {
      console.log('📤 Dispatching fx:openUpload event');
      window.dispatchEvent(new CustomEvent("fx:openUpload"));
    } else {
      console.log('📤 Opening file input...');
      if (fileInputRef.current) {
        fileInputRef.current.click();
        console.log('✅ File input clicked');
      } else {
        console.error('❌ fileInputRef.current is null!');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📂 File selected in AppShell');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('⚠️ No file selected');
      return;
    }

    console.log('📄 File:', file.name, 'Size:', file.size, 'bytes');

    try {
      // 認証チェック（オプショナル）
      console.log('🔐 Checking session...');
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;

      if (user) {
        console.log('✅ User authenticated:', user.id);
      } else {
        console.log('⚠️ No authentication, proceeding without user');
      }

      const text = await file.text();
      console.log('📝 File content length:', text.length);

      const fileName = file.name.toLowerCase();
      let trades;
      let summary = null;

      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        console.log('🌐 Detected HTML file, parsing...');
        const parsed = parseFullHtmlStatement(text);
        console.log('📊 Parsed HTML trades:', parsed.trades.length);
        console.log('💰 Parsed transactions:', parsed.transactions.length);
        console.log('📈 Parsed summary:', parsed.summary);

        if (parsed.trades.length === 0) {
          console.warn('⚠️ No trades found in HTML file');
          showToast('HTML形式から有効な取引データが見つかりませんでした', 'error');
          e.target.value = '';
          return;
        }

        summary = parsed.summary;

        const csvText = convertHtmlTradesToCsvFormat(parsed.trades);
        trades = parseCsvText(csvText);
        console.log('✅ Converted HTML to CSV format:', trades.length, 'trades');
      } else {
        console.log('📄 Parsing as CSV file...');
        trades = parseCsvText(text);
        console.log('📊 Parsed CSV trades:', trades.length);

        // CSVからもsummary情報を取得（window._csvAccountSummaryから）
        if ((window as any)._csvAccountSummary) {
          summary = {
            totalDeposits: (window as any)._csvAccountSummary.totalDeposits || 0,
            totalWithdrawals: (window as any)._csvAccountSummary.totalWithdrawals || 0,
            xmPointsEarned: (window as any)._csvAccountSummary.xmPointsEarned || 0,
            xmPointsUsed: (window as any)._csvAccountSummary.xmPointsUsed || 0,
            totalSwap: (window as any)._csvAccountSummary.totalSwap || 0,
            totalCommission: (window as any)._csvAccountSummary.totalCommission || 0,
            totalProfit: (window as any)._csvAccountSummary.totalProfit || 0,
            closedPL: (window as any)._csvAccountSummary.closedPL || 0,
          };
          console.log('📊 CSV summary from window._csvAccountSummary:', summary);
        }
      }

      if (trades.length > 0) {
        // 既存の取引履歴を削除してから新しいデータを保存
        await deleteAllTrades();
        console.log('🗑️ Deleted all existing trades');

        const dbTrades = trades.map(tradeToDb);
        await insertTrades(dbTrades);
        console.log(`✅ Uploaded ${trades.length} trades to database`);

        // インポート履歴に記録（ユーザーがいる場合のみ）
        if (user) {
          await supabase.from('import_history').insert({
            user_id: user.id,
            filename: file.name,
            rows: trades.length,
            format: fileName.endsWith('.html') || fileName.endsWith('.htm') ? 'HTML' : 'CSV',
          });
          console.log('📝 Import history recorded');
        }

        // HTMLファイルからサマリー情報が取得できた場合は保存
        if (summary) {
          await upsertAccountSummary({
            total_deposits: summary.totalDeposits,
            total_withdrawals: summary.totalWithdrawals,
            xm_points_earned: summary.xmPointsEarned,
            xm_points_used: summary.xmPointsUsed,
            total_swap: summary.totalSwap,
            total_commission: summary.totalCommission,
            total_profit: summary.totalProfit,
            closed_pl: summary.closedPL,
            bonus_credit: summary.xmPointsEarned,
          });
          console.log('📊 Account summary saved to database');
          console.log('💰 XM Points (bonus_credit):', summary.xmPointsEarned);
        }

        // Show success message
        showToast(`${trades.length}件の取引履歴をアップロードしました`, 'success');

        // TradeListPageや他のコンポーネントにイベント発火して再読み込みを促す
        window.dispatchEvent(new CustomEvent("fx:tradesUpdated"));
      } else {
        console.warn('⚠️ No trades parsed');
        showToast('有効な取引データが見つかりませんでした', 'error');
      }
    } catch (error) {
      console.error('❌ Error processing file:', error);
      showToast('ファイルの処理に失敗しました', 'error');
    }

    // input要素をリセット
    e.target.value = '';
  };

  useEffect(() => {
    (async () => {
      try {
        const url = `/menu/app_nav_menu.ja_v1.json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as MenuItem[];
        setMenu(data);
        const fromHash = (location.hash.replace(/^#\//, "") || "").trim();
        setActiveKey(fromHash || data.find((m) => m.active)?.key || data[0]?.key || "dashboard");
      } catch (err) {
        console.error("❌ メニュー読み込み失敗:", err);
        setMenu([
          { key: "dashboard", label: "パフォーマンス分析", active: true },
          { key: "reports/time", label: "時間軸" },
          { key: "reports/market", label: "通貨ペア" },
          { key: "reports/risk", label: "リスク管理" },
          { key: "reports/strategy", label: "トレード戦略" },
          { key: "ai-evaluation", label: "プロファイル" },
          { key: "calendar", label: "カレンダー" },
          { key: "notebook", label: "取引日記" },
          { key: "ai-proposal", label: "相場スキャン" },
          { key: "trades", label: "取引一覧" },
        ]);
        const fromHash = (location.hash.replace(/^#\//, "") || "").trim();
        setActiveKey(fromHash || "dashboard");
      }
    })();
  }, []);

  useEffect(() => {
    const sync = () => {
      setActiveKey(location.hash.replace(/^#\//, "") || "dashboard");

      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        const root = document.getElementById('root');
        if (root) root.scrollTop = 0;

        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.scrollTop = 0;

        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) mainContainer.scrollTop = 0;

        const allScrollable = document.querySelectorAll('[style*="overflow"]');
        allScrollable.forEach(el => {
          if (el instanceof HTMLElement) {
            el.scrollTop = 0;
          }
        });
      });
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setQuickOpen((e as CustomEvent).detail ?? true);
    window.addEventListener("fx:openQuickDiary", handler);
    return () => window.removeEventListener("fx:openQuickDiary", handler);
  }, []);

  return (
    <DatasetProvider>
      <AICoachingProvider>
        <CoachingNotification />
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/html,.html,.htm"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div style={{ display: "flex", minHeight: "100vh", width: "100%", position: "relative" }}>
        {/* 左メニュー：デスクトップは固定、モバイルはドロワー */}
        <div
          className="desktop-sidenav"
          style={{
            width: "var(--sidenav-w)",
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            overflowY: "auto",
            padding: "var(--space-3)",
            background: "var(--bg)",
            zIndex: 10,
          }}
        >
          <SideNav menu={menu} activeKey={activeKey} onUploadClick={handleUploadClick} logoImg={logoImg} theme={theme} toggleTheme={toggleTheme} />
        </div>

        {/* モバイルメニュー（ドロワー） */}
        {open && (
          <>
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 200,
              }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={drawerRef}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: 280,
                maxWidth: "80vw",
                height: "100vh",
                background: "var(--bg)",
                zIndex: 300,
                padding: "var(--space-3)",
                overflowY: "auto",
                boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
              }}
              role="dialog"
              aria-modal="true"
            >
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    padding: 4,
                  }}
                  aria-label="メニューを閉じる"
                >
                  ✕
                </button>
              </div>
              <SideNav menu={menu} activeKey={activeKey} onUploadClick={handleUploadClick} logoImg={logoImg} theme={theme} toggleTheme={toggleTheme} />
            </div>
          </>
        )}

        {/* メインエリア：100%幅（左メニュー分のマージン） */}
        <div
          className="main-content"
          style={{
            flex: 1,
            minHeight: "100vh",
            width: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg)",
            overflow: "auto"
          }}
        >
          <Header
            onMenuToggle={() => setOpen(true)}
            onFilterToggle={() => setShowFilters(!showFilters)}
            showFilters={showFilters}
            onUploadClick={handleUploadClick}
          />
          <main style={{ flex: 1, padding: "12px var(--px-mobile)", width: "100%", maxWidth: "100%", boxSizing: "border-box" }} className="main-container">{children}</main>
        </div>

        {/* 新規日記モーダル */}
        {quickOpen && (
          <div className="modal" onClick={() => setQuickOpen(false)} aria-hidden={false}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>新規日記</div>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>
                このモーダルは取引日記ページ（個別取引）から実装を移行します。
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    cursor: "pointer",
                  }}
                  onClick={() => setQuickOpen(false)}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </AICoachingProvider>
    </DatasetProvider>
  );
}
