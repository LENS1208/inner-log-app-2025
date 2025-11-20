import systemPrompt from './SYSTEM_PROMPT.txt?raw';
import { analyzeUserProfile, recommendCategories } from './analyzeUserProfile';

export const SYSTEM_TXT = systemPrompt;

export interface PromptInput {
  tradesJson: any;
  dateRangeHint?: string;
  focusHint?: string;
}

export function buildPrompt(input: PromptInput): string {
  const trades = input.tradesJson.trades || [];
  const summary = input.tradesJson.summary || {};

  // ユーザープロファイルを分析
  const profile = analyzeUserProfile(input.tradesJson);
  const categoryRec = recommendCategories(profile);

  const actualExamples = trades.slice(0, 10).map((t: any, i: number) =>
    `${i + 1}. ticket:${t.ticket}, date:${t.closeDate}, symbol:${t.symbol}, side:${t.side}, lots:${t.lots}, profit:${t.profit}円, pips:${t.pips}`
  ).join('\n');

  // カテゴリー推奨リストの文字列化
  const categoryList = categoryRec.categories.map((cat, idx) =>
    `${idx + 1}. **${cat}**: ${categoryRec.categoryDescriptions[cat]}`
  ).join('\n');

  const userTemplate = `
目的：
取引履歴データを分析し、「実例を中心」にした1ページのAIコーチングシートを作成してください。

入力：
- 取引履歴ファイル（JSON要約）：<<TRADES_JSON>>
- 期間メモ：${input.dateRangeHint ?? '（指定なし）'}
- 重点観点：${input.focusHint ?? 'ロット管理と逆張り制御'}

**🎯 現状サマリーのカテゴリー構成（このユーザー専用）**

データ分析の結果、このユーザーには以下のカテゴリー構成が最適です：

${categoryList}

**選定理由**: ${categoryRec.rationale}

**重要指示**:
- 現状サマリーは「summaryCategories」配列として出力してください
- summaryCategories配列には、上記のカテゴリーの中から選ばれた3-4つのカテゴリーを含めてください
- 各カテゴリーは { category: "カテゴリー名", description: "そのカテゴリーについての分析結果（2-4文程度）" } の形式で記述してください
- 従来のsummaryフィールド（string[]）は引き続き互換性のため維持しますが、内容はsummaryCategoriesから自動生成されるため簡潔で構いません

**🚨 絶対に守ること：以下の実際の取引データのみを使用してください 🚨**

実際の取引データのサンプル（最初の10件）：
${actualExamples}

統計サマリー：
- 総取引数: ${summary.totalTrades || 0}
- 勝率: ${(summary.winRate * 100).toFixed(1)}%
- 平均ロット: ${summary.avgLotSize?.toFixed(2) || 0}
- 最大ロット: ${summary.maxLotSize?.toFixed(2) || 0}
- 平均勝ち: ${summary.avgWin?.toFixed(0) || 0}円
- 平均負け: ${summary.avgLoss?.toFixed(0) || 0}円

**重要指示：**
1. 取引例は必ず上記の実際のデータから選択すること
2. 架空の日付（例：2024-10-03）や存在しない通貨ペアを使用しないこと
3. プロンプト内のサンプル例は形式説明のためであり、実際の出力には使用しないこと
4. すべての取引例で実際のticket番号を含めること

出力要件：
- **強みと課題**：必ず以下の5項目を使用（項目名を正確に）
  1. エントリータイミング
  2. リスク管理
  3. 損切り・利確
  4. 感情コントロール
  5. 一貫性・再現性

**重要：書き方のスタイル**
- 各項目は2-3行で簡潔に。詳細な取引情報に引っ張られすぎない
- 強み：良い行動パターンを述べる + 具体例は実際のticket番号と日付で簡潔に
- 改善ポイント：「〜のに、〜」という対比で優しく指摘 + 例は最小限
- コーチコメント：励ましと実践的トレーニング提案（1-2行）
- 「〜が確認できます」ではなく「〜していますね」という対話的表現

- 実例：勝ち×2／負け×2／ロット過大または逆張り×1以上で、合計5〜6のトレード例を必ず含める
- **ロット過大の判定基準（重要）**：
  * tradesJson.summary.avgLotSizeの2倍以上のロット数を使用している取引を「ロット過大」とする
  * 平均ロット=${summary.avgLotSize?.toFixed(2)}の場合、${(summary.avgLotSize * 2)?.toFixed(2)}以上の取引がロット過大
  * 単に損失が大きいだけで、ロット数が平均的な取引は「ロット過大」ではない
  * まず各取引のlotsと平均ロット${summary.avgLotSize?.toFixed(2)}を比較し、2倍以上の取引だけを「ロット過大」と判定する
  * ロット過大の例が見つからない場合は、「逆張り」や「損切り遅延」などの別の改善点を選ぶ
- 実例は実際のtradesJson.trades配列から選び、以下のマッピングで出力：
  * date ← closeDate（実際のデータの値を使用）
  * symbol ← symbol（実際のデータの値を使用）
  * side ← side（実際のデータの値を使用）
  * lots ← lots（実際のデータの値を使用）
  * entry ← openPrice（実際のデータの値を使用）
  * exit ← closePrice（実際のデータの値を使用）
  * pnlJPY ← profit（実際のデータの値を使用）
  * pips ← pips（実際のデータの値を使用）
  * ticket ← ticket（実際のデータの値を使用）
- 強み→具体例→改善の一言 の順
- 口調：優しいコーチ（です・ます調）、「コメント」語は使わない
- 8セクション固定順＋最後に次のステップ提案（1〜2行）

**重要：必ず以下のJSON構造で出力してください。markdown、sheet、metaの3つのトップレベルキーが必須です。**

**🚨 警告：以下は形式例です。日付・通貨ペア・金額は実際のデータから取得してください 🚨**

{
  "markdown": "# FXトレードコーチングシート\\n\\n## 1️⃣ 現状サマリー\\n\\n...(全セクションのMarkdown)",
  "sheet": {
    "summaryComment": "導入コメント",
    "summary": ["サマリー段落1", "サマリー段落2", "サマリー段落3"],
    "summaryCategories": [
      {
        "category": "カテゴリー名1",
        "description": "このカテゴリーに関する分析内容。2-4文程度で具体的に記述。"
      },
      {
        "category": "カテゴリー名2",
        "description": "このカテゴリーに関する分析内容。2-4文程度で具体的に記述。"
      },
      {
        "category": "カテゴリー名3",
        "description": "このカテゴリーに関する分析内容。2-4文程度で具体的に記述。"
      }
    ],
    "examples": [
      {
        "date": "実データのcloseDate",
        "symbol": "実データのsymbol",
        "side": "実データのside",
        "lots": "実データのlots",
        "entry": "実データのopenPrice",
        "exit": "実データのclosePrice",
        "pnlJPY": "実データのprofit",
        "pips": "実データのpips",
        "ticket": "実データのticket",
        "note": "この取引の特徴"
      }
    ],
    "strengthsWeaknessesComment": "強みと課題の導入コメント",
    "strengthsWeaknesses": [
      {
        "item": "エントリータイミング",
        "strength": "良い行動パターンの説明 + 実際のticket番号と日付で具体例",
        "improvement": "改善が必要な点の説明",
        "coachNote": "励ましと実践的アドバイス"
      },
      {
        "item": "リスク管理",
        "strength": "良い行動パターンの説明",
        "improvement": "改善が必要な点 + 実際のticket番号で具体例",
        "coachNote": "励ましと実践的アドバイス"
      },
      {
        "item": "損切り・利確",
        "strength": "良い行動パターンの説明",
        "improvement": "改善が必要な点",
        "coachNote": "励ましと実践的アドバイス"
      },
      {
        "item": "感情コントロール",
        "strength": "良い行動パターンの説明",
        "improvement": "改善が必要な点",
        "coachNote": "励ましと実践的アドバイス"
      },
      {
        "item": "一貫性・再現性",
        "strength": "良い行動パターンの説明",
        "improvement": "改善が必要な点",
        "coachNote": "励ましと実践的アドバイス"
      }
    ],
    "rulesComment": "ルールの導入コメント",
    "rules": [
      {
        "ruleId": "rule1",
        "title": "ルールタイトル",
        "content": "ルール内容",
        "coachNote": "コーチノート"
      }
    ],
    "playbookComment": "プレイブックの導入コメント",
    "playbook": {
      "trendFollowing": {
        "conditions": ["条件1", "条件2"],
        "entry": ["エントリー条件1"],
        "sl": "損切りルール",
        "tp": "利確ルール",
        "example": {
          "date": "実データのcloseDate",
          "symbol": "実データのsymbol",
          "side": "実データのside",
          "lots": "実データのlots",
          "entry": "実データのopenPrice",
          "exit": "実データのclosePrice",
          "pnlJPY": "実データのprofit",
          "pips": "実データのpips",
          "ticket": "実データのticket",
          "note": "この取引の特徴"
        },
        "coachNote": "順張りについてのアドバイス"
      },
      "meanReversion": {
        "conditions": ["条件1"],
        "lotPolicy": "ロット管理",
        "timeStop": "時間制限",
        "example": {
          "date": "実データのcloseDate",
          "symbol": "実データのsymbol",
          "side": "実データのside",
          "lots": "実データのlots",
          "entry": "実データのopenPrice",
          "exit": "実データのclosePrice",
          "pnlJPY": "実データのprofit",
          "pips": "実データのpips",
          "ticket": "実データのticket",
          "note": "この取引の特徴"
        },
        "coachNote": "逆張りについてのアドバイス"
      }
    },
    "diaryGuide": {
      "comment": "日記ガイドの導入コメント",
      "rows": [
        {
          "item": "🎯 記録項目",
          "content": "記録内容",
          "coachNote": "アドバイス"
        }
      ]
    },
    "kpisComment": "KPIの導入コメント",
    "kpis": [
      {
        "metric": "指標名",
        "target": "目標値",
        "coachNote": "説明"
      }
    ],
    "fourWeekPlanComment": "4週間プランの導入コメント",
    "fourWeekPlan": [
      {
        "week": "Week 1",
        "theme": "テーマ",
        "content": "内容",
        "coachNote": "アドバイス"
      }
    ],
    "coachingMessage": ["メッセージ段落1", "メッセージ段落2", "メッセージ段落3"],
    "nextSteps": ["次のステップ1", "次のステップ2"],
    "evaluationScore": {
      "overall": 75,
      "riskManagement": 70,
      "entryTiming": 80,
      "exitStrategy": 65,
      "emotionalControl": 75,
      "consistency": 80,
      "explanation": "各項目の評価根拠を簡潔に説明"
    }
  },
  "meta": {
    "generatedAt": "2025-11-13T10:30:00+09:00"
  }
}

**絶対に守ること：**
1. JSONの最上位には必ず "markdown", "sheet", "meta" の3つのキーを含める
2. sheetオブジェクト内のすべてのフィールド（summaryComment, summary, examples等）を含める
3. markdownのみ、またはsheetのみの出力は不可

ここからデータ（JSON）：
<<TRADES_JSON>>

**繰り返し：上記のJSON構造（markdown + sheet + meta）で出力してください。**
`.trim();

  const jsonStr = JSON.stringify(input.tradesJson).slice(0, 50_000);
  return userTemplate.replaceAll('<<TRADES_JSON>>', jsonStr);
}
