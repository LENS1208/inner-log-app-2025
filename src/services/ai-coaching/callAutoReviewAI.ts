import { SYSTEM_TXT, buildPrompt, type PromptInput } from './buildPrompt';
import type { AIResponse } from './types';
import { getCoachSystemPromptModifier } from '../../lib/coachAvatars';
import { supabase } from '../../lib/supabase';

interface CallHints {
  dateRange?: string;
  focus?: string;
  coachAvatarPreset?: string;
}

export async function callAutoReviewAI(
  tradesJson: any,
  hints?: CallHints
): Promise<AIResponse> {
  const userPrompt = buildPrompt({
    tradesJson,
    dateRangeHint: hints?.dateRange,
    focusHint: hints?.focus,
  });

  const coachModifier = hints?.coachAvatarPreset
    ? getCoachSystemPromptModifier(hints.coachAvatarPreset)
    : '';

  const finalSystemPrompt = coachModifier
    ? `${SYSTEM_TXT}\n\n${coachModifier}`
    : SYSTEM_TXT;

  console.log('📊 トレードデータ件数:', Array.isArray(tradesJson) ? tradesJson.length : 'unknown');
  console.log('📝 プロンプト長:', userPrompt.length, '文字');
  console.log('🎯 システムプロンプト長:', finalSystemPrompt.length, '文字');
  console.log('👤 コーチアバター:', hints?.coachAvatarPreset || 'デフォルト');

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const apiUrl = `${supabaseUrl}/functions/v1/generate-coaching`;

    console.log('🔌 Calling Edge Function:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt: finalSystemPrompt,
        userPrompt: userPrompt,
      }),
    });

    console.log('📡 Edge Function レスポンスステータス:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Edge Function error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result: AIResponse = await response.json();
    console.log('📦 Edge Function レスポンスデータ:', result);

    console.log('📦 result.sheet:', result.sheet);
    console.log('📦 result.sheet?.summary:', result.sheet?.summary);

    if (!result.sheet) {
      console.error('⚠️ result.sheetが存在しません');
      console.error('📦 resultの全キー:', Object.keys(result));
      throw new Error('Invalid AI response structure: missing sheet');
    }

    if (!result.sheet.summary) {
      console.error('⚠️ result.sheet.summaryが存在しません');
      console.error('📦 result.sheetの全キー:', Object.keys(result.sheet));
      throw new Error('Invalid AI response structure: missing summary');
    }

    if (!Array.isArray(result.sheet.summary) || result.sheet.summary.length === 0) {
      console.error('⚠️ result.sheet.summaryが空の配列です');
      throw new Error('Invalid AI response structure: empty summary');
    }

    return result;
  } catch (error) {
    console.error('AI呼び出しエラー:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userFriendlyMessage = 'データの分析中にエラーが発生しました。';

    // Provide more specific error messages based on the error
    if (errorMessage.includes('OpenAI API key not set')) {
      userFriendlyMessage = 'AIサービスの設定が完了していません。管理者にお問い合わせください。';
    } else if (errorMessage.includes('User not authenticated')) {
      userFriendlyMessage = 'ログインが必要です。再度ログインしてください。';
    } else if (errorMessage.includes('Supabase URL not configured')) {
      userFriendlyMessage = 'サービスの設定に問題があります。管理者にお問い合わせください。';
    } else if (errorMessage.includes('Edge Function error: 500')) {
      userFriendlyMessage = 'AIサービスで問題が発生しました。しばらく待ってから再度お試しください。';
    } else if (errorMessage.includes('Edge Function error: 401')) {
      userFriendlyMessage = '認証エラーが発生しました。再度ログインしてください。';
    } else if (errorMessage.includes('Edge Function error')) {
      userFriendlyMessage = `サーバーエラーが発生しました。(${errorMessage})`;
    }

    return {
      markdown: `# エラー\n\n${userFriendlyMessage}`,
      sheet: {
        summary: [userFriendlyMessage],
        examples: [],
        strengthsWeaknesses: [],
        rules: [],
        playbook: {
          trendFollowing: {
            conditions: [],
            entry: [],
            sl: '',
            tp: '',
            coachNote: '',
          },
          meanReversion: {
            conditions: [],
            lotPolicy: '',
            coachNote: '',
          },
        },
        diaryGuide: { rows: [] },
        kpis: [],
        fourWeekPlan: [],
        coachingMessage: [userFriendlyMessage, 'しばらく待ってから再度お試しいただくか、管理者にお問い合わせください。'],
        nextSteps: [],
      },
      meta: {
        generatedAt: new Date().toISOString(),
        error: errorMessage,
      },
    };
  }
}

