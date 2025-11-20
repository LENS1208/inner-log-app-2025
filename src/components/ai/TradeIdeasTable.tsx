import React from 'react';
import Card from '../common/Card';
import { HelpIcon } from '../common/HelpIcon';
import type { TradeIdea, HeroData } from '../../types/ai-proposal.types';

type TradeIdeasTableProps = {
  ideas: TradeIdea[];
  hero: HeroData;
  onCreateTradeNote?: (ideaId: string) => void;
};

export default function TradeIdeasTable({ ideas, hero, onCreateTradeNote }: TradeIdeasTableProps) {
  const sortedIdeas = [...ideas].sort((a, b) => {
    if (hero.bias === 'BUY') {
      if (a.side === '買い' && b.side !== '買い') return -1;
      if (a.side !== '買い' && b.side === '買い') return 1;
    } else if (hero.bias === 'SELL') {
      if (a.side === '売り' && b.side !== '売り') return -1;
      if (a.side !== '売り' && b.side === '売り') return 1;
    }
    return 0;
  });

  return (
    <Card data-testid="trade-ideas" style={{ maxWidth: 'calc(100% - 20px)', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        エントリープラン
        <HelpIcon text="セットアップ（最大3件）を表示します。各プランのエントリーポイント、損切り・利確、期待リターン、信頼度を確認できます。" />
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>ポジション</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>エントリー</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>損切り/利確</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>期待リターン</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>信頼度</th>
            <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sortedIdeas.map((idea) => (
            <tr key={idea.id}>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--ink)' }}>{idea.side}</td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--ink)' }}>{idea.entry}</td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--ink)' }}>
                {idea.slPips > 0 ? '+' : ''}{idea.slPips} / {idea.tpPips > 0 ? '+' : ''}{idea.tpPips} pips
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 13 }} className={idea.expected > 0 ? 'good' : 'bad'}>
                {idea.expected > 0 ? '+' : ''}{idea.expected.toFixed(2)}
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--ink)' }}>{idea.confidence}</td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                <button className="btn" style={{ fontSize: 12 }} onClick={() => onCreateTradeNote?.(idea.id)}>
                  取引ノートを作成
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
