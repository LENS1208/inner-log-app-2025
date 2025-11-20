import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.76.1";
import { OpenAI } from "npm:openai@4.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StartJobRequest {
  dataset: string;
  systemPrompt: string;
  userPrompt: string;
}

interface GetJobStatusRequest {
  jobId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;

    if (path.endsWith("/start") && req.method === "POST") {
      const body: StartJobRequest = await req.json();
      const { dataset, systemPrompt, userPrompt } = body;

      if (!dataset || !systemPrompt || !userPrompt) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: existingJob } = await supabase
        .from("ai_coaching_jobs")
        .select("*")
        .eq("user_id", user.id)
        .eq("dataset", dataset)
        .single();

      if (existingJob && (existingJob.status === "pending" || existingJob.status === "processing")) {
        return new Response(
          JSON.stringify({ jobId: existingJob.id, status: existingJob.status }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: job, error: insertError } = await supabase
        .from("ai_coaching_jobs")
        .upsert({
          user_id: user.id,
          dataset,
          status: "pending",
          progress: 0,
        }, { onConflict: "user_id,dataset" })
        .select()
        .single();

      if (insertError || !job) {
        throw new Error("Failed to create job");
      }

      (async () => {
        try {
          await supabase
            .from("ai_coaching_jobs")
            .update({ status: "processing", progress: 10 })
            .eq("id", job.id);

          const apiKey = Deno.env.get("OPENAI_API_KEY");
          if (!apiKey) {
            throw new Error("OpenAI API key not configured");
          }

          await supabase
            .from("ai_coaching_jobs")
            .update({ progress: 30 })
            .eq("id", job.id);

          const openai = new OpenAI({ apiKey });

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
          });

          await supabase
            .from("ai_coaching_jobs")
            .update({ progress: 80 })
            .eq("id", job.id);

          const content = completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No response from OpenAI");
          }

          const coachingData = JSON.parse(content);

          await supabase
            .from("ai_coaching_jobs")
            .update({
              status: "completed",
              progress: 100,
              result: coachingData,
            })
            .eq("id", job.id);
        } catch (error) {
          console.error("Background processing error:", error);
          await supabase
            .from("ai_coaching_jobs")
            .update({
              status: "failed",
              error_message: error instanceof Error ? error.message : "Unknown error",
            })
            .eq("id", job.id);
        }
      })();

      return new Response(
        JSON.stringify({ jobId: job.id, status: "pending" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (path.endsWith("/status") && req.method === "POST") {
      const body: GetJobStatusRequest = await req.json();
      const { jobId } = body;

      if (!jobId) {
        return new Response(
          JSON.stringify({ error: "Missing jobId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from("ai_coaching_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          result: job.result,
          error: job.error_message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (path.endsWith("/check") && req.method === "POST") {
      const body = await req.json();
      const { dataset } = body;

      if (!dataset) {
        return new Response(
          JSON.stringify({ error: "Missing dataset" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: job } = await supabase
        .from("ai_coaching_jobs")
        .select("*")
        .eq("user_id", user.id)
        .eq("dataset", dataset)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ exists: false }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          exists: true,
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          result: job.result,
          error: job.error_message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid endpoint" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});