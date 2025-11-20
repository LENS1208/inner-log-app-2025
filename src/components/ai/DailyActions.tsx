import React from 'react';
import Card from '../common/Card';
import { HelpIcon } from '../common/HelpIcon';
import type { DailyActions as DailyActionsType } from '../../types/ai-proposal.types';

type DailyActionsProps = {
  daily: DailyActionsType;
};

export default function DailyActions({ daily }: DailyActionsProps) {
  return (
    <Card data-testid="daily-actions">
      <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        本日のアクション
        <HelpIcon text="まずはここを見て判断してください。今日の想定方針と主戦場、基準価格を確認できます。" />
      </h3>
      <div className="kpi-quick">
        <div className="mini">
          <div className="label">想定方針</div>
          <div className="value">{daily.stance}</div>
        </div>
        <div className="mini">
          <div className="label">主戦場</div>
          <div className="value">{daily.session}</div>
        </div>
        <div className="mini">
          <div className="label">基準価格</div>
          <div className="value">{daily.anchor}</div>
        </div>
        <div className="mini">
          <div className="label">注意フラグ</div>
          <div className="value">{daily.riskNote}</div>
        </div>
      </div>
    </Card>
  );
}
