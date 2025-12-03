// src/widgets/TradeDiaryPage.tsx
import { getAccentColor, getLossColor, createProfitGradient } from '../lib/chartColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { UI_TEXT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { getTradeByTicket, getAllTrades, type DbTrade, getTradeNote } from "../lib/db.service";
import { useDataset } from "../lib/dataset.context";
import { parseCsvText } from "../lib/csv";
import { showToast } from "../lib/toast";
import EquityCurveDayDetailDrawer from "../components/reports/EquityCurveDayDetailDrawer";
import { getCoachAvatarById } from "../lib/coachAvatars";
import { computeTradeMetrics, formatTradeMetrics } from "../utils/trade-metrics";
import "../tradeDiary.css";

/* ===== 既存配線（A/B/C・アップロード） ===== */
function useWiring() {
  const emitPreset = useCallback((key: "A" | "B" | "C") => {
    window.dispatchEvent(new CustomEvent("fx:preset", { detail: key }));
  }, []);
  const openUpload = useCallback(() => {
    window.dispatchEvent(new Event("fx:openUpload"));
  }, []);
  return { emitPreset, openUpload };
}

/* ===== 外部スクリプトローダ（CDN） ===== */
const loaded = new Set<string>();
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!src) return resolve();
    if (loaded.has(src)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // 順序保証
    s.onload = () => {
      loaded.add(src);
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

/* ===== 型・ダミーデータ ===== */
type Trade = {
  ticket: string;
  item: string; // 通貨ペア
  side: "BUY" | "SELL";
  size: number;
  openTime: Date;
  openPrice: number;
  closeTime: Date;
  closePrice: number;
  commission: number;
  swap: number;
  profit: number; // 円
  sl: number | null;
  tp: number | null;
  pips: number; // ±
  mfe_pips?: number;
  mae_pips?: number;
  max_possible_gain_pips?: number;
  planned_tp_pips?: number;
};

function makeDummyTrades(): Trade[] {
  const base = new Date("2025-09-10T00:30:00Z").getTime();
  const items = ["USDJPY", "EURUSD", "GBPJPY", "AUDUSD"];
  const arr: Trade[] = [];
  for (let i = 0; i < 80; i++) {
    const tOpen = new Date(base + i * 45 * 60 * 1000);
    const dur = 10 + Math.floor(Math.random() * 180);
    const tClose = new Date(tOpen.getTime() + dur * 60 * 1000);
    const item = items[i % items.length];
    const side: Trade["side"] = Math.random() > 0.45 ? "BUY" : "SELL";
    const size = [0.2, 0.3, 0.5, 1.0][i % 4];
    const isJPY = /JPY$/.test(item);
    const pf = isJPY ? 100 : 10000;
    const openPx = isJPY ? 1.45 + Math.random() * 0.02 : 1.05 + Math.random() * 0.02; // 値はデモ
    const pips = Math.round((Math.random() * 60 - 20) * 10) / 10; // -20〜+40
    const closePx = side === "BUY" ? openPx + pips / pf : openPx - pips / pf;
    const commission = Math.round((Math.random() * 4 - 2) * 50);
    const swap = Math.round((Math.random() * 4 - 2) * 40);
    const yen = Math.round(pips * size * (isJPY ? 100 : 1000));
    const profit = yen + commission + swap;
    const sl = side === "BUY" ? openPx - 20 / pf : openPx + 20 / pf;
    arr.push({
      ticket: "T" + (100000 + i),
      item,
      side,
      size,
      openTime: tOpen,
      openPrice: Math.round(openPx * 1000) / 1000,
      closeTime: tClose,
      closePrice: Math.round(closePx * 1000) / 1000,
      commission,
      swap,
      profit,
      sl: Math.round(sl * 1000) / 1000,
      tp: null,
      pips,
    });
  }
  return arr;
}

/* ===== 小道具 ===== */
const pipFactor = (sym: string) => (/JPY$/.test(sym) ? 100 : 10000);
const holdMs = (a: Date, b: Date) => b.getTime() - a.getTime();
const fmtJPY = (n: number) => `${Math.round(n).toLocaleString("ja-JP")}円`;
const fmtPrice = (n: number, sym: string) => {
  const isJPY = /JPY$/.test(sym);
  const decimals = isJPY ? 3 : 5;
  return `${n.toFixed(decimals)} 円`;
};
const fmtHoldJP = (ms: number) => {
  const m = Math.floor(ms / 60000),
    h = Math.floor(m / 60);
  return `${h}時間${m % 60}分`;
};

/* ===== マルチセレクト（最大2件） ===== */
type MSProps = {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  max?: number;
  triggerId?: string;
  menuId?: string;
};
function MultiSelect({
  label,
  value,
  onChange,
  options,
  max = 2,
  triggerId,
  menuId,
}: MSProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  const clickOutside = useCallback(
    (e: MouseEvent) => {
      const trg = triggerId ? document.getElementById(triggerId) : null;
      const menu = menuId ? document.getElementById(menuId) : null;
      if (!trg || !menu) return;
      if (
        !trg.contains(e.target as Node) &&
        !menu.contains(e.target as Node)
      )
        setOpen(false);
  }, [triggerId, menuId]);
  useEffect(() => {
    document.addEventListener("click", clickOutside);
    return () => document.removeEventListener("click", clickOutside);
  }, [clickOutside]);
  const onPick = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else if (value.length < max) onChange([...value, opt]);
  };
  const title = value.length
    ? `${value.join("、")}（${value.length}）`
    : label;
  return (
    <label className="ms-wrap">
      <button type="button" id={triggerId} className="ms-trigger" onClick={toggle}>
        {title}
      </button>
      <div id={menuId} className="ms-menu" style={{ display: open ? "block" : "none" }}>
        {options.map((opt) => (
          <div
            key={opt}
            className="ms-item"
            onClick={() => onPick(opt)}
            style={{
              background: value.includes(opt) ? 'var(--bg)' : 'var(--surface)',
              opacity: value.includes(opt) ? 0.7 : 1
            }}
          >
            <input
              type="checkbox"
              readOnly
              checked={value.includes(opt)}
              disabled={!value.includes(opt) && value.length >= max}
            />
            <span>{opt}</span>
          </div>
        ))}
        <div className="ms-footer">
          <span>最大 {max} まで</span>
          <button type="button" className="td-btn" onClick={() => setOpen(false)}>
            閉じる
          </button>
        </div>
      </div>
    </label>
  );
}

/* ===== AIアドバイスセクション ===== */
type AIAdviceSectionProps = {
  tradeData: Trade;
  kpi: {
    net: number;
    pips: number;
    hold: number;
    gross: number;
    cost: number;
    rrr: number | null;
  };
  diaryData: {
    entryEmotion: string;
    entryBasis: string[];
    techSet: string[];
    marketSet: string[];
    exitTriggers: string[];
    exitEmotion: string;
    noteRight: string;
    noteWrong: string;
    noteNext: string;
  };
  coachAvatarPreset?: string;
  onInsertDraft?: (draft: string) => void;
};

function AIAdviceSection({ tradeData, kpi, diaryData, coachAvatarPreset = 'teacher', onInsertDraft }: AIAdviceSectionProps) {
  const [advice, setAdvice] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const ADVICE_KEY = `ai_advice_${tradeData.ticket}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADVICE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setAdvice(data.advice || "");
        setIsPinned(data.isPinned || false);
        setLastUpdate(data.lastUpdate ? new Date(data.lastUpdate) : null);
      }
    } catch {}
  }, [ADVICE_KEY]);

  const generateAdvice = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const isProfit = kpi.net >= 0;
      const hasSL = tradeData.sl !== null && tradeData.sl > 0;
      const hasTP = tradeData.tp !== null && tradeData.tp > 0;
      const rrr = kpi.rrr !== null ? kpi.rrr.toFixed(2) : "未設定";

      let insights = "";
      let warnings = "";
      let nextAction = "";

      // コーチアバターによる文体の切り替え
      const isBeginnerCoach = coachAvatarPreset === 'beginner-coach';
      const isAdvancedCoach = coachAvatarPreset === 'advanced-coach';

      // 気づき（良かった点）
      if (isProfit) {
        insights = isBeginnerCoach
          ? `今回のトレードは利益で終えることができましたね！素晴らしいです。${diaryData.entryBasis.length > 0 ? `エントリーの根拠として「${diaryData.entryBasis[0]}」を意識できていたのは良い判断でした。` : "エントリーのタイミングも適切でした。"}`
          : isAdvancedCoach
          ? `エントリー精度が優位性を示しています。${hasSL ? `損切り設定（${tradeData.sl}）も適切に機能しており、` : ""}リスク管理の観点から評価できます。`
          : `今回のエントリーは方向性に沿っており、${hasSL ? "損切り位置も妥当でした。" : "利益で終えられました。"}`;
      } else {
        insights = isBeginnerCoach
          ? `今回は損失で終わってしまいましたが、${hasSL ? "損切りラインをしっかり守れたことは素晴らしいです。" : "トレードを振り返る姿勢は成長につながります。"}焦らず、一つずつ改善していきましょう。`
          : isAdvancedCoach
          ? `損失トレードですが、${hasSL ? "予定通りの損切りが執行されており、" : ""}プロセスの検証が重要です。${diaryData.entryBasis.length > 0 ? `エントリー根拠「${diaryData.entryBasis[0]}」の有効性を再検証してください。` : ""}`
          : `今回は損失となりましたが、${hasSL ? "損切りを守れたことは評価できます。" : "次回に向けて振り返りを行いましょう。"}`;
      }

      // 注意点（改善点）
      if (!hasSL && !hasTP) {
        warnings = isBeginnerCoach
          ? `今回のトレードでは、損切り（SL）と利確（TP）が設定されていませんでした。これはとても危険です。どんなに自信があるトレードでも、必ず損切りラインは決めてからエントリーしましょう。これが最も大切なルールです。`
          : isAdvancedCoach
          ? `SL/TP未設定によるリスク管理の欠如が観察されます。期待値の計算が不可能な状態であり、再現性のある戦略構築の障害となっています。`
          : `損切りと利確が未設定でした。どんな場面でも、事前にリスクリワードを設定することが重要です。`;
      } else if (kpi.rrr !== null && kpi.rrr < 1.2) {
        warnings = isBeginnerCoach
          ? `リスクリワード比（RR比）が${rrr}と少し低めです。RR比とは「損失に対してどれだけ利益を狙うか」の比率のことで、最低でも1.5以上を目指すと良いですよ。利益を伸ばす練習をしてみましょう。`
          : isAdvancedCoach
          ? `現状のRR比${rrr}は期待値最適化の観点から改善余地があります。部分利確戦略の導入、またはトレイリングストップの活用により、平均R値を1.5以上に改善することを推奨します。`
          : `リスクリワード比が${rrr}とやや低めです。利確目標をもう少し高く設定することで、長期的な収益性が向上します。`;
      } else if (diaryData.exitEmotion && (diaryData.exitEmotion.includes("焦") || diaryData.exitEmotion.includes("不安"))) {
        warnings = isBeginnerCoach
          ? `決済時に「${diaryData.exitEmotion}」と感じていたようですね。感情的になると、ルール通りの行動が難しくなります。決済のタイミングは事前に決めておくと、焦らずに済みますよ。`
          : isAdvancedCoach
          ? `決済時の心理状態（${diaryData.exitEmotion}）が判断に影響を与えた可能性があります。感情的バイアスを排除するため、機械的な決済ルールの確立が必要です。`
          : `決済時に「${diaryData.exitEmotion}」という感情がありました。感情に左右されない決済ルールを事前に決めておくことが大切です。`;
      } else {
        warnings = isBeginnerCoach
          ? `全体的には良いトレードでしたが、さらに良くするために、次回は利確目標を明確にしてからエントリーしてみましょう。`
          : isAdvancedCoach
          ? `プロセスは概ね適切ですが、エントリー後の価格挙動分析を通じて、最適な利確ポイントの精度向上が可能です。`
          : `概ね良好なトレードでした。さらに改善するには、利確タイミングの精度を高めることを意識しましょう。`;
      }

      // 次の一手（具体的なアクション）
      if (!hasSL && !hasTP) {
        nextAction = isBeginnerCoach
          ? `次のトレードでは、必ずエントリー前に「ここで損切り」「ここで利確」を決めてください。最初は難しいかもしれませんが、この習慣が身につけば、トレードが安定してきますよ。一緒に頑張りましょう！`
          : isAdvancedCoach
          ? `次回トレードでは、エントリー前にSL/TPを必ず設定し、期待値（E[R] = P×Avg Win - (1-P)×Avg Loss）を計算してから執行してください。これにより戦略の定量評価が可能になります。`
          : `次回のトレードでは、エントリー前に必ず損切りと利確の位置を決め、それを守ることを徹底してください。`;
      } else if (kpi.rrr !== null && kpi.rrr < 1.2) {
        nextAction = isBeginnerCoach
          ? `次は、利確目標を「損切り幅の1.5倍以上」に設定してみましょう。例えば、10,000円の損切りなら、15,000円以上の利益を狙う、というルールです。焦って早く決済したくなる気持ちは自然ですが、目標まで待つ練習をしてみてください。`
          : isAdvancedCoach
          ? `次の10トレードで、1R到達時に50%部分利確、残りをATR×1.5のトレイリングストップで管理する戦略をテストしてください。期待値の向上が見込めます。`
          : `次回は、利確目標を損切り幅の1.5倍以上に設定し、その目標まで待つことを練習してみてください。`;
      } else {
        nextAction = isBeginnerCoach
          ? `この調子で、損切りと利確のルールを守り続けましょう。トレードごとに振り返りを続ければ、必ず上達していきます。焦らず、一歩ずつ進んでいきましょうね。`
          : isAdvancedCoach
          ? `現在の戦略は統計的に優位性を示しています。次のステップとして、セットアップごとの期待値を分類し、最も効率的なパターンに絞り込むことを推奨します。`
          : `この調子で、事前に決めたルールを守ることを継続してください。トレードごとの振り返りが、長期的な成長につながります。`;
      }

      const adviceText = `【気づき】\n${insights}\n\n【注意点】\n${warnings}\n\n【次の一手】\n${nextAction}`;

      setAdvice(adviceText);
      setIsGenerating(false);
      const now = new Date();
      setLastUpdate(now);

      const data = {
        advice: adviceText,
        isPinned,
        lastUpdate: now.toISOString(),
      };
      localStorage.setItem(ADVICE_KEY, JSON.stringify(data));
    }, 1500);
  };

  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);

    const data = {
      advice,
      isPinned: newPinned,
      lastUpdate: lastUpdate?.toISOString(),
    };
    localStorage.setItem(ADVICE_KEY, JSON.stringify(data));
  };

  const generateDiaryDraft = () => {
    if (!onInsertDraft) return;

    setIsGeneratingDraft(true);
    setTimeout(() => {
      const isProfit = kpi.net >= 0;
      const hasSL = tradeData.sl !== null && tradeData.sl > 0;
      const hasTP = tradeData.tp !== null && tradeData.tp > 0;
      const emotion = diaryData.entryEmotion || "落ち着いた気持ち";
      const exitEmotion = diaryData.exitEmotion || "";
      const rrr = kpi.rrr !== null ? kpi.rrr.toFixed(2) : "未設定";

      let draftText = "";

      // エントリー時の状況
      draftText += `今回の${tradeData.item}${tradeData.side === "BUY" ? "ロング" : "ショート"}は、`;
      if (diaryData.entryBasis.length > 0) {
        draftText += `${diaryData.entryBasis[0]}を確認した上で、`;
      }
      draftText += `${emotion}でエントリーしました。`;

      // エントリー時の判断や準備
      if (!hasSL && !hasTP) {
        draftText += `今回はSL/TPを設定せずに入ってしまいました。`;
      } else if (hasSL) {
        draftText += `損切りライン（${tradeData.sl}）は事前に設定していました。`;
      }

      // 保有中の心理
      if (kpi.hold > 0) {
        const holdHours = Math.floor(kpi.hold / (1000 * 60 * 60));
        const holdMins = Math.floor((kpi.hold % (1000 * 60 * 60)) / (1000 * 60));
        if (holdHours > 0) {
          draftText += `ポジションを約${holdHours}時間${holdMins}分保有しました。`;
        } else {
          draftText += `ポジションを約${holdMins}分保有しました。`;
        }
      }

      // 結果と決済時の判断
      if (isProfit) {
        draftText += `結果として+${Math.round(kpi.net).toLocaleString()}円（${kpi.pips > 0 ? `+${kpi.pips.toFixed(1)}pips` : `${kpi.pips.toFixed(1)}pips`}）の利益で終えることができました。`;

        if (exitEmotion) {
          draftText += `決済時は${exitEmotion}という状態でしたが、`;
        }

        // RR比に基づく振り返り
        if (kpi.rrr !== null && kpi.rrr < 1.2) {
          draftText += `振り返ると、リスクリワード比が${rrr}と低めでした。含み益が伸びた段階で早めに決済してしまった感覚があります。次回は利確目標を事前に明確にし、もう少し利益を伸ばせるよう意識したいと思います。`;
        } else if (kpi.rrr !== null && kpi.rrr >= 1.5) {
          draftText += `RR比${rrr}と良好な結果となり、計画通りのトレードができたと感じています。この調子で次回も冷静に判断していきたいです。`;
        } else {
          draftText += `計画通りに進められたと感じていますが、次回はさらに利益を伸ばせるポイントを意識してみます。`;
        }
      } else {
        draftText += `結果は${Math.round(kpi.net).toLocaleString()}円（${kpi.pips.toFixed(1)}pips）の損失となりました。`;

        // 損切りに関する振り返り
        if (hasSL) {
          draftText += `損切りラインは事前に設定していた通りに執行されたので、リスク管理の面では計画通りでした。`;
        } else {
          draftText += `損切りラインを設定していなかったため、決済のタイミングに迷いがありました。次回は必ずSLを設定してからエントリーするようにします。`;
        }

        if (exitEmotion && (exitEmotion.includes("焦") || exitEmotion.includes("不安"))) {
          draftText += `決済時は${exitEmotion}気持ちで、冷静さを欠いていた部分があったかもしれません。`;
        }

        // 改善点の明確化
        if (!hasSL && !hasTP) {
          draftText += `今回の反省点として、エントリー前にSL/TPを明確にすることの重要性を再認識しました。次回は必ず事前にリスクリワードを計算してから入るようにします。`;
        } else if (diaryData.entryBasis.length === 0) {
          draftText += `エントリーの根拠が曖昧だった可能性があります。次回はもう少し明確な根拠を持ってからエントリーするようにしたいです。`;
        } else {
          draftText += `エントリーの根拠は明確でしたが、市場環境が想定と異なっていたようです。次回はもう少し慎重に状況を確認してから判断します。`;
        }
      }

      // 次回への具体的アクション
      if (!hasSL && !hasTP) {
        draftText += `\n\n次のトレードでは、エントリー前に必ず「ここで損切り」「ここで利確」を決めてから入ることを徹底します。`;
      } else if (kpi.rrr !== null && kpi.rrr < 1.2) {
        draftText += `\n\n次回は、利確目標を損切り幅の1.5倍以上に設定し、その目標まで待つことを意識してみます。`;
      } else if (diaryData.noteNext) {
        draftText += `\n\n次回に向けて：${diaryData.noteNext}`;
      } else {
        draftText += `\n\n今回の経験を活かして、次のトレードでは同じ課題を繰り返さないよう注意していきます。`;
      }

      onInsertDraft(draftText);
      setIsGeneratingDraft(false);
      showToast("日記の下書きを挿入しました", "success");
    }, 1000);
  };

  const coachAvatar = getCoachAvatarById(coachAvatarPreset || 'teacher');

  return (
    <section className="td-card" id="aiAdviceCard" style={{
      background: '#F7FAFF',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
    }}>
      <div className="td-section-title" style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>この取引へのAIコーチレビュー</h2>
      </div>

      <div style={{
        padding: '10px 12px',
        background: 'rgba(0, 132, 199, 0.1)',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 13,
        color: 'var(--ink)',
        lineHeight: 1.6,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <img
          src={coachAvatar}
          alt="AI Coach"
          style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }}
        />
        <div>このトレードの内容と結果をもとに、コーチが分析コメントをまとめました。</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className="td-btn"
          onClick={generateAdvice}
          disabled={isGenerating}
          style={{ flex: 1, minWidth: 120 }}
        >
          {isGenerating ? "分析中..." : advice ? "もう一度分析する" : "AIレビューを見る"}
        </button>
        <button
          className="td-btn"
          onClick={togglePin}
          disabled={!advice}
          style={{
            minWidth: 100,
            backgroundColor: isPinned ? getAccentColor() : undefined,
            color: isPinned ? "white" : undefined,
          }}
        >
          {isPinned ? "保存済み" : "この分析を保存"}
        </button>
        <button
          className="td-btn"
          onClick={generateDiaryDraft}
          disabled={isGeneratingDraft}
          style={{
            minWidth: 140
          }}
        >
          {isGeneratingDraft ? "作成中..." : "日記の下書きを作る"}
        </button>
      </div>

      {advice && (
        <>
          <div
            style={{
              padding: 18,
              backgroundColor: "white",
              borderRadius: 12,
              border: "2px solid rgba(0, 132, 199, 0.2)",
              whiteSpace: "pre-line",
              lineHeight: 1.8,
            }}
          >
            {advice.split('\n\n').map((section, idx) => {
              const isHeading = section.startsWith('【');
              if (isHeading) {
                const parts = section.split('\n');
                const heading = parts[0];
                const content = parts.slice(1).join('\n');
                return (
                  <div key={idx} style={{ marginBottom: idx < 2 ? 20 : 0 }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      marginBottom: 8,
                      paddingBottom: 6,
                      borderBottom: '2px solid rgba(0, 132, 199, 0.2)'
                    }}>
                      {heading}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>{content}</div>
                  </div>
                );
              }
              return <div key={idx}>{section}</div>;
            })}
          </div>

          {(() => {
            // Trade型をcomputeTradeMetricsが期待する形式に変換
            const tradeForMetrics = {
              ...tradeData,
              openTime: tradeData.openTime.toISOString(),
              closeTime: tradeData.closeTime.toISOString(),
            };
            const metrics = computeTradeMetrics(tradeForMetrics as any);
            const displayMetrics = formatTradeMetrics(metrics, tradeForMetrics as any);

            return (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  backgroundColor: "white",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                }}
              >
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--ink)',
                }}>
                  数値によるトレード評価
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: 8,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600, minWidth: 110 }}>エントリー効率：</span>
                    <span style={{ color: 'var(--ink)', flex: 1, textAlign: 'right', fontSize: 12 }}>{displayMetrics.entryEfficiency}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600, minWidth: 110 }}>エグジット効率：</span>
                    <span style={{ color: 'var(--ink)', flex: 1, textAlign: 'right', fontSize: 12 }}>{displayMetrics.exitEfficiency}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600, minWidth: 110 }}>もったいない指数：</span>
                    <span style={{ color: 'var(--ink)', flex: 1, textAlign: 'right', fontSize: 12 }}>{displayMetrics.missedPotential}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600, minWidth: 110 }}>損切り効率：</span>
                    <span style={{ color: 'var(--ink)', flex: 1, textAlign: 'right', fontSize: 12 }}>{displayMetrics.stopEfficiency}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600, minWidth: 110 }}>時間効率：</span>
                    <span style={{ color: 'var(--ink)', flex: 1, textAlign: 'right', fontSize: 12 }}>{displayMetrics.timeEfficiency}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600, minWidth: 110 }}>機会獲得率：</span>
                    <span style={{ color: 'var(--ink)', flex: 1, textAlign: 'right', fontSize: 12 }}>{displayMetrics.opportunityScore}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 700, minWidth: 110 }}>R値：</span>
                    <span style={{
                      color: metrics.rValue && metrics.rValue >= 0 ? 'var(--gain)' : 'var(--loss)',
                      flex: 1,
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: 13,
                    }}>
                      {displayMetrics.rValue}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {lastUpdate && (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "var(--muted)",
            textAlign: "right",
          }}
        >
          最終更新: {lastUpdate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}{" "}
          {lastUpdate.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </section>
  );
}

type TradeDiaryPageProps = {
  entryId?: string;
};

export default function TradeDiaryPage({ entryId }: TradeDiaryPageProps = {}) {
  const { emitPreset, openUpload } = useWiring();
  const { dataset, useDatabase, userSettings } = useDataset();

  /* ===== データ準備 ===== */
  const [dbTrade, setDbTrade] = useState<DbTrade | null>(null);
  const [dbAllTrades, setDbAllTrades] = useState<DbTrade[]>([]);
  const [csvTrades, setCsvTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [equityCurveDayPanel, setEquityCurveDayPanel] = useState<{ dateLabel: string; trades: any[] } | null>(null);

  // CSVデータをロード
  useEffect(() => {
    if (!useDatabase) {
      const candidates = [
        `/demo/${dataset}.csv`,
        `/demo/sample/${dataset}.csv`,
        `/demo/demo_${dataset}.csv`,
      ];
      (async () => {
        for (const url of candidates) {
          try {
            const cacheBuster = `?t=${Date.now()}`;
            const res = await fetch(url + cacheBuster, { cache: "no-store" });
            if (!res.ok) continue;
            const text = await res.text();
            const trades = parseCsvText(text);
            if (Array.isArray(trades) && trades.length) {
              console.log('TradeDiaryPage: Loaded CSV trades:', trades.length);
              setCsvTrades(trades);
              return;
            }
          } catch (err) {
            console.error('Error loading CSV:', err);
          }
        }
        setCsvTrades([]);
      })();
    }
  }, [dataset, useDatabase]);

  useEffect(() => {
    const loadTrade = async () => {
      if (!entryId) {
        console.log('TradeDiaryPage: No entryId provided');
        setLoading(false);
        return;
      }
      console.log('TradeDiaryPage: Loading trade for entryId:', entryId);

      if (useDatabase) {
        try {
          const trade = await getTradeByTicket(entryId);
          console.log('TradeDiaryPage: Loaded trade from DB:', trade);
          setDbTrade(trade);
        } catch (error) {
          console.error('TradeDiaryPage: Error loading trade:', error);
        }
      }
      setLoading(false);
    };
    loadTrade();
  }, [entryId, useDatabase]);

  // データベースから全トレードを取得
  useEffect(() => {
    const loadAllTrades = async () => {
      if (useDatabase) {
        try {
          console.log('TradeDiaryPage: Loading all trades with dataset:', dataset);
          const allDbTrades = await getAllTrades(dataset);
          console.log('TradeDiaryPage: Loaded all trades from DB:', allDbTrades.length);
          setDbAllTrades(allDbTrades);
        } catch (error) {
          console.error('TradeDiaryPage: Error loading all trades:', error);
          setDbAllTrades([]);
        }
      }
    };
    loadAllTrades();
  }, [useDatabase, dataset]);

  const trades = useMemo(() => makeDummyTrades(), []);
  const allTrades = useMemo(() => {
    if (useDatabase) {
      // データベースからのトレードをTrade型に変換
      return dbAllTrades.map(t => ({
        ticket: t.ticket,
        id: t.ticket,
        pair: t.item,
        symbol: t.item,
        side: t.side,
        volume: t.size,
        openTime: t.open_time,
        datetime: t.close_time,
        openPrice: t.open_price,
        closePrice: t.close_price,
        commission: t.commission,
        swap: t.swap,
        profit: t.profit,
        profitYen: t.profit,
        stopPrice: t.sl,
        targetPrice: t.tp,
        pips: t.pips,
      }));
    }
    return csvTrades;
  }, [useDatabase, dbAllTrades, csvTrades]);

  const row = useMemo(() => {
    if (dbTrade) {
      return {
        ticket: dbTrade.ticket,
        item: dbTrade.item,
        side: dbTrade.side as "BUY" | "SELL",
        size: dbTrade.size,
        openTime: new Date(dbTrade.open_time),
        openPrice: dbTrade.open_price,
        closeTime: new Date(dbTrade.close_time),
        closePrice: dbTrade.close_price,
        commission: dbTrade.commission,
        swap: dbTrade.swap,
        profit: dbTrade.profit,
        sl: dbTrade.sl,
        tp: dbTrade.tp,
        pips: dbTrade.pips,
      };
    }

    // CSVデータから検索
    if (entryId && allTrades.length > 0) {
      const found = allTrades.find(t => t.ticket === entryId || t.id === entryId);
      console.log('TradeDiaryPage: Searching for', entryId, 'in', allTrades.length, 'trades. Found:', found);
      if (found) {
        return {
          ticket: found.ticket || found.id,
          item: found.pair || found.symbol || 'UNKNOWN',
          side: (found.side === 'LONG' ? 'BUY' : 'SELL') as "BUY" | "SELL",
          size: found.volume,
          openTime: new Date(found.openTime || found.datetime),
          openPrice: found.openPrice || 0,
          closeTime: new Date(found.datetime),
          closePrice: found.closePrice || 0,
          commission: found.commission || 0,
          swap: found.swap || 0,
          profit: found.profitYen || found.profit || 0,
          sl: found.stopPrice || null,
          tp: found.targetPrice || null,
          pips: found.pips,
        };
      }
    }

    return allTrades.length > 0 ? {
      ticket: allTrades[0].ticket || allTrades[0].id,
      item: allTrades[0].pair || allTrades[0].symbol || 'UNKNOWN',
      side: (allTrades[0].side === 'LONG' ? 'BUY' : 'SELL') as "BUY" | "SELL",
      size: allTrades[0].volume,
      openTime: new Date(allTrades[0].openTime || allTrades[0].datetime),
      openPrice: allTrades[0].openPrice || 0,
      closeTime: new Date(allTrades[0].datetime),
      closePrice: allTrades[0].closePrice || 0,
      commission: allTrades[0].commission || 0,
      swap: allTrades[0].swap || 0,
      profit: allTrades[0].profitYen || allTrades[0].profit || 0,
      sl: allTrades[0].stopPrice || null,
      tp: allTrades[0].targetPrice || null,
      pips: allTrades[0].pips,
    } : trades[trades.length - 1];
  }, [dbTrade, allTrades, trades, entryId]);

  const kpi = useMemo(() => ({
    net: row.profit,
    pips: row.pips,
    hold: holdMs(row.openTime, row.closeTime),
    gross: row.profit + row.commission,
    cost: -row.commission,
    rrr: row.sl
      ? Math.abs(row.pips) /
        Math.abs((row.openPrice - row.sl) * pipFactor(row.item))
      : null,
  }), [row]);
  const [last10, setLast10] = useState<Trade[]>([]);

  /* ===== タグ ===== */
  const [tags, setTags] = useState<string[]>([]);
  const addTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
  const removeTag = (t: string) =>
    setTags((prev) => prev.filter((x) => x !== t));

  /* ===== 画像 ===== */
  type Img = { id: string; url: string };
  const IMG_KEY = useMemo(
    () => `trade_detail_images_${row.ticket}`,
    [row.ticket]
  );
  const [images, setImages] = useState<Img[]>([]);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const allowed = ["image/jpeg", "image/png", "image/gif"];
    const accepted = Array.from(files)
      .filter((f) => {
        if (!allowed.includes(f.type)) {
          showToast(`未対応の形式です: ${f.name}`, 'error');
          return false;
        }
        if (f.size > 3 * 1024 * 1024) {
          showToast(`サイズ上限3MBを超えています: ${f.name}`, 'error');
          return false;
        }
        return true;
      })
      .slice(0, 3);
    accepted.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        setImages((prev) => [
          {
            id: `img_${Date.now()}_${Math.random()
              .toString(16)
              .slice(2)}`,
            url,
          },
          ...prev,
        ]);
      };
      reader.readAsDataURL(f);
    });
  };
  const captureCanvas = (canvas?: HTMLCanvasElement | null) => {
    try {
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      setImages((prev) => [
        {
          id: `img_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          url,
        },
        ...prev,
      ]);
    } catch (e) {
      console.warn("canvas capture failed", e);
    }
  };

  /* ===== 直近10件 ===== */
  useEffect(() => {
    if (allTrades.length > 0) {
      // Convert CSV Trade to dummy Trade format
      const converted = allTrades.map(t => ({
        ticket: t.ticket || t.id,
        item: t.pair || t.symbol || 'UNKNOWN',
        side: (t.side === 'LONG' ? 'BUY' : 'SELL') as "BUY" | "SELL",
        size: t.volume,
        openTime: new Date(t.openTime || t.datetime),
        openPrice: t.openPrice || 0,
        closeTime: new Date(t.datetime),
        closePrice: t.closePrice || 0,
        commission: t.commission || 0,
        swap: t.swap || 0,
        profit: t.profitYen || t.profit || 0,
        sl: t.stopPrice || null,
        tp: t.targetPrice || null,
        pips: t.pips,
      }));
      setLast10(converted.slice(-10).reverse());
    } else {
      setLast10(trades.slice(-10).reverse());
    }
  }, [allTrades, trades]);

  /* ===== 折りたたみ状態 ===== */
  const [expandEntry, setExpandEntry] = useState(false);
  const [expandHold, setExpandHold] = useState(false);
  const [expandExit, setExpandExit] = useState(false);
  const [expandAnalysis, setExpandAnalysis] = useState(false);

  /* ===== グラフ ===== */
  const equityRef = useRef<HTMLCanvasElement | null>(null);
  const histRef = useRef<HTMLCanvasElement | null>(null);
  const heatRef = useRef<HTMLCanvasElement | null>(null);
  const chartsRef = useRef<{ eq?: any; hist?: any; heat?: any }>({});

  // グラフ用のデータ準備
  const chartTrades = useMemo(() => {
    console.log('TradeDiaryPage chartTrades: allTrades.length =', allTrades.length, 'useDatabase =', useDatabase);
    if (allTrades.length > 0) {
      const mapped = allTrades.map(t => ({
        ticket: t.ticket || t.id,
        item: t.pair || t.symbol || 'UNKNOWN',
        side: (t.side === 'LONG' ? 'BUY' : 'SELL') as "BUY" | "SELL",
        size: t.volume,
        openTime: new Date(t.openTime || t.datetime),
        openPrice: t.openPrice || 0,
        closeTime: new Date(t.datetime),
        closePrice: t.closePrice || 0,
        commission: t.commission || 0,
        swap: t.swap || 0,
        profit: t.profitYen || t.profit || 0,
        sl: t.stopPrice || null,
        tp: t.targetPrice || null,
        pips: t.pips,
      }));
      console.log('TradeDiaryPage chartTrades: mapped', mapped.length, 'trades');
      return mapped;
    }
    console.log('TradeDiaryPage chartTrades: using dummy trades', trades.length);
    return trades;
  }, [allTrades, trades, useDatabase]);

  useEffect(() => {
    console.log('📊 Chart effect triggered - expandAnalysis:', expandAnalysis, 'chartTrades.length:', chartTrades.length);
    if (!expandAnalysis) {
      console.log('⏸️ Chart rendering skipped - expandAnalysis is false');
      return;
    }
    if (chartTrades.length === 0) {
      console.log('⏸️ Chart rendering skipped - no trades data');
      return;
    }

    console.log('🚀 Starting chart rendering process...');
    let destroyed = false;
    (async () => {
      try {
        // Chart.jsをロード
        console.log('📦 Loading Chart.js...');
        await loadScript(
          "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"
        );
        console.log('✅ Chart.js loaded, version:', (window as any).Chart?.version);
        if (destroyed) return;

        // @ts-ignore
        const Chart = (window as any).Chart;
        if (!Chart) {
          console.error('❌ Chart.js not available on window object');
          return;
        }
        console.log('✅ Chart.js constructor available');

        // 既存のチャートを破棄
        if (chartsRef.current.eq) {
          chartsRef.current.eq.destroy();
        }
        if (chartsRef.current.hist) {
          chartsRef.current.hist.destroy();
        }
        if (chartsRef.current.heat) {
          chartsRef.current.heat.destroy();
        }

        // 累積損益
        console.log('📈 Preparing equity curve data...');
        const eqData = (() => {
          let cum = 0;
          return chartTrades
            .slice()
            .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime())
            .map((t) => ({
              x: t.closeTime.getTime(), // タイムスタンプとして保存
              y: (cum += t.profit),
              date: t.closeTime // 元の日付も保持
            }));
        })();
        console.log('📈 Equity data points:', eqData.length);

        if (!equityRef.current || !histRef.current || !heatRef.current) {
          console.error('❌ Canvas refs not available:', {
            equityRef: !!equityRef.current,
            histRef: !!histRef.current,
            heatRef: !!heatRef.current
          });
          return;
        }
        console.log('✅ All canvas refs available');

        console.log('🎨 Creating equity chart...');
        chartsRef.current.eq = new Chart(
          equityRef.current.getContext("2d")!,
          {
            type: "line",
            data: {
              datasets: [
                {
                  label: "累積損益（円）",
                  data: eqData,
                  parsing: false,
                  tension: 0.1,
                  borderWidth: 2.5,
                  pointRadius: 0,
                  fill: 'origin',
                  backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const {ctx, chartArea, scales} = chart;
                    if (!chartArea) return getAccentColor(0.1);
                    return createProfitGradient(ctx, chartArea, scales);
                  },
                  segment: {
                    borderColor: (ctx: any) => {
                      return ctx.p1.parsed.y >= 0 ? getAccentColor() : getLossColor();
                    }
                  }
                },
              ],
            },
            options: {
              resizeDelay: 150,
              onClick: (event: any, elements: any) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  const clickedData = eqData[index];
                  const clickedDate = clickedData.date;
                  const dateStr = clickedDate.toISOString().split('T')[0];

                  // その日のトレードを抽出
                  const dayTrades = chartTrades.filter(t => {
                    const tradeDateStr = t.closeTime.toISOString().split('T')[0];
                    return tradeDateStr === dateStr;
                  });

                  if (dayTrades.length > 0) {
                    setEquityCurveDayPanel({ dateLabel: dateStr, trades: dayTrades });
                  }
                }
              },
              scales: {
                x: {
                  type: "linear",
                  ticks: {
                    callback: (value: any) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
                    }
                  }
                },
                y: {
                  ticks: {
                    callback: (v: number) => v.toLocaleString("ja-JP"),
                  },
                },
              },
              plugins: { legend: { display: false } },
              maintainAspectRatio: false,
            },
          }
        );

        // ヒストグラム
        const histCounts = (values: number[], step: number) => {
          const min = Math.min(...values),
            max = Math.max(...values);
          const s = Math.floor(min / step) * step,
            e = Math.ceil(max / step) * step;
          const bins: { x: number; y: number }[] = [];
          for (let v = s; v <= e; v += step) bins.push({ x: v, y: 0 });
          values.forEach((v) => {
            const i = Math.min(
              bins.length - 1,
              Math.max(0, Math.floor((v - s) / step))
            );
            bins[i].y += 1;
          });
          return bins;
        };
        const histLabels = histCounts(chartTrades.map((t) => t.profit), 2000).map(
          (b) => b.x
        );
        const histVals = histCounts(chartTrades.map((t) => t.profit), 2000).map(
          (b) => b.y
        );
        console.log('📊 Creating histogram with', histLabels.length, 'bins');
        chartsRef.current.hist = new Chart(
          histRef.current.getContext("2d")!,
          {
            type: "bar",
            data: {
              labels: histLabels.map((x) => x.toLocaleString("ja-JP")),
              datasets: [{ label: "件数（円）", data: histVals }],
            },
            options: {
              resizeDelay: 150,
              scales: {
                x: {
                  ticks: {
                    callback: (_: any, i: number) =>
                      histLabels[i].toLocaleString("ja-JP"),
                  },
                },
              },
              plugins: { legend: { display: false } },
              maintainAspectRatio: false,
            },
          }
        );

        // ヒートマップ（データ集計）
        const dataAggregationStart = performance.now();
        const weekday = (d: Date) => (d.getDay() + 6) % 7;
        const hour = (d: Date) => d.getHours();
        const grid = Array.from({ length: 7 }, (_, r) =>
          Array.from({ length: 24 }, (_, c) => ({ r, c, win: 0, total: 0 }))
        );
        chartTrades.forEach((t) => {
          const r = weekday(t.closeTime),
            c = hour(t.closeTime);
          grid[r][c].total += 1;
          if (t.profit > 0) grid[r][c].win += 1;
        });
        const dataAggregationTime = performance.now() - dataAggregationStart;
        console.log(`⏱️ Data aggregation: ${dataAggregationTime.toFixed(2)}ms for ${chartTrades.length} trades`);
        // Canvasに直接ヒートマップを描画
        const drawingStart = performance.now();
        console.log('🎨 Drawing heatmap directly on canvas...');
        const heatCtx = heatRef.current.getContext("2d")!;
        const canvas = heatRef.current;
        const width = canvas.width;
        const height = canvas.height;

        // パディングとセルサイズを計算
        const leftPadding = 40;
        const bottomPadding = 30;
        const topPadding = 10;
        const rightPadding = 10;
        const chartWidth = width - leftPadding - rightPadding;
        const chartHeight = height - topPadding - bottomPadding;
        const cellWidth = chartWidth / 24;
        const cellHeight = chartHeight / 7;

        // 背景をクリア
        heatCtx.clearRect(0, 0, width, height);

        // グリッドを描画
        grid.forEach((row, r) => {
          row.forEach((cell, c) => {
            const winRate = cell.total ? (cell.win / cell.total) * 100 : 0;
            const alpha = cell.total === 0 ? 0.05 : Math.min(0.9, 0.15 + 0.007 * winRate);

            heatCtx.fillStyle = `rgba(1, 161, 255, ${alpha})`;
            heatCtx.fillRect(
              leftPadding + c * cellWidth,
              topPadding + r * cellHeight,
              cellWidth - 1,
              cellHeight - 1
            );

            // 勝率テキストを表示（データがある場合のみ）
            if (cell.total > 0) {
              heatCtx.fillStyle = winRate > 50 ? 'white' : '#333';
              heatCtx.font = '9px sans-serif';
              heatCtx.textAlign = 'center';
              heatCtx.textBaseline = 'middle';
              heatCtx.fillText(
                `${Math.round(winRate)}%`,
                leftPadding + c * cellWidth + cellWidth / 2,
                topPadding + r * cellHeight + cellHeight / 2
              );
            }
          });
        });

        // 軸ラベルを描画
        heatCtx.fillStyle = '#666';
        heatCtx.font = '11px sans-serif';

        // X軸（時間）
        for (let h = 0; h < 24; h += 3) {
          heatCtx.textAlign = 'center';
          heatCtx.fillText(
            `${h}時`,
            leftPadding + h * cellWidth + cellWidth / 2,
            height - 10
          );
        }

        // Y軸（曜日）
        const days = ["月", "火", "水", "木", "金", "土", "日"];
        days.forEach((day, i) => {
          heatCtx.textAlign = 'right';
          heatCtx.textBaseline = 'middle';
          heatCtx.fillText(
            day,
            leftPadding - 10,
            topPadding + i * cellHeight + cellHeight / 2
          );
        });

        const drawingTime = performance.now() - drawingStart;
        const totalTime = performance.now() - dataAggregationStart;
        console.log(`✅ Heatmap drawn successfully`);
        console.log(`📊 Performance:`);
        console.log(`   - Data aggregation: ${dataAggregationTime.toFixed(2)}ms`);
        console.log(`   - Canvas drawing: ${drawingTime.toFixed(2)}ms`);
        console.log(`   - Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`   - Cells drawn: 168 (7×24)`);
        console.log(`   - Trades processed: ${chartTrades.length}`);

        // ダミーのチャートオブジェクトを作成（既存のコードとの互換性のため）
        chartsRef.current.heat = {
          destroy: () => {
            const ctx = heatRef.current?.getContext("2d");
            if (ctx && heatRef.current) {
              ctx.clearRect(0, 0, heatRef.current.width, heatRef.current.height);
            }
          }
        } as any;
        console.log('✅ All charts created successfully');
      } catch (e) {
        console.error('❌ Error creating charts:', e);
      }
    })();
    return () => {
      destroyed = true;
      try {
        chartsRef.current.eq?.destroy();
      } catch {}
      try {
        chartsRef.current.hist?.destroy();
      } catch {}
      try {
        chartsRef.current.heat?.destroy();
      } catch {}
      chartsRef.current = {};
    };
  }, [chartTrades, expandAnalysis]);

  /* ===== クイック日記（簡易） ===== */
  type QuickMemo = {
    tempId: string;
    symbol: string;
    side: "BUY" | "SELL";
    entry: { planned?: number; actual?: number; size?: number; time: string };
    entry_emotion?: string;
    ai: { side?: string; follow?: string };
    note?: string;
    linkedTo?: string | null;
  };
  const QUICK_KEY = "quick_memos_v1";
  const loadQuick = (): QuickMemo[] => {
    try {
      return JSON.parse(localStorage.getItem(QUICK_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const saveQuick = (arr: QuickMemo[]) =>
    localStorage.setItem(QUICK_KEY, JSON.stringify(arr));
  const [pending, setPending] = useState<QuickMemo[]>([]);

  useEffect(() => {
    setPending(loadQuick().filter((m) => !m.linkedTo));
  }, []);

  /* ===== トレード日記：選択肢・状態 ===== */
  const ENTRY_BASIS_OPTS = [
    "押し目・戻り",
    "ブレイク",
    "ダブルトップ／ダブルボトム",
    "三角持ち合い／ペナント／フラッグ",
    "チャネル反発／上限・下限タッチ",
    "だまし（フェイク）",
    "ピンバー／包み足／はらみ足",
    "フィボ反発（38.2／50／61.8)",
  ];
  const TECH_OPTS = [
    "MAクロス（ゴールデン／デッド）",
    "ボリンジャー（±2σタッチ→内戻り）",
    "RSI 50回復／割れ",
    "RSI 過熱（70↑）／逆張り（30↓）",
    "一目均衡表合致（雲反発／雲抜け／三役）",
    "MACDクロス（上向き／下向き）",
    "フィボ合致（38.2／50／61.8）",
    "ピボット（R1／R2／S1／S2）",
    "ATR 高め／低め",
    "ADX 強め／弱め",
  ];
  const MARKET_OPTS = [
    "トレンド相場",
    "レンジ相場",
    "市場オープン切替（東京→欧州／欧州→NY）",
    "ボラ高め",
    "ボラ低め",
    "高値圏",
    "安値圏",
    "薄商い",
    "オプションバリア付近",
    "ニュース直後",
    "指標前",
  ];
  const INTRA_EMO_OPTS = [
    "余裕があった",
    "不安が増えた",
    "早く逃げたい",
    "欲が出た",
    "含み益に固執",
    "含み損に耐えた",
    "判断がぶれた",
    "集中が切れた",
    "予定通りに待てた",
  ];
  const PRERULE_OPTS = [
    "逆指値は必ず置く",
    "損切り幅を固定",
    "直近足の下/上に損切り",
    "分割エントリー",
    "分割利確",
    "トレーリング",
    "指標またぎ回避",
    "1日の取引は◯回まで",
  ];
  const EXIT_TRIG_OPTS = [
    "目標価格に到達",
    "逆指値に到達（損切り）",
    "想定価格に達した（部分／全）",
    "損益表示に影響された",
    "指標が近づいた",
    "ボラ急変",
    "形状が崩れた",
    "時間切れ（ルール時間）",
    "AIシグナル終了／反転",
    "ほかのセットアップ優先",
  ];
  const AI_PROS_OPTS = [
    "ポジションの精度",
    "エントリーのタイミング",
    "利確＆損切りライン",
    "根拠が分かりやすい",
  ];
  const FUND_OPTS = [
    "金利見通し",
    "中銀スタンス",
    "景気サプライズ",
    "インフレ圧力",
    "リスクオン・リスクオフ",
    "原油・商品",
    "ポジション偏り",
    "地政学ヘッドライン",
  ];

  const [entryEmotion, setEntryEmotion] = useState("");
  const [entryBasis, setEntryBasis] = useState<string[]>([]);
  const [techSet, setTechSet] = useState<string[]>([]);
  const [marketSet, setMarketSet] = useState<string[]>([]);
  const [fundSet, setFundSet] = useState<string[]>([]);
  const [fundNote, setFundNote] = useState("");

  const [intraEmotion, setIntraEmotion] = useState<string[]>([]);
  const [preRules, setPreRules] = useState<string[]>([]);
  const [ruleExec, setRuleExec] = useState("");
  const [holdNote, setHoldNote] = useState("");

  useEffect(() => {
    const loadTradeNote = async () => {
      try {
        const { data, error } = await supabase
          .from('trade_notes')
          .select('*')
          .eq('ticket', row.ticket)
          .maybeSingle();

        if (error) {
          console.error('Error loading trade note:', error);
          return;
        }

        if (data) {
          setEntryEmotion(data.entry_emotion || '');
          setEntryBasis(Array.isArray(data.entry_basis) ? data.entry_basis : []);
          setTechSet(Array.isArray(data.tech_set) ? data.tech_set : []);
          setMarketSet(Array.isArray(data.market_set) ? data.market_set : []);
          setFundSet(Array.isArray(data.fund_set) ? data.fund_set : []);
          setFundNote(data.fund_note || '');
          setExitTriggers(Array.isArray(data.exit_triggers) ? data.exit_triggers : []);
          setExitEmotion(data.exit_emotion || '');
          setNoteRight(data.note_right || '');
          setNoteWrong(data.note_wrong || '');
          setNoteNext(data.note_next || '');
          setNoteFree(data.note_free || '');
          setTags(Array.isArray(data.tags) ? data.tags : []);
          setImages(Array.isArray(data.images) ? data.images : []);
        }
      } catch (e) {
        console.error('Exception loading trade note:', e);
      }
    };

    loadTradeNote();
  }, [row.ticket]);

  const [aiSide, setAiSide] = useState("");
  const [aiFollow, setAiFollow] = useState("選択しない");
  const [aiHit, setAiHit] = useState("未評価");
  const [aiPros, setAiPros] = useState<string[]>([]);
  const [aiNote, setAiNote] = useState("");

  const [exitTriggers, setExitTriggers] = useState<string[]>([]);
  const [exitEmotion, setExitEmotion] = useState("");

  const [noteRight, setNoteRight] = useState("");
  const [noteWrong, setNoteWrong] = useState("");
  const [noteNext, setNoteNext] = useState("");
  const [noteFree, setNoteFree] = useState("");

  /* ===== タグモーダル ===== */
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const openTagModal = () => setTagModalOpen(true);
  const closeTagModal = () => setTagModalOpen(false);
  const addTagDirect = (t: string) => {
    if (!t.trim()) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t.trim()]));
  };

  /* ===== 保存 ===== */
  const savePayload = async () => {
    if (!useDatabase) {
      showToast('デモデータには取引ノートを追加できません', 'error');
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('trade_notes')
        .select('id')
        .eq('ticket', row.ticket)
        .maybeSingle();

      const noteData = {
        ticket: row.ticket,
        entry_emotion: entryEmotion,
        entry_basis: entryBasis,
        tech_set: techSet,
        market_set: marketSet,
        fund_set: fundSet,
        fund_note: fundNote,
        exit_triggers: exitTriggers,
        exit_emotion: exitEmotion,
        note_right: noteRight,
        note_wrong: noteWrong,
        note_next: noteNext,
        note_free: noteFree,
        tags: tags,
        images: images,
        ai_advice: '',
        ai_advice_pinned: false,
      };

      let error;
      if (existing) {
        ({ error } = await supabase
          .from('trade_notes')
          .update(noteData)
          .eq('ticket', row.ticket));
      } else {
        ({ error } = await supabase
          .from('trade_notes')
          .insert(noteData));
      }

      if (error) {
        console.error('Error saving trade note:', error);
        showToast('保存に失敗しました', 'error');
      } else {
        showToast('このトレードの記録を保存しました。お疲れさまでした。', 'success');
      }
    } catch (e) {
      console.error('Exception saving trade note:', e);
      showToast('保存中にエラーが発生しました', 'error');
    }
  };

  /* ===== JSX ===== */
  if (loading) {
    return (
      <section className="td-root">
        <div style={{ padding: 40, textAlign: 'center' }}>読み込み中...</div>
      </section>
    );
  }

  if (entryId && !dbTrade && allTrades.length === 0) {
    return (
      <section className="td-root">
        <div style={{ padding: 40, textAlign: 'center' }}>取引データが見つかりません</div>
      </section>
    );
  }

  return (
    <section className="td-root">
      {/* 戻るボタンとタイトル */}
      {entryId && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4, 20px)', minHeight: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              {row.item}｜{fmtPrice(row.openPrice, row.item)}｜{row.side === "BUY" ? "買い" : "売り"}｜<span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>Ticket:{row.ticket}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>損益</div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: kpi.net >= 0 ? 'var(--gain)' : 'var(--loss)'
              }}>
                {(kpi.net >= 0 ? "+" : "") + Math.round(kpi.net).toLocaleString("ja-JP")}円
              </div>
            </div>
            <button
              className="nav-btn"
              onClick={() => window.location.hash = '/notebook'}
              style={{ fontSize: 14 }}
            >
              ノート一覧
            </button>
          </div>
        </div>
      )}

      {/* 既存配線トリガ（上部） */}

      {/* KPI */}
      <div className="kpi-grid">
        <div className="td-card"><div className="lab">pips</div><div className="val" style={{ color: kpi.pips >= 0 ? getAccentColor() : getLossColor() }}>{(kpi.pips >= 0 ? "+" : "") + kpi.pips.toFixed(1)}</div></div>
        <div className="td-card"><div className="lab">保有時間</div><div className="val">{fmtHoldJP(kpi.hold)}</div></div>
        <div className="td-card"><div className="lab">スワップポイント</div><div className="val" style={{ color: row.swap >= 0 ? getAccentColor() : getLossColor() }}>{(row.swap >= 0 ? "+" : "-") + Math.floor(Math.abs(row.swap)).toLocaleString("ja-JP")}円</div></div>
        <div className="td-card"><div className="lab">リスクリワード</div><div className="val">{kpi.rrr ? kpi.rrr.toFixed(2) : "—"}</div></div>
      </div>

      {/* トレード情報 */}
      <section className="td-card compact td-trade-info" id="tradeInfoCard" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>通貨ペア</div>
            <div style={{ fontWeight: 500 }}>{row.item}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>ポジション</div>
            <div style={{ fontWeight: 500 }}>{row.side === "BUY" ? "買い" : "売り"}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>サイズ</div>
            <div style={{ fontWeight: 500 }}>{row.size.toFixed(2)} lot</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>指値/逆指値</div>
            <div style={{ fontWeight: 500 }}>— / {row.sl ?? "—"}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>エントリー価格＜時刻＞</div>
            <div style={{ fontWeight: 500 }}><strong>{row.openPrice}</strong> ＜{row.openTime.toLocaleString()}＞</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>決済価格＜時刻＞</div>
            <div style={{ fontWeight: 500 }}><strong>{row.closePrice}</strong> ＜{row.closeTime.toLocaleString()}＞</div>
          </div>
        </div>
      </section>

      {/* 2列グリッド */}
      <div className="grid-main" style={{ marginTop: 16 }}>
        {/* 左列 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* トレード日記 */}
          <div className="td-diary-heading" style={{ marginTop: 0, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>トレード日記</h2>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                background: (() => {
                  const count = [fundNote.trim(), holdNote.trim(), noteFree.trim()].filter(Boolean).length;
                  return count === 3 ? 'var(--accent)' : 'var(--chip)';
                })(),
                color: (() => {
                  const count = [fundNote.trim(), holdNote.trim(), noteFree.trim()].filter(Boolean).length;
                  return count === 3 ? '#fff' : 'var(--ink)';
                })(),
                fontSize: 13,
                fontWeight: 600
              }}>
                {(() => {
                  const count = [fundNote.trim(), holdNote.trim(), noteFree.trim()].filter(Boolean).length;
                  return count === 3 ? '✓ すべて記録済み 🎉' : `記録の進捗：${count}/3`;
                })()}
              </div>
            </div>
            <button className="td-btn" onClick={savePayload}>保存</button>
          </div>
          {(() => {
            const count = [fundNote.trim(), holdNote.trim(), noteFree.trim()].filter(Boolean).length;
            return count < 3 ? (
              <div style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                marginBottom: 16
              }}>
                <img
                  src={getCoachAvatarById('teacher')}
                  alt="AIコーチ"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '3px solid var(--line)'
                  }}
                />
                <div style={{
                  position: 'relative',
                  flex: 1,
                  padding: '14px 18px',
                  background: 'var(--surface)',
                  border: '2px solid var(--line)',
                  borderRadius: '12px',
                  fontSize: 14,
                  color: 'var(--ink)',
                  lineHeight: 1.7
                }}>
                  <div style={{
                    position: 'absolute',
                    left: -10,
                    top: 20,
                    width: 0,
                    height: 0,
                    borderTop: '10px solid transparent',
                    borderBottom: '10px solid transparent',
                    borderRight: '10px solid var(--line)'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    left: -7,
                    top: 21,
                    width: 0,
                    height: 0,
                    borderTop: '9px solid transparent',
                    borderBottom: '9px solid transparent',
                    borderRight: '9px solid var(--surface)'
                  }}></div>
                  まずは①②③に一言ずつメモするだけでOKです。書くのが難しいときは「AIにふり返ってもらう」を使ってみてください。
                </div>
              </div>
            ) : null;
          })()}

          {/* エントリー前・直後 */}
          <section className="td-card td-entry-before" id="entryBeforeCard" style={{
            marginTop: 0,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{
              background: 'var(--bg)',
              padding: '10px 16px',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0
              }}>1</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>エントリー前・直後（まずは一言でOK）</h2>
            </div>

            <label>
              <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>まずはここだけ書けばOKです。</div>
              <textarea
                className="note"
                value={fundNote}
                onChange={(e) => {
                  setFundNote(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="例）どんなニュースや形状を見てエントリーしたか、一言で書いてみましょう。"
                style={{
                  fontSize: 14,
                  minHeight: '100px',
                  resize: 'vertical',
                  lineHeight: 1.6,
                  padding: '12px'
                }}
              />
            </label>

            <div style={{
              fontSize: 12,
              color: '#0EA5E9',
              marginTop: 8,
              fontStyle: 'italic'
            }}>
              💬 AI：理由を一言残しておくと、後で分析しやすくなります。
            </div>

            <button
              type="button"
              className="td-btn"
              style={{ marginTop: 12, width: "100%" }}
              onClick={() => setExpandEntry(!expandEntry)}
            >
              {expandEntry ? "閉じる" : "余裕があれば詳しく振り返る"}
            </button>

            {expandEntry && (
              <div style={{ marginTop: 12 }}>
                <div>
                  <div className="muted small" style={{ marginBottom: 8 }}>エントリーしたとき、どんな気持ちでしたか？</div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8
                  }}>
                    {[
                      { emoji: '😊', label: '落ち着いていた' },
                      { emoji: '😎', label: '自信あり' },
                      { emoji: '😬', label: '少し焦っていた' },
                      { emoji: '😐', label: 'なんとなく' },
                      { emoji: '😓', label: '負けを取り返したい' },
                      { emoji: '😕', label: '迷いがある' },
                      { emoji: '😰', label: '置いていかれ不安' }
                    ].map(item => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setEntryEmotion(item.label)}
                        style={{
                          padding: '8px 12px',
                          border: entryEmotion === item.label ? '2px solid var(--accent)' : '1px solid #E5E5EA',
                          background: entryEmotion === item.label ? '#F0F9FF' : '#fff',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{item.emoji}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <MultiSelect label="エントリーの主な根拠を選んでください（最大2つ）" value={entryBasis} onChange={setEntryBasis}
                  options={ENTRY_BASIS_OPTS} triggerId="msEntryBasisBtn" menuId="msEntryBasisMenu" />
                <MultiSelect label="使ったテクニカル指標はありますか？（最大2つ）" value={techSet} onChange={setTechSet}
                  options={TECH_OPTS} triggerId="msTechBtn" menuId="msTechMenu" />
                <MultiSelect label="そのときの相場はどんな状況でしたか？（最大2つ）" value={marketSet} onChange={setMarketSet}
                  options={MARKET_OPTS} triggerId="msMarketBtn" menuId="msMarketMenu" />
                <MultiSelect label="意識したファンダメンタルズ要因は？（最大2つ）" value={fundSet} onChange={setFundSet}
                  options={FUND_OPTS} triggerId="msFundBtn" menuId="msFundMenu" />

                <div className="hr" />

                <h3 style={{ margin: "12px 0 8px 0", fontSize: 15, color: "var(--muted)" }}>AIの予想</h3>
                <label>
                  <select
                    className="select"
                    value={aiSide}
                    onChange={(e) => setAiSide(e.target.value)}
                    style={{
                      background: aiSide ? 'var(--bg)' : 'var(--surface)'
                    }}
                  >
                    <option value="">AIのポジション予測</option><option>買い</option><option>売り</option><option>様子見</option>
                  </select>
                </label>
                <label>
                  <select
                    className="select"
                    value={aiFollow}
                    onChange={(e) => setAiFollow(e.target.value)}
                    style={{
                      background: aiFollow ? 'var(--bg)' : 'var(--surface)'
                    }}
                  >
                    <option value="">取引の判断</option><option>従った</option><option>一部従った</option><option>従わなかった</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          {/* ポジション保有中 */}
          <section className="td-card td-position-hold" id="positionHoldCard" style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{
              background: 'var(--bg)',
              padding: '10px 16px',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0
              }}>2</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>ポジション保有中（書ければでOK）</h2>
            </div>

            <label>
              <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>書ける範囲で大丈夫です。</div>
              <textarea
                className="note"
                value={holdNote}
                onChange={(e) => {
                  setHoldNote(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="例）含み益や含み損が出てきたときの気持ちを簡単にメモしておきましょう。"
                style={{
                  fontSize: 14,
                  minHeight: '100px',
                  resize: 'vertical',
                  lineHeight: 1.6,
                  padding: '12px'
                }}
              />
            </label>

            <div style={{
              fontSize: 12,
              color: '#0EA5E9',
              marginTop: 8,
              fontStyle: 'italic'
            }}>
              💬 AI：保有中の感情は、あなたのクセを見抜く鍵になります。
            </div>

            <button
              type="button"
              className="td-btn"
              style={{ marginTop: 12, width: "100%" }}
              onClick={() => setExpandHold(!expandHold)}
            >
              {expandHold ? "閉じる" : "余裕があれば詳しく振り返る"}
            </button>

            {expandHold && (
              <div style={{ marginTop: 12 }}>
                <MultiSelect label="保有している間、どんな気持ちの変化がありましたか？（最大2つ）" value={intraEmotion} onChange={setIntraEmotion}
                  options={INTRA_EMO_OPTS} triggerId="msInTradeEmotionBtn" menuId="msInTradeEmotionMenu" />
                <MultiSelect label="今回意識していたルールは？（最大2つ）" value={preRules} onChange={setPreRules}
                  options={PRERULE_OPTS} triggerId="msPreRulesBtn" menuId="msPreRulesMenu" />
                <label>
                  <div className="muted small" style={{ marginBottom: 4 }}>今回のトレードで、事前のルールは守れましたか？</div>
                  <select
                    className="select"
                    value={ruleExec}
                    onChange={(e) => setRuleExec(e.target.value)}
                    style={{
                      background: ruleExec ? 'var(--bg)' : 'var(--surface)'
                    }}
                  >
                    <option value="">選択してください</option><option>しっかり守れた</option><option>一部守れなかった</option><option>守れなかった</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          {/* ポジション決済後 */}
          <section className="td-card td-exit" id="exitCard" style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{
              background: 'var(--bg)',
              padding: '10px 16px',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0
              }}>3</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>ポジション決済後（ここだけでも大丈夫）</h2>
            </div>

            <label>
              <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>ここだけでも書いておくと後から振り返りやすくなります。</div>
              <textarea
                className="note"
                value={noteFree}
                onChange={(e) => {
                  setNoteFree(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="例）結果を見てどう感じたか、次に活かしたいことを一言書いてみてください。"
                style={{
                  fontSize: 14,
                  minHeight: '120px',
                  resize: 'vertical',
                  lineHeight: 1.6,
                  padding: '12px'
                }}
              />
            </label>

            <div style={{
              fontSize: 12,
              color: '#0EA5E9',
              marginTop: 8,
              fontStyle: 'italic'
            }}>
              💬 AI：最後に"次の一手"を一言書くと改善が進みます。
            </div>

            <button
              type="button"
              className="td-btn"
              style={{ marginTop: 12, width: "100%" }}
              onClick={() => setExpandExit(!expandExit)}
            >
              {expandExit ? "閉じる" : "余裕があれば詳しく振り返る"}
            </button>

            {expandExit && (
              <div style={{ marginTop: 12 }}>
                <MultiSelect label="何がきっかけで決済しましたか？（最大2つ）" value={exitTriggers} onChange={setExitTriggers}
                  options={EXIT_TRIG_OPTS} triggerId="msExitTriggerBtn" menuId="msExitTriggerMenu" />
                <div>
                  <div className="muted small" style={{ marginBottom: 8 }}>決済した瞬間の気持ちに一番近いものを選んでください。</div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8
                  }}>
                    {[
                      { emoji: '😊', label: '予定通りで満足' },
                      { emoji: '😰', label: '早く手放したい' },
                      { emoji: '😔', label: 'もっと引っ張れた' },
                      { emoji: '😨', label: '怖くなった' },
                      { emoji: '😌', label: '安堵した' },
                      { emoji: '😤', label: '悔しい' },
                      { emoji: '😓', label: '反省している' }
                    ].map(item => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setExitEmotion(item.label)}
                        style={{
                          padding: '8px 12px',
                          border: exitEmotion === item.label ? '2px solid var(--accent)' : '1px solid #E5E5EA',
                          background: exitEmotion === item.label ? '#F0F9FF' : '#fff',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{item.emoji}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <label>
                  <div className="muted small" style={{ marginBottom: 4 }}>AIの予想は当たっていましたか？</div>
                  <select
                    className="select"
                    value={aiHit}
                    onChange={(e) => setAiHit(e.target.value)}
                    style={{
                      background: aiHit ? 'var(--bg)' : 'var(--surface)'
                    }}
                  >
                    <option value="">選択してください</option><option>当たり</option><option>惜しい</option><option>外れ</option>
                  </select>
                </label>
                <MultiSelect label="AIのどんな点が役に立ちましたか？（最大2つ）" value={aiPros} onChange={setAiPros}
                  options={AI_PROS_OPTS} triggerId="msAiProsBtn" menuId="msAiProsMenu" />

                <div className="note-vertical" style={{ marginTop: 12 }}>
                  <label>
                    <div className="muted small" style={{ marginBottom: 6 }}>今回のトレードでうまくいったことは？</div>
                    <textarea
                      className="note"
                      value={noteRight}
                      onChange={(e) => {
                        setNoteRight(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      placeholder="例）エントリー前にしっかり水平線を引いて待てた。損切りラインも事前に決めていたので迷わず実行できた。"
                      style={{
                        fontSize: 14,
                        minHeight: '80px',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        padding: '12px'
                      }}
                    />
                  </label>
                  <label>
                    <div className="muted small" style={{ marginBottom: 6, marginTop: 12 }}>次回改善したいことは？</div>
                    <textarea
                      className="note"
                      value={noteWrong}
                      onChange={(e) => {
                        setNoteWrong(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      placeholder="例）利確が早すぎた。もう少し引っ張れば目標価格に到達していた。感情で決済してしまった。"
                      style={{
                        fontSize: 14,
                        minHeight: '80px',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        padding: '12px'
                      }}
                    />
                  </label>
                  <label>
                    <div className="muted small" style={{ marginBottom: 6, marginTop: 12 }}>次はどうすると決めましたか？</div>
                    <textarea
                      className="note"
                      value={noteNext}
                      onChange={(e) => {
                        setNoteNext(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      placeholder="例）利確ポイントを2段階に分けて、半分は早めに、残りは目標価格まで引っ張る。チャートに目標価格のラインを引いておく。"
                      style={{
                        fontSize: 14,
                        minHeight: '80px',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        padding: '12px'
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 右列 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* トレード日記見出しと高さを揃える */}
          <div className="td-diary-heading" style={{ marginTop: 0 }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 700, opacity: 0, pointerEvents: "none" }}>スペーサー</h2>
          </div>

          {/* 画像アップロード */}
          <section className="td-card" id="imageCard">
            <div className="td-section-title"><h2>画像</h2></div>
            <div className="upanel">
              <div className="uactions">
                <label className="td-btn" htmlFor="imgFile">画像を選択</label>
                <span className="small muted">.jpg/.jpeg/.gif/.png、上限 <strong>3ファイル・3MB</strong></span>
                <button
                  className="td-btn"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    captureCanvas(equityRef.current);
                    captureCanvas(histRef.current);
                    captureCanvas(heatRef.current);
                    showToast("3つのチャートを保存しました", 'success');
                  }}
                >
                  画像を保存
                </button>
              </div>
              <input
                id="imgFile"
                type="file"
                accept=".jpg,.jpeg,.gif,.png,image/jpeg,image/png,image/gif"
                multiple
                style={{ display: "none" }}
                onChange={(e) => onFiles(e.target.files)}
              />
              <div className="thumbs">
                {images.length === 0 && <div className="muted small">まだ画像はありません。</div>}
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="thumb"
                    onClick={() => setImgPreview(img.url)}
                  >
                    <img src={img.url} alt="chart" />
                    <button
                      className="del"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("削除しますか？")) {
                          setImages(images.filter((x) => x.id !== img.id));
                        }
                      }}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* タグ */}
          <section className="td-card" id="tagCard">
            <div className="td-section-title"><h2>タグ</h2></div>
            <div className="chips-wrap">
              <div className="chips" id="tagArea">
                {tags.map((t) => (
                  <span key={t} className="chip" title="クリックで削除" onClick={() => removeTag(t)}>{t}</span>
                ))}
              </div>
            </div>
            <div className="tag-actions" style={{ marginTop: 12 }}>
              <button className="td-btn" type="button" onClick={openTagModal}>＋タグを追加</button>
            </div>
          </section>

          {/* AIアドバイス */}
          <AIAdviceSection
            tradeData={row}
            kpi={kpi}
            diaryData={{
              entryEmotion,
              entryBasis,
              techSet,
              marketSet,
              exitTriggers,
              exitEmotion,
              noteRight,
              noteWrong,
              noteNext,
            }}
            coachAvatarPreset={userSettings?.coach_avatar_preset || 'teacher'}
            onInsertDraft={(draft) => {
              setNoteFree((prev) => {
                if (prev) {
                  return `${prev}\n\n${draft}`;
                }
                return draft;
              });
            }}
          />
        </div>
      </div>

      {/* 画像プレビュー */}
      {imgPreview && (
        <div className="img-modal" onClick={() => setImgPreview(null)} aria-hidden={false}>
          <img src={imgPreview} alt="preview" />
        </div>
      )}

      {/* リンク済みメモ */}
      <section className="td-card td-card-full">
        <div className="td-section-title">
          <h2>リンク済みメモ</h2>
        </div>
        <div className="linked-memos-table">
          <table>
            <thead>
              <tr>
                <th>タイトル</th>
                <th>種類</th>
                <th>更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loadQuick().filter(m => m.linkedTo).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }} className="muted small">
                    リンク済みメモはありません
                  </td>
                </tr>
              ) : (
                loadQuick().filter(m => m.linkedTo).map((m) => {
                  const linkedTrade = chartTrades.find(t => t.ticket === m.linkedTo);
                  const title = linkedTrade
                    ? `${linkedTrade.item} | ${m.linkedTo === row.ticket ? '取引' : ''}ノート (${new Date(m.entry.time).toLocaleDateString('ja-JP')})`
                    : `メモ (${new Date(m.entry.time).toLocaleDateString('ja-JP')})`;
                  const type = m.linkedTo === row.ticket ? '取引' : '日次';
                  const updated = new Date(m.entry.time).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).replace(/\//g, '/');

                  return (
                    <tr key={m.tempId}>
                      <td>{title}</td>
                      <td>{type}</td>
                      <td>{updated}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="td-btn" onClick={() => {
                            showToast(`詳細表示機能は未実装です`, 'info');
                          }}>表示</button>
                          <button className="td-btn" onClick={() => {
                            if (confirm('このメモのリンクを解除しますか？')) {
                              let arr = loadQuick();
                              const idx = arr.findIndex(x => x.tempId === m.tempId);
                              if (idx >= 0) {
                                arr[idx].linkedTo = undefined;
                                saveQuick(arr);
                                setPending(arr.filter((x) => !x.linkedTo));
                              }
                            }
                          }}>リンク解除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 未リンクメモ（簡易表示） */}
      <section className="td-card td-card-full">
        <div className="td-section-title">
          <h2>保留メモ（未リンク）</h2>
          <span className="pill">{pending.length}件</span>
        </div>
        <div className="pending-list">
          {pending.length === 0 && <div className="muted small">未リンクの仮メモはありません。</div>}
          {pending.map((m) => (
            <div key={m.tempId} className="pending-card">
              <div>
                <div><strong>{m.symbol}</strong> {m.side} <span className="muted small">tempId: {m.tempId}</span></div>
                <div className="pending-meta">
                  予定:{isNaN(m.entry.planned as any) ? "—" : m.entry.planned} /
                  実:{isNaN(m.entry.actual as any) ? "—" : m.entry.actual} /
                  lot {isNaN(m.entry.size as any) ? "—" : m.entry.size} /
                  {new Date(m.entry.time).toLocaleString()}
                </div>
                {m.note && <div className="small">{m.note}</div>}
              </div>
              <div className="pending-actions">
                <button className="td-btn" onClick={() => {
                  const candidates = chartTrades.map((t) => {
                    let score = 0;
                    if (t.item.toUpperCase() === m.symbol.toUpperCase()) score += 40;
                    if (t.side === m.side) score += 20;
                    const td = Math.abs(new Date(t.openTime).getTime() - new Date(m.entry.time).getTime()) / 60000;
                    score += Math.max(0, 20 - Math.min(20, td));
                    const ap = m.entry.actual as any;
                    if (!isNaN(ap)) {
                      const pd = Math.abs(t.openPrice - ap);
                      score += Math.max(0, 20 - Math.min(20, pd * 100));
                    }
                    return { ticket: t.ticket, item: t.item, side: t.side, score };
                  }).sort((a, b) => b.score - a.score).slice(0, 3);
                  showToast(`リンク候補: ${candidates.length}件の取引が見つかりました`, 'info');
                }}>候補を見る</button>
                <button
                  className="td-btn"
                  onClick={() => {
                    if (confirm("削除しますか？")) {
                      let arr = loadQuick();
                      arr = arr.filter((x) => x.tempId !== m.tempId);
                      saveQuick(arr);
                      setPending(arr.filter((x) => !x.linkedTo));
                    }
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* タグ候補モーダル */}
      {tagModalOpen && (
        <div className="modal" onClick={closeTagModal} aria-hidden={false}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <div className="top">
              <h3>タグ候補から追加</h3>
              <button className="td-btn" onClick={closeTagModal}>
                閉じる
              </button>
            </div>

            <div className="row2" style={{ marginBottom: 8 }}>
              <input
                className="input"
                placeholder="自由入力でタグを追加"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value;
                    if (v) {
                      addTagDirect(v);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <button
                className="td-btn"
                onClick={() => {
                  const el =
                    document.querySelector<HTMLInputElement>(
                      ".panel .row2 .input"
                    );
                  if (el && el.value.trim()) {
                    addTagDirect(el.value.trim());
                    el.value = "";
                  }
                }}
              >
                追加
              </button>
            </div>

            {[
              {
                name: "リスク・レバ・サイズ",
                items: ["ハイレバ", "低レバ", "ロット固定", "ロット段階", "リスク控えめ"],
              },
              {
                name: "建玉運用",
                items: ["分割エントリー", "追撃（ピラミ）", "追加NG", "部分撤退", "同値撤退"],
              },
              {
                name: "ストップ/退出",
                items: ["逆指値徹底", "ストップ浅め", "ストップ広め", "トレーリング"],
              },
              {
                name: "利確スタイル",
                items: ["早利確", "引っ張る", "半分利確"],
              },
              {
                name: "ルール/メンタル",
                items: ["コツコツ", "ドカン回避", "ルール順守", "ルール逸脱（要反省）"],
              },
              {
                name: "時間帯・セッション",
                items: [
                  "東京朝（〜9時）",
                  "東京昼（9–15時）",
                  "欧州入り（15–17時）",
                  "ロンドン午後（17–21時）",
                  "NY序盤（22–1時）",
                  "NY引け前（4–6時）",
                ],
              },
            ].map((cat) => (
              <section key={cat.name} style={{ marginTop: 8 }}>
                <h4 style={{ margin: "8px 0" }}>{cat.name}</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {cat.items.map((t) => (
                    <button
                      key={t}
                      className="td-btn"
                      onClick={() => addTagDirect(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {equityCurveDayPanel && (
        <EquityCurveDayDetailDrawer
          date={equityCurveDayPanel.dateLabel}
          trades={equityCurveDayPanel.trades}
          onClose={() => setEquityCurveDayPanel(null)}
        />
      )}
    </section>
  );
}
