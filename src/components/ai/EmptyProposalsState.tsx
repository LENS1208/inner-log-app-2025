import React from 'react';
import { getAccentColor } from '../../lib/chartColors';

type EmptyProposalsStateProps = {
  onGenerateSample: () => void;
  onFillTemplate: () => void;
  loading?: boolean;
};

export default function EmptyProposalsState({
  onGenerateSample,
  onFillTemplate,
  loading = false,
}: EmptyProposalsStateProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: getAccentColor(0.1),
            marginBottom: 24,
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke={getAccentColor()}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <h3
          style={{
            margin: '0 0 12px',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          まだ予想がありません
        </h3>

        <p
          style={{
            margin: '0 0 32px',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--muted)',
          }}
        >
          最初の予想がまだありません。
          <br />
          まずはドル円（USDJPY）からシナリオを作ってみませんか？
          <br />
          わからない場合は、AIがサンプルを作成することもできます。
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxWidth: 400,
            margin: '0 auto',
          }}
        >
          <button
            onClick={onGenerateSample}
            disabled={loading}
            style={{
              padding: '14px 24px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: loading ? 'var(--muted)' : getAccentColor(),
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? '生成中...' : 'ドル円のサンプル予想を表示'}
          </button>

          <button
            onClick={onFillTemplate}
            disabled={loading}
            style={{
              padding: '14px 24px',
              fontSize: 14,
              fontWeight: 600,
              color: getAccentColor(),
              background: 'transparent',
              border: `1px solid ${getAccentColor()}`,
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = getAccentColor(0.05);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            AIにシナリオ案を考えてもらう
          </button>
        </div>
      </div>
    </div>
  );
}
