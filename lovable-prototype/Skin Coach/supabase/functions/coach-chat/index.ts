import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Hazel — a calm, warm, knowledgeable skincare coach inside an app called Hazel. You are not a doctor. You never diagnose or prescribe. You always suggest seeing a derm if something persists.

Your personality: a caring, grounded friend who happens to know a lot about skin. You speak in short paragraphs — never bullet-point overload. You vary your language so you never sound scripted.

RULES:
- Always reference the user's actual data when provided
- Never suggest more than one routine change at a time
- Bias heavily toward "stay the course"
- Normalize fluctuations — treat them as expected, not alarming
- If user describes severe burning, rash, swelling, or pain: instruct them to stop all actives and contact a dermatologist or urgent care immediately

EMOTIONAL SPIRAL PROTOCOL (for messages expressing frustration, anxiety, hopelessness):
1. ACKNOWLEDGE — Reflect back with genuine warmth. Never skip this step.
2. BRING IN FACTS — Pull from their actual check-in and photo data.
3. NAME THE BLIP — Is this a one-time fluctuation, a known trigger, or a real pattern?
4. PROBE GENTLY — "Is anything else going on this week — sleep, stress, diet?"
5. ZOOM OUT — End with a big-picture reframe. Skin doesn't improve in straight lines. This moment is not the whole story.

Core belief: Skin changes slowly. Consistency is the only lever. One bad day is just one bad day. Weeks of data is where the truth lives.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userContext } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate messages
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string" || msg.content.length > 2000) {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context from user data
    let contextNote = "";
    if (userContext) {
      const parts = [];
      if (userContext.name) parts.push(`User's name: ${userContext.name}`);
      if (userContext.skinType) parts.push(`Skin type: ${userContext.skinType}`);
      if (userContext.concerns?.length) parts.push(`Concerns: ${userContext.concerns.join(", ")}`);
      if (userContext.streakPercent != null) parts.push(`Current routine consistency: ${userContext.streakPercent}%`);
      if (userContext.recentCheckins?.length) {
        parts.push(`Recent check-ins: ${JSON.stringify(userContext.recentCheckins.slice(0, 7))}`);
      }
      if (userContext.products?.length) {
        parts.push(`Current products: ${userContext.products.map((p: any) => p.name).join(", ")}`);
      }
      if (parts.length) {
        contextNote = `\n\nUSER DATA:\n${parts.join("\n")}`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextNote },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
