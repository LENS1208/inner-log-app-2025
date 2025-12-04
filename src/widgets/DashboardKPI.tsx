// src/widgets/DashboardKPI.tsx
// Updated: Fixed neutral KPI colors to use var(--ink)
import React, { useMemo, useState, useEffect } from 'react'
import { UI_TEXT, formatCount } from '../lib/i18n'
import { computePipsFromPrices, computeDurationMinutes } from '../lib/metrics'
import type { Trade } from '../lib/types'
import AccountSummaryCards from '../components/AccountSummaryCards'
import SwapSummaryCard from '../components/SwapSummaryCard'
import { HelpIcon } from '../components/common/HelpIcon'
import { getAccentColor, getLossColor } from '../lib/chartColors'
import { useDataset } from '../lib/dataset.context'
import { WelcomeMessage } from '../components/common/WelcomeMessage'
import { DemoModeBanner } from '../components/common/DemoModeBanner'
import { Doughnut } from 'react-chartjs-2'
import WinLossDetailDrawer from '../components/reports/WinLossDetailDrawer'

export type DashTrade = {
  profitJPY?: number
  profitYen?: number
  pair?: string
  symbol?: string
  side?: string
  pips?: number
  openPrice?: number
  closePrice?: number
  openTime?: string
  datetime?: string
  comment?: string
  memo?: string
}

function getProfit(t: DashTrade): number {
  return t.profitJPY ?? t.profitYen ?? 0
}

function computeDashboard(trades: DashTrade[]) {
  const tradingOnly = trades.filter(t => !(t as any).type || (t as any).type?.toLowerCase() !== 'balance')
  const count = tradingOnly.length
  const gross = tradingOnly.reduce((a, b) => a + getProfit(b), 0)
  const avg = count ? gross / count : 0
  const wins = tradingOnly.filter(t => getProfit(t) > 0).length
  const losses = tradingOnly.filter(t => getProfit(t) < 0).length
  const draws = tradingOnly.filter(t => getProfit(t) === 0).length

  const winRate = count ? wins / count : 0

  const totalProfit = tradingOnly.filter(t => getProfit(t) > 0).reduce((a, b) => a + getProfit(b), 0)
  const totalLoss = Math.abs(tradingOnly.filter(t => getProfit(t) < 0).reduce((a, b) => a + getProfit(b), 0))
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0)

  const avgProfit = wins > 0 ? totalProfit / wins : 0
  const avgLoss = losses > 0 ? totalLoss / losses : 0

  const expectancyJPY = winRate * avgProfit - (1 - winRate) * avgLoss

  const parseDateTime = (datetime: string | number | undefined): Date => {
    if (!datetime) return new Date(NaN)
    if (typeof datetime === 'number') return new Date(datetime)
    let dt = String(datetime).trim()
    if (!dt) return new Date(NaN)
    dt = dt.replace(/\./g, '-').replace(' ', 'T')
    return new Date(dt)
  }

  const validTrades = tradingOnly.filter(t => {
    const date = parseDateTime((t as any).datetime || (t as any).time)
    return !isNaN(date.getTime())
  })

  const sortedTrades = [...validTrades].sort((a, b) => {
    const dateA = parseDateTime((a as any).datetime || (a as any).time).getTime()
    const dateB = parseDateTime((b as any).datetime || (b as any).time).getTime()
    return dateA - dateB
  })

  let equity = 0
  let peak = 0
  let maxDD = 0
  sortedTrades.forEach(t => {
    equity += getProfit(t)
    if (equity > peak) peak = equity
    const dd = peak - equity
    if (dd > maxDD) maxDD = dd
  })


  let totalMinutes = 0
  let durationCount = 0
  tradingOnly.forEach(t => {
    const dur = computeDurationMinutes(t as Trade)
    if (dur !== null) {
      totalMinutes += dur
      durationCount++
    }
  })
  const avgHoldMin = durationCount > 0 ? totalMinutes / durationCount : null

  // 取引日数を計算
  const tradeDates = new Set<string>()
  tradingOnly.forEach(t => {
    const dateStr = t.openTime || t.datetime
    if (dateStr) {
      try {
        const date = new Date(dateStr)
        tradeDates.add(date.toISOString().split('T')[0])
      } catch (e) {}
    }
  })
  const tradingDays = tradeDates.size

  // 獲得リスク比（Expectancy Ratio）
  const riskRewardRatio = avgLoss > 0 ? avgProfit / avgLoss : 0

  // シャープレシオ（簡易版）
  const profits = tradingOnly.map(t => getProfit(t))
  const variance = profits.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / (profits.length > 1 ? profits.length - 1 : 1)
  const stdDev = Math.sqrt(variance)
  const sharpeRatio = stdDev > 0 ? avg / stdDev : 0

  // pips統計
  const tradesWithPips = tradingOnly.filter(t => typeof t.pips === 'number')
  const totalPips = tradesWithPips.reduce((sum, t) => sum + (t.pips || 0), 0)
  const avgPips = tradesWithPips.length > 0 ? totalPips / tradesWithPips.length : 0

  const winTradesWithPips = tradingOnly.filter(t => getProfit(t) > 0 && typeof t.pips === 'number')
  const totalWinPips = winTradesWithPips.reduce((sum, t) => sum + (t.pips || 0), 0)
  const avgWinPips = winTradesWithPips.length > 0 ? totalWinPips / winTradesWithPips.length : 0

  const lossTradesWithPips = tradingOnly.filter(t => getProfit(t) < 0 && typeof t.pips === 'number')
  const totalLossPips = lossTradesWithPips.reduce((sum, t) => sum + (t.pips || 0), 0)
  const avgLossPips = lossTradesWithPips.length > 0 ? totalLossPips / lossTradesWithPips.length : 0

  return {
    count, gross, avg, wins, losses, draws, winRate,
    profitFactor, totalProfit, totalLoss, avgProfit, avgLoss,
    expectancyJPY, maxDD, avgHoldMin,
    tradingDays, riskRewardRatio, sharpeRatio, peak,
    avgPips, avgWinPips, avgLossPips
  }
}

