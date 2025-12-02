import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { DailyReportCard1 } from './DailyReportCard1';
import { DailyReportCard2 } from './DailyReportCard2';
import type { DailyReportData } from '../../types/daily-report-card.types';

interface Props {
  data: DailyReportData;
}

export const DailyReportCardGenerator: React.FC<Props> = ({ data }) => {
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const exportCardToPNG = async (cardRef: React.RefObject<HTMLDivElement>, cardName: string) => {
    if (!cardRef.current) return;

    setIsExporting(true);
    setExportStatus(`${cardName}を生成中...`);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#fafbfc',
        scale: 2,
        width: 900,
        height: 1200,
        windowWidth: 900,
        windowHeight: 1200,
        logging: false,
        useCORS: true
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${cardName}_${data.date.replace(/\//g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setExportStatus(`${cardName}をダウンロードしました`);
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus(`エラー: ${cardName}の生成に失敗しました`);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportStatus('');
      }, 2000);
    }
  };

  const exportBothCards = async () => {
    setIsExporting(true);
    await exportCardToPNG(card1Ref, 'daily-report-card-1');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await exportCardToPNG(card2Ref, 'daily-report-card-2');
  };

  return (
    <div style={{
      width: '100%',
      padding: 40,
      background: 'var(--bg)'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        <div style={{
          marginBottom: 32,
          padding: 24,
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--line)'
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 16
          }}>
            日次レポートカード生成
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--muted)',
            marginBottom: 20
          }}>
            SNS投稿用の日次レポートカードを生成します（900×1200px）
          </p>

          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => exportCardToPNG(card1Ref, 'daily-report-card-1')}
              disabled={isExporting}
              style={{
                padding: '12px 24px',
                background: isExporting ? 'var(--button-disabled-bg)' : 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              カード1をダウンロード
            </button>

            <button
              onClick={() => exportCardToPNG(card2Ref, 'daily-report-card-2')}
              disabled={isExporting}
              style={{
                padding: '12px 24px',
                background: isExporting ? 'var(--button-disabled-bg)' : 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              カード2をダウンロード
            </button>

            <button
              onClick={exportBothCards}
              disabled={isExporting}
              style={{
                padding: '12px 24px',
                background: isExporting ? 'var(--button-disabled-bg)' : '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              両方をダウンロード
            </button>
          </div>

          {exportStatus && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              borderRadius: 6,
              color: 'var(--accent)',
              fontSize: 13,
              fontWeight: 500
            }}>
              {exportStatus}
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(900px, 1fr))',
          gap: 40,
          justifyItems: 'center'
        }}>
          <div>
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 16
            }}>
              カード1: 日次数字
            </h3>
            <div ref={card1Ref}>
              <DailyReportCard1 data={data} />
            </div>
          </div>

          <div>
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 16
            }}>
              カード2: 日次チャート
            </h3>
            <div ref={card2Ref}>
              <DailyReportCard2 data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
