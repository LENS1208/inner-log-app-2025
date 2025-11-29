import React, { useMemo } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import type { TradeMetrics } from '../../types/evaluation.types';
import { generateAlerts } from '../../utils/recommendations';
import { HelpIcon } from '../common/HelpIcon';

type Props = {
  metrics?: TradeMetrics;
};

type Goal = {
  name: string;
  target: number;
  actual: number;
  unit: string;
};

export default function AlertsRulesSection({ metrics }: Props) {
  const alerts = useMemo(() => {
    return metrics ? generateAlerts(metrics) : [];
  }, [metrics]);

  const goals: Goal[] = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'PF', target: 1.2, actual: metrics.pf, unit: '' },
      { name: 'DD', target: -8, actual: -metrics.maxdd, unit: '%' },
      { name: '勝率', target: 50, actual: metrics.winrate * 100, unit: '%' },
    ];
  }, [metrics]);

  if (!metrics) {
    return (
      <section className="panel" id="sec10">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            注意・ルール（アラート&目標）
            <HelpIcon text="ルール違反のアラート、目標達成状況、進捗率を表示します。自分のルール遵守状況を確認できます。" />
          </h3>
        </div>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
      </section>
    );
  }

  return (
    <section className="panel" id="sec10">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          注意・ルール（アラート&目標）
          <HelpIcon text="アラート、目標進捗を表示します。" />
        </h3>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>アラート</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.length === 0 ? (
                <div style={{ padding: 16, border: '1px solid var(--accent)', borderRadius: 8, background: getAccentColor(0.1), color: getAccentColor(), fontSize: 13 }}>✓ アラートなし</div>
              ) : (
                alerts.map((alert, idx) => {
                  const borderColor = alert.type === 'danger' ? getLossColor() : getAccentColor();
                  const bgColor = alert.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : getAccentColor(0.1);
                  const icon = alert.type === 'danger' ? '🔴' : '⚠️';
                  return (
                    <div key={idx} style={{ padding: 12, border: `1px solid ${borderColor}`, borderRadius: 8, background: bgColor, fontSize: 13 }}>
                      {icon} {alert.message}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>目標進捗</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {goals.map((goal, idx) => {
                const progress = goal.name === 'DD' ? Math.min(100, Math.max(0, ((goal.target - goal.actual) / goal.target) * 100)) : Math.min(100, Math.max(0, (goal.actual / goal.target) * 100));
                const achieved = goal.name === 'DD' ? goal.actual > goal.target : goal.actual >= goal.target;
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span>{goal.name}</span>
                      <span style={{ fontWeight: 600 }}>{goal.actual.toFixed(1)}{goal.unit} / {goal.target}{goal.unit}</span>
                    </div>
                    <div style={{ height: 24, background: 'var(--chip)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${Math.abs(progress)}%`, height: '100%', background: achieved ? getAccentColor() : getAccentColor(), transition: 'width 0.3s ease' }} />
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 11, fontWeight: 700, color: progress > 50 ? '#fff' : 'var(--ink)' }}>
                        {Math.abs(progress).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
