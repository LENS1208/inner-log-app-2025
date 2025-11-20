import React, { useState, useMemo, useEffect } from 'react';
import DailyNotePanel from '../components/daily/DailyNotePanel';
import type { DailyNotePanelProps } from '../components/daily/DailyNotePanel';
import TradeDetailPanel from '../components/trade/TradeDetailPanel';
import type { TradeDetailPanelProps } from '../components/trade/TradeDetailPanel';
import FreeMemoPanel from '../components/free/FreeMemoPanel';
import type { FolderKind, NoteListItem } from './journal-notes.types';
import { getAllDailyNotes, getAllTradeNotes, getAllFreeMemos, getAllTrades } from '../lib/db.service';
import { useDataset } from '../lib/dataset.context';
import '../styles/journal-notebook.css';

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

const demoTradesData: Record<string, TradeData> = {
  'T100001': {
    ticket: 'T100001',
    item: 'USDJPY',
    side: 'BUY',
    size: 0.5,
    openTime: new Date('2025-10-10T08:12:00+09:00'),
    openPrice: 149.52,
    closeTime: new Date('2025-10-10T10:31:00+09:00'),
    closePrice: 149.58,
    commission: -200,
    swap: 0,
    profit: 3200,
    pips: 6.0,
    sl: 149.42,
    tp: null,
  },
  'T100002': {
    ticket: 'T100002',
    item: 'EURUSD',
    side: 'SELL',
    size: 0.3,
    openTime: new Date('2025-10-12T13:20:00+09:00'),
    openPrice: 1.062,
    closeTime: new Date('2025-10-12T14:20:00+09:00'),
    closePrice: 1.064,
    commission: -150,
    swap: 0,
    profit: -1800,
    pips: -2.0,
    sl: 1.067,
    tp: null,
  },
  'T100003': {
    ticket: 'T100003',
    item: 'GBPJPY',
    side: 'BUY',
    size: 0.2,
    openTime: new Date('2025-10-11T08:15:00+09:00'),
    openPrice: 1.892,
    closeTime: new Date('2025-10-11T09:15:00+09:00'),
    closePrice: 1.904,
    commission: -100,
    swap: 0,
    profit: 2400,
    pips: 12.0,
    sl: 1.882,
    tp: null,
  },
  'T100004': {
    ticket: 'T100004',
    item: 'EURUSD',
    side: 'BUY',
    size: 0.4,
    openTime: new Date('2025-10-13T09:20:00+09:00'),
    openPrice: 1.065,
    closeTime: new Date('2025-10-13T11:45:00+09:00'),
    closePrice: 1.068,
    commission: -180,
    swap: 0,
    profit: 2800,
    pips: 3.0,
    sl: 1.060,
    tp: null,
  },
  'T100005': {
    ticket: 'T100005',
    item: 'GBPUSD',
    side: 'SELL',
    size: 0.3,
    openTime: new Date('2025-10-14T14:30:00+09:00'),
    openPrice: 1.285,
    closeTime: new Date('2025-10-14T15:20:00+09:00'),
    closePrice: 1.282,
    commission: -150,
    swap: 0,
    profit: 1900,
    pips: 3.0,
    sl: 1.290,
    tp: null,
  },
  'T100006': {
    ticket: 'T100006',
    item: 'USDJPY',
    side: 'SELL',
    size: 0.6,
    openTime: new Date('2025-10-15T08:00:00+09:00'),
    openPrice: 150.20,
    closeTime: new Date('2025-10-15T10:15:00+09:00'),
    closePrice: 150.35,
    commission: -250,
    swap: 0,
    profit: -3500,
    pips: -15.0,
    sl: 150.30,
    tp: null,
  },
  'T100007': {
    ticket: 'T100007',
    item: 'EURJPY',
    side: 'BUY',
    size: 0.5,
    openTime: new Date('2025-10-16T13:10:00+09:00'),
    openPrice: 162.45,
    closeTime: new Date('2025-10-16T14:50:00+09:00'),
    closePrice: 162.65,
    commission: -220,
    swap: 0,
    profit: 4200,
    pips: 20.0,
    sl: 162.25,
    tp: null,
  },
};

