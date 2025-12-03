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
  const [latestReview, setLatestReview] = useState<MonthlyReviewData | null>(null);
  const [allReviews, setAllReviews] = useState<MonthlyReviewData[]>([]);
  const [selectedPastReview, setSelectedPastReview] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const { coachAvatarPreset } = useCoachAvatar();

  useEffect(() => {
    loadReviews();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed in MonthlyReviewPage:', event);
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        loadReviews();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ User not authenticated, clearing state');
        setUserId('');
        setLatestReview(null);
        setAllReviews([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Get available months with trade data
      const months = await MonthlyReviewService.getAvailableMonths(user.id);
      setAvailableMonths(months);
      console.log('📅 Available months with trades:', months);

      // Get all reviews sorted by month (newest first)
      const reviews = await MonthlyReviewService.getAllMonthlyReviews(user.id);
      setAllReviews(reviews);

      // Set latest review (newest month with review)
      if (reviews.length > 0) {
        setLatestReview(reviews[0]);
      } else {
        setLatestReview(null);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      showToast('レビューの読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReview = async () => {
    console.log('🔄 Generate review clicked');
    console.log('👤 User ID:', userId);

    if (!userId) {
      console.error('❌ No user ID available');
      showToast('ユーザーが認証されていません', 'error');
      return;
    }

    if (availableMonths.length === 0) {
      showToast('トレードデータがありません', 'error');
      return;
    }

    setGenerating(true);
    try {
      const monthToGenerate = latestAvailableMonth;
      console.log('📅 Generating review for month:', monthToGenerate);
      console.log('🤖 Coach avatar:', coachAvatarPreset);

      const review = await MonthlyReviewService.generateMonthlyReview(
        userId,
        monthToGenerate,
        coachAvatarPreset as 'teacher' | 'beginner' | 'strategist'
      );

      console.log('📊 Generated review:', review);

      if (review) {
        const success = await MonthlyReviewService.saveMonthlyReview(review);
        console.log('💾 Save result:', success);

        if (success) {
          // Reload reviews to update the list
          await loadReviews();
          showToast('月次レビューを生成しました', 'success');
        } else {
          showToast('レビューの保存に失敗しました', 'error');
        }
      } else {
        showToast('今月のトレードデータがありません。トレードをインポートしてください。', 'error');
      }
    } catch (error) {
      console.error('❌ Error generating review:', error);
      showToast('レビューの生成中にエラーが発生しました: ' + (error as Error).message, 'error');
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

  // Show login prompt if not authenticated
  if (!userId) {
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
        <div style={{
          padding: 48,
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 16, fontWeight: 600 }}>
            ログインが必要です
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
            月次レビュー機能を使用するには、ログインしてトレードデータをアップロードしてください。
          </div>
          <button
            onClick={() => window.location.href = '#/login'}
            style={{
              padding: '12px 24px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ログインする
          </button>
        </div>
      </div>
    );
  }

  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split('-');
    return `${year}年${parseInt(monthNum)}月`;
  };

  // Get latest available month (newest month with trades)
  const latestAvailableMonth = availableMonths[0] || MonthlyReviewService.getCurrentMonth();

  const handlePastReviewSelect = (month: string) => {
    setSelectedPastReview(month);
  };

  // Get the review to display when past review is selected
  const displayReview = selectedPastReview
    ? allReviews.find(r => r.month === selectedPastReview)
    : latestReview;

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
            最新レビュー
          </h2>
          <button
            onClick={handleGenerateReview}
            disabled={generating || availableMonths.length === 0}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: (generating || availableMonths.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (generating || availableMonths.length === 0) ? 0.6 : 1,
            }}
          >
            {generating ? '生成中...' : latestReview ? 'レビュー更新' : 'レビュー生成'}
          </button>
        </div>

        {availableMonths.length === 0 ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12
          }}>
            <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 16 }}>
              トレードデータがありません
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              トレードをインポートしてからレビューを生成してください
            </div>
          </div>
        ) : latestReview ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 24,
          }}>
            <MonthlyReviewDrawer
              review={latestReview}
              onClose={() => {}}
              isDrawer={false}
            />
          </div>
        ) : (
          <div style={{
            padding: 48,
            textAlign: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12
          }}>
            <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 16 }}>
              {formatMonthLabel(latestAvailableMonth)}のレビューはまだ生成されていません
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
              {generating ? '生成中...' : `${formatMonthLabel(latestAvailableMonth)}のレビューを生成`}
            </button>
          </div>
        )}
      </section>

      {allReviews.length > 1 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              過去のレビュー
            </h2>
            <select
              value={selectedPastReview}
              onChange={(e) => handlePastReviewSelect(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                border: '1px solid var(--line)',
                borderRadius: 6,
                background: 'var(--surface)',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <option value="">過去のレビューを選択</option>
              {allReviews.slice(1).map(review => (
                <option key={review.id} value={review.month}>
                  {formatMonthLabel(review.month)}
                </option>
              ))}
            </select>
          </div>

          {selectedPastReview && displayReview && displayReview !== latestReview && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: 24,
              marginTop: 16,
            }}>
              <MonthlyReviewDrawer
                review={displayReview}
                onClose={() => setSelectedPastReview('')}
                isDrawer={false}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
