import React, { useState, useEffect, useMemo } from 'react';
import type { TradeRow, TradeMetrics } from '../types/evaluation.types';
import { scoreFromMetrics } from '../utils/evaluation-score';
import OverallScore from '../components/evaluation/OverallScore';
import { EvaluationRadarChart } from '../components/evaluation/EvaluationRadarChart';
import { getDataMetrics, getDataRows, INIT_CAPITAL } from '../services/demoData';
import { useDataset } from '../lib/dataset.context';
import { useAICoaching } from '../lib/aiCoaching.context';
import { computeMetrics } from '../utils/evaluation-metrics';
import { HelpIcon } from '../components/common/HelpIcon';
import { CoachingSheetView } from '../components/ai-coaching/CoachingSheetView';
import type { AIResponse } from '../services/ai-coaching/types';
import '../styles/journal-notebook.css';

type TabKey = "overview" | "strengths" | "weaknesses" | "trends";

export default function AiEvaluationPage() {
  const { dataset, useDatabase, isInitialized } = useDataset();
  const { currentTask, startGeneration, getResult, isGenerating, clearResult, loadCachedResult } = useAICoaching();
  const [dataRows, setDataRows] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const datasetKey = dataset || 'all';
  const coachingData = getResult(datasetKey);
  const generating = isGenerating(datasetKey);

  useEffect(() => {
    if (coachingData?.sheet) {
      setActiveTab("overview");
    }
  }, [coachingData?.sheet]);

  useEffect(() => {
    if (!isInitialized) return;

    setLoading(true);
    (async () => {
      try {
        console.log('🔍 データ取得開始:', { useDatabase, dataset, isInitialized });
        const rows = await getDataRows(useDatabase, dataset);
        console.log('📥 取得したトレード件数:', rows.length);
        if (rows.length === 0) {
          console.warn('⚠️ トレードデータが0件です。ボタンが無効化されます。');
          console.warn('⚠️ useDatabase:', useDatabase, 'dataset:', dataset);
        }
        console.log('📥 最初のトレードデータサンプル:', rows[0]);
        setDataRows(rows);

        await loadCachedResult(datasetKey);
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    })();
    // loadCachedResultは依存配列に含めない（無限ループを防ぐため）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, useDatabase, isInitialized, datasetKey]);


  const baseMetrics = useMemo<TradeMetrics>(() => {
    if (dataRows.length === 0) {
      return {
        trades: 0,
        winrate: 0,
        pf: 0,
        pipsSum: 0,
        equity: [],
        maxdd: 0,
        pnls: [],
        pipsArr: [],
      };
    }
    return computeMetrics(dataRows);
  }, [dataRows]);

  const scoreData = useMemo(() => {
    return scoreFromMetrics(baseMetrics, 'capital', INIT_CAPITAL);
  }, [baseMetrics]);


  if (!isInitialized || loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        fontSize: 16,
        color: 'var(--muted)'
      }}>
        データを読み込んでいます...
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "あなたの総評" },
    { key: "strengths", label: "強み・特徴" },
    { key: "weaknesses", label: "弱み・改善点" },
    { key: "trends", label: "傾向と目標" },
  ];

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .eval-grid-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          min-width: 0;
        }

        @media (min-width: 768px) {
          .eval-grid-2col {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
        }

        .panel {
          min-width: 0;
        }

        .panel > div {
          min-width: 0;
        }

        .overall-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }

        @media (min-width: 640px) {
          .overall-grid {
            grid-template-columns: 140px 1fr;
          }
        }

        @media (min-width: 1024px) {
          .overall-grid {
            grid-template-columns: 140px 280px 1fr 1fr;
          }
        }

        .overall-section {
          padding-left: 0;
          border-left: none;
        }

        @media (min-width: 1024px) {
          .overall-section {
            padding-left: 16px;
            border-left: 1px solid var(--line);
          }
        }

        @media (max-width: 639px) {
          .overall-grid > div:first-child {
            max-width: 200px;
            margin: 0 auto;
          }
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-bottom: 1px solid var(--line);
          gap: 12px;
        }

        @media (max-width: 640px) {
          .panel-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .panel-header .badge {
            align-self: flex-start;
          }
        }
      `}</style>

      <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
        {!coachingData ? (
          <section className="panel">
            <div className="panel-header">
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                AIコーチング
                <HelpIcon text="取引データを分析し、AIがパーソナライズされたコーチングを提供します。" />
              </h3>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
                  取引データを分析して、パーソナライズされたコーチングシートを生成します。
                </p>
                {error && (
                  <p style={{ fontSize: '13px', color: 'var(--loss)', marginBottom: '16px', padding: '12px', background: 'var(--loss-bg)', borderRadius: '6px' }}>
                    {error}
                  </p>
                )}
                {generating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--button-primary-bg)',
                        borderRadius: '50%',
                        opacity: 0.1,
                        animation: 'pulse 2s ease-in-out infinite'
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          background: 'var(--button-primary-bg)',
                          borderRadius: '50%',
                          animation: 'float 1.4s ease-in-out infinite',
                          animationDelay: '0s'
                        }} />
                        <div style={{
                          width: '12px',
                          height: '12px',
                          background: 'var(--button-primary-bg)',
                          borderRadius: '50%',
                          animation: 'float 1.4s ease-in-out infinite',
                          animationDelay: '0.2s'
                        }} />
                        <div style={{
                          width: '12px',
                          height: '12px',
                          background: 'var(--button-primary-bg)',
                          borderRadius: '50%',
                          animation: 'float 1.4s ease-in-out infinite',
                          animationDelay: '0.4s'
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '8px', fontWeight: 500 }}>
                        AI が分析中です
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                        数分かかる場合があります。
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        お待ちの間、他のページに移動しても生成は継続されます。
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      setError(null);
                      try {
                        await startGeneration(datasetKey, dataRows);
                      } catch (error) {
                        console.error('コーチング生成エラー:', error);
                        setError('AIコーチングの生成中にエラーが発生しました。');
                      }
                    }}
                    disabled={dataRows.length === 0}
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: dataRows.length === 0 ? 'var(--button-disabled-text)' : 'var(--button-primary-text)',
                      background: dataRows.length === 0 ? 'var(--button-disabled-bg)' : 'var(--button-primary-bg)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: dataRows.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    AIコーチングを生成
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : coachingData?.sheet ? (
          <>
            {/* タブナビゲーション */}
            <nav
              style={{
                display: "flex",
                gap: 4,
                borderBottom: "1px solid var(--line)",
                marginBottom: 20,
                overflowX: "auto",
                background: "var(--surface)",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 4, flex: 1 }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: "12px 20px",
                      textDecoration: "none",
                      color: activeTab === tab.key ? "var(--accent)" : "var(--ink)",
                      borderTop: "none",
                      borderLeft: "none",
                      borderRight: "none",
                      borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                      fontWeight: activeTab === tab.key ? 600 : 400,
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      background: activeTab === tab.key ? "var(--chip)" : "transparent",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  clearResult(datasetKey);
                  setError(null);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: 'var(--button-secondary-text)',
                  background: 'var(--button-secondary-bg)',
                  border: '1px solid var(--button-secondary-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginRight: '8px',
                  whiteSpace: "nowrap",
                }}
              >
                再生成
              </button>
            </nav>

            {/* コンテンツ */}
            <CoachingSheetView
              sheet={coachingData.sheet}
              activeTab={activeTab}
              radarComponent={
                coachingData.sheet.evaluationScore ? (
                  <EvaluationRadarChart
                    parts={[
                      { label: 'エントリー', value: coachingData.sheet.evaluationScore.entryTiming },
                      { label: 'リスク管理', value: coachingData.sheet.evaluationScore.riskManagement },
                      { label: '損切り・利確', value: coachingData.sheet.evaluationScore.exitStrategy },
                      { label: '感情制御', value: coachingData.sheet.evaluationScore.emotionalControl },
                      { label: '一貫性', value: coachingData.sheet.evaluationScore.consistency },
                    ]}
                    centerScore={coachingData.sheet.evaluationScore.overall}
                  />
                ) : null
              }
            />
          </>
        ) : (
          <section style={{ background: 'var(--card)', padding: '24px', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
                データの読み込み中にエラーが発生しました
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