const demoNotesData: NoteListItem[] = [
  {
    id: 'note-1',
    title: '2025/10/09（木）日次ノート',
    kind: '日次',
    updatedAt: '2025-10-11T18:02:00+09:00',
    dateKey: '2025-10-09',
    linked: true,
  },
  {
    id: '2e7af441-a385-4332-97f1-f5c81a785afa',
    title: '2025/10/17（木）｜自由メモ',
    kind: '自由',
    updatedAt: '2025-10-17T09:00:00+09:00',
    dateKey: '2025-10-17',
    linked: false,
    memoPreview: 'メンタル管理の重要性を再認識。損切りラインを守ることが大切。',
  },
  {
    id: 'T100007',
    title: '2025/10/16（水）｜取引ノート｜EUR/JPY',
    kind: '取引',
    updatedAt: '2025-10-16T14:50:00+09:00',
    dateKey: '2025-10-16',
    linked: false,
    pnlYen: 4200,
  },
  {
    id: 'T100006',
    title: '2025/10/15（火）｜取引ノート｜USD/JPY',
    kind: '取引',
    updatedAt: '2025-10-15T10:15:00+09:00',
    dateKey: '2025-10-15',
    linked: false,
    pnlYen: -3500,
  },
  {
    id: 'T100005',
    title: '2025/10/14（月）｜取引ノート｜GBP/USD',
    kind: '取引',
    updatedAt: '2025-10-14T15:20:00+09:00',
    dateKey: '2025-10-14',
    linked: false,
    pnlYen: 1900,
  },
  {
    id: 'T100004',
    title: '2025/10/13（日）｜取引ノート｜EUR/USD',
    kind: '取引',
    updatedAt: '2025-10-13T11:45:00+09:00',
    dateKey: '2025-10-13',
    linked: false,
    pnlYen: 2800,
  },
  {
    id: 'T100002',
    title: '2025/10/12（土）｜取引ノート｜EUR/USD',
    kind: '取引',
    updatedAt: '2025-10-12T14:20:00+09:00',
    dateKey: '2025-10-12',
    linked: false,
    pnlYen: -1800,
  },
  {
    id: 'T100003',
    title: '2025/10/11（金）｜取引ノート｜GBP/JPY',
    kind: '取引',
    updatedAt: '2025-10-11T09:15:00+09:00',
    dateKey: '2025-10-11',
    linked: false,
    pnlYen: 2400,
  },
  {
    id: 'T100001',
    title: '2025/10/10（木）｜取引ノート｜USD/JPY',
    kind: '取引',
    updatedAt: '2025-10-10T10:31:00+09:00',
    dateKey: '2025-10-10',
    linked: false,
    pnlYen: 3200,
  },
  {
    id: '774e4c9d-7e09-4445-a516-0e8c07b3dfb9',
    title: '2025/10/13（日）｜自由メモ｜週末振り返り',
    kind: '自由',
    updatedAt: '2025-10-13T20:00:00+09:00',
    dateKey: '2025-10-13',
    linked: false,
    memoPreview: '',
  },
  {
    id: '47d21e50-efc6-4b6f-bc38-d69b618cd63a',
    title: '2025/10/08（火）｜自由メモ｜トレード戦略',
    kind: '自由',
    updatedAt: '2025-10-08T09:00:00+09:00',
    dateKey: '2025-10-08',
    linked: false,
    memoPreview: 'RSIとボリンジャーバンドの組み合わせが効果的だった。',
  },
  {
    id: 'acddeb4a-a5f3-474d-b91e-2708ee87c0d6',
    title: '2025/10/03（金）｜自由メモ',
    kind: '自由',
    updatedAt: '2025-10-03T09:00:00+09:00',
    dateKey: '2025-10-03',
    linked: true,
    memoPreview: '今日は調子が良かった。エントリーポイントを見極められた。',
  },
];

