import React from 'react';
import type { EvaluationDetails } from '../../utils/monthly-evaluation';
import { HelpIcon } from '../common/HelpIcon';

interface EvaluationDetailsGridProps {
  details: EvaluationDetails;
}

interface DetailCardProps {
  title: string;
  score: number;
  items: Array<{ label: string; value: string | number }>;
  helpText: string;
}

const DetailCard: React.FC<DetailCardProps> = ({ title, score, items, helpText }) => {
  // Clamp score between 0 and 10
  const clampedScore = Math.max(0, Math.min(10, score));

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h4 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 'bold',
            color: 'var(--muted)',
          }}>
            {title}
          </h4>
          <HelpIcon text={helpText} />
        </div>
        <div style={{
          fontSize: 24,
          fontWeight: 900,
          color: 'var(--accent)',
        }}>
          {clampedScore.toFixed(1)}
        </div>
      </div>

      {items.map((item, idx) => (
        <div key={idx} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: idx === 0 ? 8 : 0,
          borderTop: idx === 0 ? '1px solid var(--line)' : 'none',
        }}>
          <span style={{
            fontSize: 14,
            color: 'var(--muted)',
          }}>
            {item.label}：
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ink)',
          }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const EvaluationDetailsGrid: React.FC<EvaluationDetailsGridProps> = ({ details }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <h3 style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 'bold',
          color: 'var(--muted)',
        }}>
          スコア詳細
        </h3>
        <HelpIcon text="各評価軸の詳細スコアと根拠となる具体的な数値を表示しています。これらの指標を改善することで、総合評価スコアの向上につながります。" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12,
      }}>
        <DetailCard
          title="エントリー技術"
          score={details.entry_skill.win_rate / 10}
          helpText="エントリーの精度を評価します。勝率が高いほど、適切なタイミングでポジションを取れていることを示します。セッション適合率は、取引時間帯の選択が適切かを評価します。"
          items={[
            { label: '勝率', value: `${details.entry_skill.win_rate.toFixed(1)}%` },
            { label: 'セッション適合率', value: `${details.entry_skill.session_match_rate}点` },
            { label: '総合判定', value: details.entry_skill.overall_rating },
          ]}
        />

        <DetailCard
          title="ドローダウン耐性"
          score={10 - (details.drawdown_control.dd_ratio / 2)}
          helpText="資金の減少にどれだけ耐えられるかを評価します。最大DDは資金の最大下落額、DD率は総資金に対する割合です。回復力は損失からの立ち直りの早さを示します。"
          items={[
            { label: '最大DD', value: `¥${details.drawdown_control.max_dd.toLocaleString()}` },
            { label: 'DD率', value: `${details.drawdown_control.dd_ratio.toFixed(1)}%` },
            { label: '回復力', value: details.drawdown_control.recovery },
          ]}
        />

        <DetailCard
          title="リスクリワード力"
          score={details.risk_reward.rr_ratio * 3}
          helpText="利益と損失のバランスを評価します。RR比（リスクリワード比）が1.0以上であれば、勝った時の利益が負けた時の損失より大きいことを意味し、理想的です。"
          items={[
            { label: 'RR比', value: details.risk_reward.rr_ratio.toFixed(2) },
            { label: '平均利益', value: `¥${details.risk_reward.avg_profit.toLocaleString()}` },
            { label: '平均損失', value: `¥${details.risk_reward.avg_loss.toLocaleString()}` },
          ]}
        />

        <DetailCard
          title="リスク管理力"
          score={details.risk_management.loss_cut_rate / 10}
          helpText="リスクをコントロールできているかを評価します。損切り徹底度が高いほど、計画的に損失を限定できています。最大損失が管理できる範囲内であることが重要です。"
          items={[
            { label: '損切り徹底度', value: `${details.risk_management.loss_cut_rate.toFixed(1)}%` },
            { label: '最大損失', value: `¥${details.risk_management.max_loss.toLocaleString()}` },
            { label: 'リスク管理', value: details.risk_management.risk_rating },
          ]}
        />

        <DetailCard
          title="収益安定力"
          score={(details.profit_stability.monthly_positive_rate / 100) * 10}
          helpText="継続的に利益を出せているかを評価します。月次安定度は毎月の収益の安定性、プラス月率は利益が出た月の割合を示します。安定した収益が理想的です。"
          items={[
            { label: '月次安定度', value: `${details.profit_stability.monthly_positive_rate.toFixed(1)}%` },
            { label: '平均月利', value: `¥${details.profit_stability.avg_monthly_profit.toLocaleString()}` },
            { label: 'プラス月率', value: `${details.profit_stability.positive_months_ratio.toFixed(1)}%` },
          ]}
        />
      </div>
    </div>
  );
};
