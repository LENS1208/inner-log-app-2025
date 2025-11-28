import React from 'react';

interface DemoModeBannerProps {
  onUploadClick?: () => void;
}

export function DemoModeBanner({ onUploadClick }: DemoModeBannerProps) {
  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#e3f2fd',
        color: '#1565c0',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        border: '1px solid #90caf9',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
        <span>
          現在デモデータを表示中です。実際のデータをアップロードすると、あなた専用の分析が可能になります。
        </span>
      </div>
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            background: '#1976d2',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1565c0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1976d2';
          }}
        >
          データをアップロード
        </button>
      )}
    </div>
  );
}
