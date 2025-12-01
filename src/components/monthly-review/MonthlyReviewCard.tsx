import React from 'react';
import type { MonthlyReviewData } from '../../services/monthlyReview.service';

interface MonthlyReviewCardProps {
  review: MonthlyReviewData;
  onClick?: () => void;
  isCurrentMonth?: boolean;
}

export const MonthlyReviewCard: React.FC<MonthlyReviewCardProps> = ({
  review,
  onClick,
  isCurrentMonth = false
}) => {
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    return `${year}年${parseInt(monthNum)}月`;
  };

  const getCoachName = (avatar: string) => {
    switch (avatar) {
      case 'teacher':
        return '先生';
      case 'beginner':
        return '初心者サポーター';
      case 'strategist':
        return '上級戦略家';
      default:
        return '先生';
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: isCurrentMonth ? 'rgba(0, 132, 199, 0.05)' : 'var(--surface)',
        border: isCurrentMonth ? '2px solid var(--accent)' : '1px solid var(--line)',
        borderRadius: 12,
        padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = isCurrentMonth ? 'var(--accent)' : 'var(--line)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
          {formatMonth(review.month)}
          {isCurrentMonth && (
            <span style={{
              marginLeft: 8,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'rgba(0, 132, 199, 0.1)',
              padding: '2px 8px',
              borderRadius: 4
            }}>
              今月
            </span>
          )}
        </h3>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {getCoachName(review.coach_avatar)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>損益</div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: review.summary_profit >= 0 ? 'var(--gain)' : 'var(--loss)'
          }}>
            {review.summary_profit >= 0 ? '+' : ''}{Math.round(review.summary_profit).toLocaleString()}円
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>PF</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
            {review.summary_pf.toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
            {review.summary_win_rate.toFixed(1)}%
          </div>
        </div>
      </div>

      {review.is_early_month && (
        <div style={{
          fontSize: 11,
          color: 'var(--muted)',
          background: 'rgba(239, 68, 68, 0.05)',
          padding: '6px 10px',
          borderRadius: 6,
          marginBottom: 12,
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          月初レビュー（データ不足）
        </div>
      )}

      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
        {review.next_focus}
      </div>
    </div>
  );
};