function formatMinutesJP(min: number | null): string {
  if (min === null) return '—'
  if (!Number.isFinite(min)) return '—'
  const m = Math.round(min)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h <= 0) return `${r}分`
  if (r === 0) return `${h}時間`
  return `${h}時間${r}分`
}

const Info: React.FC<{title:string}> = ({title}) => <span className="info" title={title} aria-label="説明">?</span>

function Gauge({ winRate, profitFactor }: { winRate: number; profitFactor: number }) {
  const winPct = Math.round(winRate * 100)
  const lossPct = 100 - winPct
  const pfPct = Math.min(Math.round(profitFactor * 100), 100)

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg viewBox="0 0 80 80" style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="var(--line)" strokeWidth="9" />
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke="var(--accent-2)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${winPct * 2.01} ${201 - winPct * 2.01}`}
          />
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke="var(--loss)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`0 ${winPct * 2.01} ${lossPct * 2.01}`}
          />
        </svg>
      </div>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg viewBox="0 0 80 80" style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="var(--line)" strokeWidth="9" />
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke="var(--accent, #01a1ff)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${pfPct * 2.01} ${201 - pfPct * 2.01}`}
          />
        </svg>
      </div>
    </div>
  )
}

function SemiGauge({ winRate, wins, draws, losses }: { winRate: number; wins: number; draws: number; losses: number }) {
  const winPct = Math.round(winRate * 100)
  const lossPct = 100 - winPct

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 120, height: 70 }}>
        <svg viewBox="0 0 120 70" style={{ width: '100%', height: 70 }}>
          <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="var(--line)" strokeWidth="4" pathLength="100" />
          <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="var(--accent-2)" strokeLinecap="round" strokeWidth="4" pathLength="100" strokeDasharray={`${winPct} ${100 - winPct}`} />
          <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="var(--loss)" strokeLinecap="round" strokeWidth="4" pathLength="100" strokeDasharray={`0 ${winPct} ${lossPct}`} />
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, height: 22, padding: '0 6px', borderRadius: 999, fontWeight: 600, fontSize: 12, border: '1px solid var(--line)', background: 'var(--chip)', color: 'var(--ink)' }}>{wins}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, height: 22, padding: '0 6px', borderRadius: 999, fontWeight: 600, fontSize: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--muted)' }}>{draws}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, height: 22, padding: '0 6px', borderRadius: 999, fontWeight: 600, fontSize: 12, border: '1px solid var(--line)', background: 'var(--chip)', color: 'var(--muted)' }}>{losses}</span>
      </div>
    </div>
  )
}

