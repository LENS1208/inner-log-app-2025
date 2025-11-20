// src/widgets/TradeListPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Trade } from "../lib/types";
import TradesTable from "../components/TradesTable";
import { parseCsvText } from "../lib/csv";
import { useDataset, Filters } from "../lib/dataset.context";
import { getAllTrades, dbToTrade, tradeToDb, insertTrades, deleteAllTrades } from "../lib/db.service";
import { showToast } from "../lib/toast";

function mapToRow(t: Trade) {
  return {
    ticket: t.ticket || t.id,
    datetime: t.datetime,
    symbol: t.pair,
    side: t.side,
    pnl_jpy: t.profitYen,
    pips: t.pips,
    size: t.volume,
    entry: t.openPrice,
    exit: t.closePrice,
    swap: t.swap,
    note: t.memo || t.comment || "",
  };
}

function applyFiltersToRows(rows: any[], filters: Filters) {
  const toUTC = (d: string | Date) => (typeof d === "string" ? new Date(d) : d);
  const weekdayOf = (d: Date) => d.getUTCDay();
  const sessionOf = (h: number) => (h >= 5 && h <= 15 ? "asia" : h >= 16 && h <= 21 ? "london" : h >= 22 || h <= 1 ? "ny" : "thin");
  const normalizeSymbol = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

  return rows.filter((r) => {
    const dt = toUTC(r.datetime as any);
    if (Number.isNaN(dt.getTime())) return false;

    const hour = dt.getUTCHours();
    const wday = weekdayOf(dt);

    if (filters.symbol && normalizeSymbol(r.symbol) !== normalizeSymbol(filters.symbol)) return false;
    if (filters.session && sessionOf(hour) !== filters.session) return false;

    if (filters.weekday) {
      if (filters.weekday === "weekdays" && (wday === 0 || wday === 6)) return false;
      if (filters.weekday === "weekend" && (wday !== 0 && wday !== 6)) return false;
      if (/^[0-6]$/.test(filters.weekday) && Number(filters.weekday) !== wday) return false;
    }

    if (filters.side && r.side !== filters.side) return false;

    if (filters.pnl) {
      if (filters.pnl === "win" && !(r.pnl_jpy > 0)) return false;
      if (filters.pnl === "loss" && !(r.pnl_jpy < 0)) return false;
    }

    if (filters.from && dt < new Date(filters.from + "T00:00:00Z")) return false;
    if (filters.to && dt > new Date(filters.to + "T23:59:59Z")) return false;

    return true;
  });
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

function sortRows(rows: any[], sortConfig: SortConfig) {
  if (!sortConfig) return rows;

  return [...rows].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (sortConfig.key === 'datetime') {
      const aTime = new Date(aVal).getTime();
      const bTime = new Date(bVal).getTime();
      return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
    }

    if (sortConfig.key === 'symbol') {
      const aStr = String(aVal || '').toUpperCase();
      const bStr = String(bVal || '').toUpperCase();
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    }

    if (sortConfig.key === 'side') {
      const aStr = String(aVal || '').toUpperCase();
      const bStr = String(bVal || '').toUpperCase();
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    }

    if (['pnl_jpy', 'pips', 'size', 'swap'].includes(sortConfig.key)) {
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
    }

    return 0;
  });
}

