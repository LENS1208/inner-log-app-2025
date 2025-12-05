import React, { useEffect, useState } from 'react';
import { getAccountSummary, type DbAccountSummary } from '../lib/db.service';
import { useDataset } from '../lib/dataset.context';
import { HelpIcon } from './common/HelpIcon';
import { supabase } from '../lib/supabase';

type AccountSummaryCardsProps = {
  peakEquity?: number;
};

export default function AccountSummaryCards({ peakEquity }: AccountSummaryCardsProps = {}) {
  const [summary, setSummary] = useState<DbAccountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { useDatabase, dataset } = useDataset();

  useEffect(() => {
    loadSummary();

    const handleTradesUpdated = () => {
      console.log('🔄 Trades updated, reloading summary...');
      loadSummary();
    };

    window.addEventListener('fx:tradesUpdated', handleTradesUpdated);
    return () => window.removeEventListener('fx:tradesUpdated', handleTradesUpdated);
  }, [useDatabase, dataset]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      // データベースモードの場合は実際にデータを取得
      if (useDatabase) {
        const data = await getAccountSummary('default');
        console.log('📊 Account summary loaded:', data);
        console.log('🔍 Swap breakdown:', {
          swap_positive: data?.swap_positive,
          swap_negative: data?.swap_negative,
          hasSwapBreakdown: data?.swap_positive !== undefined && data?.swap_negative !== undefined
        });

        // 新しい列が存在する場合は古い列にコピー
        if (data) {
          data.deposit = data.total_deposits || data.deposit;
          data.withdraw = data.total_withdrawals || data.withdraw;
          data.swap = data.total_swap || data.swap;
          console.log('💰 Using deposits:', data.deposit, 'withdrawals:', data.withdraw, 'swap:', data.swap);
        }

        setSummary(data);
        setError(null);
        setLoading(false);
        return;
      }

      // デモモード: account-data.jsonから読み込む
      const response = await fetch(`/demo/account-data.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load account data');
      }

      const accountData = await response.json();
      const datasetInfo = accountData.datasets?.[dataset] || accountData.datasets?.['A'];

      console.log('📊 Demo account summary loaded:', datasetInfo);

      const summaryData: DbAccountSummary = {
        id: 'demo',
        user_id: 'demo',
        balance: 0,
        equity: 0,
        profit: datasetInfo?.total_profit || 0,
        deposit: datasetInfo?.total_deposits || 0,
        withdraw: datasetInfo?.total_withdrawals || 0,
        commission: datasetInfo?.total_commission || 0,
        swap: datasetInfo?.total_swap || 0,
        swap_long: 0,
        swap_short: 0,
        swap_positive: datasetInfo?.swap_positive || 0,
        swap_negative: datasetInfo?.swap_negative || 0,
        bonus_credit: 0,
        xm_points_earned: datasetInfo?.xm_points_earned || 0,
        xm_points_used: datasetInfo?.xm_points_used || 0,
        total_deposits: datasetInfo?.total_deposits || 0,
        total_withdrawals: datasetInfo?.total_withdrawals || 0,
        total_swap: datasetInfo?.total_swap || 0,
        updated_at: new Date().toISOString(),
      };

      console.log('🔍 Demo swap breakdown:', {
        swap_positive: summaryData.swap_positive,
        swap_negative: summaryData.swap_negative,
        hasSwapBreakdown: summaryData.swap_positive !== undefined && summaryData.swap_negative !== undefined
      });

      setSummary(summaryData);
      setError(null);
    } catch (error) {
      console.error('❌ Failed to load account summary:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (error && !summary) {
    return null;
  }

  // データがない場合はすべて0として扱う
  const summaryData = summary || {
    deposit: 0,
    withdraw: 0,
    swap: 0,
    swap_positive: 0,
    swap_negative: 0,
    balance: 0,
    equity: 0,
    profit: 0,
    commission: 0,
    bonus_credit: 0,
    xm_points_earned: 0,
    xm_points_used: 0,
  };

  const hasXmPointsEarned = summaryData.xm_points_earned !== undefined && summaryData.xm_points_earned > 0;
  const hasXmPointsUsed = summaryData.xm_points_used !== undefined && summaryData.xm_points_used > 0;
  const hasSwapBreakdown = summaryData.swap_positive !== undefined && summaryData.swap_negative !== undefined;

  return (
    <>
      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          入金総額
          <HelpIcon text="口座に入金した総額です。取引資金の元手を示します。" />
        </div>
        <div className="kpi-value" style={{ color: 'var(--accent-2)' }}>
          +{summaryData.deposit.toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--accent-2)' }}>円</span>
        </div>
        <div className="kpi-desc">累計入金額の合計</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          出金総額
          <HelpIcon text="口座から出金した総額です。利益の引き出しや資金移動を示します。" />
        </div>
        <div className="kpi-value" style={{ color: 'var(--loss)' }}>
          -{Math.abs(summaryData.withdraw).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--loss)' }}>円</span>
        </div>
        <div className="kpi-desc">累計出金額の合計</div>
      </div>

      {peakEquity !== undefined && (
        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            最高資産
            <HelpIcon text="累積損益の最高到達点です。過去の最大資産額を示します。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-2)' }}>
            +{peakEquity.toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--accent-2)' }}>円</span>
          </div>
          <div className="kpi-desc">累積損益のピーク値</div>
        </div>
      )}

      {/* XM Points cards temporarily hidden due to complexity */}
      {false && hasXmPointsEarned && (
        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            獲得XMポイント
            <HelpIcon text="XMポイントを資金に変換した額です。取引ごとに獲得できるボーナスです。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-2)' }}>
            +{Math.floor(summaryData.xm_points_earned || 0).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--accent-2)' }}>円</span>
          </div>
          <div className="kpi-desc">Credit In-XMP累計</div>
        </div>
      )}

      {false && hasXmPointsUsed && (
        <div className="kpi-card">
          <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
            利用XMポイント
            <HelpIcon text="ボーナスクレジットの失効や使用により減少した金額です。" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--loss)' }}>
            -{Math.floor(summaryData.xm_points_used || 0).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--loss)' }}>円</span>
          </div>
          <div className="kpi-desc">Credit Out累計</div>
        </div>
      )}

    </>
  );
}
