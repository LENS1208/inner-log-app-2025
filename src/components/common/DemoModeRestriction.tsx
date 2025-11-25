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
        padding: '40px 24px',
        textAlign: 'center',
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '2px dashed var(--line)',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}
      >
        🔒
      </div>
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--ink)',
        }}
      >
        デモデータには{featureName}を追加できません
      </h3>
      <p
        style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: 'var(--muted)',
          lineHeight: '1.6',
          maxWidth: '400px',
          marginLeft: 'auto',
          marginRight: 'auto',
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
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#fff',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          取引データをアップロード
        </button>
      )}
    </div>
  );
}
