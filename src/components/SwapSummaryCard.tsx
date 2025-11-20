import React, { useEffect, useState } from 'react';
import { getAccountSummary, type DbAccountSummary } from '../lib/db.service';
import { useDataset } from '../lib/dataset.context';
import { HelpIcon } from './common/HelpIcon';
import { supabase } from '../lib/supabase';

export default function SwapSummaryCard() {
  const [summary, setSummary] = useState<DbAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
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
    try {
      if (useDatabase) {
        const data = await getAccountSummary('default');
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

      const summaryData = {
        id: 'demo',
        user_id: 'demo',
        dataset: dataset,
        total_deposits: demoData?.total_deposits || 0,
        total_withdrawals: demoData?.total_withdrawals || 0,
        xm_points_earned: demoData?.xm_points_earned || 0,
        xm_points_used: demoData?.xm_points_used || 0,
        total_swap: demoData?.total_swap || 0,
        swap_positive: demoData?.swap_positive || 0,
        swap_negative: Math.abs(demoData?.swap_negative || 0),
        total_commission: 0,
        total_profit: 0,
        closed_pl: 0,
        updated_at: new Date().toISOString(),
      };

      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load swap summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  const summaryData = summary || {
    total_swap: 0,
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
      <div className="kpi-value" style={{ color: summaryData.total_swap >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>
        {summaryData.total_swap >= 0 ? '+' : ''}{Math.floor(Math.abs(summaryData.total_swap)).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: summaryData.total_swap >= 0 ? 'var(--accent-2)' : 'var(--loss)' }}>円</span>
      </div>
      {hasSwapBreakdown ? (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            スワップポイントの累計
          </div>
          <div style={{
            display: 'flex',
            height: '12px',
            borderRadius: '6px',
            overflow: 'hidden',
            background: 'var(--line)',
            marginBottom: 8
          }}>
            {summaryData.swap_positive > 0 && (
              <div
                style={{
                  background: 'var(--accent-2)',
                  width: `${(summaryData.swap_positive / (summaryData.swap_positive + Math.abs(summaryData.swap_negative))) * 100}%`,
                  minWidth: summaryData.swap_positive > 0 ? '2px' : '0'
                }}
                title={`受取: ${Math.floor(summaryData.swap_positive).toLocaleString('ja-JP')}円`}
              />
            )}
            {summaryData.swap_negative < 0 && (
              <div
                style={{
                  background: 'var(--loss)',
                  width: `${(Math.abs(summaryData.swap_negative) / (summaryData.swap_positive + Math.abs(summaryData.swap_negative))) * 100}%`,
                  minWidth: summaryData.swap_negative < 0 ? '2px' : '0'
                }}
                title={`支払: ${Math.floor(Math.abs(summaryData.swap_negative)).toLocaleString('ja-JP')}円`}
              />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>+{Math.floor(summaryData.swap_positive || 0).toLocaleString('ja-JP')} 円</span>
            <span style={{ color: 'var(--loss)', fontWeight: 600 }}>-{Math.floor(Math.abs(summaryData.swap_negative || 0)).toLocaleString('ja-JP')} 円</span>
          </div>
        </>
      ) : (
        <div className="kpi-desc">スワップポイントの累計</div>
      )}
    </div>
  );
}