function BarSplit({ avgProfit, avgLoss, unit = '円' }: { avgProfit: number; avgLoss: number; unit?: string }) {
  const total = avgProfit + avgLoss
  const profitPct = total > 0 ? (avgProfit / total) * 100 : 50
  const lossPct = 100 - profitPct

  const formatValue = (val: number) => {
    if (unit === 'pips') {
      return val.toFixed(1)
    }
    return Math.round(val).toLocaleString('ja-JP')
  }

  return (
    <div>
      <div style={{ height: 10, borderRadius: 999, background: 'var(--chip)', border: '1px solid var(--line)', display: 'flex', overflow: 'hidden', marginTop: 6 }}>
        <div style={{ width: `${profitPct}%`, background: 'var(--accent-border)' }} />
        <div style={{ width: `${lossPct}%`, background: 'rgba(239,68,68,.35)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontWeight: 600 }}>
        <span style={{ color: 'var(--accent-2)' }}>+{formatValue(avgProfit)} <span style={{ fontSize: 12, color: 'var(--accent-2)' }}>{unit}</span></span>
        <span style={{ color: 'var(--loss)' }}>-{formatValue(avgLoss)} <span style={{ fontSize: 12, color: 'var(--loss)' }}>{unit}</span></span>
      </div>
    </div>
  )
}

export default function DashboardKPI({ trades }: { trades: DashTrade[] }) {
  const dash = useMemo(() => computeDashboard(trades), [trades])
  const { useDatabase } = useDataset();
  const [showWelcome, setShowWelcome] = useState(false);
  const [winLossDrawer, setWinLossDrawer] = useState<{ kind: 'WIN' | 'LOSS' } | null>(null);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome && !useDatabase) {
      setShowWelcome(true);
    }
  }, [useDatabase]);

  const handleDismissWelcome = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  const handleUploadClick = () => {
    window.dispatchEvent(new CustomEvent("fx:openUpload"));
  };

  const tradePeriod = useMemo(() => {
    if (trades.length === 0) return null;

    const dates = trades
      .map(t => {
        const dateStr = t.openTime || t.datetime;
        if (!dateStr) return null;
        try {
          return new Date(dateStr);
        } catch {
          return null;
        }
      })
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return null;

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const formatDate = (date: Date) => {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    return `${formatDate(firstDate)}〜${formatDate(lastDate)}`;
  }, [trades]);

  return (
    <>
      {showWelcome && <WelcomeMessage onDismiss={handleDismissWelcome} />}
      {!useDatabase && !showWelcome && <DemoModeBanner onUploadClick={handleUploadClick} />}
      <div className="kpi-grid" style={{ marginBottom: 12, width: '100%', maxWidth: '100%' }}>
      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          合計損益
          <HelpIcon text="全取引の利益と損失を合計した最終的な損益です。プラスなら利益が出ています。" />
        </div>
        <div className="kpi-value" style={{ color: dash.gross < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
          {dash.gross >= 0 ? '+' : ''}{Math.round(dash.gross).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: dash.gross < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>円</span>
        </div>
        <div className="kpi-desc">全取引の合計損益</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          取引回数（期間）
          <HelpIcon text="分析対象の取引回数です。データが多いほど統計的に信頼できる分析結果が得られます。" />
        </div>
        <div className="kpi-value" style={{ color: 'var(--ink)' }}>
          {dash.count} <span className="kpi-unit" style={{ color: 'var(--muted)' }}>回</span>
        </div>
        {tradePeriod && (
          <div style={{
            fontSize: 12,
            color: 'var(--muted)',
            marginTop: 8,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {tradePeriod}
          </div>
        )}
        <div className="kpi-desc">アクティブな取引件数</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          平均損益
          <HelpIcon text="1回の取引あたりの平均的な損益です。プラスなら平均的に利益が出ています。" />
        </div>
        <div>
          <div className="kpi-value" style={{ color: dash.avg < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
            {dash.avg >= 0 ? '+' : ''}{Math.round(dash.avg).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: dash.avg < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>円/件</span>
          </div>
          <div className="kpi-desc">1取引あたりの平均</div>
          <div style={{
            marginTop: 8,
            display: 'flex',
            height: 4,
            borderRadius: 2,
            overflow: 'hidden',
            background: 'var(--line)'
          }}>
            {dash.avgProfit > 0 && (
              <div
                style={{
                  width: `${(dash.avgProfit / (dash.avgProfit + dash.avgLoss)) * 100}%`,
                  background: 'var(--gain)',
                  transition: 'width 0.3s ease'
                }}
              />
            )}
            {dash.avgLoss > 0 && (
              <div
                style={{
                  width: `${(dash.avgLoss / (dash.avgProfit + dash.avgLoss)) * 100}%`,
                  background: 'var(--loss)',
                  transition: 'width 0.3s ease'
                }}
              />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
            <span style={{ color: 'var(--gain)', fontWeight: 600 }}>+{Math.round(dash.avgProfit).toLocaleString('ja-JP')}円</span>
            <span style={{ color: 'var(--loss)', fontWeight: 600 }}>-{Math.round(dash.avgLoss).toLocaleString('ja-JP')}円</span>
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          平均pips
          <HelpIcon text="1回の取引あたりの平均獲得pips数です。プラスなら平均的にpipsを獲得しています。" />
        </div>
        <div>
          <div className="kpi-value" style={{ color: dash.avgPips < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>
            {dash.avgPips >= 0 ? '+' : ''}{dash.avgPips.toFixed(1)} <span className="kpi-unit" style={{ color: dash.avgPips < 0 ? 'var(--loss)' : 'var(--accent-2)' }}>pips</span>
          </div>
          <div className="kpi-desc">1取引あたりの平均</div>
          <div style={{
            marginTop: 8,
            display: 'flex',
            height: 4,
            borderRadius: 2,
            overflow: 'hidden',
            background: 'var(--line)'
          }}>
            {dash.avgWinPips > 0 && (
              <div
                style={{
                  width: `${(dash.avgWinPips / (dash.avgWinPips + Math.abs(dash.avgLossPips))) * 100}%`,
                  background: 'var(--gain)',
                  transition: 'width 0.3s ease'
                }}
              />
            )}
            {dash.avgLossPips < 0 && (
              <div
                style={{
                  width: `${(Math.abs(dash.avgLossPips) / (dash.avgWinPips + Math.abs(dash.avgLossPips))) * 100}%`,
                  background: 'var(--loss)',
                  transition: 'width 0.3s ease'
                }}
              />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
            <span style={{ color: 'var(--gain)', fontWeight: 600 }}>{dash.avgWinPips >= 0 ? '+' : ''}{dash.avgWinPips.toFixed(1)}pips</span>
            <span style={{ color: 'var(--loss)', fontWeight: 600 }}>{dash.avgLossPips.toFixed(1)}pips</span>
          </div>
        </div>
      </div>

      <SwapSummaryCard />

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          勝率
          <HelpIcon text="利益が出た取引の割合です。50%以上なら半分以上の取引で勝っています。" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div className="kpi-value" style={{ color: 'var(--ink)' }}>
              {(dash.winRate * 100).toFixed(1)} <span className="kpi-unit" style={{ color: 'var(--muted)' }}>%</span>
            </div>
            <div className="kpi-desc">{dash.wins}勝 {dash.draws}分 {dash.losses}敗</div>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <SemiGauge winRate={dash.winRate} wins={dash.wins} draws={dash.draws} losses={dash.losses} />
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          プロフィットファクター
          <HelpIcon text="総利益÷総損失の比率です。1.5以上が優秀、1.0以上が良好、1.0未満は要改善です。" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div className="kpi-value" style={{ color: dash.profitFactor >= 1.5 ? 'var(--gain)' : dash.profitFactor >= 1.0 ? 'var(--accent)' : 'var(--loss)' }}>
              {Number.isFinite(dash.profitFactor) ? dash.profitFactor.toFixed(2) : '∞'}
            </div>
            <div className="kpi-desc">総利益 / 総損失</div>
          </div>
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <svg viewBox="0 0 80 80" style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="32" fill="none" stroke="var(--line)" strokeWidth="9" />
              <circle
                cx="40" cy="40" r="32"
                fill="none"
                stroke="var(--accent-2)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(Math.round(dash.profitFactor * 100), 201)} 201`}
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          最大ドローダウン
          <HelpIcon text="資金が最も減った金額です。この数値が大きいほど、大きな含み損に耐える必要があります。" />
        </div>
        <div className="kpi-value" style={{ color: 'var(--loss)' }}>
          -{Math.round(dash.maxDD).toLocaleString('ja-JP')} <span className="kpi-unit" style={{ color: 'var(--loss)' }}>円</span>
        </div>
        <div className="kpi-desc">ピーク→ボトムの最大下落</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          平均保有時間
          <HelpIcon text="ポジションを保有していた平均時間です。短いほどスキャルピング、長いほどスイングトレードの傾向があります。" />
        </div>
        <div className="kpi-value" style={{ color: 'var(--ink)' }}>{formatMinutesJP(dash.avgHoldMin)}</div>
        <div className="kpi-desc">Open→Close の平均</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          獲得リスク比
          <HelpIcon text="平均利益÷平均損失の比率です。2.0以上が優秀、1.0以上が良好、1.0未満は要改善です。" />
        </div>
        <div className="kpi-value" style={{ color: dash.riskRewardRatio >= 2.0 ? 'var(--gain)' : dash.riskRewardRatio >= 1.0 ? 'var(--accent)' : 'var(--loss)' }}>
          {dash.riskRewardRatio.toFixed(2)}
        </div>
        <div className="kpi-desc">平均利益 / 平均損失</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          シャープレシオ
          <HelpIcon text="リスク1単位あたりのリターンを示す指標です。1.0以上が良好、0以上が普通、マイナスは損失状態です。" />
        </div>
        <div className="kpi-value" style={{ color: dash.sharpeRatio >= 1.0 ? 'var(--gain)' : dash.sharpeRatio >= 0 ? 'var(--accent)' : 'var(--loss)' }}>
          {dash.sharpeRatio.toFixed(2)}
        </div>
        <div className="kpi-desc">リターン / リスク</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', margin: '0 0 8px' }}>
          勝ち負け集計
          <HelpIcon text="勝ちトレードと負けトレードの件数比率です。円グラフをクリックして詳細分析を表示します。" />
        </div>
        <div style={{ height: 180 }}>
          <Doughnut
            data={{
              labels: ['勝ち', '負け'],
              datasets: [{
                data: [dash.wins, dash.losses],
                backgroundColor: [getAccentColor(), getLossColor()],
                borderWidth: 0,
                borderColor: 'transparent',
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              onClick: (event, elements) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  const kind = index === 0 ? 'WIN' : 'LOSS';
                  setWinLossDrawer({ kind });
                }
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'bottom',
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label || '';
                      const value = context.parsed;
                      const total = dash.wins + dash.losses;
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      return `${label}: ${value}件 (${percentage}%)`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <AccountSummaryCards peakEquity={dash.peak} />
    </div>

    {winLossDrawer && (
      <WinLossDetailDrawer
        kind={winLossDrawer.kind}
        trades={trades as Trade[]}
        onClose={() => setWinLossDrawer(null)}
      />
    )}
    </>
  )
}
