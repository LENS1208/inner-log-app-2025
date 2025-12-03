import React from 'react';
import { HelpIcon } from '../common/HelpIcon';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import type { EvaluationScore } from '../../utils/monthly-evaluation';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface EvaluationRadarChartProps {
  scores: EvaluationScore;
}

export const EvaluationRadarChart: React.FC<EvaluationRadarChartProps> = ({ scores }) => {
  // Clamp all scores between 0 and 10
  const clampScore = (score: number) => Math.max(0, Math.min(10, score));

  const data = {
    labels: [
      'エントリー技術',
      'ドローダウン耐性',
      'リスクリワード力',
      'リスク管理力',
      '収益安定力'
    ],
    datasets: [
      {
        label: '評価スコア',
        data: [
          clampScore(scores.entry_skill),
          clampScore(scores.drawdown_control),
          clampScore(scores.risk_reward),
          clampScore(scores.risk_management),
          clampScore(scores.profit_stability),
        ],
        backgroundColor: 'rgba(0, 132, 199, 0.2)',
        borderColor: 'rgba(0, 132, 199, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0, 132, 199, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(0, 132, 199, 1)',
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          color: 'var(--muted)',
          backdropColor: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 11,
            weight: '600',
          },
          showLabelBackdrop: true,
          backdropPadding: 2,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.2)',
        },
        angleLines: {
          color: 'rgba(128, 128, 128, 0.2)',
        },
        pointLabels: {
          color: 'var(--ink)',
          font: {
            size: 12,
            weight: '600',
          },
          padding: 8,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          label: (context) => {
            return `${context.parsed.r.toFixed(1)} / 10`;
          },
        },
      },
    },
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 10,
      padding: 12,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h3 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 'bold',
            color: 'var(--muted)',
          }}>
            評価スコア レーダーチャート
          </h3>
          <HelpIcon text="5つの評価軸（エントリー技術、ドローダウン耐性、リスクリワード力、リスク管理力、収益安定力）でトレーディングスキルを総合的に分析します。各軸は独立して評価され、バランスの取れた五角形が理想的な形です。" />
        </div>
      </div>

      <div style={{
        width: '100%',
        padding: '8px 0',
      }}>
        <Radar data={data} options={options} />
      </div>
    </div>
  );
};
