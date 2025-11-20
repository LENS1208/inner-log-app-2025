import React from 'react';
import type { CoachingSheet, SummaryCategory } from '../../services/ai-coaching/types';
import { TradeExampleCard } from './TradeExampleCard';
import { StrengthsWeaknessesTable } from './StrengthsWeaknessesTable';
import { RulesTable } from './RulesTable';
import { PlaybookView } from './PlaybookView';
import { DiaryGuideTable } from './DiaryGuideTable';
import { KPITable } from './KPITable';
import { FourWeekPlanTable } from './FourWeekPlanTable';
import { CoachBubble } from './CoachBubble';
import { HelpIcon } from '../common/HelpIcon';

type TabKey = "overview" | "strengths" | "weaknesses" | "trends";

function convertSummaryToCategories(summary: string[]): SummaryCategory[] {
  if (!summary || summary.length === 0) return [];

  const categoryNames = [
    '全体像・取引スタイル',
    'エントリー・タイミング',
    'リスク管理・ポジション管理',
    'メンタル・規律'
  ];

  const itemsPerCategory = Math.ceil(summary.length / categoryNames.length);
  const categories: SummaryCategory[] = [];

  for (let i = 0; i < categoryNames.length; i++) {
    const startIdx = i * itemsPerCategory;
    const endIdx = Math.min(startIdx + itemsPerCategory, summary.length);
    const items = summary.slice(startIdx, endIdx);

    if (items.length > 0) {
      categories.push({
        category: categoryNames[i],
        description: items.join(' ')
      });
    }
  }

  if (categories.length < 3) {
    const allText = summary.join(' ');
    const words = allText.split('。').filter(s => s.trim());
    const wordsPerCat = Math.ceil(words.length / 3);

    categories.length = 0;
    for (let i = 0; i < 3; i++) {
      const start = i * wordsPerCat;
      const end = Math.min(start + wordsPerCat, words.length);
      const text = words.slice(start, end).join('。') + '。';
      if (text.trim() !== '。') {
        categories.push({
          category: categoryNames[i],
          description: text
        });
      }
    }
  }

  return categories;
}

interface CoachingSheetViewProps {
  sheet: CoachingSheet;
  scoreComponent?: React.ReactNode;
  radarComponent?: React.ReactNode;
  activeTab?: TabKey;
}

