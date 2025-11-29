import React from 'react';
import DayTradesTable from './DayTradesTable';
import LinkedNotesTable from './LinkedNotesTable';
import AiAdviceBlock from './AiAdviceBlock';
import TextareaGroup from './TextareaGroup';
import { showToast } from '../../lib/toast';
import type {
  DailyKpi,
  DayTradeRow,
  LinkedNoteRow,
  AiAdvice,
  TextareaGroupValue,
} from './types';

export type DailyNotePanelProps = {
  dateJst: string;
  kpi: DailyKpi;
  trades: DayTradeRow[];
  linkedNotes: LinkedNoteRow[];
  advice: AiAdvice;
  values: TextareaGroupValue;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onOpenTradesList?: () => void;
  onOpenLinkedNote?: (title: string) => void;
  onGenerateAdvice?: () => void;
  onRegenerateAdvice?: () => void;
  onPinAdvice?: () => void;
  onChangeValues?: (v: TextareaGroupValue) => void;
  onSave?: () => void;
};

export default function DailyNotePanel({
  dateJst,
  kpi,
  trades,
  linkedNotes,
  advice,
  values,
  onPrevDay,
  onNextDay,
  onOpenTradesList,
  onOpenLinkedNote,
  onGenerateAdvice,
  onRegenerateAdvice,
  onPinAdvice,
  onChangeValues,
  onSave,
}: DailyNotePanelProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const avgYenClass = kpi.avgYenPerTrade >= 0 ? 'good' : 'bad';
  const totalPipsClass = kpi.totalPips >= 0 ? 'good' : 'bad';

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteNote = () => {
    if (confirm('この日次ノートを削除しますか？')) {
      console.log('日次ノートを削除:', dateJst);
      showToast('日次ノートを削除しました', 'success');
    }
  };

  const handleAddTrade = () => {
    console.log('取引を追加:', dateJst);
    showToast('取引選択画面を表示します', 'info');
    setMenuOpen(false);
  };

  const handleLinkMemo = () => {
    console.log('メモをリンク:', dateJst);
    showToast('メモ選択画面を表示します', 'info');
    setMenuOpen(false);
  };

  return (
    <section className="pane">
      <div className="head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3>日次ノート</h3>
          <div ref={menuRef} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            <button
              onClick={onPrevDay}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              ← 前日
            </button>
            <button
              onClick={onNextDay}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              翌日 →
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
                  onClick={handleAddTrade}
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
                  取引を追加
                </button>
                <button
                  onClick={handleLinkMemo}
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
                  メモをリンク
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
            <div className="kpi-title">勝率</div>
            <div className="kpi-value">{kpi.winRate.toFixed(1)}%</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">取引回数</div>
            <div className="kpi-value">{kpi.trades}回</div>
            <div className="kpi-desc">勝ち：{kpi.wins}｜負け：{kpi.losses}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">平均損益</div>
            <div className={`kpi-value ${avgYenClass}`}>
              {kpi.avgYenPerTrade >= 0 ? '+' : ''}{Math.round(kpi.avgYenPerTrade).toLocaleString('ja-JP')}円
            </div>
            <div className="kpi-desc">1取引あたりの平均損益</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">PF</div>
            <div className="kpi-value">{kpi.pf.toFixed(2)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">総pips数</div>
            <div className={`kpi-value ${totalPipsClass}`}>
              {kpi.totalPips >= 0 ? '+' : ''}{kpi.totalPips.toFixed(1)} pips
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 'bold', color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>当日の推移</h2>
          <TextareaGroup values={values} onChange={onChangeValues} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
            <button
              onClick={onSave}
              style={{
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
              }}
            >
              保存
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 'bold', color: 'var(--ink)', margin: 0 }}>この日の取引</h2>
            <button
              onClick={onOpenTradesList}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 13,
                textDecoration: 'underline',
              }}
            >
              取引一覧を開く
            </button>
          </div>
          <DayTradesTable trades={trades} />
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 'bold', color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>リンク済みノート</h2>
          <LinkedNotesTable notes={linkedNotes} onOpenNote={onOpenLinkedNote} />
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 'var(--space-3)' }}>
          <AiAdviceBlock
            advice={advice}
            onGenerate={onGenerateAdvice}
            onRegenerate={onRegenerateAdvice}
            onPin={onPinAdvice}
          />
        </div>
      </div>
    </section>
  );
}
