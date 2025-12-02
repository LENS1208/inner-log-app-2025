import React, { useState, useEffect, useMemo } from 'react';
import { useDataset } from '../lib/dataset.context';
import { filterTrades } from '../lib/filterTrades';
import { parseCsvText } from '../lib/csv';
import type { Trade } from '../lib/types';
import type { DailyReportData, ProfitMode } from '../types/daily-report-card.types';
import { DailyReportCardGenerator } from '../components/daily-report/DailyReportCardGenerator';

export const DailyReportCardPage: React.FC = () => {
  const { filters, useDatabase, dataset: contextDataset, isInitialized } = useDataset();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [profitMode, setProfitMode] = useState<ProfitMode>('yen');
  const [showUsername, setShowUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [brokerName, setBrokerName] = useState('XM');
  const [showBrokerLink, setShowBrokerLink] = useState(true);

  useEffect(() => {
    const loadTrades = async () => {
      if (!isInitialized) return;

      try {
        if (useDatabase) {
          const { getAllTrades } = await import('../lib/db.service');
          const data = await getAllTrades(contextDataset || null);
          const typedTrades = (data || []).map((t: any) => ({
            id: String(t.ticket || t.id),
            datetime: t.close_time,
            openTime: t.open_time,
            pair: t.item || t.symbol || 'UNKNOWN',
            symbol: t.item || t.symbol,
            side: (t.side || 'LONG') as 'LONG' | 'SHORT',
            volume: Number(t.size) || 0,
            profitYen: Number(t.profit),
            profit: Number(t.profit),
            pips: Number(t.pips) || 0,
            openPrice: Number(t.open_price),
            closePrice: Number(t.close_price),
            memo: t.memo || '',
            comment: t.comment || ''
          }));
          setTrades(typedTrades);
        } else {
          const res = await fetch(`/demo/${contextDataset}.csv?t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            const text = await res.text();
            const parsedTrades = parseCsvText(text);
            setTrades(parsedTrades);
          }
        }
      } catch (error) {
        console.error('Failed to load trades:', error);
      }
    };

    loadTrades();
  }, [isInitialized, useDatabase, contextDataset]);

  const filteredTrades = useMemo(() => {
    return filterTrades(trades, filters);
  }, [trades, filters]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    filteredTrades.forEach(trade => {
      if (trade.datetime) {
        const date = new Date(trade.datetime);
        if (!isNaN(date.getTime())) {
          dates.add(date.toISOString().split('T')[0]);
        }
      }
    });
    return Array.from(dates).sort().reverse();
  }, [filteredTrades]);

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  const reportData: DailyReportData | null = useMemo(() => {
    if (!selectedDate) return null;

    const dayTrades = filteredTrades.filter(trade => {
      if (!trade.datetime) return false;
      const tradeDate = new Date(trade.datetime).toISOString().split('T')[0];
      return tradeDate === selectedDate;
    });

    if (dayTrades.length === 0) return null;

    const totalProfit = dayTrades.reduce((sum, t) => sum + (t.profitYen || 0), 0);
    const totalPips = dayTrades.reduce((sum, t) => sum + (t.pips || 0), 0);
    const wins = dayTrades.filter(t => (t.profitYen || 0) > 0).length;
    const losses = dayTrades.filter(t => (t.profitYen || 0) < 0).length;
    const draws = dayTrades.filter(t => (t.profitYen || 0) === 0).length;
    const winRate = dayTrades.length > 0 ? wins / dayTrades.length : 0;

    const winProfit = dayTrades.filter(t => (t.profitYen || 0) > 0).reduce((sum, t) => sum + (t.profitYen || 0), 0);
    const lossProfit = Math.abs(dayTrades.filter(t => (t.profitYen || 0) < 0).reduce((sum, t) => sum + (t.profitYen || 0), 0));
    const pf = lossProfit > 0 ? winProfit / lossProfit : (winProfit > 0 ? Infinity : 0);

    let equity = 0;
    let peak = 0;
    let maxDD = 0;
    const sortedTrades = [...dayTrades].sort((a, b) =>
      new Date(a.datetime!).getTime() - new Date(b.datetime!).getTime()
    );
    sortedTrades.forEach(t => {
      equity += t.profitYen || 0;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDD) maxDD = dd;
    });

    const equityData = sortedTrades.map((t, i) => {
      const cumulative = sortedTrades.slice(0, i + 1).reduce((sum, tr) => sum + (tr.profitYen || 0), 0);
      return {
        time: new Date(t.datetime!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        equity: cumulative
      };
    });

    const pairProfitMap = new Map<string, number>();
    dayTrades.forEach(t => {
      const pair = t.pair || 'UNKNOWN';
      pairProfitMap.set(pair, (pairProfitMap.get(pair) || 0) + (t.profitYen || 0));
    });
    const pairProfitData = Array.from(pairProfitMap.entries())
      .map(([pair, profit]) => ({ pair, profit }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 5);

    const sessionProfitMap = new Map<string, number>();
    dayTrades.forEach(t => {
      const hour = new Date(t.datetime!).getHours();
      let session = '';
      if (hour >= 0 && hour < 8) session = '東京';
      else if (hour >= 8 && hour < 16) session = 'ロンドン';
      else session = 'NY';
      sessionProfitMap.set(session, (sessionProfitMap.get(session) || 0) + (t.profitYen || 0));
    });
    const sessionProfitData = Array.from(sessionProfitMap.entries())
      .map(([session, profit]) => ({ session, profit }));

    return {
      date: new Date(selectedDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }),
      profitMode,
      mainProfitValue: {
        yen: totalProfit,
        pips: totalPips
      },
      winRate,
      pf,
      maxDD,
      tradeCount: dayTrades.length,
      sessionProfitData,
      pairProfitData,
      equityData,
      showUsername,
      username: username || undefined,
      brokerName: brokerName || undefined,
      showBrokerLink,
      wins,
      losses,
      draws
    };
  }, [selectedDate, filteredTrades, profitMode, showUsername, username, brokerName, showBrokerLink]);

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: 24
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 24
        }}>
          日次レポートカード生成
        </h1>

        <div style={{
          background: 'var(--surface)',
          padding: 24,
          borderRadius: 12,
          border: '1px solid var(--line)',
          marginBottom: 32
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 16
          }}>
            設定
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--muted)',
                marginBottom: 6
              }}>
                日付を選択
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 6,
                  fontSize: 14,
                  color: 'var(--input-text)'
                }}
              >
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('ja-JP')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--muted)',
                marginBottom: 6
              }}>
                損益表示モード
              </label>
              <select
                value={profitMode}
                onChange={(e) => setProfitMode(e.target.value as ProfitMode)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 6,
                  fontSize: 14,
                  color: 'var(--input-text)'
                }}
              >
                <option value="yen">円のみ</option>
                <option value="pips">pipsのみ</option>
                <option value="both">両方表示</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--muted)',
                marginBottom: 6
              }}>
                FX会社名
              </label>
              <input
                type="text"
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                placeholder="例: XM, TITAN"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 6,
                  fontSize: 14,
                  color: 'var(--input-text)'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--muted)',
                marginBottom: 6
              }}>
                ユーザー名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例: trader123"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 6,
                  fontSize: 14,
                  color: 'var(--input-text)'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 16,
            marginTop: 16
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showUsername}
                onChange={(e) => setShowUsername(e.target.checked)}
              />
              <span style={{
                fontSize: 14,
                color: 'var(--ink)'
              }}>
                ユーザー名を表示
              </span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showBrokerLink}
                onChange={(e) => setShowBrokerLink(e.target.checked)}
              />
              <span style={{
                fontSize: 14,
                color: 'var(--ink)'
              }}>
                FX会社名を表示
              </span>
            </label>
          </div>
        </div>

        {reportData && <DailyReportCardGenerator data={reportData} />}
      </div>
    </div>
  );
};
