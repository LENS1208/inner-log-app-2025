// src/widgets/DiaryIndexPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../tradeDiary.css";
import { showToast } from "../lib/toast";

/* ========= 型 ========= */
type Diary = {
  tempId: string;
  symbol: string;                        // 例: USDJPY（英大）
  side: "BUY" | "SELL";
  entry: { actual?: number | null; size?: number | null; time: string }; // ISO
  entry_emotion?: string | null;
  ai: { side?: string; follow?: string };
  note?: string;
  linkedTo: string | null;               // ticket id
};
type DiaryImage = { id: string; dataUrl: string; createdAt: string };
type TradeRow = { ticket: string; item: string; side: "BUY" | "SELL"; openTime: string; openPrice: number; size: number };

/* ========= ストレージ ========= */
const KEY = "quick_memos_v1";
const IMGKEY = (tempId: string) => `quick_memo_images_${tempId}`;
const loadDiaries = (): Diary[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const saveDiaries = (arr: Diary[]) => localStorage.setItem(KEY, JSON.stringify(arr));
const loadImages = (tempId: string): DiaryImage[] => { try { return JSON.parse(localStorage.getItem(IMGKEY(tempId)) || "[]"); } catch { return []; } };
const saveImages = (tempId: string, list: DiaryImage[]) => localStorage.setItem(IMGKEY(tempId), JSON.stringify(list));

/* ========= 取引データ（候補用） ========= */
function loadTrades(): TradeRow[] {
  try { const raw = localStorage.getItem("trade_diary_trades"); if (raw) return JSON.parse(raw); } catch {}
  const now = Date.now(), items = ["USDJPY", "EURUSD", "GBPJPY", "AUDUSD"]; const arr: TradeRow[] = [];
  for (let i = 0; i < 20; i++) {
    const item = items[i % items.length], side: "BUY" | "SELL" = Math.random() > 0.5 ? "BUY" : "SELL";
    const openTime = new Date(now - (i + 1) * 3600_000).toISOString();
    const openPrice = Number((1 + Math.random()).toFixed(3)), size = [0.2, 0.3, 0.5, 1.0][i % 4];
    arr.push({ ticket: `T${100000 + i}`, item, side, openTime, openPrice, size });
  }
  return arr;
}

/* ========= ユーティリティ ========= */
const nowISO = () => new Date().toISOString();
const pad2 = (n: number) => String(n).padStart(2, "0");
const upper = (s: string) => s.toUpperCase().replace(/\s+/g, "");
const fmtJIS = (iso: string) => new Date(iso).toLocaleString();
function genTempId(symbol: string) {
  const t = new Date(); return `TMP-${t.getFullYear()}${pad2(t.getMonth() + 1)}${pad2(t.getDate())}-${pad2(t.getHours())}${pad2(t.getMinutes())}${pad2(t.getSeconds())}-${symbol}`;
}
function scoreCandidates(d: Diary, trades: TradeRow[]) {
  const sym = d.symbol.toUpperCase(); const side = d.side; const base = new Date(d.entry.time).getTime(); const ap = Number(d.entry.actual);
  return trades.map(t => {
    let s = 0;
    if (t.item.toUpperCase() === sym) s += 40;
    if (t.side === side) s += 20;
    const td = Math.abs(new Date(t.openTime).getTime() - base) / 60000;  // 分差
    s += Math.max(0, 20 - Math.min(20, td));
    if (!Number.isNaN(ap)) { const pd = Math.abs(t.openPrice - ap); s += Math.max(0, 20 - Math.min(20, pd * 100)); }
    return { ...t, score: Math.round(s) };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
}

/* ========= トースト ========= */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const show = (m: string) => { setMsg(m); if (timer.current) clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(null), 2200); };
  const Toast = msg ? (
    <div id="toast" style={{ position: "fixed", right: 16, top: 16, zIndex: 10001, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}>
      {msg}
    </div>
  ) : null;
  return { show, Toast };
}

/* ========= 画像ドロップゾーン ========= */
function Dropzone({ tempId, maxFiles = 3 }: { tempId: string; maxFiles?: number }) {
  const [imgs, setImgs] = useState<DiaryImage[]>(() => loadImages(tempId));
  const fileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => setImgs(loadImages(tempId)), [tempId]);

  const addImages = (files: FileList | File[]) => {
    const allowed = ["image/jpeg", "image/png", "image/gif"]; let list = [...imgs];
    for (const f of Array.from(files)) {
      if (list.length >= maxFiles) break;
      // @ts-ignore
      const type = f.type || ""; if (!allowed.includes(type)) { showToast(`未対応の形式です: ${(f as any).name}`, 'error'); continue; }
      if ((f as File).size > 3 * 1024 * 1024) { showToast(`サイズ上限3MBを超えています: ${(f as any).name}`, 'error'); continue; }
      const reader = new FileReader();
      reader.onload = () => { list = [{ id: `img_${Date.now()}_${Math.random().toString(16).slice(2)}`, dataUrl: String(reader.result), createdAt: nowISO() }, ...list]; saveImages(tempId, list); setImgs([...list]); };
      reader.readAsDataURL(f as File);
    }
  };
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => { e.preventDefault(); if (e.dataTransfer.files?.length) addImages(e.dataTransfer.files); };
  useEffect(() => { const onPaste = (e: ClipboardEvent) => { const fs = e.clipboardData?.files; if (fs?.length) addImages(fs); }; window.addEventListener("paste", onPaste); return () => window.removeEventListener("paste", onPaste); }, [imgs]);
  const removeImg = (id: string) => { const next = imgs.filter(x => x.id !== id); saveImages(tempId, next); setImgs(next); };

  return (
    <div className="upanel">
      <div className="uactions">
        <label className="td-btn" htmlFor={`file_${tempId}`}>画像を選択</label>
        <span className="small muted">.jpg/.jpeg/.gif/.png、上限 <strong>{maxFiles}ファイル・3MB</strong></span>
        <div className="right" />
      </div>
      <input id={`file_${tempId}`} ref={fileRef} type="file" multiple style={{ display: "none" }}
        accept=".jpg,.jpeg,.gif,.png,image/jpeg,image/png,image/gif"
        onChange={(e) => e.target.files && addImages(e.target.files)} />
      <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={() => fileRef.current?.click()}
        style={{ border: "2px dashed var(--line)", borderRadius: 12, padding: 14, textAlign: "center", color: "var(--muted)", cursor: "pointer" }}>
        ここに画像をドロップ（または貼り付け / 画像選択）
      </div>
      <div className="thumbs" style={{ marginTop: 10 }}>
        {imgs.length === 0 && <div className="muted small">まだ画像はありません。</div>}
        {imgs.map(im => (<div key={im.id} className="thumb"><img src={im.dataUrl} alt="img" /><button className="del" onClick={() => removeImg(im.id)}>削除</button></div>))}
      </div>
    </div>
  );
}

/* ========= 新規/編集/候補モーダル ========= */
function DiaryNewDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (d: Diary) => void; }) {
  const [symbol, setSymbol] = useState(""); const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [actual, setActual] = useState<string>(""); const [size, setSize] = useState<string>("");

  // 日付 + 時/分プルダウン
  const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const now = new Date(); const [entryDate, setEntryDate] = useState<string>(toLocalDate(now));
  const [entryHour, setEntryHour] = useState<string>(pad2(now.getHours())); const [entryMin, setEntryMin] = useState<string>(pad2(now.getMinutes()));

  const [emotion, setEmotion] = useState<string>(""); const [aiSide, setAiSide] = useState<string>("設定なし");
  const [aiFollow, setAiFollow] = useState<string>("選択しない"); const [note, setNote] = useState<string>("");

  // 画像ステージング
  const [stageImgs, setStageImgs] = useState<DiaryImage[]>([]); const fileRef = useRef<HTMLInputElement | null>(null);
  const addImages = (files: FileList | File[]) => {
    const allowed = ["image/jpeg", "image/png", "image/gif"]; let list = [...stageImgs];
    for (const f of Array.from(files)) {
      // @ts-ignore
      const type = f.type || ""; if (!allowed.includes(type)) { showToast(`未対応の形式です: ${(f as any).name}`, 'error'); continue; }
      if ((f as File).size > 3 * 1024 * 1024) { showToast(`サイズ上限3MBを超えています: ${(f as any).name}`, 'error'); continue; }
      const reader = new FileReader();
      reader.onload = () => { list = [{ id: `img_${Date.now()}_${Math.random().toString(16).slice(2)}`, dataUrl: String(reader.result), createdAt: nowISO() }, ...list]; setStageImgs([...list]); };
      reader.readAsDataURL(f as File);
    }
  };
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => { e.preventDefault(); if (e.dataTransfer.files?.length) addImages(e.dataTransfer.files); };
  useEffect(() => { const onPaste = (e: ClipboardEvent) => { const fs = e.clipboardData?.files; if (fs?.length) addImages(fs); }; window.addEventListener("paste", onPaste); return () => window.removeEventListener("paste", onPaste); }, [stageImgs]);
  const removeStageImg = (id: string) => setStageImgs(prev => prev.filter(x => x.id !== id));

  const { show, Toast } = useToast();
  useEffect(() => { if (open) { setSymbol(""); setSide("BUY"); setActual(""); setSize(""); const n = new Date(); setEntryDate(toLocalDate(n)); setEntryHour(pad2(n.getHours())); setEntryMin(pad2(n.getMinutes())); setEmotion(""); setAiSide("設定なし"); setAiFollow("選択しない"); setNote(""); setStageImgs([]); } }, [open]);

  const onSave = () => {
    const sym = upper(symbol); if (!sym) { showToast("通貨ペアを入力してください（例：USDJPY）", 'error'); return; }
    const iso = new Date(`${entryDate}T${entryHour}:${entryMin}:00`).toISOString(); // 入力 → ISO
    const tempId = genTempId(sym);
    const d: Diary = {
      tempId, symbol: sym, side,
      entry: { actual: actual ? Number(actual) : null, size: size ? Number(size) : null, time: iso },
      entry_emotion: emotion || null, ai: { side: aiSide, follow: aiFollow }, note: note || "", linkedTo: null,
    };
    const arr = loadDiaries(); arr.unshift(d); saveDiaries(arr);
    if (stageImgs.length) saveImages(tempId, stageImgs);
    show("日記を仮保存しました"); onSaved(d); onClose();
  };

  if (!open) return null;
  return (
    <div className="modal" aria-hidden={false} onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="top"><h3>新規日記</h3><button className="td-btn" onClick={onClose}>閉じる</button></div>

        <div className="dlg-grid">
          <label><div className="muted small">通貨ペア（例: USDJPY）</div><input className="input" placeholder="例: USDJPY" value={symbol} onChange={(e) => setSymbol(e.target.value)} /></label>
          <label><div className="muted small">ポジション</div><select className="select" value={side} onChange={(e) => setSide(e.target.value as "BUY"|"SELL")}><option>BUY</option><option>SELL</option></select></label>

          <label><div className="muted small">実エントリー価格（任意）</div><input className="input" placeholder="150.123" value={actual} onChange={(e) => setActual(e.target.value)} /></label>
          <label><div className="muted small">サイズ（lot 任意）</div><input className="input" placeholder="0.50" value={size} onChange={(e) => setSize(e.target.value)} /></label>

          <label>
            <div className="muted small">エントリー日時</div>
            <div className="time-row">
              <input className="input" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              <select className="select time-select" value={entryHour} onChange={(e) => setEntryHour(e.target.value)} aria-label="時">
                {Array.from({ length: 24 }, (_, i) => pad2(i)).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="time-sep">:</span>
              <select className="select time-select" value={entryMin} onChange={(e) => setEntryMin(e.target.value)} aria-label="分">
                {Array.from({ length: 60 }, (_, i) => pad2(i)).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </label>
          <div />

          <label><div className="muted small">エントリー時の感情</div>
            <select className="select" value={emotion} onChange={(e) => setEmotion(e.target.value)}>
              <option value="">選択しない</option>
              <option>落ち着いていた</option><option>自信あり</option><option>少し焦っていた</option>
              <option>なんとなく</option><option>負けを取り返したい</option><option>迷いがある</option><option>置いていかれ不安</option>
            </select>
          </label>
          <label><div className="muted small">AIのポジション予測</div><select className="select" value={aiSide} onChange={(e) => setAiSide(e.target.value)}>
            <option>設定なし</option><option>買い</option><option>売り</option><option>様子見</option></select></label>

          <label><div className="muted small">取引の判断</div><select className="select" value={aiFollow} onChange={(e) => setAiFollow(e.target.value)}>
            <option>選択しない</option><option>AIに従った</option><option>AIに一部従った</option><option>AIを気にせず行動した</option><option>見送った</option></select></label>
          <label><div className="muted small">ファンダメモ（自由入力）</div><input className="input" placeholder="例）CPI直後の乱高下を想定、要人発言あり など" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>

        <div className="td-section-title" style={{ marginTop: 6 }}><h2>チャート画像を添付</h2></div>
        <div className="uactions" style={{ marginBottom: 8 }}>
          <label className="td-btn" htmlFor="newDiaryFile">ファイル選択</label>
          <span className="small muted">選択されていません</span>
          <button className="td-btn" style={{ marginLeft: "auto" }} onClick={() => fileRef.current?.click()}>画像を選択</button>
        </div>
        <input id="newDiaryFile" ref={fileRef} type="file" accept=".jpg,.jpeg,.gif,.png,image/jpeg,image/png,image/gif" multiple style={{ display: "none" }} onChange={(e) => e.target.files && addImages(e.target.files)} />

        <div className="dropzone-large" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={() => fileRef.current?.click()}>
          ここに画像をドロップ（または貼り付け / 画像選択）
        </div>

        <div className="thumbs" style={{ marginTop: 10 }}>
          {stageImgs.length === 0 && <div className="muted small">まだ画像はありません。</div>}
          {stageImgs.map(im => (<div key={im.id} className="thumb"><img src={im.dataUrl} alt="img" /><button className="del" onClick={() => removeStageImg(im.id)}>削除</button></div>))}
        </div>

        <div className="actions" style={{ marginTop: 12 }}>
          <button className="td-btn" onClick={onClose}>閉じる</button>
          <button className="td-btn td-accent" onClick={onSave}>保存</button>
        </div>
      </div>
      {Toast}
    </div>
  );
}

function DiaryEditDialog({ open, onClose, diary, onSaved }: { open: boolean; onClose: () => void; diary: Diary | null; onSaved: (d: Diary) => void; }) {
  const [d, setD] = useState<Diary | null>(diary); const { show, Toast } = useToast();
  useEffect(() => setD(diary), [diary]); if (!open || !d) return null;
  const setField = (path: string, v: any) => setD(prev => { if (!prev) return prev; const next: Diary = JSON.parse(JSON.stringify(prev)); const p = path.split("."); // @ts-ignore
    let cur = next; for (let i = 0; i < p.length - 1; i++) cur = cur[p[i]]; // @ts-ignore
    cur[p[p.length - 1]] = v; return next; });
  const onSave = () => { if (!d) return; const arr = loadDiaries().map(x => (x.tempId === d.tempId ? d : x)); saveDiaries(arr); show("日記を保存しました"); onSaved(d); onClose(); };

  return (
    <div className="modal" aria-hidden={false} onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="top"><h3>日記を編集</h3><button className="td-btn" onClick={onClose}>閉じる</button></div>

        <div className="row2" style={{ marginTop: 8 }}>
          <label><div className="muted small">通貨ペア</div><input className="input" value={d.symbol} onChange={(e) => setField("symbol", upper(e.target.value))} /></label>
          <label><div className="muted small">ポジション</div><select className="select" value={d.side} onChange={(e) => setField("side", e.target.value as "BUY"|"SELL")}><option>BUY</option><option>SELL</option></select></label>
        </div>

        <div className="row2" style={{ marginTop: 8 }}>
          <label><div className="muted small">エントリー価格</div><input className="input" value={d.entry.actual ?? ""} onChange={(e) => setField("entry.actual", e.target.value ? Number(e.target.value) : null)} /></label>
          <label><div className="muted small">サイズ（lot）</div><input className="input" value={d.entry.size ?? ""} onChange={(e) => setField("entry.size", e.target.value ? Number(e.target.value) : null)} /></label>
        </div>

        <div style={{ marginTop: 12 }}><Dropzone tempId={d.tempId} /></div>

        <div className="actions"><button className="td-btn td-accent" onClick={onSave}>保存</button></div>
      </div>
      {Toast}
    </div>
  );
}

function CandidateDialog({ open, onClose, diary }: { open: boolean; onClose: () => void; diary: Diary | null; }) {
  const trades = useMemo(() => loadTrades(), []);
  if (!open || !diary) return null;
  const cands = scoreCandidates(diary, trades);
  const linkTo = (ticket: string) => window.open(`trade-detail.html?ticket=${encodeURIComponent(ticket)}&dataset=A`, "_blank");

  return (
    <div className="modal" aria-hidden={false} onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="top"><h3>リンク候補</h3><button className="td-btn" onClick={onClose}>閉じる</button></div>
        <div className="muted small">tempId: {diary.tempId} ／ {diary.symbol} {diary.side} ／ {fmtJIS(diary.entry.time)}</div>
        <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
          {cands.length === 0 && <div className="muted small">候補は見つかりませんでした。</div>}
          {cands.map(c => (
            <div key={c.ticket} className="pending-card">
              <div>
                <div><strong>{c.item}</strong> {c.side} <span className="muted small">Ticket: {c.ticket}</span></div>
                <div className="pending-meta">Open: {fmtJIS(c.openTime)} ／ {c.openPrice} ／ lot {c.size} ／ Score {c.score}</div>
              </div>
              <div className="pending-actions"><button className="td-btn td-accent" onClick={() => linkTo(c.ticket)}>この取引にリンク</button></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========= 一覧ページ ========= */
export default function DiaryIndexPage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [showUnlinked, setShowUnlinked] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [editTarget, setEditTarget] = useState<Diary | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openCand, setOpenCand] = useState(false);
  const [candTarget, setCandTarget] = useState<Diary | null>(null);

  const reload = useCallback(() => {
    const arr = loadDiaries(); setDiaries(showUnlinked ? arr.filter(d => !d.linkedTo) : arr);
  }, [showUnlinked]);
  useEffect(() => { reload(); }, [reload]);

  const removeDiary = (tempId: string) => {
    if (!confirm("この日記を削除しますか？")) return;
    const arr = loadDiaries().filter(d => d.tempId !== tempId); saveDiaries(arr);
    localStorage.removeItem(IMGKEY(tempId)); reload();
  };

  const rows = diaries;

  return (
    <section className="td-root">
      <header className="td-header">
        <h1 className="td-title">日記一覧</h1>
        <div className="td-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label className="small muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={showUnlinked} onChange={(e) => setShowUnlinked(e.target.checked)} />
            未リンクのみ表示
          </label>
          <button className="td-btn td-accent" onClick={() => setOpenNew(true)}>新しい日記をつける</button>
        </div>
      </header>

      <div className="td-card diary-list">
        <div className="td-section-title">
          <h2>リンク待ちの日記一覧</h2>
          <div className="small muted">取引にまだリンクしていない日記です。候補から紐付けできます。　<strong>{rows.length} 件</strong></div>
        </div>

        {rows.length === 0 && <div className="muted small">まだ日記がありません。</div>}

        {rows.length > 0 && (
          <table role="grid" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th className="nowrap">作成時刻</th>
                <th>通貨ペア</th>
                <th>ポジション</th>
                <th className="num">サイズ(lot)</th>
                <th className="num">エントリー価格</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(d => (
                <tr key={d.tempId} className="row">
                  <td className="nowrap">{fmtJIS(d.entry.time)}</td>
                  <td>{d.symbol}</td>
                  <td>{d.side === "BUY" ? "買い" : "売り"}</td>
                  <td className="num">{isFinite(Number(d.entry.size)) ? Number(d.entry.size).toFixed(2) : "—"}</td>
                  <td className="num">{isFinite(Number(d.entry.actual)) ? String(Number(d.entry.actual)) : "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="td-btn" onClick={() => { setEditTarget(d); setOpenEdit(true); }}>編集</button>
                      <button className="td-btn" onClick={() => { setCandTarget(d); setOpenCand(true); }}>候補を見る</button>
                      <button className="td-btn" onClick={() => removeDiary(d.tempId)}>削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* モーダル群 */}
      <DiaryNewDialog  open={openNew}  onClose={() => setOpenNew(false)}  onSaved={() => reload()} />
      <DiaryEditDialog open={openEdit} onClose={() => setOpenEdit(false)} diary={editTarget} onSaved={() => reload()} />
      <CandidateDialog open={openCand} onClose={() => setOpenCand(false)} diary={candTarget} />
    </section>
  );
}
