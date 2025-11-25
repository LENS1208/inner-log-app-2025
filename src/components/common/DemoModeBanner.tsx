import React from 'react';

interface DemoModeBannerProps {
  onUploadClick?: () => void;
}

export function DemoModeBanner({ onUploadClick }: DemoModeBannerProps) {
  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#fff3cd',
        color: '#856404',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        border: '1px solid #ffeaa7',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
        <span style={{ fontSize: '18px' }}>📊</span>
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
            color: '#856404',
            background: '#fff',
            border: '1px solid #ffd93d',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffeaa7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
          }}
        >
          データをアップロード
        </button>
      )}
    </div>
  );
}
