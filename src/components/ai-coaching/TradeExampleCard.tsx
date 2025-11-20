import React from 'react';
import type { TradeExample } from '../../services/ai-coaching/types';
import { fmt } from '../../lib/formatters';

interface TradeExampleCardProps {
  ex: TradeExample;
}

export function TradeExampleCard({ ex }: TradeExampleCardProps) {
  const isProfit = ex.pnlJPY >= 0;
  const note = ex.note || '';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hour}:${min}`;
  };

  const formatSide = (side: string) => {
    if (side === "LONG" || side === "BUY" || side === "買い") return "買い";
    if (side === "SHORT" || side === "SELL" || side === "売り") return "売り";
    return side;
  };

  const isGoodExample =
    note.includes('良い') ||
    note.includes('好例') ||
    note.includes('成功') ||
    note.includes('綺麗') ||
    note.includes('理想') ||
    note.includes('完璧') ||
    note.includes('適切') ||
    (isProfit && (note.includes('利確') || note.includes('勝ち') || note.includes('プラス')));

  const isOverLotOrCounter =
    note.includes('過大') ||
    note.includes('逆張り') ||
    note.includes('大きすぎ') ||
    note.includes('ロット大');

  const isBadExample =
    note.includes('改善') ||
    note.includes('課題') ||
    note.includes('注意') ||
    note.includes('反省') ||
    (!isProfit && (note.includes('損切り') || note.includes('負け') || note.includes('マイナス')));

  let iconType: 'good' | 'warning' | 'bad' | null = null;
  let iconSymbol = '';
  let iconBg = '';
  let iconColor = '';

  if (isGoodExample) {
    iconType = 'good';
    iconSymbol = '✓';
    iconBg = 'var(--gain-bg)';
    iconColor = 'var(--gain)';
  } else if (isOverLotOrCounter) {
    iconType = 'warning';
    iconSymbol = '⚠';
    iconBg = '#FEF3C7';
    iconColor = '#D97706';
  } else if (isBadExample) {
    iconType = 'bad';
    iconSymbol = '!';
    iconBg = 'var(--loss-bg)';
    iconColor = 'var(--loss)';
  } else if (isProfit && ex.pnlJPY > 10000) {
    iconType = 'good';
    iconSymbol = '✓';
    iconBg = 'var(--gain-bg)';
    iconColor = 'var(--gain)';
  } else if (!isProfit && ex.pnlJPY < -10000) {
    iconType = 'bad';
    iconSymbol = '!';
    iconBg = 'var(--loss-bg)';
    iconColor = 'var(--loss)';
  }

  const pnlFormatted = fmt.yen_signed_colored(ex.pnlJPY);
  const pipsFormatted = ex.pips != null ? fmt.pips_signed_colored(ex.pips) : { text: '—', cls: '' };

  const handleClick = () => {
    if (ex.ticket) {
      console.log('Trade example clicked:', ex.ticket);
      location.hash = `/notebook/${ex.ticket}`;
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        padding: '16px',
        position: 'relative',
        cursor: ex.ticket ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (ex.ticket) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          e.currentTarget.style.borderColor = 'var(--accent)';
        }
      }}
      onMouseLeave={(e) => {
        if (ex.ticket) {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'var(--line)';
        }
      }}
    >
      {iconType && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            background: iconBg,
            color: iconColor,
            fontWeight: 'bold',
          }}
        >
          {iconSymbol}
        </div>
      )}

      {note && (
        <div style={{
          fontSize: '14px',
          color: 'var(--ink)',
          marginBottom: '12px',
          paddingLeft: iconType ? '32px' : '0',
          fontWeight: 500,
          lineHeight: 1.6
        }}>
          {note}
        </div>
      )}

      <div style={{
        fontSize: '13px',
        paddingLeft: iconType ? '32px' : '0'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 8px 10px 0', color: 'var(--ink)', fontWeight: 600, width: '35%', fontSize: '14px' }}>決済日時</td>
              <td style={{ padding: '10px 0', color: 'var(--ink)', fontSize: '14px', fontWeight: 500 }}>{formatDate(ex.date)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 8px 10px 0', color: 'var(--ink)', fontWeight: 600, fontSize: '14px' }}>通貨ペア</td>
              <td style={{ padding: '10px 0', color: 'var(--ink)', fontSize: '14px', fontWeight: 500 }}>{ex.symbol}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 8px 10px 0', color: 'var(--ink)', fontWeight: 600, fontSize: '14px' }}>ポジション</td>
              <td style={{ padding: '10px 0', color: 'var(--ink)', fontSize: '14px', fontWeight: 500 }}>{formatSide(ex.side)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 8px 10px 0', color: 'var(--ink)', fontWeight: 600, fontSize: '14px' }}>損益</td>
              <td style={{ padding: '10px 0', fontSize: '14px', fontWeight: 600 }} className={pnlFormatted.cls}>{pnlFormatted.text}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 8px 10px 0', color: 'var(--ink)', fontWeight: 600, fontSize: '14px' }}>pips</td>
              <td style={{ padding: '10px 0', fontSize: '14px', fontWeight: 600 }} className={pipsFormatted.cls}>{pipsFormatted.text}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 8px 10px 0', color: 'var(--ink)', fontWeight: 600, fontSize: '14px' }}>ロット数</td>
              <td style={{ padding: '10px 0', color: 'var(--ink)', fontSize: '14px', fontWeight: 500 }}>
                {typeof ex.lots === 'number' ? ex.lots.toFixed(2) : Number(ex.lots || 0).toFixed(2)}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 8px 10px 0', color: 'var(--ink)', fontWeight: 600, fontSize: '14px' }}>建値</td>
              <td style={{ padding: '10px 0', color: 'var(--ink)', fontSize: '14px', fontWeight: 500 }}>
                {typeof ex.entry === 'number' ? ex.entry : ex.entry}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px 8px 10px 0', color: 'var(--ink)', fontWeight: 600, fontSize: '14px' }}>決済</td>
              <td style={{ padding: '10px 0', color: 'var(--ink)', fontSize: '14px', fontWeight: 500 }}>
                {typeof ex.exit === 'number' ? ex.exit : ex.exit}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
