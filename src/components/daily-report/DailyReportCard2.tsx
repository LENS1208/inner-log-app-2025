import React, { useEffect, useRef } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import type { DailyReportData } from '../../types/daily-report-card.types';

interface Props {
  data: DailyReportData;
}

export const DailyReportCard2: React.FC<Props> = ({ data }) => {
  const equityChartData = {
    labels: data.equityData.map(d => d.time),
    datasets: [
      {
        label: '累積損益',
        data: data.equityData.map(d => d.equity),
        borderColor: '#0084c7',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(0, 132, 199, 0.3)');
          gradient.addColorStop(1, 'rgba(0, 132, 199, 0.01)');
          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6
      }
    ]
  };

  const equityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13
        },
        bodyFont: {
          size: 12
        },
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return `損益: ${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#64748b'
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(203, 213, 225, 0.3)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#64748b',
          callback: (value: number) => {
            return new Intl.NumberFormat('ja-JP', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value);
          }
        }
      }
    }
  };

  const pairChartData = {
    labels: data.pairProfitData.map(d => d.pair),
    datasets: [
      {
        data: data.pairProfitData.map(d => d.profit),
        backgroundColor: data.pairProfitData.map(d =>
          d.profit >= 0 ? 'rgba(0, 132, 199, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ),
        borderColor: data.pairProfitData.map(d =>
          d.profit >= 0 ? '#0084c7' : '#ef4444'
        ),
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const sessionChartData = {
    labels: data.sessionProfitData.map(d => d.session),
    datasets: [
      {
        data: data.sessionProfitData.map(d => d.profit),
        backgroundColor: data.sessionProfitData.map(d =>
          d.profit >= 0 ? 'rgba(0, 132, 199, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ),
        borderColor: data.sessionProfitData.map(d =>
          d.profit >= 0 ? '#0084c7' : '#ef4444'
        ),
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 8,
        titleFont: {
          size: 11
        },
        bodyFont: {
          size: 10
        },
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return `${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          },
          color: '#64748b'
        }
      },
      y: {
        grid: {
          color: 'rgba(203, 213, 225, 0.3)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 10
          },
          color: '#64748b',
          callback: (value: number) => {
            return new Intl.NumberFormat('ja-JP', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value);
          }
        }
      }
    }
  };

  return (
    <div style={{
      width: 900,
      height: 1200,
      background: '#fafbfc',
      borderRadius: 8,
      padding: 40,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      position: 'relative'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0084c7 0%, #0084c7 100%)',
        color: '#ffffff',
        padding: '24px 32px',
        borderRadius: 8,
        marginBottom: 24
      }}>
        <div style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 4,
          letterSpacing: '-0.01em'
        }}>
          Today's Trading Activity
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 500,
          opacity: 0.95,
          letterSpacing: '0.01em'
        }}>
          {data.date}
        </div>
      </div>

      <div style={{
        background: '#ffffff',
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: 16,
          letterSpacing: '-0.01em'
        }}>
          損益推移
        </div>
        <div style={{ height: 400 }}>
          <Line data={equityChartData} options={equityChartOptions} />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        flex: 1
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: 20,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#0f172a',
            marginBottom: 12,
            letterSpacing: '-0.01em'
          }}>
            通貨ペア別損益
          </div>
          <div style={{ height: 220 }}>
            <Bar data={pairChartData} options={barChartOptions} />
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: 20,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#0f172a',
            marginBottom: 12,
            letterSpacing: '-0.01em'
          }}>
            時間帯別損益
          </div>
          <div style={{ height: 220 }}>
            <Bar data={sessionChartData} options={barChartOptions} />
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 20,
        marginTop: 20,
        borderTop: '1px solid #e2e8f0'
      }}>
        {data.showUsername && data.username ? (
          <div style={{
            fontSize: 14,
            color: '#64748b',
            fontWeight: 500
          }}>
            @{data.username}
          </div>
        ) : (
          <div />
        )}

        {data.showBrokerLink && data.brokerName ? (
          <div style={{
            fontSize: 14,
            color: '#0084c7',
            fontWeight: 600,
            textDecoration: 'underline'
          }}>
            {data.brokerName}
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
