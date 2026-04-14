import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const IntakeSchema = z.object({
  userName: z.string().optional(),
  skinTypes: z.array(z.enum(['oily', 'dry', 'dehydrated', 'combination', 'normal', 'sensitive'])),
  concerns: z.array(z.enum(['acne', 'pigmentation', 'anti-ageing', 'redness', 'texture', 'hydration', 'sensitivity', 'dark-circles'])),
  goals: z.array(z.enum(['clear-skin', 'glow', 'anti-ageing', 'calm-redness', 'hydration', 'consistency'])),
  products: z.array(z.object({
    name: z.string(),
    brand: z.string().optional(),
  })),
  additionalNotes: z.string().optional(),
})

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'API not configured' }, { status: 500 })
  }

  const { transcript } = await request.json()

  if (!transcript?.trim()) {
    return Response.json({ error: 'No transcript provided' }, { status: 400 })
  }

  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: IntakeSchema,
      system: `You are a warm, expert skin intake specialist. Extract structured information from what someone tells you about their skin.

Be generous with your interpretation:
- "blemishes", "spots", "breakouts", "pimples" → acne
- "fine lines", "wrinkles", "ageing", "aging" → anti-ageing
- "uneven tone", "dark spots", "marks", "post-acne marks" → pigmentation
- "oily T-zone, dry cheeks" → combination
- "sensitive", "reactive", "easily irritated" → sensitive
- Any product mentioned: extract the name and brand if given
- If someone says "I want clearer skin" → clear-skin goal
- If someone mentions their name, capture it

If a field isn't mentioned, return an empty array (for arrays) or omit it (for optional strings).
Never fabricate information that wasn't in the transcript.`,
      prompt: `Extract skin profile information from this intake statement: "${transcript}"`,
    })

    return Response.json(object)
  } catch (err) {
    console.error('Voice intake error:', err)
    return Response.json({ error: 'Could not process intake' }, { status: 500 })
  }
}
