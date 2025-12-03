import React, { useRef, useEffect } from 'react';
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
          scores.entry_skill,
          scores.drawdown_control,
          scores.risk_reward,
          scores.risk_management,
          scores.profit_stability,
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
          backdropColor: 'transparent',
          font: {
            size: 11,
          },
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
            size: 11,
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
      borderRadius: 12,
      padding: 16,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--ink)',
        }}>
          評価スコア レーダーチャート
        </h3>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            fontSize: 12,
            cursor: 'pointer',
            padding: 4,
          }}
          title="5つの評価軸でトレーディングスキルを総合的に分析します"
        >
          ?
        </button>
      </div>

      <div style={{
        width: '100%',
        padding: '10px 0',
      }}>
        <Radar data={data} options={options} />
      </div>
    </div>
  );
};
