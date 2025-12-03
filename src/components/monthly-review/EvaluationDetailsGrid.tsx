import React from 'react';
import type { EvaluationDetails } from '../../utils/monthly-evaluation';

interface EvaluationDetailsGridProps {
  details: EvaluationDetails;
}

interface DetailCardProps {
  title: string;
  score: number;
  items: Array<{ label: string; value: string | number }>;
}

const DetailCard: React.FC<DetailCardProps> = ({ title, score, items }) => {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 6,
      padding: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
      }}>
        <h4 style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--ink)',
        }}>
          {title}
        </h4>
        <div style={{
          fontSize: 18,
          fontWeight: 900,
          color: 'var(--accent)',
        }}>
          {score.toFixed(1)}
        </div>
      </div>

      {items.map((item, idx) => (
        <div key={idx} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 4,
          borderTop: idx === 0 ? '1px solid var(--line)' : 'none',
        }}>
          <span style={{
            fontSize: 10,
            color: 'var(--muted)',
          }}>
            {item.label}：
          </span>
          <span style={{
            fontSize: 10,
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
    <div>
      <h3 style={{
        margin: '0 0 12px 0',
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--ink)',
      }}>
        スコア詳細（全期間総合評価）
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, auto)',
        gap: 8,
      }}>
        <DetailCard
          title="エントリー技術"
          score={details.entry_skill.win_rate / 10}
          items={[
            { label: '勝率', value: `${details.entry_skill.win_rate.toFixed(1)}%` },
            { label: 'セッション適合率', value: `${details.entry_skill.session_match_rate}点` },
            { label: '総合判定', value: details.entry_skill.overall_rating },
          ]}
        />

        <DetailCard
          title="ドローダウン耐性"
          score={10 - (details.drawdown_control.dd_ratio / 2)}
          items={[
            { label: '最大DD', value: `¥${details.drawdown_control.max_dd.toLocaleString()}` },
            { label: 'DD率', value: `${details.drawdown_control.dd_ratio.toFixed(1)}%` },
            { label: '回復力', value: details.drawdown_control.recovery },
          ]}
        />

        <DetailCard
          title="リスクリワード力"
          score={details.risk_reward.rr_ratio * 3}
          items={[
            { label: 'RR比', value: details.risk_reward.rr_ratio.toFixed(2) },
            { label: '平均利益', value: `¥${details.risk_reward.avg_profit.toLocaleString()}` },
            { label: '平均損失', value: `¥${details.risk_reward.avg_loss.toLocaleString()}` },
          ]}
        />

        <DetailCard
          title="リスク管理力"
          score={details.risk_management.loss_cut_rate / 10}
          items={[
            { label: '損切り徹底度', value: `${details.risk_management.loss_cut_rate.toFixed(1)}%` },
            { label: '最大損失', value: `¥${details.risk_management.max_loss.toLocaleString()}` },
            { label: 'リスク管理', value: details.risk_management.risk_rating },
          ]}
        />

        <DetailCard
          title="収益安定力"
          score={(details.profit_stability.monthly_positive_rate / 100) * 10}
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
