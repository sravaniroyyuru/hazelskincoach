import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName } = await req.json();
    if (!productName || typeof productName !== "string" || productName.trim().length === 0 || productName.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid product name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a skincare product expert. When given a search query, return up to 5 matching skincare products that best match the query. Include exact product names with their brand. For sensitive skin flags, note any potentially irritating ingredients like fragrances, essential oils, high-concentration acids, or known allergens. Always return results using the provided tool.`,
          },
          {
            role: "user",
            content: `Search for skincare products matching: "${productName.trim()}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_products",
              description: "Return a list of matching skincare products",
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Full product name" },
                        brand: { type: "string", description: "Brand name" },
                        category: {
                          type: "string",
                          enum: ["Cleanser", "Moisturizer", "Sunscreen", "Serum", "Toner", "Exfoliant", "Oil", "Mask", "Eye Cream", "Spot Treatment", "Lip Care", "Body Care", "Other"],
                        },
                        keyIngredients: {
                          type: "array",
                          items: { type: "string" },
                          description: "Key active ingredients (max 6)",
                        },
                        flags: {
                          type: "array",
                          items: { type: "string" },
                          description: "Sensitive skin warnings. Empty array if no concerns.",
                        },
                        summary: {
                          type: "string",
                          description: "One sentence summary of what this product does",
                        },
                      },
                      required: ["name", "brand", "category", "keyIngredients", "flags", "summary"],
                    },
                    description: "Up to 5 matching products",
                  },
                },
                required: ["products"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_products" } },
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

    return new Response(JSON.stringify({ products: result.products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
