import React, { useEffect, useMemo, useState } from "react";
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../../lib/chartColors";
import { Line } from "react-chartjs-2";
import { useDataset } from "../../lib/dataset.context";
import type { Trade } from "../../lib/types";
import { filterTrades, getTradeProfit, isValidCurrencyPair } from "../../lib/filterTrades";
import { HelpIcon } from "../../components/common/HelpIcon";

interface AccountSnapshot {
  date: string;
  balance: number;
  equity: number;
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
  const { dataset, filters, useDatabase, isInitialized } = useDataset();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accountData, setAccountData] = useState<AccountSnapshot[]>([]);
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!isMounted) return;
      if (!isInitialized) return;

      setIsLoading(true);
      try {
        if (useDatabase) {
          const { getAllTrades } = await import('../../lib/db.service');
          const data = await getAllTrades(dataset);

          const mapped: Trade[] = (data || [])
            .filter((t: any) => isValidCurrencyPair(t.item))
            .map((t: any) => {
              const openTime = typeof t.open_time === 'string' ? t.open_time : new Date(t.open_time).toISOString();
              const closeTime = typeof t.close_time === 'string' ? t.close_time : new Date(t.close_time).toISOString();

              return {
                id: t.id || t.ticket || String(Math.random()),
                datetime: closeTime,
                openTime: openTime,
                closeTime: closeTime,
                pair: t.item || t.pair || t.symbol || '',
                side: (t.action?.toUpperCase() === 'BUY' || t.action?.toUpperCase() === 'LONG') ? 'LONG' : 'SHORT',
                volume: Number(t.size || t.volume || 0),
                profitYen: Number(t.profit || 0),
                pips: Number(t.pips || 0),
                swap: Number(t.swap || 0),
                commission: Number(t.commission || 0),
              } as Trade;
            });

          if (isMounted) setTrades(mapped);
        } else {
          const text = await fetch('/demo/' + dataset + '.csv').then(r => r.text());
          const { parseCsvText } = await import('../../lib/csv');
          const raw = parseCsvText(text);
          if (isMounted) setTrades(raw);
        }

        const accountResponse = await fetch('/demo/account-data.json');
        const accountJson = await accountResponse.json();
        const datasetTransactions = accountJson.transactions?.[dataset] || [];

        const formattedTransactions: TransactionEvent[] = datasetTransactions.map((tx: any) => ({
          date: tx.date,
          type: tx.type,
          amount: tx.amount,
          memo: tx.description,
        }));

        if (isMounted) setTransactions(formattedTransactions);

        const mockSnapshots: AccountSnapshot[] = [];
        const startDate = new Date('2024-05-01');
        const days = 400;
        let balance = 1000000;

        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];

          const txOnThisDay = formattedTransactions.find(t => {
            const txDate = new Date(t.date.replace(/\./g, '-').split(' ')[0]);
            return txDate.toISOString().split('T')[0] === dateStr;
          });

          if (txOnThisDay) {
            if (txOnThisDay.type === 'deposit') {
              balance += txOnThisDay.amount;
            } else {
              balance -= txOnThisDay.amount;
            }
          }

          const dailyChange = (Math.random() - 0.48) * 30000;
          balance += dailyChange;

          mockSnapshots.push({
            date: dateStr,
            balance: Math.max(balance, 100000),
            equity: Math.max(balance, 100000) * (0.98 + Math.random() * 0.04),
            leverage: 3 + Math.random() * 15,
            marginLevel: 500 + Math.random() * 450,
          });
        }

        if (isMounted) setAccountData(mockSnapshots);

      } catch (error) {
        console.error('データ読み込みエラー:', error);
        if (isMounted) {
          setTrades([]);
          setAccountData([]);
          setTransactions([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [dataset, useDatabase, isInitialized]);

  const filtered = useMemo(() => filterTrades(trades, filters), [trades, filters]);

  const kpiMetrics = useMemo(() => {
    if (filtered.length === 0 || accountData.length === 0) {
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

    const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
    const swapTotal = filtered.reduce((sum, t) => sum + (t.swap || 0), 0);

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

    const realGrowthRate = initialBalance > 0 ? ((netAssetChange / initialBalance) * 100) : 0;
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
  }, [filtered, accountData, transactions]);

  const balanceChartData = useMemo(() => {
    if (accountData.length === 0) return null;

    const labels = accountData.map(s => {
      const date = new Date(s.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const depositPoints: number[] = [];
    const withdrawalPoints: number[] = [];

    accountData.forEach((snapshot) => {
      const hasDeposit = transactions.some(t => {
        const txDate = new Date(t.date.replace(/\./g, '-').split(' ')[0]);
        return t.type === 'deposit' && txDate.toISOString().split('T')[0] === snapshot.date;
      });
      const hasWithdrawal = transactions.some(t => {
        const txDate = new Date(t.date.replace(/\./g, '-').split(' ')[0]);
        return t.type === 'withdrawal' && txDate.toISOString().split('T')[0] === snapshot.date;
      });

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
          pointRadius: 6,
          pointBackgroundColor: getLongColor(),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          showLine: false,
        },
        {
          label: '出金',
          data: withdrawalPoints,
          pointRadius: 6,
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
          Radius: 0,
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
          pointRadius: 0,
        },
      ],
    };
  }, [accountData]);

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            純資産増減
            <HelpIcon text="取引損益から入出金を差し引いた、実質的な資産の増減額です。" />
          </h3>
          <div className="kpi-value" style={{ color: kpiMetrics.netAssetChange >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
            {kpiMetrics.netAssetChange >= 0 ? '+' : ''}{Math.round(kpiMetrics.netAssetChange).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: kpiMetrics.netAssetChange >= 0 ? 'var(--gain)' : 'var(--loss)' }}>円</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>入出金補正後</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            累計入金額
            <HelpIcon text="口座への入金総額です。追加資金への依存度を把握できます。" />
          </h3>
          <div className="kpi-value">
            {Math.round(kpiMetrics.totalDeposits).toLocaleString('ja-JP')} <span className="kpi-unit">円</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>合計</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            累計出金額
            <HelpIcon text="口座からの出金総額です。利益確定の習慣を確認できます。" />
          </h3>
          <div className="kpi-value">
            {Math.round(kpiMetrics.totalWithdrawals).toLocaleString('ja-JP')} <span className="kpi-unit">円</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>合計</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            スワップ累計
            <HelpIcon text="ポジションの保有期間に応じて発生したスワップポイントの累計です。" />
          </h3>
          <div className="kpi-value" style={{ color: kpiMetrics.swapTotal >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
            {kpiMetrics.swapTotal >= 0 ? '+' : ''}{Math.round(kpiMetrics.swapTotal).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: kpiMetrics.swapTotal >= 0 ? 'var(--gain)' : 'var(--loss)' }}>円</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>合計</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            最高資産
            <HelpIcon text="口座残高が最も高かった時点の金額です。ピークからの下落度合いを確認できます。" />
          </h3>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>
            {Math.round(kpiMetrics.peakBalance).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--accent)' }}>円</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>ピーク</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            最大資金DD
            <HelpIcon text="入出金を補正した資産の最大ドローダウン率です。リスク許容度の評価に使います。" />
          </h3>
          <div className="kpi-value" style={{ color: 'var(--loss)' }}>
            {Math.abs(kpiMetrics.maxDrawdown).toFixed(1)} <span className="kpi-unit" style={{ color: 'var(--loss)' }}>%</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>入出金補正後</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            実質成長率
            <HelpIcon text="入出金を除外した、純粋なトレードによる資産成長率です。" />
          </h3>
          <div className="kpi-value" style={{ color: kpiMetrics.realGrowthRate >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
            {kpiMetrics.realGrowthRate >= 0 ? '+' : ''}{kpiMetrics.realGrowthRate.toFixed(1)} <span className="kpi-unit" style={{ color: kpiMetrics.realGrowthRate >= 0 ? 'var(--gain)' : 'var(--loss)' }}>%</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>成長率</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            平均実効レバレッジ
            <HelpIcon text="実際の取引で使用しているレバレッジの平均値です。リスク水準の確認に使います。" />
          </h3>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>
            {kpiMetrics.avgLeverage.toFixed(1)} <span className="kpi-unit" style={{ color: 'var(--accent)' }}>倍</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>平均</div>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          資金曲線
          <HelpIcon text="口座残高の推移と入出金イベントを表示します。" />
        </h3>
        {balanceChartData ? (
          <div style={{ height: 280 }}>
            <Line
              data={balanceChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { font: { size: 12 } } },
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
                  x: { grid: { color: getGridLineColor() }, ticks: { font: { size: 11 } } },
                  y: {
                    grid: { color: getGridLineColor() },
                    ticks: {
                      font: { size: 11 },
                      callback: (value: any) => `${(value / 1000).toFixed(0)}k`,
                    },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            実効レバレッジ推移
            <HelpIcon text="実際の取引に使用しているレバレッジの推移を表示します。" />
          </h3>
          {leverageChartData ? (
            <div style={{ height: 200 }}>
              <Line
                data={leverageChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: getGridLineColor() }, ticks: { font: { size: 11 } } },
                    y: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (value: any) => `${value}倍`,
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            証拠金維持率
            <HelpIcon text="証拠金に対する有効証拠金の比率を表示します。" />
          </h3>
          {marginLevelChartData ? (
            <div style={{ height: 200 }}>
              <Line
                data={marginLevelChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: getGridLineColor() }, ticks: { font: { size: 11 } } },
                    y: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        font: { size: 11 },
                        callback: (value: any) => `${value}%`,
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
          )}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          入出金イベント一覧
          <HelpIcon text="口座への入金・出金の履歴を時系列で表示します。" />
        </h3>
        {transactions.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--line)' }}>
                <th style={{ padding: 10, textAlign: 'left', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>日付</th>
                <th style={{ padding: 10, textAlign: 'left', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>種類</th>
                <th style={{ padding: 10, textAlign: 'right', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>金額</th>
                <th style={{ padding: 10, textAlign: 'left', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)' }}>メモ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => {
                const txDate = new Date(tx.date.replace(/\./g, '-').split(' ')[0]);
                return (
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid var(--line)', height: 44, cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--chip)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: 10, fontSize: 13 }}>{txDate.toLocaleDateString('ja-JP')}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: tx.type === 'deposit' ? getLongColor(0.1) : getLossColor(0.1),
                        color: tx.type === 'deposit' ? getLongColor() : getLossColor(),
                      }}>
                        {tx.type === 'deposit' ? '入金' : '出金'}
                      </span>
                    </td>
                    <td style={{ padding: 10, textAlign: 'right', fontSize: 15, fontWeight: 700, color: tx.type === 'deposit' ? 'var(--gain)' : 'var(--loss)' }}>
                      {tx.type === 'deposit' ? '+' : '-'}
                      {Math.round(tx.amount).toLocaleString('ja-JP')} <span style={{ fontSize: 13 }}>円</span>
                    </td>
                    <td style={{ padding: 10, fontSize: 13, color: 'var(--muted)' }}>
                      {tx.memo || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>入出金イベントがありません</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>💡 DDの本質的深さ</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, color: 'var(--ink)' }}>
            入出金補正後の最大DDは <strong>{Math.abs(kpiMetrics.maxDrawdown).toFixed(1)}%</strong> です。
            {Math.abs(kpiMetrics.maxDrawdown) > 20 ? 'リスク許容度を超えています。' : '適切な範囲内です。'}
          </div>
          <div style={{ padding: 10, backgroundColor: 'var(--chip)', borderRadius: 8, fontSize: 12, color: 'var(--ink)' }}>
            次のアクション: ロットサイズを見直しましょう
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>💡 レバレッジと損失の相関</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, color: 'var(--ink)' }}>
            平均実効レバレッジは <strong>{kpiMetrics.avgLeverage.toFixed(1)}倍</strong> です。
            {kpiMetrics.avgLeverage > 25 ? '高レバレッジ環境での取引が続いています。' : '適切なレバレッジ管理ができています。'}
          </div>
          <div style={{ padding: 10, backgroundColor: 'var(--chip)', borderRadius: 8, fontSize: 12, color: 'var(--ink)' }}>
            次のアクション: レバレッジ上限を20倍以内に設定しましょう
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>💡 入出金のクセ分析</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, color: 'var(--ink)' }}>
            累計入金 <strong>{Math.round(kpiMetrics.totalDeposits / 10000).toFixed(0)}万円</strong>、
            累計出金 <strong>{Math.round(kpiMetrics.totalWithdrawals / 10000).toFixed(0)}万円</strong>。
            {kpiMetrics.totalDeposits > kpiMetrics.totalWithdrawals * 2 ? '追加入金への依存が見られます。' : '健全な資金管理ができています。'}
          </div>
          <div style={{ padding: 10, backgroundColor: 'var(--chip)', borderRadius: 8, fontSize: 12, color: 'var(--ink)' }}>
            次のアクション: 週次で利益出金ルールを設定しましょう
          </div>
        </div>
      </div>
    </div>
  );
}
