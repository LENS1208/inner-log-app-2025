import React, { useState, useCallback, useEffect } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import '../../tradeDiary.css';
import { getTradeNote, saveTradeNote, getTradeByTicket, DbTrade } from '../../lib/db.service';
import { showToast } from '../../lib/toast';
import SimilarTradesCard from './SimilarTradesCard';

type TradeData = {
  ticket: string;
  item: string;
  side: 'BUY' | 'SELL';
  size: number;
  openTime: Date;
  openPrice: number;
  closeTime: Date;
  closePrice: number;
  commission: number;
  swap: number;
  profit: number;
  pips: number;
  sl: number | null;
  tp: number | null;
};

type TradeKpi = {
  net: number;
  pips: number;
  hold: number;
  gross: number;
  cost: number;
  rrr: number | null;
};

export type TradeDetailPanelProps = {
  trade: TradeData;
  kpi: TradeKpi;
  noteId: string;
};

const fmtJPY = (n: number) => `${Math.round(n).toLocaleString('ja-JP')}円`;
const fmtHoldJP = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return `${h}時間${m % 60}分`;
};

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
    },
    [triggerId, menuId]
  );
  useEffect(() => {
    document.addEventListener('click', clickOutside);
    return () => document.removeEventListener('click', clickOutside);
  }, [clickOutside]);
  const onPick = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else if (value.length < max) onChange([...value, opt]);
  };
  const title = value.length
    ? `${value.join('、')}（${value.length}）`
    : label;
  return (
    <label className="ms-wrap">
      <button type="button" id={triggerId} className="ms-trigger" onClick={toggle}>
        {title}
      </button>
      <div id={menuId} className="ms-menu" style={{ display: open ? 'block' : 'none' }}>
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

export default function TradeDetailPanel({ trade, kpi, noteId }: TradeDetailPanelProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const ENTRY_BASIS_OPTS = [
    '押し目・戻り',
    'ブレイク',
    'ダブルトップ／ダブルボトム',
    '三角持ち合い／ペナント／フラッグ',
    'チャネル反発／上限・下限タッチ',
    'だまし（フェイク）',
    'ピンバー／包み足／はらみ足',
    'フィボ反発（38.2／50／61.8)',
  ];
  const TECH_OPTS = [
    'MAクロス（ゴールデン／デッド）',
    'ボリンジャー（±2σタッチ→内戻り）',
    'RSI 50回復／割れ',
    'RSI 過熱（70↑）／逆張り（30↓）',
    '一目均衡表合致（雲反発／雲抜け／三役）',
    'MACDクロス（上向き／下向き）',
    'フィボ合致（38.2／50／61.8）',
    'ピボット（R1／R2／S1／S2）',
    'ATR 高め／低め',
    'ADX 強め／弱め',
  ];
  const MARKET_OPTS = [
    'トレンド相場',
    'レンジ相場',
    '市場オープン切替（東京→欧州／欧州→NY）',
    'ボラ高め',
    'ボラ低め',
    '高値圏',
    '安値圏',
    '薄商い',
    'オプションバリア付近',
    'ニュース直後',
    '指標前',
  ];
  const INTRA_EMO_OPTS = [
    '余裕があった',
    '不安が増えた',
    '早く逃げたい',
    '欲が出た',
    '含み益に固執',
    '含み損に耐えた',
    '判断がぶれた',
    '集中が切れた',
    '予定通りに待てた',
  ];
  const PRERULE_OPTS = [
    '逆指値は必ず置く',
    '損切り幅を固定',
    '直近足の下/上に損切り',
    '分割エントリー',
    '分割利確',
    'トレーリング',
    '指標またぎ回避',
    '1日の取引は◯回まで',
  ];
  const EXIT_TRIG_OPTS = [
    '目標価格に到達',
    '逆指値に到達（損切り）',
    '想定価格に達した（部分／全）',
    '損益表示に影響された',
    '指標が近づいた',
    'ボラ急変',
    '形状が崩れた',
    '時間切れ（ルール時間）',
    'AIシグナル終了／反転',
    'ほかのセットアップ優先',
  ];
  const AI_PROS_OPTS = [
    'ポジションの精度',
    'エントリーのタイミング',
    '利確＆損切りライン',
    '根拠が分かりやすい',
  ];
  const FUND_OPTS = [
    '金利見通し',
    '中銀スタンス',
    '景気サプライズ',
    'インフレ圧力',
    'リスクオン・リスクオフ',
    '原油・商品',
    'ポジション偏り',
    '地政学ヘッドライン',
  ];

  const [entryEmotion, setEntryEmotion] = useState('');
  const [entryBasis, setEntryBasis] = useState<string[]>([]);
  const [techSet, setTechSet] = useState<string[]>([]);
  const [marketSet, setMarketSet] = useState<string[]>([]);
  const [fundSet, setFundSet] = useState<string[]>([]);
  const [fundNote, setFundNote] = useState('');

  const [intraNote, setIntraNote] = useState('');
  const [intraEmotion, setIntraEmotion] = useState<string[]>([]);
  const [preRules, setPreRules] = useState<string[]>([]);
  const [ruleExec, setRuleExec] = useState('');

  const [aiSide, setAiSide] = useState('');
  const [aiFollow, setAiFollow] = useState('選択しない');
  const [aiHit, setAiHit] = useState('未評価');
  const [aiPros, setAiPros] = useState<string[]>([]);

  const [exitTriggers, setExitTriggers] = useState<string[]>([]);
  const [exitEmotion, setExitEmotion] = useState('');

  const [noteRight, setNoteRight] = useState('');
  const [noteWrong, setNoteWrong] = useState('');
  const [noteNext, setNoteNext] = useState('');
  const [noteFree, setNoteFree] = useState('');

  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<Array<{ id: string; url: string }>>([]);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  const [expandEntry, setExpandEntry] = useState(false);
  const [expandHold, setExpandHold] = useState(false);
  const [expandExit, setExpandExit] = useState(false);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const openTagModal = () => setTagModalOpen(true);
  const closeTagModal = () => setTagModalOpen(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dbTrade, setDbTrade] = useState<DbTrade | null>(null);
  const [loadedNote, setLoadedNote] = useState<any>(null);

  // 記録の進捗を計算
  const getProgressStatus = () => {
    const phase1 = fundNote.trim().length > 0;
    const phase2 = intraNote.trim().length > 0;
    const phase3 = noteFree.trim().length > 0;
    const count = [phase1, phase2, phase3].filter(Boolean).length;
    return { phase1, phase2, phase3, count, total: 3 };
  };

  const progress = getProgressStatus();

  useEffect(() => {
    (async () => {
      try {
        const [note, tradeData] = await Promise.all([
          getTradeNote(trade.ticket),
          getTradeByTicket(trade.ticket)
        ]);

        if (note) {
          setEntryEmotion(note.entry_emotion || '');
          setEntryBasis(note.entry_basis || []);
          setTechSet(note.tech_set || []);
          setMarketSet(note.market_set || []);
          setFundSet(note.fund_set || []);
          setFundNote(note.fund_note || '');
          setExitTriggers(note.exit_triggers || []);
          setExitEmotion(note.exit_emotion || '');
          setNoteRight(note.note_right || '');
          setNoteWrong(note.note_wrong || '');
          setNoteNext(note.note_next || '');
          setNoteFree(note.note_free || '');
          setTags(note.tags || []);
          setImages((note.images || []).map((url: string, idx: number) => ({ id: `img_${idx}`, url })));
          setLoadedNote(note);
        }

        if (tradeData) {
          setDbTrade(tradeData);
        }
      } catch (err) {
        console.error('Failed to load trade note:', err);
        setLoadError((err as Error).message);
      }
    })();
  }, [trade.ticket]);

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  const addTagDirect = (t: string) => {
    if (!t.trim()) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t.trim()]));
  };

  const savePayload = async () => {
    setSaving(true);
    try {
      const tradeDbData = {
        ticket: trade.ticket,
        item: trade.item,
        side: trade.side,
        size: trade.size,
        open_time: trade.openTime.toISOString(),
        open_price: trade.openPrice,
        close_time: trade.closeTime.toISOString(),
        close_price: trade.closePrice,
        commission: trade.commission,
        swap: trade.swap,
        profit: trade.profit,
        pips: trade.pips,
        sl: trade.sl,
        tp: trade.tp,
      };

      await saveTradeNote({
        ticket: trade.ticket,
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
        tags,
        images: images.map((i) => i.url),
        ai_advice: '',
        ai_advice_pinned: false,
      }, tradeDbData);
      showToast('このトレードの記録を保存しました。お疲れさまでした。', 'success');
    } catch (err) {
      console.error('Failed to save trade note:', err);
      showToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const MAX_FILES = 3;
    const MAX_SIZE = 3 * 1024 * 1024;
    const arr = Array.from(files);
    if (arr.length + images.length > MAX_FILES) {
      showToast(`画像は最大${MAX_FILES}枚までです`, 'error');
      return;
    }
    for (const f of arr) {
      if (f.size > MAX_SIZE) {
        showToast(`${f.name}は3MBを超えています`, 'error');
        return;
      }
    }
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const id = `img_${Date.now()}_${Math.random()}`;
        setImages((prev) => [...prev, { id, url }]);
      };
      reader.readAsDataURL(f);
    });
  };

  const [menuOpen, setMenuOpen] = useState(false);

  const handleOpenDetail = () => {
    window.location.hash = `/notebook/${noteId}`;
  };

  const handleDeleteNote = () => {
    if (confirm('このノートを削除しますか？')) {
      console.log('ノートを削除:', noteId);
      localStorage.removeItem(`diary_${trade.ticket}`);
      showToast('ノートを削除しました', 'success');
    }
  };

  const handleLinkToDailyNote = () => {
    console.log('日次ノートにリンク:', noteId);
    showToast('日次ノート選択画面を表示します', 'info');
    setMenuOpen(false);
  };

  const handleShowRelatedMemos = () => {
    console.log('関連メモを表示:', noteId);
    showToast('この取引に関連するメモ一覧を表示します', 'info');
    setMenuOpen(false);
  };

  return (
    <section className="pane">
      <div className="head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3>取引ノート</h3>
          <div ref={menuRef} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            <button
              onClick={handleOpenDetail}
              style={{
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
              }}
            >
              詳細ページへ →
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              ⋮
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: 180,
                  zIndex: 100,
                }}
              >
                <button
                  onClick={handleLinkToDailyNote}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  日次ノートにリンク
                </button>
                <button
                  onClick={handleShowRelatedMemos}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  関連メモを表示
                </button>
                <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
                <button
                  onClick={() => {
                    handleDeleteNote();
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#dc2626',
                  }}
                >
                  ノートを削除
                </button>
              </div>
            )}
          </div>
      </div>

      <div className="body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-title">損益（円）</div>
            <div className={`kpi-value ${kpi.net >= 0 ? 'good' : 'bad'}`}>
              {kpi.net >= 0 ? '+' : ''}{fmtJPY(kpi.net)}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">pips</div>
            <div className={`kpi-value ${kpi.pips >= 0 ? 'good' : 'bad'}`}>
              {kpi.pips >= 0 ? '+' : ''}{kpi.pips.toFixed(1)}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">保有時間</div>
            <div className="kpi-value">{fmtHoldJP(kpi.hold)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">リスクリワード比（RRR）</div>
            <div className="kpi-value">{kpi.rrr ? kpi.rrr.toFixed(2) : '—'}</div>
          </div>
        </div>

        <section className="td-card compact td-trade-info">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>通貨ペア</div>
              <div style={{ fontWeight: 500 }}>{trade.item}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>ポジション</div>
              <div style={{ fontWeight: 500 }}>{trade.side === 'BUY' ? '買い' : '売り'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>サイズ</div>
              <div style={{ fontWeight: 500 }}>{trade.size.toFixed(2)} lot</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>指値/逆指値</div>
              <div style={{ fontWeight: 500 }}>— / {trade.sl ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>エントリー価格＜時刻＞</div>
              <div style={{ fontWeight: 500 }}>
                <strong>{trade.openPrice}</strong> ＜{trade.openTime.toLocaleString()}＞
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>決済価格＜時刻＞</div>
              <div style={{ fontWeight: 500 }}>
                <strong>{trade.closePrice}</strong> ＜{trade.closeTime.toLocaleString()}＞
              </div>
            </div>
          </div>
        </section>

        <div className="td-diary-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>取引日記</h2>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              background: progress.count === 3 ? 'var(--accent)' : 'var(--chip)',
              color: progress.count === 3 ? '#fff' : 'var(--ink)',
              fontSize: 13,
              fontWeight: 600
            }}>
              {progress.count === 3 ? '✓ すべて記録済み 🎉' : `記録の進捗：${progress.count}/3`}
            </div>
          </div>
          <button className="td-btn" onClick={savePayload} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
        {progress.count < 3 && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--chip)',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--muted)',
            lineHeight: 1.6
          }}>
            💡 まずは各フェーズ（①②③）に一言ずつメモするだけでOKです。
          </div>
        )}

        <section className="td-card td-entry-before">
          <div className="td-section-title" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>① エントリー前・直後（まずは一言でOK）</h2>
          </div>

          <label>
            <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>まずはここだけ書けばOKです。</div>
            <textarea
              className="note"
              rows={2}
              value={fundNote}
              onChange={(e) => setFundNote(e.target.value)}
              placeholder="例）どんなニュースやチャートの形を見てエントリーしたか、一言で書いてみましょう。"
              style={{ fontSize: 14 }}
            />
          </label>

          <button
            type="button"
            className="td-btn"
            style={{ marginTop: 12, width: '100%' }}
            onClick={() => setExpandEntry(!expandEntry)}
          >
            {expandEntry ? '詳細を閉じる' : '📝 余裕があれば詳しく振り返る'}
          </button>

          {expandEntry && (
            <div style={{ marginTop: 12 }}>
              <label>
                <div className="muted small" style={{ marginBottom: 4 }}>エントリーしたとき、どんな気持ちでしたか？</div>
                <select className="select" value={entryEmotion} onChange={(e) => setEntryEmotion(e.target.value)}>
                  <option value="">選択してください</option>
                  <option>落ち着いていた</option>
                  <option>自信あり</option>
                  <option>少し焦っていた</option>
                  <option>なんとなく</option>
                  <option>負けを取り返したい</option>
                  <option>迷いがある</option>
                  <option>置いていかれ不安</option>
                </select>
              </label>
              <MultiSelect
                label="エントリーの主な根拠を選んでください（最大2つ）"
                value={entryBasis}
                onChange={setEntryBasis}
                options={ENTRY_BASIS_OPTS}
                triggerId="msEntryBasisBtn"
                menuId="msEntryBasisMenu"
              />
              <MultiSelect
                label="使ったテクニカル指標はありますか？（最大2つ）"
                value={techSet}
                onChange={setTechSet}
                options={TECH_OPTS}
                triggerId="msTechBtn"
                menuId="msTechMenu"
              />
              <MultiSelect
                label="そのときの相場はどんな状況でしたか？（最大2つ）"
                value={marketSet}
                onChange={setMarketSet}
                options={MARKET_OPTS}
                triggerId="msMarketBtn"
                menuId="msMarketMenu"
              />
              <MultiSelect
                label="意識したファンダメンタルズ要因は？（最大2つ）"
                value={fundSet}
                onChange={setFundSet}
                options={FUND_OPTS}
                triggerId="msFundBtn"
                menuId="msFundMenu"
              />

              <div className="hr" />

              <h3 style={{ margin: '12px 0 8px 0', fontSize: 13, fontWeight: 'bold', color: 'var(--muted)' }}>AIの予想</h3>
              <label>
                <select className="select" value={aiSide} onChange={(e) => setAiSide(e.target.value)}>
                  <option value="">AIのポジション予測</option>
                  <option>買い</option>
                  <option>売り</option>
                  <option>様子見</option>
                </select>
              </label>
              <label>
                <select className="select" value={aiFollow} onChange={(e) => setAiFollow(e.target.value)}>
                  <option value="">取引の判断</option>
                  <option>従った</option>
                  <option>一部従った</option>
                  <option>従わなかった</option>
                </select>
              </label>
            </div>
          )}
        </section>

        <section className="td-card td-position-hold">
          <div className="td-section-title" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>② ポジション保有中（書ければでOK）</h2>
          </div>

          <label>
            <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>書ける範囲で大丈夫です。</div>
            <textarea
              className="note"
              rows={2}
              value={intraNote}
              onChange={(e) => setIntraNote(e.target.value)}
              placeholder="例）含み益・含み損が出てきたとき、どんな気持ちだったか簡単にメモしておきましょう。"
              style={{ fontSize: 14 }}
            />
          </label>

          <button
            type="button"
            className="td-btn"
            style={{ marginTop: 12, width: '100%' }}
            onClick={() => setExpandHold(!expandHold)}
          >
            {expandHold ? '詳細を閉じる' : '📝 余裕があれば詳しく振り返る'}
          </button>

          {expandHold && (
            <div style={{ marginTop: 12 }}>
              <MultiSelect
                label="保有している間、どんな気持ちの変化がありましたか？（最大2つ）"
                value={intraEmotion}
                onChange={setIntraEmotion}
                options={INTRA_EMO_OPTS}
                triggerId="msInTradeEmotionBtn"
                menuId="msInTradeEmotionMenu"
              />
              <MultiSelect
                label="今回意識していたルールは？（最大2つ）"
                value={preRules}
                onChange={setPreRules}
                options={PRERULE_OPTS}
                triggerId="msPreRulesBtn"
                menuId="msPreRulesMenu"
              />
              <label>
                <div className="muted small" style={{ marginBottom: 4 }}>今回のトレードで、事前のルールは守れましたか？</div>
                <select className="select" value={ruleExec} onChange={(e) => setRuleExec(e.target.value)}>
                  <option value="">選択してください</option>
                  <option>しっかり守れた</option>
                  <option>一部守れなかった</option>
                  <option>守れなかった</option>
                </select>
              </label>
            </div>
          )}
        </section>

        <section className="td-card td-exit">
          <div className="td-section-title" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>③ ポジション決済後（ここだけでも大丈夫）</h2>
          </div>

          <label>
            <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>ここだけでも書いておくと後から振り返りやすくなります。</div>
            <textarea
              className="note"
              rows={2}
              value={noteFree}
              onChange={(e) => setNoteFree(e.target.value)}
              placeholder="例）結果を見てどう感じたか、次に活かしたいことを一言だけ書いてみてください。"
              style={{ fontSize: 14 }}
            />
          </label>

          <button
            type="button"
            className="td-btn"
            style={{ marginTop: 12, width: '100%' }}
            onClick={() => setExpandExit(!expandExit)}
          >
            {expandExit ? '詳細を閉じる' : '📝 余裕があれば詳しく振り返る'}
          </button>

          {expandExit && (
            <div style={{ marginTop: 12 }}>
              <MultiSelect
                label="何がきっかけで決済しましたか？（最大2つ）"
                value={exitTriggers}
                onChange={setExitTriggers}
                options={EXIT_TRIG_OPTS}
                triggerId="msExitTriggerBtn"
                menuId="msExitTriggerMenu"
              />
              <label>
                <div className="muted small" style={{ marginBottom: 4 }}>決済した瞬間の気持ちに一番近いものを選んでください。</div>
                <select className="select" value={exitEmotion} onChange={(e) => setExitEmotion(e.target.value)}>
                  <option value="">選択してください</option>
                  <option>予定通りで満足</option>
                  <option>早く手放したい</option>
                  <option>もっと引っ張れた</option>
                  <option>怖くなった</option>
                  <option>安堵した</option>
                  <option>悔しい</option>
                  <option>反省している</option>
                </select>
              </label>
              <label>
                <div className="muted small" style={{ marginBottom: 4 }}>AIの予想は当たっていましたか？</div>
                <select className="select" value={aiHit} onChange={(e) => setAiHit(e.target.value)}>
                  <option value="">選択してください</option>
                  <option>当たり</option>
                  <option>惜しい</option>
                  <option>外れ</option>
                </select>
              </label>
              <MultiSelect
                label="AIのどんな点が役に立ちましたか？（最大2つ）"
                value={aiPros}
                onChange={setAiPros}
                options={AI_PROS_OPTS}
                triggerId="msAiProsBtn"
                menuId="msAiProsMenu"
              />

              <div className="note-vertical" style={{ marginTop: 12 }}>
                <label>
                  <div className="muted small">今回のトレードでうまくいったことは？</div>
                  <textarea
                    className="note"
                    rows={1}
                    value={noteRight}
                    onChange={(e) => setNoteRight(e.target.value)}
                    placeholder="例）エントリー前にしっかり水平線を引いて待てた。損切りラインも事前に決めていたので迷わず実行できた。"
                  />
                </label>
                <label>
                  <div className="muted small">次回改善したいことは？</div>
                  <textarea
                    className="note"
                    rows={1}
                    value={noteWrong}
                    onChange={(e) => setNoteWrong(e.target.value)}
                    placeholder="例）利確が早すぎた。もう少し引っ張れば目標価格に到達していた。感情で決済してしまった。"
                  />
                </label>
                <label>
                  <div className="muted small">次はどうすると決めましたか？</div>
                  <textarea
                    className="note"
                    rows={1}
                    value={noteNext}
                    onChange={(e) => setNoteNext(e.target.value)}
                    placeholder="例）利確ポイントを2段階に分けて、半分は早めに、残りは目標価格まで引っ張る。チャートに目標価格のラインを引いておく。"
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        <section className="td-card">
          <div className="td-section-title">
            <h2>画像</h2>
          </div>
          <div className="upanel">
            <div className="uactions">
              <label className="td-btn" htmlFor="imgFile">
                画像を選択
              </label>
              <span className="small muted">
                .jpg/.jpeg/.gif/.png、上限 <strong>3ファイル・3MB</strong>
              </span>
            </div>
            <input
              id="imgFile"
              type="file"
              accept=".jpg,.jpeg,.gif,.png,image/jpeg,image/png,image/gif"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => onFiles(e.target.files)}
            />
            <div className="thumbs">
              {images.length === 0 && <div className="muted small">まだ画像はありません。</div>}
              {images.map((img) => (
                <div key={img.id} className="thumb" onClick={() => setImgPreview(img.url)}>
                  <img src={img.url} alt="chart" />
                  <button
                    className="del"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('削除しますか？')) {
                        setImages((prev) => prev.filter((x) => x.id !== img.id));
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

        {imgPreview && (
          <div
            className="img-modal"
            onClick={() => setImgPreview(null)}
            aria-hidden={false}
          >
            <img src={imgPreview} alt="preview" />
          </div>
        )}

        <section className="td-card">
          <div className="td-section-title">
            <h2>タグ</h2>
          </div>
          <div className="chips-wrap">
            <div className="chips" id="tagArea">
              {tags.map((t) => (
                <span key={t} className="chip" title="クリックで削除" onClick={() => removeTag(t)}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="tag-actions" style={{ marginTop: 12 }}>
            <button className="td-btn" type="button" onClick={openTagModal}>
              ＋タグを追加
            </button>
          </div>
        </section>

        {tagModalOpen && (
          <div className="modal" onClick={closeTagModal} aria-hidden={false}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <div className="top">
                <h3>タグ候補から追加</h3>
                <button className="td-btn" onClick={closeTagModal}>
                  ✕
                </button>
              </div>
              <div className="tags-grid">
                {['デイトレ', 'スイング', '順張り', '逆張り', '成功', '失敗', 'ルール遵守', 'ルール違反', '感情的', '冷静'].map((t) => (
                  <button
                    key={t}
                    className="tag-btn"
                    onClick={() => {
                      addTagDirect(t);
                      closeTagModal();
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={savePayload}
            style={{
              background: getAccentColor(),
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
            }}
          >
            保存
          </button>
        </div>

        <div
          style={{
            padding: 'var(--space-3)',
            background: 'var(--chip, #f3f4f6)',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
            すべての詳細情報を確認・編集するには
          </div>
          <button
            onClick={handleOpenDetail}
            style={{
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
            }}
          >
            詳細ページを開く
          </button>
        </div>
      </div>
    </section>
  );
}

export function TradePerformanceAnalysis({ trade, noteId }: TradeDetailPanelProps) {
  const [dbTrade, setDbTrade] = useState<DbTrade | null>(null);
  const [loadedNote, setLoadedNote] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [note, tradeData] = await Promise.all([
          getTradeNote(trade.ticket),
          getTradeByTicket(trade.ticket)
        ]);

        if (note) {
          setLoadedNote(note);
        }

        if (tradeData) {
          setDbTrade(tradeData);
        }
      } catch (err) {
        console.error('Failed to load trade data:', err);
      }
    })();
  }, [trade.ticket]);

  if (!dbTrade) {
    return (
      <section className="pane">
        <div className="head">
          <h3>パフォーマンス分析</h3>
        </div>
        <div className="body" style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
          読み込み中...
        </div>
      </section>
    );
  }

  return (
    <section className="pane">
      <div className="head">
        <h3>パフォーマンス分析</h3>
      </div>
      <div className="body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <SimilarTradesCard trade={dbTrade} note={loadedNote} />
      </div>
    </section>
  );
}
