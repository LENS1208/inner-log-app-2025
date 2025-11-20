import React from 'react';
import Card from '../common/Card';

type AiAdviceProps = {
  onConvertToDaily?: () => void;
  onConvertToTrade?: () => void;
};

export default function AiAdvice({ onConvertToDaily, onConvertToTrade }: AiAdviceProps) {
  return (
    <Card style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }} data-testid="ai-advice">
      <button className="btn" onClick={() => onConvertToDaily?.()}>
        日次ノートに変換
      </button>
      <button className="btn" onClick={() => onConvertToTrade?.()}>
        取引ノートに変換
      </button>
    </Card>
  );
}
