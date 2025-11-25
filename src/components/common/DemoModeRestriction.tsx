import React from 'react';

interface DemoModeRestrictionProps {
  featureName?: string;
  onUploadClick?: () => void;
}

export function DemoModeRestriction({
  featureName = 'この機能',
  onUploadClick
}: DemoModeRestrictionProps) {
  return (
    <div
      style={{
        padding: '20px 24px',
        background: 'var(--accent-bg)',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid var(--accent-border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--ink)',
        }}
      >
        デモデータには{featureName}を追加できません
      </h3>
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          lineHeight: '1.6',
          color: 'var(--muted)',
        }}
      >
        実際のデータをアップロードすると、取引ごとにノートやメモを追加できるようになります。
        <br />
        あなた専用の取引日記を作成しましょう。
      </p>
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#fff',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          取引データをアップロード
        </button>
      )}
    </div>
  );
}