export default function TradeListPage() {
  console.log("🔄 TradeListPage render");
  const [srcRows, setSrcRows] = useState<Trade[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'datetime', direction: 'desc' });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { filters, dataset, useDatabase } = useDataset();

  // データ読み込み
  useEffect(() => {
    console.log("📥 TradeListPage: Loading data", { useDatabase, dataset });
    setLoading(true);
    (async () => {
      if (useDatabase) {
        try {
          const dbTrades = await getAllTrades(dataset);
          const trades = dbTrades.map(dbToTrade);
          console.log("✅ Loaded from database:", trades.length, { dataset });
          setSrcRows(trades);
        } catch (err) {
          console.error("❌ Error loading from database:", err);
          setSrcRows([]);
        }
      } else {
        const candidates = [
          `/demo/${dataset}.csv`,
          `/demo/sample/${dataset}.csv`,
          `/demo/demo_${dataset}.csv`,
        ];
        for (const url of candidates) {
          try {
            console.log("🔍 Trying:", url);
            const cacheBuster = `?t=${Date.now()}`;
            const res = await fetch(url + cacheBuster, { cache: "no-store" });
            if (!res.ok) {
              console.log("❌ Failed:", url, res.status);
              continue;
            }
            const text = await res.text();
            const trades = parseCsvText(text);
            console.log("✅ Parsed trades:", trades.length, "from", url);
            if (Array.isArray(trades) && trades.length) {
              setSrcRows(trades);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error("❌ Error loading", url, err);
          }
        }
        console.log("⚠️ No data loaded, setting empty array");
        setSrcRows([]);
      }
      setLoading(false);
    })();
  }, [dataset, useDatabase]);

  // バナーのボタン（fx:openUpload / fx:preset）と連携
  useEffect(() => {
    const openUpload = () => {
      console.log('📤 Upload button clicked from header');
      fileRef.current?.click();
    };

    const tradesUpdated = async () => {
      console.log('🔄 Trades updated, reloading from database');
      if (useDatabase) {
        const dbData = await getAllTrades(dataset);
        setSrcRows(dbData.map(dbToTrade));
        console.log(`✅ Reloaded ${dbData.length} trades from database`, { dataset });
      }
    };

    const onPreset = (e: Event) => {
      const n = (e as CustomEvent<"A" | "B" | "C">).detail;
      if (!n) return;
      const candidates = [
        `/demo/${n}.csv`,
        `/demo/sample/${n}.csv`,
        `/demo/demo_${n}.csv`,
      ];
      (async () => {
        for (const url of candidates) {
          try {
            const cacheBuster = `?t=${Date.now()}`;
            const r = await fetch(url + cacheBuster, { cache: "no-store" });
            if (!r.ok) continue;
            const t = await r.text();
            const tr = parseCsvText(t);
            if (Array.isArray(tr) && tr.length) {
              setSrcRows(tr);
              return;
            }
          } catch {}
        }
        setSrcRows([]);
      })();
    };
    (window as any).addEventListener("fx:openUpload", openUpload);
    (window as any).addEventListener("fx:tradesUpdated", tradesUpdated);
    (window as any).addEventListener("fx:preset", onPreset);
    return () => {
      (window as any).removeEventListener("fx:openUpload", openUpload);
      (window as any).removeEventListener("fx:tradesUpdated", tradesUpdated);
      (window as any).removeEventListener("fx:preset", onPreset);
    };
  }, [useDatabase]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    console.log('📂 File selected');
    const f = e.target.files?.[0];
    if (!f) {
      console.log('⚠️ No file selected');
      return;
    }

    console.log('📄 File:', f.name, 'Size:', f.size, 'bytes');
    console.log('🗂️ useDatabase:', useDatabase);

    try {
      const text = await f.text();
      console.log('📝 File content length:', text.length);

      const trades = parseCsvText(text);
      console.log('📊 Parsed trades:', trades.length);

      const MAX_TRADES = 50000;
      if (trades.length > MAX_TRADES) {
        showToast(`アップロードできる取引回数の最大は5万回です。${trades.length.toLocaleString()}回が検出されたため、${MAX_TRADES.toLocaleString()}回のみアップロードされます。`, 'error');
      }

      const tradesToUpload = trades.slice(0, MAX_TRADES);

      if (tradesToUpload.length > 0) {
        console.log('💾 Saving to database...');

        // Delete existing user-uploaded trades first
        await deleteAllTrades();
        console.log('🗑️ Deleted existing user-uploaded trades');

        const dbTrades = tradesToUpload.map(tradeToDb);
        console.log('🔄 Converted to DB format:', dbTrades.length);

        await insertTrades(dbTrades);
        console.log(`✅ Uploaded ${tradesToUpload.length} trades to database`);

        showToast(`${tradesToUpload.length}件の取引履歴をアップロードしました`, 'success');

        // Reload page to refresh all data
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      console.error('❌ Error uploading file:', err);
      showToast('ファイルのアップロードに失敗しました', 'error');
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  const allRows = useMemo(() => {
    console.log("🔄 Computing rows. srcRows:", srcRows.length, "filters:", filters);
    const mapped = (srcRows || []).map(mapToRow);
    console.log("📊 Mapped rows:", mapped.length);
    const filtered = applyFiltersToRows(mapped, filters);
    console.log("✅ Filtered rows:", filtered.length);
    const sorted = sortRows(filtered, sortConfig);
    console.log("🔀 Sorted rows:", sorted.length);
    return sorted;
  }, [srcRows, filters, sortConfig]);

  const totalPages = Math.ceil(allRows.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const paginatedRows = allRows.slice(startIdx, endIdx);

  const handleSort = (columnId: string) => {
    const SORTABLE_COLUMNS = ['datetime', 'symbol', 'side', 'pnl_jpy', 'pips', 'size', 'swap'];
    if (!SORTABLE_COLUMNS.includes(columnId)) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === columnId && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnId, direction });
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, rowsPerPage]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onPick} style={{ display: "none" }} />

      <TradesTable rows={paginatedRows as any[]} sortConfig={sortConfig} onSort={handleSort} />

      {/* Pagination Controls */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px",
        background: "var(--surface)",
        borderRadius: 12,
        border: "1px solid var(--line)",
      }}>
        {/* Page Navigation */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: currentPage === 1 ? "var(--chip)" : "var(--surface)",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              color: currentPage === 1 ? "var(--muted)" : "var(--ink)",
            }}
          >
            ←
          </button>

          {Array.from({ length: Math.min(6, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 6) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 5 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  background: currentPage === pageNum ? "var(--accent)" : "var(--surface)",
                  color: currentPage === pageNum ? "var(--button-primary-text)" : "var(--ink)",
                  cursor: "pointer",
                  fontWeight: currentPage === pageNum ? 600 : 400,
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: currentPage === totalPages ? "var(--chip)" : "var(--surface)",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              color: currentPage === totalPages ? "var(--muted)" : "var(--ink)",
            }}
          >
            →
          </button>
        </div>

        {/* Records per page selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>表示件数:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              const newValue = Number(e.target.value);
              console.log('📊 Changing rowsPerPage from', rowsPerPage, 'to', newValue);
              setRowsPerPage(newValue);
            }}
            style={{
              padding: "6px 32px 6px 12px",
              border: "1px solid var(--input-border)",
              borderRadius: 6,
              background: "var(--button-primary-bg)",
              color: "var(--button-primary-text)",
              fontSize: 14,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    </div>
  );
}