export function generateMockCoachingSheet(): AIResponse {
  return {
    markdown: '# AIコーチングシート（サンプル）',
    sheet: {
      summary: [
        '最近のトレードは、勢いのある相場ではしっかりと波に乗れており、方向感を読む力は安定しています。',
        '一方で、利確をやや早める傾向があり、大きく取れる場面でも途中で離脱してしまうことが多いようです。',
        'また、ロットサイズの変化が激しく、気持ちの波がそのまま取引サイズに現れている点が課題です。',
        '感覚と技術はすでに備わっていますので、「サイズとリズム」を整える段階に入っています。',
      ],
      summaryComment: '最近のトレードは、勢いのある相場ではしっかりと波に乗れており、方向感を読む力は安定しています。一方で、利確をやや早める傾向があり、大きく取れる場面でも途中で離脱してしまうことが多いようです。また、ロットサイズの変化が激しく、気持ちの波がそのまま取引サイズに現れている点が課題です。感覚と技術はすでに備わっていますので、「サイズとリズム」を整える段階に入っています。',
      examples: [
        {
          date: '2024-10-03',
          symbol: 'USDJPY',
          side: 'SELL',
          lots: 0.5,
          entry: 149.20,
          exit: 148.50,
          pnlJPY: 35000,
          note: '良い流れ：上昇一服後の戻りを正確に捉え、RR1.2を達成',
        },
        {
          date: '2024-10-17',
          symbol: 'USDJPY',
          side: 'SELL',
          lots: 2.0,
          entry: 150.00,
          exit: 150.65,
          pnlJPY: -135000,
          note: '改善点：高ロット逆張りで、エントリー直後に含み損が拡大し損失許容できず',
        },
        {
          date: '2024-09-17',
          symbol: 'USDJPY',
          side: 'BUY',
          lots: 0.3,
          entry: 147.80,
          exit: 148.60,
          pnlJPY: 24000,
          note: '上昇再開のブレイクで綺麗に利確',
        },
      ],
      strengthsWeaknessesComment: 'あなたのトレードには、瞬間的な判断力と相場の呼吸を読む感覚がしっかりあります。その反面、「止まる」「待つ」「減らす」といった"守りの判断"が曖昧になる場面があります。いくつかの取引を例に、強みと改善のバランスを整理してみましょう。',
      strengthsWeaknesses: [
        {
          item: '方向感',
          strength: '相場の初動を読む力が非常に高く、押し目や戻りを素早く捉えています。10/03のUSDJPY売りでは、戻り高値を明確に見極めて順張り成功。',
          improvement: '方向感は合っているのに、「ここで終わり」と判断するタイミングが少し早いです。',
          coachNote: 'トレンドが継続している間は、半分を残して伸ばす習慣をつけましょう。',
        },
        {
          item: 'エントリー精度',
          strength: '決断が早く、迷いの少ないクリックができています。9/17のUSDJPY買いでは、上昇再開のブレイクで綺麗に利確。',
          improvement: 'エントリー回数が多くなると、条件の精度が下がる傾向があります。',
          coachNote: '「3条件が揃ったときだけ入る」など、チェックリスト化がおすすめです。',
        },
        {
          item: 'ロット管理',
          strength: '勝ちパターンでは自信をもってサイズを上げられています。',
          improvement: '一方で、逆行時や感情的な場面でロットが膨らみやすいです。10/17の売り2lot -135,000円。',
          coachNote: '「1日の最大ロット＝平均の1.5倍まで」と決めるだけで安定します。',
        },
        {
          item: '感情制御',
          strength: '負けても次の機会を探せる回復力があります。',
          improvement: '「取り返したい」と感じた瞬間の再エントリーが多く見られます。',
          coachNote: '連敗後は必ず"観察の1時間"を設けてください。相場を見ても手は出さない時間です。',
        },
        {
          item: '検証習慣',
          strength: '履歴を保存し、振り返る意識を持てています。',
          improvement: 'チャート画像やR換算の記録がまだ少ないです。',
          coachNote: '"どの位置でどう感じたか"をスクショにメモすると再現性が高まります。',
        },
      ],
      rulesComment: 'あなたの取引履歴を分析した上で、安定した利益を継続するための5つのルールをご提案します。',
      rules: [
        {
          ruleId: 'rule1',
          title: '1回の損失＝残高の1%以内',
          content: '1回のトレードで失う金額を残高の1%以内に制限することで、連敗時でも資金を大きく減らさずに済みます。具体的には、残高100万円なら1万円までの損失に抑えるということです。この制限を守ることで、10連敗しても資金は90%以上残り、トレードを続けることができます。感情が動いても資金を守れるラインを設定することが重要です。',
          coachNote: '大きく負けた日を「特別な日」にしないためのルールです。',
        },
        {
          ruleId: 'rule2',
          title: 'サイズアップは勝ち型のみ',
          content: '順張りで2連勝したときのみロットサイズを上げるようにします。これにより、調子が良い時だけリスクを取り、調子が悪い時は控えめにトレードすることができます。例えば、通常0.1ロットでトレードしている場合、順張りで2連勝したら0.15ロットに増やすといった具合です。焦ってサイズを上げず、「勝っている流れ」を確認してから強気になることが大切です。',
          coachNote: '「勝っている流れ」にだけ強気になることが大切です。',
        },
        {
          ruleId: 'rule3',
          title: 'S/Lは常に固定（20〜30pips）',
          content: '損切りラインは20〜30pipsの範囲で固定し、エントリー後は絶対に動かさないようにします。感情に流されて損切りラインを遠ざけたり、逆に近づけたりすることは、トレード計画を崩す最大の要因です。最初に設定した損切りラインを守ることで、損失を予測可能な範囲に収め、メンタルを安定させることができます。"切る勇気"が安定の土台になります。',
          coachNote: '"切る勇気"が安定の土台になります。',
        },
        {
          ruleId: 'rule4',
          title: '日次 -3Rで終了',
          content: '1日の損失が3R（リスク単位）に達したら、その日のトレードを強制終了するルールを設けます。例えば、1Rを1万円に設定している場合、1日で3万円負けたら終了です。これにより、連敗時の損失拡大を防ぎ、感情的になる前に相場から離れることができます。翌日は新しい気持ちでスタートできるため、冷静なトレードを維持できます。相場を離れることも"実力の一部"です。',
          coachNote: '相場を離れることも"実力の一部"です。',
        },
        {
          ruleId: 'rule5',
          title: 'GOLDは検証モード',
          content: 'GOLDなどボラティリティが高い銘柄は、本格的なトレード対象ではなく検証モードとして扱います。実際のエントリーはせず、チャートを観察して値動きのパターンを学ぶことに集中しましょう。ボラティリティが大きい銘柄は利益も大きいですが、損失も大きくなるため、まずは安定した銘柄（ドル円など）で自信をつけてから挑戦するのが賢明です。',
          coachNote: '「見る」だけの時間も、成長のための投資です。',
        },
      ],
      playbookComment: 'あなたの"勝ちパターン"はすでに明確です。順張りと逆張りの役割を整理して、どちらの型でも落ち着いて実行できる状態を目指しましょう。',
      playbook: {
        trendFollowing: {
          conditions: ['上位足トレンドが明確', '押し目再始動を確認'],
          entry: ['高値更新後の再テスト', '戻り高値の反発'],
          sl: '直近スイング＋10pips固定',
          tp: 'RR1.2〜1.5で分割決済',
          example: {
            date: '2024-10-03',
            symbol: 'USDJPY',
            side: 'SELL',
            lots: 0.5,
            entry: 149.20,
            exit: 148.50,
            pnlJPY: 35000,
            note: '直近戻りの再開をきれいに捉えた好例',
          },
          coachNote: '小さな利確でも、安定して取れるリズムを優先しましょう。',
        },
        meanReversion: {
          conditions: ['RSI極端値', '急伸急落後の反転足'],
          lotPolicy: '通常の半分',
          timeStop: '4時間以内',
          example: {
            date: '2024-10-17',
            symbol: 'USDJPY',
            side: 'SELL',
            lots: 2.0,
            entry: 150.00,
            exit: 150.65,
            pnlJPY: -135000,
            note: 'タイミングは悪くなかったものの、ロットが過大',
          },
          coachNote: '「検証トレード」として記録を取り、収益にこだわらずパターン収集に使いましょう。',
        },
      },
      diaryGuide: {
        comment: '日記は反省ではなく、"次の自分の設計図"です。短い一文でも良いので、トレード直後に「なぜそう思ったか」を残してみましょう。',
        rows: [
          {
            item: '🎯 根拠',
            content: 'どの根拠で方向を決めたか',
            coachNote: '書くことで「感覚」が言語化されます。',
          },
          {
            item: '📏 R換算',
            content: '今回のリスクはいくらか',
            coachNote: 'Rで管理することで、感情を数値化できます。',
          },
          {
            item: '🧠 感情',
            content: '焦り・自信・迷い など',
            coachNote: '感情と結果の関係が見えるようになります。',
          },
          {
            item: '🖼️ スクショ',
            content: 'エントリー直後・決済直後',
            coachNote: '視覚で学ぶのが一番の再現訓練です。',
          },
        ],
      },
      kpisComment: '数字は冷静さを取り戻す道具です。感覚が良いあなただからこそ、「数字で整える」ことを意識していきましょう。',
      kpis: [
        {
          metric: 'RR遵守率',
          target: '95%以上',
          coachNote: '感情の波を消す最短ルートです。',
        },
        {
          metric: '平均R',
          target: '+0.8以上',
          coachNote: '小さく勝ち、大きく負けない構造へ。',
        },
        {
          metric: '勝率',
          target: '58〜62%',
          coachNote: 'すでに安定域。維持でOKです。',
        },
        {
          metric: '連敗上限',
          target: '3以下',
          coachNote: 'ストップラインを意識的に。',
        },
        {
          metric: 'ロット変動幅',
          target: '2倍以内',
          coachNote: 'サイズの安定がメンタルの安定につながります。',
        },
      ],
      fourWeekPlanComment: '4週間は、リズムを整えるための最適なサイクルです。まずは「守る→磨く→伸ばす→安定させる」の流れでいきましょう。',
      fourWeekPlan: [
        {
          week: 'Week 1',
          theme: 'リセット',
          content: 'USDJPY限定・R=0.5固定',
          coachNote: '負けても揺れないリズムを作る週です。',
        },
        {
          week: 'Week 2',
          theme: '再現性強化',
          content: '順張り型の反復練習',
          coachNote: '成功パターンを「型」にして積み上げましょう。',
        },
        {
          week: 'Week 3',
          theme: '感情観察',
          content: '感情タグを毎日1つ記録',
          coachNote: '自分の癖を"データ"として見る段階です。',
        },
        {
          week: 'Week 4',
          theme: 'ロット調整',
          content: 'MAE/MFE分析で適正化',
          coachNote: 'データで「最適ロット」を見つけます。',
        },
      ],
      coachingMessage: [
        'あなたのトレードには、方向を読む力と瞬発力があります。',
        'いま大切なのは、「感情と行動を一呼吸ずらす」意識です。',
        '焦りを感じたら、まず"記録する"だけに留める。その1回の「待つ」が、次の大きなチャンスを逃さない冷静さにつながります。',
        'トレードは、上達の速度より安定の深さが価値を生みます。',
        '毎回の取引を「うまくやる」ではなく、「うまく向き合う」つもりで取り組んでみてください。',
        '技術はすでに十分です。次は、それを支えるメンタル設計と習慣化の段階に進みましょう。',
      ],
      nextSteps: [
        '来週1週間は「RR1.2固定＋順張りのみ」で運用し、記録を5件残しましょう',
        '次回の分析では、その5件をもとに"待つ力"の成長度を一緒に見ていきます',
      ],
      evaluationScore: {
        overall: 72,
        riskManagement: 65,
        entryTiming: 78,
        exitStrategy: 68,
        emotionalControl: 70,
        consistency: 79,
        explanation: 'エントリータイミングと一貫性は良好です。リスク管理と感情制御の改善により、総合スコアは大きく向上する見込みです。',
      },
    },
    meta: {
      model: 'mock',
      generatedAt: new Date().toISOString(),
    },
  };
}
