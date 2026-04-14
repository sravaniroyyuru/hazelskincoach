import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const ProductSchema = z.object({
  name: z.string(),
  brand: z.string().nullable(),
  category: z.string().nullable(),
  keyIngredients: z.array(z.string()),
  flags: z.array(z.string()),
  summary: z.string(),
})

const ProductListSchema = z.object({
  results: z.array(ProductSchema).min(1).max(5),
})

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured on server' }, { status: 500 })
  }

  const { query } = await request.json()

  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: ProductListSchema,
      prompt: `Search for skincare products matching: "${query}"

Return up to 5 real matching products. If the query is specific (e.g. a full product name), return exact matches and close variants. If it's vague (e.g. "vitamin c serum"), return the most popular/well-known options across different brands.

For each product return: exact product name, brand, category (cleanser / moisturiser / serum / SPF / toner / exfoliant / treatment / eye cream / oil / mist), key active ingredients (max 5), flags (e.g. "fragrance-free", "reef-safe", "contains retinol", "avoid with acids"), and a one-sentence summary of what it does.`,
    })

    return Response.json(object.results)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not look up product'
    return Response.json({ error: message }, { status: 500 })
  }
}
