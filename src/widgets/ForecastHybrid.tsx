// src/widgets/ForecastHybrid.tsx
import { getAccentColor, getLossColor } from '../lib/chartColors';
import React, { useMemo, useRef, useState, useEffect } from "react";

/* ================== 型 ================== */
type ScenarioKind = "bull" | "range" | "bear";
type Who = "user" | "ai";
type UserRating = "adopted" | "reference" | "rejected" | null;

type Scenario = {
  kind: ScenarioKind;
  probability: number;     // 0-100
  trigger: string;         // 条件（トリガー）
  target: string;          // 目標
  stop: string;            // 損切りライン（＝否定条件）
  rationaleText: string;   // コーチング調・最大120字
  tags?: string[];         // 根拠タグ（自動抽出 1〜3）
};

export type ForecastPayload = {
  pair: string;
  timeframe: string;
  asOf: string;
  scenarios: Scenario[];   // bull / range / bear
};

/* ===== トレード実績（チャットに流す用） ===== */
type TradeSide = "LONG" | "SHORT";
type LinkedTrade = {
  id: string;
  pair: string;
  entryTime: string;   // ISO
  side: TradeSide;     // LONG / SHORT
  price?: number;      // 例: 147.50
  link?: string;       // 詳細ページURL（任意）
  pips?: number;
  pnl?: number;
  note?: string;
};

/* チャット */
type ChatKind = "text" | "title" | "trade";
type ChatMsg = { who: Who; text: string; ts: number; titleKey?: string; kind?: ChatKind; href?: string };

/* 履歴（評価＆メモ付き） */
type HistoryItem = {
  id: string;
  createdAt: number;
  payload: ForecastPayload;
  userRating?: UserRating;     // 採用/参考/不採用/未評価
  userNote?: string;           // 1口メモ
};

/* ================== 表示用メタ ================== */
const kindMeta: Record<ScenarioKind, { label: string; color: string }> = {
  bull:  { label: "上昇トレンド", color: getAccentColor() },
  range: { label: "レンジ",       color: "#6b7280" },
  bear:  { label: "下降トレンド", color: "#dc2626" },
};
const order: ScenarioKind[] = ["bull","range","bear"];

/* ================== ユーティリティ ================== */
const clamp01 = (n:number)=>Math.max(0,Math.min(100,n));
const formatTime = (ts:number)=> new Date(ts).toLocaleTimeString("ja-JP",{hour12:false, hour:"2-digit", minute:"2-digit"});

/* 120文字上限の整形（句点で自然に区切る） */
function to120(s: string) {
  const t = s.replace(/\s+/g, " ").replace(/。+/g,"。");
  return t.length <= 120 ? t : t.slice(0, 118) + "…";
}

/* 根拠タグの簡易抽出（キーワード→ハッシュタグ化） */
function extractTags(text: string): string[] {
  const dict: Array<[RegExp, string]> = [
    [/高値|レジ|上抜|ブレイク|リテスト/, "#高値帯"],
    [/安値|サポ|下抜|ブレイクダウン/, "#安値帯"],
    [/出来高|出来高増|ボリューム/, "#出来高"],
    [/指標|イベント|発表|CPI|雇用/, "#イベント前"],
    [/ATR|ボラ|値幅|σ/, "#ボラ"],
    [/NYカット|オプション|バリア/, "#オプション"],
    [/戻り売り|押し目|追随/, "#戦略"],
  ];
  const tags: string[] = [];
  for (const [re, tag] of dict) if (re.test(text)) tags.push(tag);
  return Array.from(new Set(tags)).slice(0, 3);
}

