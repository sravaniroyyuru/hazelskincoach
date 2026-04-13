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

export async function POST(request: Request) {
  const { query } = await request.json()

  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: ProductSchema,
      prompt: `Look up this skincare product and return structured info: "${query}"

Return the product name, brand, category (e.g. cleanser, moisturiser, serum, SPF, toner, exfoliant, treatment),
key active ingredients (max 5), any flags (e.g. "fragrance-free", "reef-safe", "retinol", "acids - don't layer"),
and a one-sentence summary of what it does.

If the product doesn't exist or you're unsure, make a reasonable inference based on the query.`,
    })

    return Response.json(object)
  } catch {
    return Response.json({ error: 'Could not look up product' }, { status: 500 })
  }
}
