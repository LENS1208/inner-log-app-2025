import React, { useState } from 'react';
import { getAccentColor, getLossColor } from '../lib/chartColors';
import { parseCsvText } from '../lib/csv';
import { insertTrades, tradeToDb, upsertAccountSummary } from '../lib/db.service';
import { parseHtmlStatement, convertHtmlTradesToCsvFormat, parseFullHtmlStatement } from '../lib/html-parser';
import { showToast } from '../lib/toast';
import { supabase } from '../lib/supabase';

type CsvUploadProps = {
  useDatabase: boolean;
  onToggleDatabase: (value: boolean) => void;
  loading: boolean;
  dataCount: number;
};

export default function CsvUpload({ useDatabase, onToggleDatabase, loading, dataCount }: CsvUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleCalculateSummary = async () => {
    setUploading(true);
    setMessage('');

    try {
      console.log('📊 Calculating account summary from existing trades...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setMessage('認証が必要です');
        return;
      }

      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('swap, commission, profit')
        .eq('user_id', session.user.id);

      if (tradesError) throw tradesError;

      if (!trades || trades.length === 0) {
        setMessage('取引データが見つかりません');
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

      // 既存の入金・出金情報を保持するため、undefined で渡す
      await upsertAccountSummary({
        profit: totalProfit,
        commission: totalCommission,
        swap: totalSwap,
      });

      setMessage(`✅ サマリーを計算しました: ${trades.length}件の取引から`);
      showToast('サマリーを計算しました', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Calculate summary error:', error);
      setMessage('サマリーの計算に失敗しました: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadDemoData = async () => {
    setUploading(true);
    setMessage('');

    try {
      const response = await fetch('/demo/sample/Statement_1106_ 41045484 - KAN YAMAJI.html');
      const text = await response.text();

      const parsed = parseFullHtmlStatement(text);

      if (parsed.trades.length === 0) {
        setMessage('デモデータの読み込みに失敗しました');
        return;
      }

      const csvText = convertHtmlTradesToCsvFormat(parsed.trades);
      const allTrades = parseCsvText(csvText);
      // balance型のエントリー（入金・出金・ボーナス）を除外
      const trades = allTrades.filter(t => t.type?.toLowerCase() !== 'balance');

      await upsertAccountSummary({
        balance: parsed.summary.balance || 0,
        equity: parsed.summary.equity || 0,
        profit: parsed.summary.totalProfit || 0,
        deposit: parsed.summary.totalDeposits || 0,
        withdraw: parsed.summary.totalWithdrawals || 0,
        commission: parsed.summary.totalCommission || 0,
        swap: parsed.summary.totalSwap || 0,
        swap_long: 0,
        swap_short: 0,
        bonus_credit: parsed.summary.xmPointsEarned || 0,
      });

      const dbTrades = trades.map(tradeToDb);
      await insertTrades(dbTrades);

      setMessage(`✅ デモデータを読み込みました: ${trades.length}件の取引と口座サマリー`);
      showToast('デモデータを読み込みました', 'success');

      if (!useDatabase) {
        onToggleDatabase(true);
      }

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Demo data load error:', error);
      setMessage('デモデータの読み込みに失敗しました: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      const text = await file.text();
      const fileName = file.name.toLowerCase();
      let trades;

      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const parsed = parseFullHtmlStatement(text);

        if (parsed.trades.length === 0) {
          setMessage('HTML形式から有効な取引データが見つかりませんでした');
          setUploading(false);
          return;
        }

        const csvText = convertHtmlTradesToCsvFormat(parsed.trades);
        const allTrades = parseCsvText(csvText);
        // balance型のエントリー（入金・出金・ボーナス）を除外
        trades = allTrades.filter(t => t.type?.toLowerCase() !== 'balance');

        await upsertAccountSummary({
          balance: parsed.summary.balance || 0,
          equity: parsed.summary.equity || 0,
          profit: parsed.summary.totalProfit || 0,
          deposit: parsed.summary.totalDeposits || 0,
          withdraw: parsed.summary.totalWithdrawals || 0,
          commission: parsed.summary.totalCommission || 0,
          swap: parsed.summary.totalSwap || 0,
          swap_long: 0,
          swap_short: 0,
          bonus_credit: parsed.summary.xmPointsEarned || 0,
        });

        setMessage(`HTML形式から${trades.length}件の取引データと口座サマリーを読み込みました`);
      } else {
        const allTrades = parseCsvText(text);
        // balance型のエントリー（入金・出金・ボーナス）を除外
        trades = allTrades.filter(t => t.type?.toLowerCase() !== 'balance');

        if (trades.length === 0) {
          setMessage('有効な取引データが見つかりませんでした');
          setUploading(false);
          return;
        }

        // parseCsvTextが計算した口座サマリーを取得（window._csvAccountSummary）
        const csvSummary = (window as any)._csvAccountSummary || { deposit: 0, withdraw: 0, bonus_credit: 0 };
        console.log('📊 CSV Summary extracted:', csvSummary);

        // 口座サマリーに入金・出金情報を保存
        await upsertAccountSummary({
          deposit: csvSummary.deposit,
          withdraw: csvSummary.withdraw,
          bonus_credit: csvSummary.bonus_credit,
        });

        const balanceCount = allTrades.length - trades.length;
        if (balanceCount > 0) {
          setMessage(`${trades.length}件の取引データを読み込みました（${balanceCount}件の入金・出金エントリーを除外）`);
        } else {
          setMessage(`${trades.length}件の取引データを読み込みました`);
        }
      }

      const dbTrades = trades.map(tradeToDb);
      await insertTrades(dbTrades);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('import_history').insert({
          user_id: user.id,
          filename: file.name,
          rows: trades.length,
          format: fileName.endsWith('.html') || fileName.endsWith('.htm') ? 'HTML' : 'CSV',
        });
      }

      setMessage(`✅ ${trades.length}件の取引データをアップロードしました`);
      showToast('取引データをアップロードしました', 'success');

      if (!useDatabase) {
        onToggleDatabase(true);
      }

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('アップロードに失敗しました: ' + (error as Error).message);
      showToast('アップロードに失敗しました', 'error');
    } finally {
      setUploading(false);
      setFileInputKey(prev => prev + 1);
    }
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: 'var(--space-3)',
    }}>
      <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: 17, fontWeight: 'bold', color: 'var(--ink)' }}>
        データ操作
      </h3>
      <p style={{ margin: '0 0 var(--space-3) 0', fontSize: 13, color: 'var(--muted)' }}>
        取引データのCSVまたはHTML形式のファイルをアップロードしてデータベースに保存します
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {dataCount > 0 && (
          <div style={{
            padding: '12px 16px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            fontSize: 14,
            color: '#0369a1',
          }}>
            📊 データベースに<strong>{dataCount}件</strong>のデータがあります
          </div>
        )}

        <label style={{
          display: 'inline-block',
          background: 'var(--accent)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 8,
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 600,
          opacity: uploading ? 0.6 : 1,
          width: 'fit-content',
        }}>
          {uploading ? 'アップロード中...' : 'CSV/HTMLファイルを選択'}
          <input
            key={fileInputKey}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>

        <button
          onClick={handleLoadDemoData}
          disabled={uploading}
          style={{
            padding: '10px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            opacity: uploading ? 0.6 : 1,
            color: 'var(--text)',
          }}
        >
          📊 デモデータを読み込む
        </button>

        {dataCount > 0 && (
          <button
            onClick={handleCalculateSummary}
            disabled={uploading}
            style={{
              padding: '10px 20px',
              background: getAccentColor(),
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            🧮 サマリーを再計算
          </button>
        )}
      </div>

      {message && (
        <div style={{
          marginTop: 'var(--space-3)',
          padding: 'var(--space-2)',
          background: message.includes('失敗') ? '#fee' : '#efe',
          border: `1px solid ${message.includes('失敗') ? '#fcc' : '#cfc'}`,
          borderRadius: 8,
          fontSize: 13,
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
