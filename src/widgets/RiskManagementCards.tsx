import React, { useMemo } from 'react'
import { HelpIcon } from '../components/common/HelpIcon'

type TradeWithProfit = {
  profitYen?: number
  profitJPY?: number
  datetime?: string
  time?: number
}

function getProfit(t: TradeWithProfit): number {
  return t.profitYen ?? t.profitJPY ?? 0
}

function formatJPY(v: number) {
  return Math.round(v).toLocaleString('ja-JP')
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN)
  if (typeof datetime === 'number') return new Date(datetime)

  let dt = datetime.trim()
  if (!dt) return new Date(NaN)

  dt = dt.replace(/\./g, '-').replace(' ', 'T')
  return new Date(dt)
}

export function RiskManagementCards({ trades }: { trades: TradeWithProfit[] }) {
  console.log('⚠️ RiskManagementCards rendered with', trades?.length, 'trades');

  const stats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        currentDrawdown: 0,
        peakEquity: 0,
        recoveryFactor: 0,
        riskRewardRatio: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        sharpeRatio: 0
      }
    }

    const sorted = [...trades].sort((a, b) => {
      const dateA = parseDateTime(a.datetime || a.time).getTime()
      const dateB = parseDateTime(b.datetime || b.time).getTime()
      return dateA - dateB
    })

    let equity = 0
    let peak = 0
    let maxDrawdown = 0
    let maxDrawdownPercent = 0
    let currentDrawdown = 0

    sorted.forEach(t => {
      equity += getProfit(t)
      if (equity > peak) {
        peak = equity
      }
      const drawdown = peak - equity
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
        maxDrawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0
      }
    })

    currentDrawdown = peak - equity

    const totalProfit = sorted.reduce((sum, t) => sum + getProfit(t), 0)
    const recoveryFactor = maxDrawdown > 0 ? totalProfit / maxDrawdown : totalProfit > 0 ? Infinity : 0

    const winTrades = sorted.filter(t => getProfit(t) > 0)
    const lossTrades = sorted.filter(t => getProfit(t) <= 0)
    const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + getProfit(t), 0) / winTrades.length : 0
    const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((sum, t) => sum + getProfit(t), 0)) / lossTrades.length : 0
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0

    let consecutiveWins = 0
    let consecutiveLosses = 0
    let maxConsecutiveWins = 0
    let maxConsecutiveLosses = 0

    sorted.forEach(t => {
      const profit = getProfit(t)
      if (profit > 0) {
        consecutiveWins++
        consecutiveLosses = 0
        if (consecutiveWins > maxConsecutiveWins) {
          maxConsecutiveWins = consecutiveWins
        }
      } else {
        consecutiveLosses++
        consecutiveWins = 0
        if (consecutiveLosses > maxConsecutiveLosses) {
          maxConsecutiveLosses = consecutiveLosses
        }
      }
    })

    const returns = sorted.map(t => getProfit(t))
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0

    return {
      maxDrawdown,
      maxDrawdownPercent,
      currentDrawdown,
      peakEquity: peak,
      recoveryFactor,
      riskRewardRatio,
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
      sharpeRatio
    }
  }, [trades])

  return (
    <div className="dash-card">
      <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 'bold', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
        リスク管理
        <HelpIcon text="リスク管理に関する統計情報です。最大ドローダウン、リスクリワード比などを確認できます。" />
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="kpi-title">最大ドローダウン</div>
          <div className="kpi-value" style={{ color: 'var(--loss)' }}>
            {formatJPY(stats.maxDrawdown)}
            <span className="kpi-unit">円</span>
          </div>
          <div className="kpi-desc">
            {stats.maxDrawdownPercent.toFixed(1)}%
          </div>
        </div>

        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="kpi-title">現在のDD</div>
          <div className="kpi-value" style={{ color: stats.currentDrawdown > 0 ? 'var(--warning)' : 'var(--gain)' }}>
            {formatJPY(stats.currentDrawdown)}
            <span className="kpi-unit">円</span>
          </div>
        </div>

        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="kpi-title">最高資産</div>
          <div className="kpi-value" style={{ color: 'var(--gain)' }}>
            {formatJPY(stats.peakEquity)}
            <span className="kpi-unit">円</span>
          </div>
        </div>

        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="kpi-title">リカバリーファクター</div>
          <div className="kpi-value" style={{ color: stats.recoveryFactor >= 2 ? 'var(--gain)' : stats.recoveryFactor >= 1 ? 'var(--ink)' : 'var(--loss)' }}>
            {stats.recoveryFactor === Infinity ? '∞' : stats.recoveryFactor.toFixed(2)}
          </div>
        </div>

        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="kpi-title">
            リスクリワード比
            <HelpIcon text="平均利益÷平均損失の比率です。2.0以上が優秀、1.0以上が良好、1.0未満は要改善です。" />
          </div>
          <div className="kpi-value" style={{ color: stats.riskRewardRatio >= 2 ? 'var(--gain)' : stats.riskRewardRatio >= 1 ? 'var(--accent)' : 'var(--loss)' }}>
            {stats.riskRewardRatio === Infinity ? '∞' : stats.riskRewardRatio.toFixed(2)}
          </div>
        </div>

        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="kpi-title">最大連勝</div>
          <div className="kpi-value" style={{ color: 'var(--gain)' }}>
            {stats.consecutiveWins}
            <span className="kpi-unit">回</span>
          </div>
        </div>

        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="kpi-title">最大連敗</div>
          <div className="kpi-value" style={{ color: 'var(--loss)' }}>
            {stats.consecutiveLosses}
            <span className="kpi-unit">回</span>
          </div>
        </div>

        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="kpi-title">
            シャープレシオ
            <HelpIcon text="リスク1単位あたりのリターンを示す指標です。1.0以上が良好、0以上が普通、マイナスは損失状態です。" />
          </div>
          <div className="kpi-value" style={{ color: stats.sharpeRatio >= 1 ? 'var(--gain)' : stats.sharpeRatio >= 0 ? 'var(--accent)' : 'var(--loss)' }}>
            {stats.sharpeRatio.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}
