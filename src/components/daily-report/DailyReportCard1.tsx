import React from 'react';
import type { DailyReportData } from '../../types/daily-report-card.types';

interface Props {
  data: DailyReportData;
}

export const DailyReportCard1: React.FC<Props> = ({ data }) => {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(num));
  };

  const formatProfitDisplay = (): JSX.Element => {
    const { profitMode, mainProfitValue } = data;

    if (profitMode === 'yen') {
      return (
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: mainProfitValue.yen >= 0 ? '#0084c7' : '#ef4444',
          letterSpacing: '-0.02em',
          marginBottom: 8
        }}>
          {mainProfitValue.yen >= 0 ? '+' : ''}{formatNumber(mainProfitValue.yen)}円
        </div>
      );
    }

    if (profitMode === 'pips') {
      return (
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: mainProfitValue.pips >= 0 ? '#0084c7' : '#ef4444',
          letterSpacing: '-0.02em',
          marginBottom: 8
        }}>
          {mainProfitValue.pips >= 0 ? '+' : ''}{mainProfitValue.pips.toFixed(1)} pips
        </div>
      );
    }

    return (
      <div>
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: mainProfitValue.yen >= 0 ? '#0084c7' : '#ef4444',
          letterSpacing: '-0.02em',
          marginBottom: 4
        }}>
          {mainProfitValue.yen >= 0 ? '+' : ''}{formatNumber(mainProfitValue.yen)}円
        </div>
        <div style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#64748b',
          letterSpacing: '-0.01em'
        }}>
          ({mainProfitValue.pips >= 0 ? '+' : ''}{mainProfitValue.pips.toFixed(1)} pips)
        </div>
      </div>
    );
  };

  return (
    <div style={{
      width: 900,
      height: 1200,
      background: '#fafbfc',
      borderRadius: 8,
      padding: 40,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      position: 'relative'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0084c7 0%, #0084c7 100%)',
        color: '#ffffff',
        padding: '24px 32px',
        borderRadius: 8,
        marginBottom: 32
      }}>
        <div style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 4,
          letterSpacing: '-0.01em'
        }}>
          Today's FX Result
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 500,
          opacity: 0.95,
          letterSpacing: '0.01em'
        }}>
          {data.date}
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32
      }}>
        {formatProfitDisplay()}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 32
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: 24,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: 14,
            color: '#64748b',
            marginBottom: 8,
            fontWeight: 500
          }}>
            勝率
          </div>
          <div style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#0084c7',
            letterSpacing: '-0.02em'
          }}>
            {(data.winRate * 100).toFixed(1)}%
          </div>
          <div style={{
            fontSize: 12,
            color: '#94a3b8',
            marginTop: 8
          }}>
            {data.wins}勝 {data.losses}敗 {data.draws}分
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: 24,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: 14,
            color: '#64748b',
            marginBottom: 8,
            fontWeight: 500
          }}>
            PF
          </div>
          <div style={{
            fontSize: 36,
            fontWeight: 700,
            color: data.pf >= 1 ? '#0084c7' : '#ef4444',
            letterSpacing: '-0.02em'
          }}>
            {data.pf === Infinity ? '∞' : data.pf.toFixed(2)}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: 24,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: 14,
            color: '#64748b',
            marginBottom: 8,
            fontWeight: 500
          }}>
            最大DD
          </div>
          <div style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#ef4444',
            letterSpacing: '-0.02em'
          }}>
            -{formatNumber(data.maxDD)}円
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: 24,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: 14,
            color: '#64748b',
            marginBottom: 8,
            fontWeight: 500
          }}>
            取引回数
          </div>
          <div style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}>
            {data.tradeCount}回
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTop: '1px solid #e2e8f0'
      }}>
        {data.showUsername && data.username ? (
          <div style={{
            fontSize: 14,
            color: '#64748b',
            fontWeight: 500
          }}>
            @{data.username}
          </div>
        ) : (
          <div />
        )}

        {data.showBrokerLink && data.brokerName ? (
          <div style={{
            fontSize: 14,
            color: '#0084c7',
            fontWeight: 600,
            textDecoration: 'underline'
          }}>
            {data.brokerName}
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
