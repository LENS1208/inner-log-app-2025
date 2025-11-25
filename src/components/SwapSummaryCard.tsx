import React, { useEffect, useState } from 'react';
import { getAccountSummary, type DbAccountSummary } from '../lib/db.service';
import { useDataset } from '../lib/dataset.context';
import { HelpIcon } from './common/HelpIcon';
import { supabase } from '../lib/supabase';

export default function SwapSummaryCard() {
  const [summary, setSummary] = useState<DbAccountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { useDatabase, dataset } = useDataset();

  useEffect(() => {
    loadSummary();

    const handleTradesUpdated = () => {
      loadSummary();
    };

    window.addEventListener('fx:tradesUpdated', handleTradesUpdated);
    return () => window.removeEventListener('fx:tradesUpdated', handleTradesUpdated);
  }, [useDatabase, dataset]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      if (useDatabase) {
        const data = await getAccountSummary('default');
        // 新しい列が存在する場合は古い列にコピー
        if (data) {
          data.swap = data.total_swap || data.swap;
        }
        setSummary(data);
        setLoading(false);
        return;
      }

      const { data: demoData, error: rpcError } = await supabase.rpc('get_demo_account_summary', {
        p_dataset: dataset
      });

      if (rpcError) {
        throw rpcError;
      }

      const summaryData: DbAccountSummary = {
        id: 'demo',
        user_id: 'demo',
        balance: demoData?.balance || 0,
        equity: demoData?.equity || 0,
        profit: demoData?.profit || 0,
        deposit: demoData?.total_deposits || demoData?.deposit || 0,
        withdraw: demoData?.total_withdrawals || demoData?.withdraw || 0,
        commission: demoData?.commission || 0,
        swap: demoData?.total_swap || demoData?.swap || 0,
        swap_long: demoData?.swap_long || 0,
        swap_short: demoData?.swap_short || 0,
        swap_positive: demoData?.swap_positive || 0,
        swap_negative: Math.abs(demoData?.swap_negative || 0),
        total_swap: demoData?.total_swap || 0,
        updated_at: new Date().toISOString(),
      };

      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load swap summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summary) {
    return null;
  }

  const summaryData = summary || {
    swap: 0,
    swap_positive: 0,
    swap_negative: 0,
  };

  const hasSwapBreakdown = summaryData.swap_positive !== undefined && summaryData.swap_negative !== undefined;

  return (
    <div className="kpi-card">
      <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
        累計スワップ
        <HelpIcon text="ポジションを保有したことで発生したスワップポイントの総額です。プラスなら収入になります。" />
      </div>
      <div className="kpi-value" style={{ color: summaryData.swap >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>
        {summaryData.swap >= 0 ? '+' : ''}{Math.floor(Math.abs(summaryData.swap)).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: summaryData.swap >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>円</span>
      </div>
      {hasSwapBreakdown ? (
        <>
          <div className="kpi-desc">スワップポイントの累計</div>
          <div style={{
            marginTop: 8,
            display: 'flex',
            height: 4,
            borderRadius: 2,
            overflow: 'hidden',
            background: 'var(--line)'
          }}>
            {summaryData.swap_positive > 0 && (
              <div
                style={{
                  background: 'var(--gain)',
                  width: `${(summaryData.swap_positive / (summaryData.swap_positive + Math.abs(summaryData.swap_negative))) * 100}%`,
                  minWidth: summaryData.swap_positive > 0 ? '2px' : '0',
                  transition: 'width 0.3s ease'
                }}
                title={`受取: ${Math.floor(summaryData.swap_positive).toLocaleString('ja-JP')}円`}
              />
            )}
            {summaryData.swap_negative < 0 && (
              <div
                style={{
                  background: 'var(--loss)',
                  width: `${(Math.abs(summaryData.swap_negative) / (summaryData.swap_positive + Math.abs(summaryData.swap_negative))) * 100}%`,
                  minWidth: summaryData.swap_negative < 0 ? '2px' : '0',
                  transition: 'width 0.3s ease'
                }}
                title={`支払: ${Math.floor(Math.abs(summaryData.swap_negative)).toLocaleString('ja-JP')}円`}
              />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
            <span style={{ color: 'var(--gain)', fontWeight: 600 }}>+{Math.floor(summaryData.swap_positive || 0).toLocaleString('ja-JP')}円</span>
            <span style={{ color: 'var(--loss)', fontWeight: 600 }}>-{Math.floor(Math.abs(summaryData.swap_negative || 0)).toLocaleString('ja-JP')}円</span>
          </div>
        </>
      ) : (
        <div className="kpi-desc">スワップポイントの累計</div>
      )}
    </div>
  );
}
