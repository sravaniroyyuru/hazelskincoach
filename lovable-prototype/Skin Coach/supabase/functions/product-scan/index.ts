import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mode } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Image data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to ~4MB base64
    if (imageBase64.length > 5_500_000) {
      return new Response(JSON.stringify({ error: "Image too large. Please use a smaller photo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scanMode = mode === "ingredients" ? "ingredients" : "product";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = scanMode === "product"
      ? `You are a skincare product identification expert. The user will show you a photo of a skincare product (bottle, tube, jar, box). Identify the exact product — name, brand, category, key ingredients, and any sensitive skin flags. If you can't identify it with confidence, say so. Always use the provided tool to return results.`
      : `You are a skincare ingredient analysis expert. The user will show you a photo of an ingredients list on the back of a skincare product. Extract the ingredients, identify key active ingredients, categorize the product, and flag any ingredients that may irritate sensitive skin (fragrances, essential oils, high-concentration acids, known allergens). Always use the provided tool to return results.`;

    const userPrompt = scanMode === "product"
      ? "Identify this skincare product from the photo. Return the product details."
      : "Extract and analyze the ingredients list from this photo. Return the product details.";

    // Strip data URL prefix if present
    let base64Data = imageBase64;
    let mimeType = "image/jpeg";
    const dataUrlMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_product",
              description: "Return the identified skincare product details",
              parameters: {
                type: "object",
                properties: {
                  identified: { type: "boolean", description: "Whether the product was successfully identified" },
                  name: { type: "string", description: "Full product name" },
                  brand: { type: "string", description: "Brand name" },
                  category: {
                    type: "string",
                    enum: ["Cleanser", "Moisturizer", "Sunscreen", "Serum", "Toner", "Exfoliant", "Oil", "Mask", "Eye Cream", "Spot Treatment", "Lip Care", "Body Care", "Other"],
                  },
                  keyIngredients: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key active ingredients (max 8)",
                  },
                  allIngredients: {
                    type: "array",
                    items: { type: "string" },
                    description: "Full extracted ingredients list (only for ingredient list photos)",
                  },
                  flags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Sensitive skin warnings. Empty if no concerns.",
                  },
                  summary: {
                    type: "string",
                    description: "One sentence summary of what this product does",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "How confident you are in the identification",
                  },
                },
                required: ["identified", "name", "brand", "category", "keyIngredients", "flags", "summary", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_product" } },
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ product: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
