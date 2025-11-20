import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OpenAI } from "npm:openai@4.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  pair: string;
  timeframe: string;
  period: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { prompt, pair, timeframe, period } = body;

    if (!prompt || !pair || !timeframe || !period) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: OpenAI API key not set" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openai = new OpenAI({ apiKey });

    const currentDate = new Date().toISOString().split('T')[0];

    let currentRate = null;
    try {
      const rateResponse = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();

        if (pair === 'USD/JPY' && rateData.rates?.JPY) {
          currentRate = rateData.rates.JPY;
        } else if (pair === 'EUR/JPY' && rateData.rates?.EUR && rateData.rates?.JPY) {
          currentRate = rateData.rates.JPY / rateData.rates.EUR;
        } else if (pair === 'GBP/JPY' && rateData.rates?.GBP && rateData.rates?.JPY) {
          currentRate = rateData.rates.JPY / rateData.rates.GBP;
        } else if (pair === 'AUD/JPY' && rateData.rates?.AUD && rateData.rates?.JPY) {
          currentRate = rateData.rates.JPY / rateData.rates.AUD;
        } else if (pair === 'EUR/USD' && rateData.rates?.EUR) {
          currentRate = 1 / rateData.rates.EUR;
        } else if (pair === 'GBP/USD' && rateData.rates?.GBP) {
          currentRate = 1 / rateData.rates.GBP;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch current rate:', error);
    }

    const systemPrompt = `あなたはプロのFXトレーダーです。ユーザーの入力から、構造化された相場スキャンを生成してください。

今日の日付: ${currentDate}
${currentRate ? `現在の${pair}レート: ${currentRate.toFixed(2)}` : ''}

以下のJSON形式で回答してください：

{
  "hero": {
    "pair": "通貨ペア",
    "bias": "BUY" | "SELL" | "NEUTRAL",
    "confidence": 0-100の数値,
    "nowYen": 現在の実際の市場価格(数値) - 必ず最新の実勢レートを反映してください,
    "buyEntry": "買いエントリー価格",
    "sellEntry": "売りエントリー価格"
  },
  "daily": {
    "stance": "本日のスタンス（例：戻り売り優先）",
    "session": "推奨セッション（例：東京・欧州前場）",
    "anchor": "アンカーポイント（例：147.00）",
    "riskNote": "リスク注意事項"
  },
  "scenario": {
    "strong": "強気シナリオ（価格推移）",
    "base": "ベースシナリオ（価格推移）",
    "weak": "弱気シナリオ（価格推移）"
  },
  "ideas": [
    {
      "id": "idea-1",
      "side": "買い" | "売り",
      "entry": "エントリー範囲",
      "slPips": 損切りpips(負の数値),
      "tpPips": 利確pips(正の数値),
      "expected": リスクリワード比(数値),
      "confidence": "◎" | "○" | "△"
    }
  ],
  "factors": {
    "technical": ["テクニカル要因1", "テクニカル要因2"],
    "fundamental": ["ファンダメンタル要因1", "ファンダメンタル要因2"],
    "sentiment": ["センチメント要因1", "センチメント要因2"]
  },
  "notes": {
    "memo": ["メモ1", "メモ2", "メモ3"]
  }
}

重要：
- nowYenには必ず現在の実際の市場レートを入れてください（例：USD/JPYなら現在の実勢レート）
- エントリー価格やシナリオの価格も、現在の実際の市場状況を反映した現実的な値にしてください
- 必ずJSON形式のみで回答し、他のテキストは含めないでください。`;

    const userPrompt = `通貨ペア: ${pair}
分析足: ${timeframe}
予想期間: ${period}
日付: ${currentDate}
${currentRate ? `\n現在の実際の市場レート: ${currentRate.toFixed(2)}円` : ''}

ユーザーの要望:
${prompt}

注意：${currentRate ? `nowYenフィールドには上記の現在レート ${currentRate.toFixed(2)} を使用してください。` : 'nowYenフィールドには現在の実際の市場レート（${pair}の実勢価格）を設定してください。'}エントリー価格やシナリオの価格も、この現在レートを基準に現実的な値を設定してください。`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const proposalData = JSON.parse(content);

    return new Response(JSON.stringify(proposalData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
