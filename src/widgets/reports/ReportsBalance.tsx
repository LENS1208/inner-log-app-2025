import React, { useEffect, useMemo, useState } from "react";
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../../lib/chartColors";
import { Bar, Line } from "react-chartjs-2";
import { useDataset } from "../../lib/dataset.context";
import { parseCsvText } from "../../lib/csv";
import type { Trade } from "../../lib/types";
import { filterTrades, getTradeProfit } from "../../lib/filterTrades";
import { supabase } from "../../lib/supabase";
import { HelpIcon } from "../../components/common/HelpIcon";
import Card from "../../components/common/Card";

interface AccountSnapshot {
  date: string;
  balance: number;
  equity: number;
  deposit?: number;
  withdrawal?: number;
  leverage?: number;
  marginLevel?: number;
}

interface TransactionEvent {
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  memo?: string;
}

export default function ReportsBalance() {
  const { selectedDataset } = useDataset();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accountData, setAccountData] = useState<AccountSnapshot[]>([]);
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedDataset]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('dataset', selectedDataset || 'A')
          .order('datetime', { ascending: true });

        if (error) throw error;
        setTrades(data || []);
      } else {
        const response = await fetch('/demo/trades.json');
        const demoTrades = await response.json();
        setTrades(demoTrades || []);
      }

      const accountResponse = await fetch('/demo/account-data.json');
      const accountJson = await accountResponse.json();

      const dataset = selectedDataset || 'A';
      const datasetTransactions = accountJson.transactions?.[dataset] || [];

      const formattedTransactions: TransactionEvent[] = datasetTransactions.map((tx: any) => ({
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        memo: tx.description,
      }));

      setTransactions(formattedTransactions);

      const mockSnapshots: AccountSnapshot[] = [];
      const startDate = new Date('2025-11-01');
      const days = 28;
      let balance = 1000000;

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const hasDeposit = formattedTransactions.some(t =>
          t.type === 'deposit' && new Date(t.date.replace(/\./g, '-').split(' ')[0]).toISOString().split('T')[0] === dateStr
        );
        const hasWithdrawal = formattedTransactions.some(t =>
          t.type === 'withdrawal' && new Date(t.date.replace(/\./g, '-').split(' ')[0]).toISOString().split('T')[0] === dateStr
        );

        if (hasDeposit) {
          const depositAmount = formattedTransactions.find(t =>
            t.type === 'deposit' && new Date(t.date.replace(/\./g, '-').split(' ')[0]).toISOString().split('T')[0] === dateStr
          )?.amount || 0;
          balance += depositAmount;
        }

        if (hasWithdrawal) {
          const withdrawalAmount = formattedTransactions.find(t =>
            t.type === 'withdrawal' && new Date(t.date.replace(/\./g, '-').split(' ')[0]).toISOString().split('T')[0] === dateStr
          )?.amount || 0;
          balance -= withdrawalAmount;
        }

        const dailyChange = (Math.random() - 0.48) * 50000;
        balance += dailyChange;

        mockSnapshots.push({
          date: dateStr,
          balance: Math.max(balance, 100000),
          equity: Math.max(balance, 100000) * (0.98 + Math.random() * 0.04),
          leverage: 3 + Math.random() * 15,
          marginLevel: 500 + Math.random() * 450,
        });
      }

      setAccountData(mockSnapshots);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      setTrades([]);
      setAccountData([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const kpiMetrics = useMemo(() => {
    if (trades.length === 0 || accountData.length === 0) {
      return {
        netAssetChange: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        swapTotal: 0,
        peakBalance: 0,
        maxDrawdown: 0,
        realGrowthRate: 0,
        avgLeverage: 0,
      };
    }

    const totalDeposits = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = transactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    const swapTotal = trades.reduce((sum, t) => sum + (t.swap || 0), 0);

    const initialBalance = accountData[0]?.balance || 0;
    const finalBalance = accountData[accountData.length - 1]?.balance || 0;
    const netAssetChange = finalBalance - initialBalance - totalDeposits + totalWithdrawals;

    const peakBalance = Math.max(...accountData.map(s => s.balance));

    let maxDD = 0;
    let peak = initialBalance;
    accountData.forEach(snapshot => {
      const adjustedBalance = snapshot.balance - totalDeposits + totalWithdrawals;
      if (adjustedBalance > peak) peak = adjustedBalance;
      const dd = ((adjustedBalance - peak) / peak) * 100;
      if (dd < maxDD) maxDD = dd;
    });

    const realGrowthRate = initialBalance > 0
      ? ((netAssetChange / initialBalance) * 100)
      : 0;

    const avgLeverage = accountData.reduce((sum, s) => sum + (s.leverage || 0), 0) / accountData.length;

    return {
      netAssetChange,
      totalDeposits,
      totalWithdrawals,
      swapTotal,
      peakBalance,
      maxDrawdown: maxDD,
      realGrowthRate,
      avgLeverage,
    };
  }, [trades, accountData, transactions]);

  const balanceChartData = useMemo(() => {
    if (accountData.length === 0) return null;

    const labels = accountData.map(s => {
      const date = new Date(s.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const depositPoints: number[] = [];
    const withdrawalPoints: number[] = [];

    accountData.forEach((snapshot, idx) => {
      const hasDeposit = transactions.some(t => t.type === 'deposit' && t.date === snapshot.date);
      const hasWithdrawal = transactions.some(t => t.type === 'withdrawal' && t.date === snapshot.date);

      depositPoints.push(hasDeposit ? snapshot.balance : null as any);
      withdrawalPoints.push(hasWithdrawal ? snapshot.balance : null as any);
    });

    return {
      labels,
      datasets: [
        {
          label: '口座残高',
          data: accountData.map(s => s.balance),
          borderColor: getAccentColor(),
          backgroundColor: getAccentColor(0.1),
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: '入金',
          data: depositPoints,
          pointRadius: 8,
          pointBackgroundColor: getLongColor(),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          showLine: false,
        },
        {
          label: '出金',
          data: withdrawalPoints,
          pointRadius: 8,
          pointBackgroundColor: getLossColor(),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          showLine: false,
        },
      ],
    };
  }, [accountData, transactions]);

  const leverageChartData = useMemo(() => {
    if (accountData.length === 0) return null;

    return {
      labels: accountData.map(s => {
        const date = new Date(s.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: '実効レバレッジ',
          data: accountData.map(s => s.leverage || 0),
          borderColor: getAccentColor(),
          backgroundColor: getAccentColor(0.2),
          fill: true,
          tension: 0.4,
          pointRadius: 2,
        },
      ],
    };
  }, [accountData]);

  const marginLevelChartData = useMemo(() => {
    if (accountData.length === 0) return null;

    return {
      labels: accountData.map(s => {
        const date = new Date(s.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: '証拠金維持率',
          data: accountData.map(s => s.marginLevel || 0),
          borderColor: getAccentColor(),
          backgroundColor: getAccentColor(0.2),
          fill: true,
          tension: 0.4,
          pointRadius: 2,
        },
      ],
    };
  }, [accountData]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: 16 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          資金管理
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          口座の入出金、レバレッジ、資金推移の健全性を可視化します。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              純資産増減
              <HelpIcon text="入出金を除いた実質的な資産増減" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: kpiMetrics.netAssetChange >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
              {kpiMetrics.netAssetChange >= 0 ? '+' : ''}
              {Math.round(kpiMetrics.netAssetChange).toLocaleString('ja-JP')}
              <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>円</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>累計入金額</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
              {Math.round(kpiMetrics.totalDeposits).toLocaleString('ja-JP')}
              <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>円</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>累計出金額</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
              {Math.round(kpiMetrics.totalWithdrawals).toLocaleString('ja-JP')}
              <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>円</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>スワップ累計</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: kpiMetrics.swapTotal >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
              {kpiMetrics.swapTotal >= 0 ? '+' : ''}
              {Math.round(kpiMetrics.swapTotal).toLocaleString('ja-JP')}
              <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>円</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>最高資産</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
              {Math.round(kpiMetrics.peakBalance).toLocaleString('ja-JP')}
              <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>円</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              最大資金DD
              <HelpIcon text="入出金補正後の最大ドローダウン" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--loss)' }}>
              {kpiMetrics.maxDrawdown.toFixed(1)}
              <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>%</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>実質成長率</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: kpiMetrics.realGrowthRate >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
              {kpiMetrics.realGrowthRate >= 0 ? '+' : ''}
              {kpiMetrics.realGrowthRate.toFixed(1)}
              <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>%</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>平均実効レバレッジ</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
              {kpiMetrics.avgLeverage.toFixed(1)}
              <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>倍</span>
            </div>
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>資金曲線</h2>
        </div>
        <div style={{ padding: 20 }}>
          {balanceChartData ? (
            <div style={{ height: 320 }}>
              <Line
                data={balanceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          if (context.datasetIndex === 0) {
                            return `残高: ${Math.round(context.parsed.y).toLocaleString('ja-JP')}円`;
                          }
                          return context.dataset.label;
                        },
                      },
                    },
                  },
                  scales: {
                    x: { grid: { color: getGridLineColor() } },
                    y: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        callback: (value: any) => `${Math.round(value).toLocaleString('ja-JP')}円`,
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              データがありません
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>実効レバレッジ推移</h2>
          </div>
          <div style={{ padding: 20 }}>
            {leverageChartData ? (
              <div style={{ height: 240 }}>
                <Line
                  data={leverageChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      x: { grid: { color: getGridLineColor() } },
                      y: {
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value: any) => `${value}倍`,
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                データがありません
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>証拠金維持率</h2>
          </div>
          <div style={{ padding: 20 }}>
            {marginLevelChartData ? (
              <div style={{ height: 240 }}>
                <Line
                  data={marginLevelChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      x: { grid: { color: getGridLineColor() } },
                      y: {
                        grid: { color: getGridLineColor() },
                        ticks: {
                          callback: (value: any) => `${value}%`,
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                データがありません
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>入出金イベント一覧</h2>
        </div>
        <div style={{ padding: 20 }}>
          {transactions.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 14, fontWeight: 'bold', color: 'var(--muted)' }}>日付</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 14, fontWeight: 'bold', color: 'var(--muted)' }}>種類</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: 'var(--muted)' }}>金額</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 14, fontWeight: 'bold', color: 'var(--muted)' }}>メモ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 12, fontSize: 14 }}>{new Date(tx.date).toLocaleDateString('ja-JP')}</td>
                    <td style={{ padding: 12, fontSize: 14 }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: tx.type === 'deposit' ? getLongColor(0.1) : getLossColor(0.1),
                        color: tx.type === 'deposit' ? getLongColor() : getLossColor(),
                      }}>
                        {tx.type === 'deposit' ? '入金' : '出金'}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 14, textAlign: 'right', fontWeight: 600 }}>
                      {tx.type === 'deposit' ? '+' : '-'}
                      {Math.round(tx.amount).toLocaleString('ja-JP')}円
                    </td>
                    <td style={{ padding: 12, fontSize: 14, color: 'var(--muted)' }}>
                      {tx.memo || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              入出金イベントがありません
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>
              💡 DDの本質的深さ
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              入出金補正後の最大DDは <strong>{kpiMetrics.maxDrawdown.toFixed(1)}%</strong> です。
              {Math.abs(kpiMetrics.maxDrawdown) > 20
                ? 'リスク許容度を超えています。'
                : '適切な範囲内です。'}
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--chip)', borderRadius: 8, fontSize: 13 }}>
              次のアクション: ロットサイズを見直しましょう
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>
              💡 レバレッジと損失の相関
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              平均実効レバレッジは <strong>{kpiMetrics.avgLeverage.toFixed(1)}倍</strong> です。
              {kpiMetrics.avgLeverage > 25
                ? '高レバレッジ環境での取引が続いています。'
                : '適切なレバレッジ管理ができています。'}
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--chip)', borderRadius: 8, fontSize: 13 }}>
              次のアクション: レバレッジ上限を20倍以内に設定しましょう
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>
              💡 入出金のクセ分析
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              累計入金 <strong>{Math.round(kpiMetrics.totalDeposits).toLocaleString('ja-JP')}円</strong>、
              累計出金 <strong>{Math.round(kpiMetrics.totalWithdrawals).toLocaleString('ja-JP')}円</strong>。
              {kpiMetrics.totalDeposits > kpiMetrics.totalWithdrawals * 2
                ? '追加入金への依存が見られます。'
                : '健全な資金管理ができています。'}
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--chip)', borderRadius: 8, fontSize: 13 }}>
              次のアクション: 週次で利益出金ルールを設定しましょう
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
