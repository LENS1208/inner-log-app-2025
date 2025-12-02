import React, { useState, useEffect } from 'react';
import { getSimilarTrades, getTradeByTicket, getTradeNote, type SimilarTrade } from '../../lib/db.service';
import { getAccentColor, getLossColor } from '../../lib/chartColors';

type SimilarTradesCardProps = {
  tradeTicket: string;
  onViewDetails: (ticket: string) => void;
};

export default function SimilarTradesCard({ tradeTicket, onViewDetails }: SimilarTradesCardProps) {
  const [loading, setLoading] = useState(true);
  const [similarTrades, setSimilarTrades] = useState<SimilarTrade[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [stats, setStats] = useState({
    count: 0,
    winRate: 0,
    avgProfit: 0,
    avgRValue: 0,
    maxWin: 0,
    maxLoss: 0,
  });

  useEffect(() => {
    loadSimilarTrades();
  }, [tradeTicket]);

  const loadSimilarTrades = async () => {
    setLoading(true);
    try {
      const baseTrade = await getTradeByTicket(tradeTicket);
      if (!baseTrade) {
        setLoading(false);
        return;
      }

      const baseNote = await getTradeNote(tradeTicket);
      const similar = await getSimilarTrades(baseTrade, baseNote, 50, 50);

      setSimilarTrades(similar);

      if (similar.length > 0) {
        const winCount = similar.filter(t => t.profit > 0).length;
        const avgProfit = similar.reduce((sum, t) => sum + t.profit, 0) / similar.length;
        const rValues = similar.filter(t => t.r_value !== undefined).map(t => t.r_value!);
        const avgRValue = rValues.length > 0 ? rValues.reduce((sum, r) => sum + r, 0) / rValues.length : 0;
        const maxWin = Math.max(...similar.map(t => t.profit));
        const maxLoss = Math.min(...similar.map(t => t.profit));

        setStats({
          count: similar.length,
          winRate: (winCount / similar.length) * 100,
          avgProfit,
          avgRValue,
          maxWin,
          maxLoss,
        });
      } else {
        setStats({
          count: 0,
          winRate: 0,
          avgProfit: 0,
          avgRValue: 0,
          maxWin: 0,
          maxLoss: 0,
        });
      }
    } catch (err) {
      console.error('Failed to load similar trades:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRDistribution = () => {
    const buckets: { [key: string]: number } = {
      '-3R以下': 0,
      '-2R〜-3R': 0,
      '-1R〜-2R': 0,
      '-1R〜0R': 0,
      '0R〜1R': 0,
      '1R〜2R': 0,
      '2R〜3R': 0,
      '3R以上': 0,
    };

    similarTrades.forEach(trade => {
      const r = trade.r_value;
      if (r === undefined) return;

      if (r <= -3) buckets['-3R以下']++;
      else if (r <= -2) buckets['-2R〜-3R']++;
      else if (r <= -1) buckets['-1R〜-2R']++;
      else if (r < 0) buckets['-1R〜0R']++;
      else if (r < 1) buckets['0R〜1R']++;
      else if (r < 2) buckets['1R〜2R']++;
      else if (r < 3) buckets['2R〜3R']++;
      else buckets['3R以上']++;
    });

    return buckets;
  };

  if (loading) {
    return (
      <section className="td-card" style={{ padding: 'var(--space-3)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>類似トレード分析</h3>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>読み込み中...</div>
      </section>
    );
  }

  if (stats.count === 0) {
    return (
      <section className="td-card" style={{ padding: 'var(--space-3)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>類似トレード分析</h3>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>
          このセットアップに類似した過去のトレードが見つかりませんでした。
        </div>
      </section>
    );
  }

  const rDistribution = getRDistribution();
  const maxCount = Math.max(...Object.values(rDistribution));

  return (
    <>
      <section className="td-card" style={{ padding: 'var(--space-3)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>類似トレード分析</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>類似トレード件数</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.count}件</div>
          </div>
          <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: stats.winRate >= 50 ? getAccentColor() : getLossColor() }}>
              {stats.winRate.toFixed(1)}%
            </div>
          </div>
          <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>平均損益</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: stats.avgProfit >= 0 ? getAccentColor() : getLossColor() }}>
              {stats.avgProfit >= 0 ? '+' : ''}{Math.round(stats.avgProfit).toLocaleString()}円
            </div>
          </div>
          <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>平均R値</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: stats.avgRValue >= 0 ? getAccentColor() : getLossColor() }}>
              {stats.avgRValue >= 0 ? '+' : ''}{stats.avgRValue.toFixed(2)}R
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>最大勝ち・負け</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, padding: 10, background: 'var(--chip)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>最大勝ち</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: getAccentColor() }}>
                +{Math.round(stats.maxWin).toLocaleString()}円
              </div>
            </div>
            <div style={{ flex: 1, padding: 10, background: 'var(--chip)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>最大負け</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: getLossColor() }}>
                {Math.round(stats.maxLoss).toLocaleString()}円
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>R値分布</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(rDistribution).map(([label, count]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, fontSize: 11, color: 'var(--muted)' }}>{label}</div>
                <div style={{ flex: 1, height: 20, background: 'var(--chip)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%',
                      background: label.includes('-') ? getLossColor() : getAccentColor(),
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 6,
                      fontSize: 11,
                      color: '#fff',
                      fontWeight: 600,
                      transition: 'width 0.3s ease',
                    }}
                  >
                    {count > 0 && count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowDrawer(true)}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          類似トレードを一覧で見る →
        </button>
      </section>

      {showDrawer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setShowDrawer(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 800,
              background: 'var(--surface)',
              height: '100%',
              overflowY: 'auto',
              padding: 'var(--space-4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>類似トレード一覧（{stats.count}件）</h2>
              <button
                onClick={() => setShowDrawer(false)}
                style={{
                  background: 'var(--chip)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                閉じる
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {similarTrades.map((trade) => (
                <div
                  key={trade.ticket}
                  style={{
                    padding: 16,
                    background: 'var(--chip)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: '1px solid var(--line)',
                  }}
                  onClick={() => {
                    setShowDrawer(false);
                    onViewDetails(trade.ticket);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        {trade.item} {trade.side === 'BUY' ? '買い' : '売り'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(trade.close_time).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: trade.profit >= 0 ? getAccentColor() : getLossColor(),
                        }}
                      >
                        {trade.profit >= 0 ? '+' : ''}{Math.round(trade.profit).toLocaleString()}円
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {trade.pips >= 0 ? '+' : ''}{trade.pips.toFixed(1)} pips
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {trade.r_value !== undefined && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          background: trade.r_value >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: trade.r_value >= 0 ? getAccentColor() : getLossColor(),
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {trade.r_value >= 0 ? '+' : ''}{trade.r_value.toFixed(2)}R
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      類似度 {trade.similarity_score}%
                    </span>
                  </div>

                  {trade.entry_basis && trade.entry_basis.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                      根拠: {trade.entry_basis.slice(0, 2).join('、')}
                    </div>
                  )}

                  {trade.tags && trade.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {trade.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            background: 'var(--surface)',
                            border: '1px solid var(--line)',
                            borderRadius: 4,
                            color: 'var(--muted)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
