import React from 'react';

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

type DiaryData = {
  entryEmotion?: string;
  fundNote?: string;
  entryBasis?: string[];
  techSet?: string[];
  marketSet?: string[];
  fundSet?: string[];
  intraNote?: string;
  intraEmotion?: string[];
  preRules?: string[];
  ruleExec?: string;
  exitTriggers?: string[];
  exitEmotion?: string;
  aiHit?: string;
  aiPros?: string[];
  noteRight?: string;
  noteWrong?: string;
  noteNext?: string;
  noteFree?: string;
  tags?: string[];
  images?: Array<{ id: string; url: string }>;
};

type LinkedMemo = {
  tempId: string;
  title: string;
  type: string;
  updated: string;
};

type PendingMemo = {
  tempId: string;
  symbol: string;
  side: string;
  note?: string;
  entry: {
    planned?: number;
    actual?: number;
    size?: number;
    time: string;
  };
};

type AIAdvice = {
  advice: string[];
  timestamp: string;
};

export type TradeDetailPanelProps = {
  trade: TradeData;
  kpi: TradeKpi;
  diary?: DiaryData;
  noteId: string;
  linkedMemos?: LinkedMemo[];
  pendingMemos?: PendingMemo[];
  aiAdvice?: AIAdvice;
  onGenerateAdvice?: () => void;
  onRegenerateAdvice?: () => void;
};

const fmtJPY = (n: number) => `${Math.round(n).toLocaleString('ja-JP')}円`;
const fmtHoldJP = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return `${h}時間${m % 60}分`;
};

