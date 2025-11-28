import React from 'react';

interface DemoModeBannerProps {
  onUploadClick?: () => void;
}

export function DemoModeBanner({ onUploadClick }: DemoModeBannerProps) {
  return (
    <div
      style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%)',
        borderRadius: '12px',
        fontSize: '14px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        border: '1px solid rgba(255, 211, 61, 0.3)',
        boxShadow: '0 2px 8px rgba(255, 193, 7, 0.08)',
        flexWrap: 'wrap',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          background: 'linear-gradient(180deg, #ffc107 0%, #ff9800 100%)',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px', paddingLeft: '8px' }}>
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 193, 7, 0.15)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#f57c00',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
          }}
        >
          デモモード
        </div>
        <span style={{ color: '#6d4c00', lineHeight: '1.5' }}>
          現在デモデータを表示中です。実際のデータをアップロードすると、あなた専用の分析が可能になります。
        </span>
      </div>
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          style={{
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(255, 152, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 152, 0, 0.2)';
          }}
        >
          データをアップロード
        </button>
      )}
    </div>
  );
}
