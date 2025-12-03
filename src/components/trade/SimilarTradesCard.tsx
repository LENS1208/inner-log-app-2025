import React, { useState, useEffect } from 'react';
import { getSimilarTrades, SimilarTrade, DbTrade, DbTradeNote, getTradeByTicket } from '../../lib/db.service';
import { getAccentColor } from '../../lib/chartColors';

type SimilarTradesCardProps = {
  trade: DbTrade;
  note: DbTradeNote | null;
};

export default function SimilarTradesCard({ trade, note }: SimilarTradesCardProps) {
  const [similarTrades, setSimilarTrades] = useState<SimilarTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadSimilarTrades();
  }, [trade.ticket]);

  const loadSimilarTrades = async () => {
    setLoading(true);
    try {
      const trades = await getSimilarTrades(trade, note);
      setSimilarTrades(trades);
    } catch (err) {
      console.error('類似トレード取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = React.useMemo(() => {
    if (similarTrades.length === 0) return null;

    const winCount = similarTrades.filter(t => t.profit > 0).length;
    const winRate = (winCount / similarTrades.length) * 100;
    const avgProfit = similarTrades.reduce((sum, t) => sum + t.profit, 0) / similarTrades.length;
    const avgR = similarTrades
      .filter(t => t.r_value !== null)
      .reduce((sum, t) => sum + (t.r_value || 0), 0) / similarTrades.filter(t => t.r_value !== null).length || 0;

    const maxWin = Math.max(...similarTrades.map(t => t.profit));
    const maxLoss = Math.min(...similarTrades.map(t => t.profit));

    return { winRate, avgProfit, avgR, maxWin, maxLoss };
  }, [similarTrades]);

  const rHistogram = React.useMemo(() => {
    const bins = [
      { label: '-3R以下', min: -Infinity, max: -3, count: 0 },
      { label: '-3R〜-2R', min: -3, max: -2, count: 0 },
      { label: '-2R〜-1R', min: -2, max: -1, count: 0 },
      { label: '-1R〜0R', min: -1, max: 0, count: 0 },
      { label: '0R〜1R', min: 0, max: 1, count: 0 },
      { label: '1R〜2R', min: 1, max: 2, count: 0 },
      { label: '2R〜3R', min: 2, max: 3, count: 0 },
      { label: '3R以上', min: 3, max: Infinity, count: 0 },
    ];

    similarTrades
      .filter(t => t.r_value !== null)
      .forEach(t => {
        const r = t.r_value!;
        const bin = bins.find(b => r >= b.min && r < b.max);
        if (bin) bin.count++;
      });

    const maxCount = Math.max(...bins.map(b => b.count), 1);

    return { bins, maxCount };
  }, [similarTrades]);

  const handleTradeClick = (ticket: string) => {
    window.location.hash = `/notebook/${ticket}`;
    setDrawerOpen(false);
  };

  if (loading) {
    return (
      <section className="td-card">
        <div className="td-section-title">
          <h2>類似トレード分析</h2>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
          読み込み中...
        </div>
      </section>
    );
  }

  if (similarTrades.length === 0) {
    return (
      <section className="td-card">
        <div className="td-section-title">
          <h2>類似トレード分析</h2>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
          類似トレードが見つかりませんでした。
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="td-card">
        <div className="td-section-title">
          <h2>類似トレード分析</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>類似トレード件数</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{similarTrades.length}件</div>
          </div>

          {stats && (
            <>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>勝率</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.winRate >= 50 ? 'var(--accent)' : 'var(--loss)' }}>
                  {stats.winRate.toFixed(1)}%
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>平均損益</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.avgProfit >= 0 ? 'var(--accent)' : 'var(--loss)' }}>
                  {stats.avgProfit >= 0 ? '+' : ''}{Math.round(stats.avgProfit).toLocaleString()}円
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>平均R値</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.avgR >= 0 ? 'var(--accent)' : 'var(--loss)' }}>
                  {stats.avgR >= 0 ? '+' : ''}{stats.avgR.toFixed(1)}R
                </div>
              </div>
            </>
          )}
        </div>

        {stats && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>最大勝ち</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
                  +{Math.round(stats.maxWin).toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>最大負け</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--loss)' }}>
                  {Math.round(stats.maxLoss).toLocaleString()}円
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>損益ヒストグラム（R単位）</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rHistogram.bins.map((bin, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, fontSize: 12, color: 'var(--muted)' }}>{bin.label}</div>
                <div style={{ flex: 1, height: 24, background: 'var(--chip)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(bin.count / rHistogram.maxCount) * 100}%`,
                      height: '100%',
                      background: getAccentColor(),
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{bin.count}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          類似トレードを一覧で見る →
        </button>
      </section>

      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 800,
              height: '100%',
              background: 'var(--surface)',
              overflowY: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>類似トレード一覧</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
              {similarTrades.length}件の類似トレードが見つかりました
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {similarTrades.map((t) => (
                <div
                  key={t.ticket}
                  style={{
                    padding: 16,
                    background: 'var(--chip)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => handleTradeClick(t.ticket)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--line)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--chip)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(t.open_time).toLocaleDateString('ja-JP')}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                        {trade.item} {trade.side === 'BUY' ? '買い' : '売り'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: t.profit >= 0 ? 'var(--accent)' : 'var(--loss)' }}>
                        {t.profit >= 0 ? '+' : ''}{Math.round(t.profit).toLocaleString()}円
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {t.pips >= 0 ? '+' : ''}{t.pips.toFixed(1)} pips
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    {t.r_value !== null && (
                      <div>
                        <span style={{ color: 'var(--muted)' }}>R値: </span>
                        <span style={{ fontWeight: 600, color: t.r_value >= 0 ? 'var(--accent)' : 'var(--loss)' }}>
                          {t.r_value >= 0 ? '+' : ''}{t.r_value.toFixed(1)}R
                        </span>
                      </div>
                    )}
                    {t.strategy_tag && (
                      <div>
                        <span style={{ color: 'var(--muted)' }}>戦略: </span>
                        <span style={{ fontWeight: 600 }}>{t.strategy_tag}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--muted)' }}>類似度: </span>
                      <span style={{ fontWeight: 600 }}>{t.similarity_score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
