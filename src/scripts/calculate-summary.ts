import { supabase } from '../lib/supabase';

async function calculateAndSaveSummary() {
  try {
    console.log('📊 Calculating account summary from trades...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }

    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('swap, commission, profit')
      .eq('user_id', user.id);

    if (tradesError) throw tradesError;

    if (!trades || trades.length === 0) {
      console.log('⚠️ No trades found');
      return;
    }

    let totalSwap = 0;
    let totalCommission = 0;
    let totalProfit = 0;

    trades.forEach((trade: any) => {
      totalSwap += trade.swap || 0;
      totalCommission += trade.commission || 0;
      totalProfit += trade.profit || 0;
    });

    const closedPL = totalCommission + totalSwap + totalProfit;

    const summary = {
      user_id: user.id,
      dataset: 'default',
      total_deposits: 0,
      total_withdrawals: 0,
      xm_points_earned: 0,
      xm_points_used: 0,
      total_swap: totalSwap,
      total_commission: totalCommission,
      total_profit: totalProfit,
      closed_pl: closedPL,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('account_summary')
      .upsert(summary, { onConflict: 'user_id,dataset' });

    if (upsertError) throw upsertError;

    console.log('✅ Account summary saved:', summary);
    console.log(`
      Total Swap: ${totalSwap.toLocaleString()} JPY
      Total Commission: ${totalCommission.toLocaleString()} JPY
      Total Profit: ${totalProfit.toLocaleString()} JPY
      Closed P/L: ${closedPL.toLocaleString()} JPY
    `);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

calculateAndSaveSummary();