export default function TradeDetailPanel({
  trade,
  kpi,
  diary = {},
  noteId,
  linkedMemos = [],
  pendingMemos = [],
  aiAdvice,
  onGenerateAdvice,
  onRegenerateAdvice
}: TradeDetailPanelProps) {
  const handleOpenDetail = () => {
    window.location.hash = `/notebook/${noteId}`;
  };

  return (
    <section className="pane">
      <div className="head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>取引ノート（表示）</h3>
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
            <div className="kpi-title">リスクリワード</div>
            <div className="kpi-value">{kpi.rrr ? kpi.rrr.toFixed(2) : '—'}</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-3)' }}>トレード情報</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>通貨ペア</div>
              <div style={{ fontWeight: 600 }}>{trade.item}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>方向</div>
              <div style={{ fontWeight: 600 }}>{trade.side === 'BUY' ? '買い' : '売り'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>サイズ</div>
              <div style={{ fontWeight: 600 }}>{trade.size.toFixed(2)} lot</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>指値/逆指値</div>
              <div style={{ fontWeight: 600 }}>{trade.tp ?? '—'} / {trade.sl ?? '—'}</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-3)' }}>価格と時刻</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>エントリー価格</div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>{trade.openPrice.toFixed(3)}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                {trade.openTime.toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>決済価格</div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>{trade.closePrice.toFixed(3)}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                {trade.closeTime.toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-2)' }}>トレード日記</h2>

          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--muted)' }}>エントリー前・直後</h3>
            {diary.fundNote ? (
              <div style={{ background: 'var(--chip, #f3f4f6)', padding: 'var(--space-2)', borderRadius: 8, fontSize: 13 }}>
                {diary.fundNote}
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>記入なし</div>
            )}
            {diary.entryEmotion && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>感情: </span>
                <span>{diary.entryEmotion}</span>
              </div>
            )}
            {diary.entryBasis && diary.entryBasis.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>エントリー根拠: </span>
                <span>{diary.entryBasis.join(', ')}</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--muted)' }}>ポジション保有中</h3>
            {diary.intraNote ? (
              <div style={{ background: 'var(--chip, #f3f4f6)', padding: 'var(--space-2)', borderRadius: 8, fontSize: 13 }}>
                {diary.intraNote}
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>記入なし</div>
            )}
            {diary.intraEmotion && diary.intraEmotion.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>保有中の感情: </span>
                <span>{diary.intraEmotion.join(', ')}</span>
              </div>
            )}
            {diary.preRules && diary.preRules.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>事前ルール: </span>
                <span>{diary.preRules.join(', ')}</span>
              </div>
            )}
            {diary.ruleExec && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>ルールの守り具合: </span>
                <span>{diary.ruleExec}</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--muted)' }}>ポジション決済後</h3>
            {diary.noteFree ? (
              <div style={{ background: 'var(--chip, #f3f4f6)', padding: 'var(--space-2)', borderRadius: 8, fontSize: 13 }}>
                {diary.noteFree}
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>記入なし</div>
            )}

            {diary.exitTriggers && diary.exitTriggers.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>決済のきっかけ: </span>
                <span>{diary.exitTriggers.join(', ')}</span>
              </div>
            )}

            {diary.exitEmotion && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>決済時の感情: </span>
                <span>{diary.exitEmotion}</span>
              </div>
            )}

            {diary.aiHit && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>当たり外れ（AI）: </span>
                <span>{diary.aiHit}</span>
              </div>
            )}

            {diary.aiPros && diary.aiPros.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>AI予想が良かった点: </span>
                <span>{diary.aiPros.join(', ')}</span>
              </div>
            )}

            {diary.noteRight && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>うまくいった点</div>
                <div style={{ background: 'var(--chip, #f3f4f6)', padding: 'var(--space-2)', borderRadius: 8, fontSize: 13 }}>
                  {diary.noteRight}
                </div>
              </div>
            )}

            {diary.noteWrong && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>改善点</div>
                <div style={{ background: 'var(--chip, #f3f4f6)', padding: 'var(--space-2)', borderRadius: 8, fontSize: 13 }}>
                  {diary.noteWrong}
                </div>
              </div>
            )}

            {diary.noteNext && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>次回の約束</div>
                <div style={{ background: 'var(--chip, #f3f4f6)', padding: 'var(--space-2)', borderRadius: 8, fontSize: 13 }}>
                  {diary.noteNext}
                </div>
              </div>
            )}
          </div>

        </div>

        {diary.tags && diary.tags.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-2)' }}>タグ</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {diary.tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 12px',
                    background: 'var(--accent)',
                    color: 'white',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {aiAdvice && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>AIアドバイス</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {onRegenerateAdvice && (
                  <button
                    onClick={onRegenerateAdvice}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    再生成
                  </button>
                )}
              </div>
            </div>
            <div style={{ background: 'var(--chip, #f3f4f6)', padding: 'var(--space-3)', borderRadius: 8 }}>
              {aiAdvice.advice.map((line, idx) => (
                <div key={idx} style={{ fontSize: 13, marginBottom: idx < aiAdvice.advice.length - 1 ? 8 : 0 }}>
                  {line}
                </div>
              ))}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 8, textAlign: 'right' }}>
              最終更新: {aiAdvice.timestamp}
            </div>
          </div>
        )}

        {!aiAdvice && onGenerateAdvice && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-2)' }}>AIアドバイス</h2>
            <button
              onClick={onGenerateAdvice}
              style={{
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                width: '100%',
              }}
            >
              アドバイスを生成
            </button>
          </div>
        )}

        {diary.images && diary.images.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-2)' }}>画像</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
              {diary.images.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt="trade"
                  style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-2)' }}>リンク済みメモ</h2>
          {linkedMemos.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 'var(--space-2)' }}>
              リンク済みメモはありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {linkedMemos.map((memo) => (
                <div
                  key={memo.tempId}
                  style={{
                    background: 'var(--chip, #f3f4f6)',
                    padding: 'var(--space-2)',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{memo.title}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                      {memo.type} | {memo.updated}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>保留メモ（未リンク）</h2>
            <span style={{
              background: 'var(--accent)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
            }}>
              {pendingMemos.length}件
            </span>
          </div>
          {pendingMemos.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 'var(--space-2)' }}>
              未リンクの仮メモはありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingMemos.map((memo) => (
                <div
                  key={memo.tempId}
                  style={{
                    background: 'var(--chip, #f3f4f6)',
                    padding: 'var(--space-2)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
                    <strong>{memo.symbol}</strong> {memo.side}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4 }}>
                    予定:{isNaN(memo.entry.planned as any) ? "—" : memo.entry.planned} /
                    実:{isNaN(memo.entry.actual as any) ? "—" : memo.entry.actual} /
                    lot {isNaN(memo.entry.size as any) ? "—" : memo.entry.size}
                  </div>
                  {memo.note && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>{memo.note}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: 'var(--space-3)',
          background: 'var(--chip, #f3f4f6)',
          borderRadius: 12,
          textAlign: 'center'
        }}>
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
