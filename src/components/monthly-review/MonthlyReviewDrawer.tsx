import React, { useState, useEffect } from 'react';
import type { MonthlyReviewData } from '../../services/monthlyReview.service';
import { EvaluationScoreCard } from './EvaluationScoreCard';
import { EvaluationRadarChart } from './EvaluationRadarChart';
import { EvaluationDetailsGrid } from './EvaluationDetailsGrid';
import { supabase } from '../../lib/supabase';
import { calculateMonthlyEvaluation, type MonthlyEvaluation } from '../../utils/monthly-evaluation';
import type { Trade } from '../../lib/types';
import { HelpIcon } from '../common/HelpIcon';

interface MonthlyReviewDrawerProps {
  review: MonthlyReviewData | null;
  onClose: () => void;
  isOpen?: boolean;
  isDrawer?: boolean;
}

export const MonthlyReviewDrawer: React.FC<MonthlyReviewDrawerProps> = ({ review, onClose, isOpen = true, isDrawer = true }) => {
  const [evaluation, setEvaluation] = useState<MonthlyEvaluation | null>(review?.evaluation || null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (review && !review.evaluation) {
      loadEvaluationData();
    } else if (review?.evaluation) {
      setEvaluation(review.evaluation);
    }
  }, [review]);

  const loadEvaluationData = async () => {
    if (!review) return;

    setLoadingEvaluation(true);
    try {
      const [year, monthNum] = review.month.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endMonth = parseInt(monthNum) === 12 ? '01' : String(parseInt(monthNum) + 1).padStart(2, '0');
      const endYear = parseInt(monthNum) === 12 ? String(parseInt(year) + 1) : year;
      const endDate = `${endYear}-${endMonth}-01`;

      const { data: monthTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', review.user_id)
        .gte('close_time', startDate)
        .lt('close_time', endDate)
        .order('close_time', { ascending: true });

      const { data: allTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', review.user_id)
        .order('close_time', { ascending: true });

      if (monthTrades && allTrades) {
        const calculatedEvaluation = calculateMonthlyEvaluation(monthTrades as Trade[], allTrades as Trade[]);
        setEvaluation(calculatedEvaluation);
      }
    } catch (error) {
      console.error('Error loading evaluation data:', error);
    } finally {
      setLoadingEvaluation(false);
    }
  };

  if (!review || !isOpen) return null;

  console.log('📊 MonthlyReviewDrawer rendering with review:', {
    month: review.month,
    ai_comment_kizuki: review.ai_comment_kizuki,
    ai_comment_chuui: review.ai_comment_chuui,
    ai_comment_next_itte: review.ai_comment_next_itte,
    coach_avatar: review.coach_avatar,
  });

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

  const content = (
    <div
      style={{
        background: 'var(--bg)',
        padding: 0,
      }}
    >
      {!isDrawer && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
            {formatMonth(review.month)} 月次レビュー
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              閉じる
            </button>
          )}
        </div>
      )}

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
            background: 'var(--chip)',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            border: '1px solid var(--line)'
          }}>
            月初データ
          </span>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>取引回数</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {review.summary_trade_count}
            </div>
          </div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {review.summary_win_rate.toFixed(1)}%
            </div>
          </div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>PF</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {review.summary_pf === Infinity ? '∞' : review.summary_pf.toFixed(2)}
            </div>
          </div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>損益</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: review.summary_profit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
              {review.summary_profit >= 0 ? '+' : ''}{Math.round(review.summary_profit).toLocaleString()}円
            </div>
          </div>
        </div>
      </div>

      {loadingEvaluation ? (
        <div style={{
          padding: 24,
          textAlign: 'center',
          background: 'var(--surface)',
          borderRadius: 12,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>評価データを読み込み中...</div>
        </div>
      ) : evaluation ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <EvaluationScoreCard evaluation={evaluation} />
            <EvaluationRadarChart scores={evaluation.scores} />
          </div>
          <EvaluationDetailsGrid details={evaluation.details} />
        </>
      ) : null}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <div>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--accent-2)',
          }}>
            今月の強み
          </h3>
          <div style={{
            background: 'rgba(0, 132, 199, 0.05)',
            border: '1px solid var(--accent-border)',
            borderRadius: 12,
            padding: 16,
            minHeight: 120,
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

        <div>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--loss)',
          }}>
            今月の課題
          </h3>
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            padding: 16,
            minHeight: 120,
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

        <div>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: 16,
            fontWeight: 700,
            color: '#10b981',
          }}>
            来月の重点テーマ
          </h3>
          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 12,
            padding: 16,
            fontSize: 14,
            lineHeight: 1.8,
            color: 'var(--ink)',
            fontWeight: 600,
            minHeight: 120,
          }}>
            {review.next_focus}
          </div>
        </div>
      </div>

      {(review.ai_comment_kizuki || review.ai_comment_chuui || review.ai_comment_next_itte) && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
            AIコーチからのメッセージ
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {review.ai_comment_kizuki && (
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--accent-2)',
                  marginBottom: 6,
                }}>
                  気づき
                </div>
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--ink)',
                  minHeight: 100,
                  whiteSpace: 'pre-wrap',
                }}>
                  {review.ai_comment_kizuki}
                </div>
              </div>
            )}

            {review.ai_comment_chuui && (
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--loss)',
                  marginBottom: 6,
                }}>
                  注意点
                </div>
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--ink)',
                  minHeight: 100,
                  whiteSpace: 'pre-wrap',
                }}>
                  {review.ai_comment_chuui}
                </div>
              </div>
            )}

            {review.ai_comment_next_itte && (
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#10b981',
                  marginBottom: 6,
                }}>
                  次の一手
                </div>
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--ink)',
                  minHeight: 100,
                  whiteSpace: 'pre-wrap',
                }}>
                  {review.ai_comment_next_itte}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!isDrawer) {
    return content;
  }

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
        ref={drawerRef}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '40%',
          minWidth: 600,
          maxWidth: 800,
          background: 'var(--surface)',
          zIndex: 9999,
          overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
          animation: 'slideInRight 0.3s ease-out',
          outline: 'none',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  {formatMonth(review.month)} 月次レビュー
                </h2>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--chip)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--line)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--chip)';
                }}
              >
                閉じる
              </button>
            </div>
          </div>
          {content}
        </div>
      </div>
    </>
  );
};
