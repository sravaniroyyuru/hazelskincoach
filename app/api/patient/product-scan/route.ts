import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ProductSchema = z.object({
  identified: z.boolean(),
  name: z.string(),
  brand: z.string().nullable(),
  category: z.string().nullable(),
  keyIngredients: z.array(z.string()),
  flags: z.array(z.string()),
  summary: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
})

export async function POST(request: Request) {
  const { imageBase64, mimeType = 'image/jpeg' } = await request.json()

  if (!imageBase64) {
    return Response.json({ error: 'No image provided' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Identify this skincare product from the photo. Look at the packaging, label, bottle, or ingredients list.

Return a JSON object with exactly these fields:
{
  "identified": true/false,
  "name": "product name",
  "brand": "brand name or null",
  "category": "one of: cleanser, moisturiser, serum, SPF, toner, exfoliant, treatment, eye cream, mask, oil, mist, other",
  "keyIngredients": ["up to 5 key active ingredients"],
  "flags": ["notable flags like: fragrance-free, alcohol-free, retinol, acids, vitamin C, niacinamide, reef-safe, vegan"],
  "summary": "one sentence description of what this product does",
  "confidence": "high/medium/low"
}

If you can't identify a specific product, still try to describe what type of product it appears to be from the packaging.
Return only the JSON object, no other text.`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = ProductSchema.parse(JSON.parse(jsonMatch[0]))
    return Response.json(parsed)
  } catch (err) {
    console.error('Product scan error:', err)
    return Response.json({ error: 'Could not scan product' }, { status: 500 })
  }
}
