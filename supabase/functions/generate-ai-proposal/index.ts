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
      console.error('OPENAI_API_KEY is not set in environment variables');
      return new Response(
        JSON.stringify({ error: "Server configuration error: OpenAI API key not set. Please configure OPENAI_API_KEY in Supabase dashboard." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openai = new OpenAI({ apiKey });

    const currentDate = new Date().toISOString().split('T')[0];

    // レート取得関数の定義
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "get_current_exchange_rate",
          description: "指定された通貨ペアの現在の為替レートを取得します。相場分析を行う前に必ずこの関数を呼び出して、最新のレートを確認してください。",
          parameters: {
            type: "object",
            properties: {
              pair: {
                type: "string",
                description: "通貨ペア（例：USD/JPY, EUR/USD, GBP/JPY）",
              },
            },
            required: ["pair"],
          },
        },
      },
    ];

    // レート取得関数の実装
    async function getCurrentExchangeRate(currencyPair: string): Promise<number | null> {
      try {
        const rateResponse = await fetch(`https://open.er-api.com/v6/latest/USD`);
        if (!rateResponse.ok) {
          return null;
        }
        const rateData = await rateResponse.json();

        if (currencyPair === 'USD/JPY' && rateData.rates?.JPY) {
          return Math.round(rateData.rates.JPY * 100) / 100;
        } else if (currencyPair === 'EUR/JPY' && rateData.rates?.EUR && rateData.rates?.JPY) {
          return Math.round((rateData.rates.JPY / rateData.rates.EUR) * 100) / 100;
        } else if (currencyPair === 'GBP/JPY' && rateData.rates?.GBP && rateData.rates?.JPY) {
          return Math.round((rateData.rates.JPY / rateData.rates.GBP) * 100) / 100;
        } else if (currencyPair === 'AUD/JPY' && rateData.rates?.AUD && rateData.rates?.JPY) {
          return Math.round((rateData.rates.JPY / rateData.rates.AUD) * 100) / 100;
        } else if (currencyPair === 'EUR/USD' && rateData.rates?.EUR) {
          return Math.round((1 / rateData.rates.EUR) * 10000) / 10000;
        } else if (currencyPair === 'GBP/USD' && rateData.rates?.GBP) {
          return Math.round((1 / rateData.rates.GBP) * 10000) / 10000;
        }
      } catch (error) {
        console.warn('Failed to fetch current rate:', error);
      }
      return null;
    }

    const systemPrompt = `あなたはプロのFXトレーダーです。ユーザーの入力から、構造化された相場スキャンを生成してください。

今日の日付: ${currentDate}

重要：相場分析を行う前に、必ず get_current_exchange_rate 関数を使って対象通貨ペアの現在の為替レートを取得してください。

以下のJSON形式で回答してください：

{
  "hero": {
    "pair": "通貨ペア",
    "bias": "BUY" | "SELL" | "NEUTRAL",
    "confidence": 0-100の数値,
    "nowYen": 現在の実際の市場価格(数値) - get_current_exchange_rate関数で取得したレートを使用,
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
- 必ず最初に get_current_exchange_rate 関数を呼び出して、現在のレートを取得してください
- nowYenには取得した実際の市場レートを入れてください
- エントリー価格やシナリオの価格も、取得したレートを基準に現実的な値にしてください
- 必ずJSON形式のみで回答し、他のテキストは含めないでください。`;

    const userPrompt = `通貨ペア: ${pair}
分析足: ${timeframe}
予想期間: ${period}
日付: ${currentDate}

ユーザーの要望:
${prompt}

注意：まず get_current_exchange_rate 関数を使って ${pair} の現在のレートを取得してから、そのレートを基準に相場分析を行ってください。`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    // 最初のAPI呼び出し（Function Calling付き）
    let completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
    });

    let responseMessage = completion.choices[0]?.message;

    // Function Callingの処理
    while (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "get_current_exchange_rate") {
          const args = JSON.parse(toolCall.function.arguments);
          const rate = await getCurrentExchangeRate(args.pair);

          messages.push({
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: rate !== null
              ? JSON.stringify({ rate, pair: args.pair })
              : JSON.stringify({ error: "レートの取得に失敗しました" }),
          });
        }
      }

      // 次のAPI呼び出し
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      responseMessage = completion.choices[0]?.message;
    }

    const content = responseMessage?.content;
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