export function CoachingSheetView({ sheet, scoreComponent, radarComponent, activeTab = "overview" }: CoachingSheetViewProps) {
  if (!sheet || !sheet.summary) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
        データの読み込み中にエラーが発生しました
      </div>
    );
  }

  const goodExamples = sheet.examples?.filter(ex => {
    const note = ex.note || '';
    const isProfit = ex.pnlJPY >= 0;
    return note.includes('良い') ||
           note.includes('好例') ||
           note.includes('成功') ||
           note.includes('綺麗') ||
           note.includes('理想') ||
           note.includes('完璧') ||
           note.includes('適切') ||
           (isProfit && ex.pnlJPY > 10000);
  }) || [];

  const badExamples = sheet.examples?.filter(ex => {
    const note = ex.note || '';
    const isProfit = ex.pnlJPY >= 0;
    return note.includes('改善') ||
           note.includes('課題') ||
           note.includes('注意') ||
           note.includes('反省') ||
           note.includes('過大') ||
           note.includes('逆張り') ||
           note.includes('大きすぎ') ||
           note.includes('ロット大') ||
           (!isProfit && ex.pnlJPY < -10000);
  }) || [];

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <style>{`
        .coaching-top-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (min-width: 640px) {
          .coaching-top-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .trade-examples-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .trade-examples-grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 16px;
          }
        }
        .summary-category-card {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .summary-category-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* 総評タブ */}
      {activeTab === "overview" && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px',
            alignItems: 'start'
          }}>
            <style>{`
              @media (min-width: 1024px) {
                .overview-layout {
                  grid-template-columns: 30% 1fr !important;
                }
              }
            `}</style>
            <div className="overview-layout" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '16px',
              alignItems: 'start'
            }}>
              {radarComponent && (
                <Section title="総合評価" helpText="AIがあなたの取引パフォーマンスを多角的に評価した結果です。">
                  {radarComponent}
                </Section>
              )}

              {(sheet.summaryCategories && Array.isArray(sheet.summaryCategories) && sheet.summaryCategories.length > 0) || (sheet.summary && Array.isArray(sheet.summary) && sheet.summary.length > 0) ? (
                <div>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: 15,
                    fontWeight: 'bold',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    現状サマリー
                    <HelpIcon text="あなたの取引スタイルと現在の状況を重要なカテゴリーごとに分析しています。" />
                  </h3>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {(sheet.summaryCategories && sheet.summaryCategories.length > 0 ? sheet.summaryCategories : convertSummaryToCategories(sheet.summary || [])).map((cat, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          padding: '16px',
                        }}
                      >
                        <h4 style={{
                          margin: '0 0 8px 0',
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--ink)',
                        }}>
                          {cat.category}
                        </h4>
                        <p style={{
                          margin: 0,
                          fontSize: '16px',
                          lineHeight: 1.8,
                          color: 'var(--ink)',
                          fontWeight: 500
                        }}>
                          {cat.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {sheet.kpis && Array.isArray(sheet.kpis) && sheet.kpis.length > 0 && (
            <Section title="KPI（数値で見る改善指標）" helpText="目標達成のために追跡すべき重要な数値指標です。">
              {sheet.kpisComment && <CoachBubble message={sheet.kpisComment} />}
              <KPITable kpis={sheet.kpis} />
            </Section>
          )}

          {sheet.coachingMessage && Array.isArray(sheet.coachingMessage) && sheet.coachingMessage.length > 0 && (
            <Section title="コーチングメッセージ" helpText="AIコーチからのパーソナルメッセージです。">
              {sheet.coachingMessage.map((text, i) => (
                <p key={i} style={{ margin: '0 0 12px 0', fontSize: '15px', lineHeight: 1.7, color: 'var(--ink)' }}>
                  {text}
                </p>
              ))}
            </Section>
          )}

          {sheet.nextSteps && Array.isArray(sheet.nextSteps) && sheet.nextSteps.length > 0 && (
            <footer
              style={{
                padding: '16px',
                background: 'var(--chip)',
                borderRadius: '8px',
                fontSize: '14px',
                color: 'var(--ink)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '15px' }}>次のステップ提案：</div>
              <div>{sheet.nextSteps.join(' / ')}</div>
            </footer>
          )}
        </>
      )}

      {/* 強みタブ */}
      {activeTab === "strengths" && (
        <>
          {sheet.strengthsWeaknesses && Array.isArray(sheet.strengthsWeaknesses) && sheet.strengthsWeaknesses.length > 0 && (
            <Section title="あなたの強み" helpText="取引における優れている点と活かし方を分析しています。">
              {sheet.strengthsWeaknessesComment && <CoachBubble message={sheet.strengthsWeaknessesComment} />}
              <StrengthsWeaknessesTable
                rows={sheet.strengthsWeaknesses}
                evaluationScore={sheet.evaluationScore}
                focusMode="strengths"
              />
            </Section>
          )}

          {goodExamples.length > 0 && (
            <Section title="成功トレード事例" helpText="学びに繋がる良いトレード事例を抽出しました。">
              <div className="trade-examples-grid">
                {goodExamples.map((ex, i) => (
                  <TradeExampleCard key={i} ex={ex} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* 弱みタブ */}
      {activeTab === "weaknesses" && (
        <>
          {sheet.strengthsWeaknesses && Array.isArray(sheet.strengthsWeaknesses) && sheet.strengthsWeaknesses.length > 0 && (
            <Section title="改善すべき課題" helpText="取引における弱点と具体的な改善策を提案します。">
              {sheet.strengthsWeaknessesComment && <CoachBubble message={sheet.strengthsWeaknessesComment} />}
              <StrengthsWeaknessesTable
                rows={sheet.strengthsWeaknesses}
                evaluationScore={sheet.evaluationScore}
                focusMode="weaknesses"
              />
            </Section>
          )}

          {badExamples.length > 0 && (
            <Section title="改善すべきトレード事例" helpText="課題が見られたトレード事例を分析します。">
              <div className="trade-examples-grid">
                {badExamples.map((ex, i) => (
                  <TradeExampleCard key={i} ex={ex} />
                ))}
              </div>
            </Section>
          )}

          {sheet.rules && Array.isArray(sheet.rules) && sheet.rules.length > 0 && (
            <Section title="改善のための5ルール" helpText="今すぐ実践できる具体的なトレードルールを提案します。" comment={sheet.rulesComment}>
              <RulesTable rules={sheet.rules} />
            </Section>
          )}
        </>
      )}

      {/* 傾向タブ */}
      {activeTab === "trends" && (
        <>
          {sheet.playbook && typeof sheet.playbook === 'object' && (
            <Section title="プレイブック（戦略型）" helpText="セットアップごとの勝率や統計データから最適な戦略を導きます。" comment={sheet.playbookComment}>
              <PlaybookView playbook={sheet.playbook} />
            </Section>
          )}

          {sheet.fourWeekPlan && Array.isArray(sheet.fourWeekPlan) && sheet.fourWeekPlan.length > 0 && (
            <Section title="4週間リセットプラン" helpText="段階的にスキルアップするための4週間の実践プランです。">
              {sheet.fourWeekPlanComment && <CoachBubble message={sheet.fourWeekPlanComment} />}
              <FourWeekPlanTable weeks={sheet.fourWeekPlan} />
            </Section>
          )}

          {sheet.diaryGuide && sheet.diaryGuide.rows && Array.isArray(sheet.diaryGuide.rows) && sheet.diaryGuide.rows.length > 0 && (
            <Section title="オンライン日記の活用法" helpText="トレード日記を効果的に活用するための具体的なアドバイスです。">
              {sheet.diaryGuide.comment && <CoachBubble message={sheet.diaryGuide.comment} />}
              <DiaryGuideTable rows={sheet.diaryGuide.rows} />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  helpText?: string;
  comment?: string;
  children: React.ReactNode;
}

function Section({ title, helpText, comment, children }: SectionProps) {
  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        padding: '12px',
        height: '100%',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: 15,
          fontWeight: 'bold',
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {title}
        {helpText && <HelpIcon text={helpText} />}
      </h3>
      {comment && (
        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: '16px',
            lineHeight: 1.8,
            color: 'var(--ink)',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--line)',
            fontWeight: 500,
          }}
        >
          {comment}
        </p>
      )}
      {children}
    </section>
  );
}
