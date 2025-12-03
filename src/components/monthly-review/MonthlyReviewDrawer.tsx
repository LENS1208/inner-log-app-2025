import React from 'react';
import type { MonthlyReviewData } from '../../services/monthlyReview.service';
import { EvaluationScoreCard } from './EvaluationScoreCard';
import { EvaluationRadarChart } from './EvaluationRadarChart';
import { EvaluationDetailsGrid } from './EvaluationDetailsGrid';

interface MonthlyReviewDrawerProps {
  review: MonthlyReviewData | null;
  onClose: () => void;
}

export const MonthlyReviewDrawer: React.FC<MonthlyReviewDrawerProps> = ({ review, onClose }) => {
  if (!review) return null;

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
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '50%',
          maxWidth: 650,
          background: 'var(--bg)',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          overflowY: 'auto',
          padding: 32,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
            {formatMonth(review.month)} 月次レビュー
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          fontSize: 13,
          color: 'var(--muted)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>コーチ: {getCoachName(review.coach_avatar)}</span>
          {review.is_early_month && (
            <span style={{
              fontSize: 11,
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--loss)',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              月初レビュー
            </span>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 24,
          padding: 16,
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--line)'
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>月間損益</div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: review.summary_profit >= 0 ? 'var(--gain)' : 'var(--loss)'
            }}>
              {review.summary_profit >= 0 ? '+' : ''}{Math.round(review.summary_profit).toLocaleString()}円
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>取引数</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {review.summary_trade_count}回
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>PF</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {review.summary_pf.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>勝率</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {review.summary_win_rate.toFixed(1)}%
            </div>
          </div>
        </div>

        {review.evaluation && (
          <>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginBottom: 32,
            }}>
              <EvaluationScoreCard evaluation={review.evaluation} />
              <EvaluationRadarChart scores={review.evaluation.scores} />
              <EvaluationDetailsGrid details={review.evaluation.details} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 24 }}>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--accent-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{ fontSize: 18 }}>✓</span> 今月の強み
          </h3>
          <div style={{
            background: 'rgba(0, 132, 199, 0.05)',
            border: '1px solid var(--accent-border)',
            borderRadius: 12,
            padding: 16
          }}>
            {review.strengths.length > 0 ? (
              <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 14, lineHeight: 1.8, color: 'var(--ink)' }}>
                {review.strengths.map((strength, i) => (
                  <li key={i}>{strength}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>データが不足しています</div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--loss)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{ fontSize: 18 }}>⚠</span> 今月の課題
          </h3>
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            padding: 16
          }}>
            {review.weaknesses.length > 0 ? (
              <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 14, lineHeight: 1.8, color: 'var(--ink)' }}>
                {review.weaknesses.map((weakness, i) => (
                  <li key={i}>{weakness}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>特に課題はありません</div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: 16,
            fontWeight: 700,
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{ fontSize: 18 }}>→</span> 来月の重点テーマ
          </h3>
          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 12,
            padding: 16,
            fontSize: 14,
            lineHeight: 1.8,
            color: 'var(--ink)',
            fontWeight: 600
          }}>
            {review.next_focus}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
            AIコーチからのメッセージ
          </h3>

          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--accent-2)',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>💡</span> 気づき
            </div>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--ink)'
            }}>
              {review.ai_comment_kizuki}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--loss)',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>⚠️</span> 注意点
            </div>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--ink)'
            }}>
              {review.ai_comment_chuui}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#10b981',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>🎯</span> 次の一手
            </div>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--ink)'
            }}>
              {review.ai_comment_next_itte}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