const demoDailyProps: DailyNotePanelProps = {
  dateJst: '2025/10/04',
  kpi: {
    winRate: 66.7,
    trades: 6,
    wins: 4,
    losses: 2,
    avgYenPerTrade: 1250,
    pf: 2.15,
    totalPips: 42.3,
  },
  trades: [
    { time: '08:12', symbol: 'USD/JPY', sideJp: '買い', pnlYen: 3200 },
    { time: '10:45', symbol: 'EUR/USD', sideJp: '売り', pnlYen: -1800 },
    { time: '13:30', symbol: 'GBP/JPY', sideJp: '買い', pnlYen: 2400 },
  ],
  linkedNotes: [
    { title: '2025-10-04（土）｜日次ノート', kind: '日次', updated: '2025/10/04 20:15' },
    { title: 'USD/JPY 買いポジション #00123', kind: '取引', updated: '2025/10/04 08:30' },
  ],
  advice: {
    items: [
      '本日の勝率は66.7%と良好です。引き続き慎重なエントリーを心がけましょう。',
      'EURUSDで2敗していますが、1勝1敗です。通貨ペアでこのパターンを再検証してみましょう。',
      '損切りが適切に機能しています。この調子でリスク管理を継続してください。',
      '午前中の取引が好調です。時間帯ごとの傾向を分析してみると良いでしょう。',
    ],
    lastUpdated: '2025/10/04 20:30',
  },
  values: { good: '', improve: '', nextPromise: '', free: '' },
};

const formatPnl = (pnlYen: number): string => {
  const sign = pnlYen >= 0 ? '+' : '-';
  return `${sign}${Math.abs(pnlYen).toLocaleString('ja-JP')}円`;
};

