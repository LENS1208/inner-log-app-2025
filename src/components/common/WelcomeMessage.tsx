import React from 'react';

interface WelcomeMessageProps {
  onDismiss: () => void;
}

interface EmptyDataMessageProps {
  message?: string;
  showUploadButton?: boolean;
}

export function EmptyDataMessage({
  message = 'データがありません',
  showUploadButton = true
}: EmptyDataMessageProps) {
  const handleUpload = () => {
    window.dispatchEvent(new Event("fx:openUpload"));
  };

  return (
    <div style={{
      height: '100%',
      display: 'grid',
      placeItems: 'center',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <div>
        <div style={{
          fontSize: 14,
          color: 'var(--muted)',
          marginBottom: showUploadButton ? 16 : 0
        }}>
          {message}
        </div>
        {showUploadButton && (
          <button
            onClick={handleUpload}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 8,
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
            取引履歴を追加
          </button>
        )}
      </div>
    </div>
  );
}

export function WelcomeMessage({ onDismiss }: WelcomeMessageProps) {
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
      <div style={{ textAlign: 'center' }}>
        <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--ink)',
            }}
          >
            Welcome to Inner log
          </h3>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--muted)',
            }}
          >
            まずはデモデータで機能をお試しください。
            <br />
            準備ができたら「取引履歴を追加」から実際のデータをアップロードできます。
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={onDismiss}
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
              理解しました
            </button>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--muted)',
              }}
            >
              このメッセージは一度だけ表示されます
            </span>
          </div>
      </div>
    </div>
  );
}