/* ================== ダミー推論 ================== */
function mockForecast(query: string): ForecastPayload {
  const upBias   = /(long|上|買|break up|上抜|高値更新)/i.test(query) ? 10 : 0;
  const downBias = /(short|下|売|break down|下抜|安値更新)/i.test(query) ? 10 : 0;
  let bull = 56 + upBias - Math.floor(downBias/2);
  let bear = 16 + downBias - Math.floor(upBias/2);
  let range = 100 - bull - bear;
  bull=clamp01(bull); bear=clamp01(bear); range=clamp01(range);

  const tf = /5m|5分/.test(query) ? "5m" : /4h|4時間/.test(query) ? "4h" : "30m";

  const bullR = to120("直近の高値帯に近づき、買いの勢いが続きやすい場面です。優位性は“上抜けを確認してから”の追随にあり、焦らず条件待ちが成果につながりやすいはず。サイズはいつも通りの基準内で、想定外に備える姿勢を保ちましょう。");
  const rangeR = to120("値幅が狭く呼吸を整える時間帯です。今は方向を当てにいくより、抜けた後に素直についていく準備が効率的。あなたの得意パターンを温存し、ムダ打ちを減らす意識を持てると良いですね。");
  const bearR = to120("安値更新が意識され、戻り売りが活きやすい流れです。下抜け後の戻り待ちを基準化すると、飛びつきを避けやすくなります。視点は“崩れたら乗る、戻れば見送る”。いつもの撤退ラインを忘れずに。");

  const scn: Scenario[] = [
    { kind:"bull",  probability: bull,  trigger:"148.80を15分足で明確に上抜けて維持", target:"149.10〜149.20", stop:"148.30割れで前提無効", rationaleText: bullR },
    { kind:"range", probability: range, trigger:"148.30〜148.80の往復を複数回確認",     target:"値幅縮小。方向はブレイク後に判断",    stop:"レンジ外の明確な抜けで前提無効", rationaleText: rangeR },
    { kind:"bear",  probability: bear,  trigger:"148.30の下抜け確認後、戻りで再下押し", target:"148.00 → 147.70",                 stop:"148.80奪回で下目線は一旦終了",       rationaleText: bearR },
  ];
  scn.forEach(s => { s.tags = extractTags(`${s.rationaleText} ${s.trigger} ${s.stop}`); });

  return {
    pair: "USD/JPY",
    timeframe: tf,
    asOf: new Date().toLocaleString("ja-JP",{hour12:false}),
    scenarios: scn
  };
}

/* ================== UIパーツ ================== */
function Bar({ value, color }: { value:number; color:string }) {
  return (
    <div className="fh-bar">
      <div className="fh-bar__fill" style={{ width:`${clamp01(value)}%`, background:color }} />
    </div>
  );
}