export default function JournalNotesPage() {
  const { dataset } = useDataset();
  const [sortBy, setSortBy] = useState<'updated' | 'date'>('updated');
  const [selectedFolder, setSelectedFolder] = useState<FolderKind>('all');
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'trade' | 'free' | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradesData, setTradesData] = useState<Record<string, TradeData>>({});

  const loadNotes = async () => {
    try {
      setLoading(true);
      const [dailyNotes, tradeNotes, freeMemos, allTrades] = await Promise.all([
        getAllDailyNotes(),
        getAllTradeNotes(),
        getAllFreeMemos(),
        getAllTrades(dataset),
      ]);

      const tradesMap = new Map(allTrades.map(t => [t.ticket, t]));

      const tradesDataMap: Record<string, TradeData> = {};
      allTrades.forEach(t => {
        tradesDataMap[t.ticket] = {
          ticket: t.ticket,
          item: t.item,
          side: t.side as 'BUY' | 'SELL',
          size: t.size,
          openTime: new Date(t.open_time),
          openPrice: t.open_price,
          closeTime: new Date(t.close_time),
          closePrice: t.close_price,
          commission: t.commission,
          swap: t.swap,
          profit: t.profit,
          pips: t.pips,
          sl: t.sl,
          tp: t.tp,
        };
      });
      setTradesData(tradesDataMap);

      const allNotes: NoteListItem[] = [
        ...dailyNotes.map(note => ({
          id: note.id,
          title: `${note.date_key}（${getDayOfWeek(note.date_key)}）日次ノート`,
          kind: '日次' as const,
          updatedAt: note.updated_at,
          dateKey: note.date_key,
          linked: true,
        })),
        ...tradeNotes.map(note => {
          const trade = tradesMap.get(note.ticket);
          if (!trade) {
            console.warn(`Trade data not found for ticket: ${note.ticket}`);
            return {
              id: note.ticket,
              title: `取引ノート｜${note.ticket}`,
              kind: '取引' as const,
              updatedAt: note.updated_at,
              dateKey: note.ticket,
              linked: false,
              pnlYen: 0,
            };
          }
          const closeDateKey = trade.close_time ? trade.close_time.split('T')[0] : note.ticket;
          return {
            id: note.ticket,
            title: `${formatTradeDate(trade.close_time)}（${getDayOfWeek(trade.close_time || '')}）｜取引ノート｜${trade.item}`,
            kind: '取引' as const,
            updatedAt: note.updated_at,
            dateKey: closeDateKey,
            linked: true,
            pnlYen: trade.profit || 0,
          };
        }),
        ...freeMemos.map(memo => ({
          id: memo.id,
          title: memo.title,
          kind: '自由' as const,
          updatedAt: memo.updated_at,
          dateKey: memo.date_key,
          linked: false,
          memoPreview: memo.content.substring(0, 50),
        })),
      ];

      setNotes(allNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayOfWeek = (dateKey: string): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const date = new Date(dateKey);
    return days[date.getDay()];
  };

  const formatTradeDate = (dateTime: string | undefined): string => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  useEffect(() => {
    loadNotes();
  }, [dataset]);

  const filteredNotes = useMemo(() => {
    let filtered = notes;

    if (selectedFolder === 'daily') {
      filtered = notes.filter((n) => n.kind === '日次');
    } else if (selectedFolder === 'trade') {
      filtered = notes.filter((n) => n.kind === '取引');
    } else if (selectedFolder === 'free') {
      filtered = notes.filter((n) => n.kind === '自由');
    } else if (selectedFolder === 'unlinked') {
      filtered = notes.filter((n) => !n.linked);
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'updated') {
        const aVal = new Date(a.updatedAt).getTime();
        const bVal = new Date(b.updatedAt).getTime();
        return bVal - aVal;
      } else {
        return b.dateKey.localeCompare(a.dateKey);
      }
    });

    return sorted;
  }, [notes, selectedFolder, sortBy]);

  const handleSort = (type: 'updated' | 'date') => {
    setSortBy(type);
  };

  const handleSelectFolder = (folder: FolderKind) => {
    setSelectedFolder(folder);
  };

  const handleLink = (noteId: string) => {
    console.log('取引にリンク:', noteId);
  };

  const handleOpenNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    setSelectedNoteId(noteId);
    if (note.kind === '取引') {
      setViewMode('trade');
    } else if (note.kind === '日次') {
      setViewMode('daily');
    } else if (note.kind === '自由') {
      setViewMode('free');
    }
  };

  const handleClosePanel = () => {
    setSelectedNoteId(null);
    setViewMode(null);
  };

  const handlePrevDay = () => console.log('前日へ');
  const handleNextDay = () => console.log('翌日へ');
  const handleOpenTradesList = () => console.log('取引一覧を開く');
  const handleOpenLinkedNote = (title: string) => console.log('ノートを開く:', title);
  const handleGenerateAdvice = () => console.log('アドバイスを生成');
  const handleRegenerateAdvice = () => console.log('再生成');
  const handlePinAdvice = () => console.log('固定');
  const handleChangeValues = (values: any) => console.log('値変更:', values);
  const handleSave = async () => {
    await loadNotes();
  };

  const unlinkedCount = notes.filter((n) => !n.linked).length;

  useEffect(() => {
    if (!loading && filteredNotes.length > 0 && !selectedNoteId) {
      handleOpenNote(filteredNotes[0].id);
    }
  }, [loading, filteredNotes]);

  return (
    <div className="shell">
      <aside className="pane">
        <div className="head" style={{ display: 'flex', alignItems: 'center' }}>
          <h3>カテゴリー</h3>
        </div>
        <div className="body list">
          <div
            className="note"
            style={{
              cursor: 'pointer',
              background: selectedFolder === 'all' ? 'var(--chip)' : 'var(--surface)',
              padding: '4px 12px',
            }}
            onClick={() => handleSelectFolder('all')}
          >
            <div className="title">すべてのノート</div>
          </div>
          <div
            className="note"
            style={{
              cursor: 'pointer',
              background: selectedFolder === 'daily' ? 'var(--chip)' : 'var(--surface)',
              padding: '4px 12px',
            }}
            onClick={() => handleSelectFolder('daily')}
          >
            <div className="title">日次ノート</div>
          </div>
          <div
            className="note"
            style={{
              cursor: 'pointer',
              background: selectedFolder === 'trade' ? 'var(--chip)' : 'var(--surface)',
              padding: '4px 12px',
            }}
            onClick={() => handleSelectFolder('trade')}
          >
            <div className="title">取引ノート</div>
          </div>
          <div
            className="note"
            style={{
              cursor: 'pointer',
              background: selectedFolder === 'free' ? 'var(--chip)' : 'var(--surface)',
              padding: '4px 12px',
            }}
            onClick={() => handleSelectFolder('free')}
          >
            <div className="title">自由メモ</div>
          </div>
          <div
            className="note"
            style={{
              cursor: 'pointer',
              background: selectedFolder === 'unlinked' ? 'var(--chip)' : 'var(--surface)',
              padding: '4px 12px',
            }}
            onClick={() => handleSelectFolder('unlinked')}
          >
            <div className="title">未リンクノート</div>
          </div>
        </div>
      </aside>

      <section className="pane">
        <div
          className="head"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <h3>ノート</h3>
          <div className="seg" role="group" aria-label="並び替え">
            <button
              aria-pressed={sortBy === 'updated'}
              onClick={() => handleSort('updated')}
            >
              更新順
            </button>
            <button aria-pressed={sortBy === 'date'} onClick={() => handleSort('date')}>
              日付順
            </button>
          </div>
        </div>
        <div className="body list">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
              読み込み中...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
              ノートがありません
            </div>
          ) : (
            filteredNotes.map((note) => {
            const titleParts = note.title.split('｜');
            const firstLine = titleParts.slice(0, -1).join('｜');
            const secondLine = titleParts[titleParts.length - 1];

            return (
              <div
                key={note.id}
                className="note"
                onClick={() => handleOpenNote(note.id)}
                style={{
                  background: selectedNoteId === note.id ? 'var(--chip)' : 'var(--surface)',
                }}
              >
                <div className="title">
                  {titleParts.length > 1 ? (
                    <>
                      {firstLine}｜
                      <br />
                      {secondLine}
                    </>
                  ) : (
                    note.title
                  )}
                </div>
                <div className="meta-line">
                  {note.kind === '取引' && note.pnlYen !== undefined ? (
                    <span>
                      <span style={{ color: 'var(--muted, #6b7280)' }}>損益　</span>
                      <span className={note.pnlYen >= 0 ? 'good' : 'bad'}>
                        {formatPnl(note.pnlYen)}
                      </span>
                    </span>
                  ) : note.kind === '自由' ? (
                    <span>メモ：{note.memoPreview || '—'}</span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
                {!note.linked && (
                  <div className="bottom-line">
                    <span className="badge-status">未リンク</span>
                    <button
                      className="link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLink(note.id);
                      }}
                    >
                      取引にリンク…
                    </button>
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      </section>

      {viewMode === 'daily' && selectedNoteId ? (
        <DailyNotePanel
          {...demoDailyProps}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onOpenTradesList={handleOpenTradesList}
          onOpenLinkedNote={handleOpenLinkedNote}
          onGenerateAdvice={handleGenerateAdvice}
          onRegenerateAdvice={handleRegenerateAdvice}
          onPinAdvice={handlePinAdvice}
          onChangeValues={handleChangeValues}
          onSave={handleSave}
        />
      ) : viewMode === 'trade' && selectedNoteId && tradesData[selectedNoteId] ? (
        <TradeDetailPanel
          trade={tradesData[selectedNoteId]}
          kpi={{
            net: tradesData[selectedNoteId].profit,
            pips: tradesData[selectedNoteId].pips,
            hold: tradesData[selectedNoteId].closeTime.getTime() - tradesData[selectedNoteId].openTime.getTime(),
            gross: tradesData[selectedNoteId].profit - tradesData[selectedNoteId].commission,
            cost: tradesData[selectedNoteId].commission + tradesData[selectedNoteId].swap,
            rrr: tradesData[selectedNoteId].sl
              ? Math.abs(tradesData[selectedNoteId].pips) /
                Math.abs((tradesData[selectedNoteId].openPrice - tradesData[selectedNoteId].sl!) * (/JPY$/.test(tradesData[selectedNoteId].item) ? 100 : 10000))
              : null,
          }}
          noteId={selectedNoteId}
        />
      ) : viewMode === 'free' && selectedNoteId ? (
        <FreeMemoPanel
          noteId={selectedNoteId}
          title={notes.find(n => n.id === selectedNoteId)?.title || ''}
          dateKey={notes.find(n => n.id === selectedNoteId)?.dateKey || ''}
          onSave={handleSave}
          onDelete={() => {
            handleClosePanel();
            loadNotes();
          }}
        />
      ) : (
        <section className="pane">
          <div className="head">
            <h3>ノートを選択してください</h3>
          </div>
          <div className="body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--muted)' }}>
            左のリストからノートを選択すると、詳細が表示されます
          </div>
        </section>
      )}
    </div>
  );
}
