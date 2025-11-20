import React from 'react';
import type { AiAdvice } from './types';

type AiAdviceBlockProps = {
  advice: AiAdvice;
  onGenerate?: () => void;
  onRegenerate?: () => void;
  onPin?: () => void;
};

export default function AiAdviceBlock({
  advice,
  onGenerate,
  onRegenerate,
  onPin,
}: AiAdviceBlockProps) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <h2 style={{ fontSize: 17, fontWeight: 'bold', color: 'var(--ink)', margin: 0 }}>AI相談</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onGenerate}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            アドバイスを生成
          </button>
          <button
            onClick={onRegenerate}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            再生成
          </button>
          <button
            onClick={onPin}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            固定
          </button>
        </div>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: 'var(--ink)' }}>
        {advice.items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      {advice.lastUpdated && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
          最終更新: {advice.lastUpdated}
        </div>
      )}
    </>
  );
}
