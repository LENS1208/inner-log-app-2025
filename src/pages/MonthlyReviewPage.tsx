import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MonthlyReviewService, type MonthlyReviewData } from '../services/monthlyReview.service';
import { MonthlyReviewCard } from '../components/monthly-review/MonthlyReviewCard';
import { MonthlyReviewDrawer } from '../components/monthly-review/MonthlyReviewDrawer';
import { useCoachAvatar } from '../lib/coachAvatar.context';
import { showToast } from '../lib/toast';

export default function MonthlyReviewPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentReview, setCurrentReview] = useState<MonthlyReviewData | null>(null);
  const [pastReviews, setPastReviews] = useState<MonthlyReviewData[]>([]);
  const [selectedReview, setSelectedReview] = useState<MonthlyReviewData | null>(null);
  const [userId, setUserId] = useState<string>('');
  const { coachAvatarPreset } = useCoachAvatar();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const currentMonth = MonthlyReviewService.getCurrentMonth();
      const current = await MonthlyReviewService.getMonthlyReview(user.id, currentMonth);
      setCurrentReview(current);

      const allReviews = await MonthlyReviewService.getAllMonthlyReviews(user.id);
      const past = allReviews.filter(r => r.month !== currentMonth);
      setPastReviews(past);
    } catch (error) {
      console.error('Error loading reviews:', error);
      showToast('レビューの読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReview = async () => {
    if (!userId) return;

    setGenerating(true);
    try {
      const currentMonth = MonthlyReviewService.getCurrentMonth();
      const review = await MonthlyReviewService.generateMonthlyReview(
        userId,
        currentMonth,
        coachAvatarPreset as 'teacher' | 'beginner' | 'strategist'
      );

      if (review) {
        const success = await MonthlyReviewService.saveMonthlyReview(review);
        if (success) {
          setCurrentReview(review);
          showToast('月次レビューを生成しました', 'success');
        } else {
          showToast('レビューの保存に失敗しました', 'error');
        }
      } else {
        showToast('レビューの生成に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Error generating review:', error);
      showToast('レビューの生成中にエラーが発生しました', 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: 'var(--muted)' }}>読み込み中...</div>
      </div>
    );
  }

  const currentMonth = MonthlyReviewService.getCurrentMonth();
  const [year, month] = currentMonth.split('-');
  const currentMonthLabel = `${year}年${parseInt(month)}月`;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>
          月次レビュー
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
          毎月のトレード成績をAIが自動で分析・振り返ります
        </p>
      </div>

      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
            今月のレビュー（{currentMonthLabel}）
          </h2>
          <button
            onClick={handleGenerateReview}
            disabled={generating}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? '生成中...' : currentReview ? 'レビュー更新' : 'レビュー生成'}
          </button>
        </div>

        {currentReview ? (
          <MonthlyReviewCard
            review={currentReview}
            onClick={() => setSelectedReview(currentReview)}
            isCurrentMonth={true}
          />
        ) : (
          <div style={{
            padding: 48,
            textAlign: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12
          }}>
            <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 16 }}>
              今月のレビューはまだ生成されていません
            </div>
            <button
              onClick={handleGenerateReview}
              disabled={generating}
              style={{
                padding: '12px 24px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.6 : 1,
              }}
            >
              {generating ? '生成中...' : '今月のレビューを生成'}
            </button>
          </div>
        )}
      </section>

      {pastReviews.length > 0 && (
        <section>
          <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
            過去のレビュー（アーカイブ）
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16
          }}>
            {pastReviews.map(review => (
              <MonthlyReviewCard
                key={review.id}
                review={review}
                onClick={() => setSelectedReview(review)}
              />
            ))}
          </div>
        </section>
      )}

      {pastReviews.length === 0 && !currentReview && (
        <div style={{
          padding: 48,
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 8 }}>
            まだレビューがありません
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>
            月次レビューを生成すると、ここに履歴が表示されます
          </div>
        </div>
      )}

      <MonthlyReviewDrawer
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
      />
    </div>
  );
}