/* ================== 本体 ================== */
export default function ForecastHybrid(){
  /* チャット */
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { who:"ai", text:"相場の質問をどうぞ。送信すると右側に結果（詳細まで）を表示し、チャットにもタイトルを残します。", ts: Date.now(), kind:"text" }
  ]);
  const [query, setQuery] = useState("・");   // ご要望どおり初期値「・」
  const [sending, setSending] = useState(false);

  /* 添付（モック） */
  const fileRef = useRef<HTMLInputElement>(null);
  const [attached, setAttached] = useState<string[]>([]);

  /* 予想と履歴 */
  const [data, setData] = useState<ForecastPayload|null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(()=>{
    try{ const raw = localStorage.getItem("fx_forecast_history_v2"); return raw? JSON.parse(raw):[]; }catch{return [];}
  });

  /* チャット／タイムライン 切替 */
  const [showTimeline, setShowTimeline] = useState(false);

  /* 現在表示中の履歴ID（評価・メモ用） */
  const [currentId, setCurrentId] = useState<string | null>(null);

  /* 外部トレード実績（注入→チャットに流す） */
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      const trades = ev.detail as LinkedTrade[] | undefined;
      if (!Array.isArray(trades) || trades.length === 0) return;
      // 受け取ったトレードをチャットに時系列で追加
      const items: ChatMsg[] = trades.map((t) => {
        const sideJp = t.side === "LONG" ? "買い" : "売り";
        const price = typeof t.price === "number" ? ` ${t.price.toFixed(2)}` : "";
        const text = `取引：${t.pair} ${sideJp}エントリー${price}`;
        return { who: "ai", text, ts: new Date(t.entryTime).getTime(), kind: "trade", href: t.link ?? undefined };
      }).sort((a,b)=> a.ts - b.ts);
      setMsgs(m => [...m, ...items]);
    };
    window.addEventListener("fx:setTrades", handler as any);
    return () => window.removeEventListener("fx:setTrades", handler as any);
  }, []);

  const saveHistory = (items:HistoryItem[])=>{
    setHistory(items);
    try{ localStorage.setItem("fx_forecast_history_v2", JSON.stringify(items.slice(0,150))); }catch{}
  };

  /* ===== 評価・メモ ===== */
  function setHistoryRating(id: string, rating: UserRating) {
    const next = history.map(h => (h.id === id ? { ...h, userRating: (h.userRating===rating ? null : rating) } : h));
    saveHistory(next);
  }
  function setHistoryNote(id: string, note: string) {
    const next = history.map(h => (h.id === id ? { ...h, userNote: note } : h));
    saveHistory(next);
  }

  // 送信
  const onSend = async () => {
    const raw = query.trim();
    if (!raw || sending) return;

    setMsgs(m=>[...m, { who:"user", text:raw, ts:Date.now(), kind:"text" }]);
    setSending(true);

    try {
      await new Promise(r=>setTimeout(r,250));
      const payload = mockForecast(raw);
      setData(payload);

      const top = [...payload.scenarios].sort((a,b)=>b.probability-a.probability)[0];
      const title = `${payload.pair}｜${payload.timeframe}｜${kindMeta[top.kind].label} ${top.probability}%`;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      const hItem:HistoryItem = { id, createdAt: Date.now(), payload };
      saveHistory([hItem, ...history]);
      setCurrentId(id);

      setMsgs(m=>[...m, { who:"ai", text:title, ts:Date.now(), titleKey:id, kind:"title" }]);
      setQuery("・");   // 送信後にご要望どおり「・」へ
    } catch (e) {
      console.error("onSend error:", e);
    } finally {
      setSending(false);
    }
  };

  // タイムライン → 右側に表示
  const openHistory = (id:string)=>{
    const item = history.find(h=>h.id===id);
    if(item){ setData(item.payload); setCurrentId(id); }
  };

  // 添付（モック）
  const onPickFile = ()=> fileRef.current?.click();
  const onFiles:React.ChangeEventHandler<HTMLInputElement> = (e)=>{
    const names = Array.from(e.target.files ?? []).map(f=>f.name);
    if(names.length) setAttached(a=>[...a, ...names]);
  };

  // 棒3本
  const probRows = useMemo(()=>{
    if(!data) return [];
    const m = new Map<ScenarioKind,number>();
    data.scenarios.forEach(s=>m.set(s.kind, s.probability));
    return order.map(k=>({ label:kindMeta[k].label, color:kindMeta[k].color, pct:m.get(k) ?? 0 }));
  },[data]);

  // タイトル
  const currentTitle = useMemo(()=>{
    if(!data) return "—";
    const top = [...data.scenarios].sort((a,b)=>b.probability-a.probability)[0];
    return `${data.pair}｜${data.timeframe}｜${kindMeta[top.kind].label} ${top.probability}%`;
  },[data]);

  // 現在の履歴アイテム
  const currentHistoryItem = useMemo(
    () => (currentId ? history.find(h => h.id === currentId) : history[0]) ?? null,
    [history, currentId]
  );

  // ヘッダ用：最上位シナリオ（％を大きく表示）
  const topScenario = useMemo(() => {
    if (!data) return null;
    return [...data.scenarios].sort((a,b)=>b.probability-a.probability)[0];
  }, [data]);

  /* ===== UI ===== */
  return (
    <div className="fh-wrap">
{/* ===== 2カラム ===== */}
<div className="fh-root">
  <div className="fh-left">

    {/* トグル（タイトル直下） */}
    <div className="fh-toggle fh-toggle--top" role="tablist" aria-label="表示切替">
      <button
        className={`fh-toggle__btn ${!showTimeline ? "is-on" : ""}`}
        onClick={() => setShowTimeline(false)}
        aria-pressed={!showTimeline}
      >リアルタイムAI予想</button>
      <button
        className={`fh-toggle__btn ${showTimeline ? "is-on" : ""}`}
        onClick={() => setShowTimeline(true)}
        aria-pressed={showTimeline}
      >過去の予想一覧</button>
    </div>

  {/* ▼▼ チャット or 予想一覧（入れ替え） ▼▼ */}
  {!showTimeline ? (
    /* ===== チャット ===== */
    <section className="fh-card fh-card--chat">
      <h3 className="fh-title">チャット</h3>

      {/* ログ */}
      <div className="fh-chat">
        {msgs.map((m, i) => (
          <div key={`${m.ts}-${i}`} className={`fh-msg ${m.who === "user" ? "fh-msg--me" : "fh-msg--ai"}`}>
            <div className={`fh-msg__bubble ${m.kind==="trade" ? "is-trade" : ""}`}>
              {m.titleKey ? (
                <button className="fh-link" onClick={() => openHistory(m.titleKey!)}>{m.text}</button>
              ) : m.href ? (
                <a className="fh-link" href={m.href} target="_blank" rel="noreferrer">{m.text}</a>
              ) : (
                <span>{m.text}</span>
              )}
              <div className={`fh-time ${m.who === "user" ? "right" : "left"}`}>{formatTime(m.ts)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 添付チップ */}
      {attached.length > 0 && (
        <div className="fh-attach">
          {attached.map((n, i) => (<span key={i} className="fh-chip">{n}</span>))}
        </div>
      )}

      {/* 入力バー */}
      <div className="fh-composer">
        <button className="fh-iconbtn fh-composer__icon" title="ファイルを選択" onClick={onPickFile}>＋</button>
        <input ref={fileRef} type="file" multiple hidden onChange={onFiles} />
        <textarea
          className="fh-composer__textarea"
          value={query}
          placeholder="メッセージを入力"
          rows={1}
          onChange={(e) => {
            setQuery(e.target.value);
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 200) + "px";
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        />
        <button type="button" className="fh-btn fh-btn--primary fh-composer__send" onClick={onSend} disabled={sending || !query.trim()}>
          {sending ? "送信中…" : "送信"}
        </button>
      </div>
    </section>
  ) : (
    /* ===== 予想一覧 ===== */
    <section className="fh-card">
      <h3 className="fh-title">予想タイムライン（最新が上）</h3>
      {history.length === 0 ? (
        <div className="fh-subtle">まだ履歴がありません。</div>
      ) : (
        <ul className="fh-timeline">
          {history.map((h) => (
            <li key={h.id}>
              <div className="fh-tl-row">
                <div className="fh-tl-main">
                  <div className="fh-tl-title">
                    {h.payload.pair}｜{h.payload.timeframe}｜
                    {(() => {
                      const top = [...h.payload.scenarios].sort((a, b) => b.probability - a.probability)[0];
                      return `${kindMeta[top.kind].label} ${top.probability}%`;
                    })()}
                  </div>
                  <div className="fh-tl-time">{new Date(h.createdAt).toLocaleString("ja-JP", { hour12: false })}</div>
                </div>
                <div className="fh-tl-actions">
                  <button className="fh-btn fh-btn--ghost" onClick={() => { setData(h.payload); setCurrentId(h.id); }}>詳細</button>
                  <button className="fh-btn fh-btn--ghost" onClick={() => { const next = history.filter(x => x.id !== h.id); saveHistory(next); }}>削除</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )}
  {/* ▲▲ 入れ替えここまで ▲▲ */}

  </div>

  {/* 右カラム：結果（棒グラフ＋詳細） */}
  <section className="fh-col fh-gap12">
    {/* 要約（棒3本） */}
    <div className={`fh-card ${data ? "" : "fh-disabled"}`}>
      <div className="fh-row fh-between fh-mb8">
        <div>
          <div className="fh-caption">最新の結果</div>
          <div className="fh-headline">{currentTitle}</div>
          <div className="fh-subtle">{data?.asOf ?? "—"} 更新</div>
        </div>

        {/* 右上：ユーザー評価（三択） */}
        {currentHistoryItem && (
          <div className="fh-rate">
            <button
              className={`fh-rate__btn ${currentHistoryItem.userRating === "adopted" ? "is-on adopted" : ""}`}
              onClick={() => setHistoryRating(currentHistoryItem.id, "adopted")}
            >採用</button>
            <button
              className={`fh-rate__btn ${currentHistoryItem.userRating === "reference" ? "is-on reference" : ""}`}
              onClick={() => setHistoryRating(currentHistoryItem.id, "reference")}
            >参考</button>
            <button
              className={`fh-rate__btn ${currentHistoryItem.userRating === "rejected" ? "is-on rejected" : ""}`}
              onClick={() => setHistoryRating(currentHistoryItem.id, "rejected")}
            >不採用</button>
          </div>
        )}
      </div>

      {/* 上段に大きな％表示（トップシナリオ） */}
      {topScenario && (
        <div className="fh-topprob">
          <div className="fh-topprob__ring" style={{ ['--v' as any]: `${clamp01(topScenario.probability)}%` }} />
          <div className="fh-topprob__meta">
            <div className="fh-topprob__num">{topScenario.probability}%</div>
            <div className="fh-topprob__label">{kindMeta[topScenario.kind].label}</div>
          </div>
        </div>
      )}

      {/* 1口メモ */}
      {currentHistoryItem && (
        <div className="fh-memo">
          <input
            className="fh-memo__input"
            type="text"
            placeholder="1口メモ（例：指標前なのでサイズ半分）"
            defaultValue={currentHistoryItem.userNote ?? ""}
            onBlur={(e) => setHistoryNote(currentHistoryItem.id, e.target.value.trim())}
          />
          <button
            className="fh-memo__save"
            onClick={() => {
              const el = (document.querySelector('.fh-memo__input') as HTMLInputElement);
              setHistoryNote(currentHistoryItem.id, (el?.value ?? '').trim());
            }}
          >保存</button>
        </div>
      )}

      {/* 棒3本 */}
      <div className="fh-row fh-gap8 fh-gauge">
        {probRows.length ? (
          probRows.map((r) => (
            <div key={r.label} className="fh-gauge__item">
              <div className="fh-gauge__label"><span>{r.label}</span><b className="fh-gauge__pct">{r.pct}%</b></div>
              <Bar value={r.pct} color={r.color} />
            </div>
          ))
        ) : (
          <div className="fh-subtle">ここに棒グラフが表示されます</div>
        )}
      </div>
    </div>

    {/* 詳細（区切り線で3セクション） */}
    <div className={`fh-card ${data ? "" : "fh-disabled"}`}>
      {data ? (
        order.map((k, idx) => {
          const s = data.scenarios.find((x) => x.kind === k)!;
          return (
            <div key={k} className="fh-detail-sec">
              {/* セクション見出し ＆ 否定条件（別表現）＆ タグ */}
              <div className="fh-row fh-between fh-mb8">
                <div className="fh-row fh-gap8">
                  <div className="fh-strong">{kindMeta[k].label}</div>
                  <span className="fh-chip" style={{ borderColor: kindMeta[k].color, color: kindMeta[k].color }}>{s.probability}%</span>
                  <span className="fh-badge fh-badge--neg">前提無効: {s.stop}</span>
                </div>
                {s.tags && s.tags.length>0 && (
                  <div className="fh-tags">{s.tags.map((t,i)=><span key={i} className="fh-tag">{t}</span>)}</div>
                )}
              </div>

              {/* 条件・目標・損切り */}
              <div className="fh-grid">
                <div><div className="fh-subtle fh-mb4">条件</div><div>{s.trigger}</div></div>
                <div><div className="fh-subtle fh-mb4">目標</div><div>{s.target}</div></div>
                <div><div className="fh-subtle fh-mb4">損切りライン</div><div>{s.stop}</div></div>
              </div>

              {/* 根拠（120字） */}
              <div className="fh-mt10">
                <div className="fh-subtle fh-mb4">根拠・要点（120字）</div>
                <p className="fh-paragraph">{s.rationaleText}</p>
              </div>

              {idx < 2 && <hr className="fh-sep" />}
            </div>
          );
        })
      ) : (
        <div className="fh-subtle">質問を送ると、上昇／レンジ／下降トレンドの詳細がここに表示されます。</div>
      )}
    </div>
  </section>
</div>
{/* ===== /2カラム ===== */}
    </div>
  );
}
