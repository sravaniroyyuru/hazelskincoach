import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const AnalysisSchema = z.object({
  summary: z.string(),
  observations: z.array(z.string()),
  overallCondition: z.enum(['clear', 'mild', 'moderate', 'significant']),
  notableFindings: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
})

const ComparisonSchema = z.object({
  summary: z.string(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const { mode = 'single' } = body

  try {
    if (mode === 'compare') {
      return handleCompare(body)
    }
    return handleSingle(body)
  } catch (err) {
    console.error('Photo analysis error:', err)
    return Response.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

async function handleSingle(body: {
  frontPhoto: string
  context?: { skinType?: string; concerns?: string[] }
}) {
  const { frontPhoto, context } = body

  if (!frontPhoto) {
    return Response.json({ error: 'No photo provided' }, { status: 400 })
  }

  const contextText = [
    context?.skinType ? `Skin type: ${context.skinType}` : '',
    context?.concerns?.length ? `Known concerns: ${context.concerns.join(', ')}` : '',
  ].filter(Boolean).join('. ')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: frontPhoto },
        },
        {
          type: 'text',
          text: `You are a warm, careful skin observation assistant. Analyse this person's skin from the photo.
${contextText ? `Context: ${contextText}` : ''}

Important guidelines:
- Describe only what you can visually observe — do not diagnose
- Use warm, non-alarming language — this person may be anxious about their skin
- Never use clinical or medical terminology
- Be honest but kind
- "Notable findings" are only things a dermatologist would genuinely want to know about

Return a JSON object with exactly these fields:
{
  "summary": "1-2 warm sentences describing overall skin appearance",
  "observations": ["specific visible observation", "another observation", ...] (max 4, empty array if nothing notable),
  "overallCondition": "clear" | "mild" | "moderate" | "significant",
  "notableFindings": ["finding worth mentioning to a dermatologist", ...] (empty array if nothing notable),
  "confidence": "high" | "medium" | "low" (based on photo quality and clarity)
}

Return only the JSON object, no other text.`,
        },
      ],
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')

  const parsed = AnalysisSchema.parse(JSON.parse(jsonMatch[0]))
  return Response.json(parsed)
}

async function handleCompare(body: {
  photoA: string
  photoB: string
  dateA: string
  dateB: string
  context?: { skinType?: string; concerns?: string[] }
}) {
  const { photoA, photoB, dateA, dateB, context } = body

  if (!photoA || !photoB) {
    return Response.json({ error: 'Two photos required for comparison' }, { status: 400 })
  }

  const contextText = context?.concerns?.length
    ? `Known concerns: ${context.concerns.join(', ')}.`
    : ''

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: photoA },
        },
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: photoB },
        },
        {
          type: 'text',
          text: `The first image is from ${dateA}. The second image is from ${dateB}. ${contextText}

Compare the two photos and write 2–3 warm, honest sentences describing what appears to have changed in this person's skin between the two dates.

Be specific but kind. If things look better, say so clearly. If there's no visible change, say that too — it's still useful to know. Do not diagnose.

Return a JSON object with one field:
{
  "summary": "your 2-3 sentence comparison"
}

Return only the JSON, no other text.`,
        },
      ],
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')

  const parsed = ComparisonSchema.parse(JSON.parse(jsonMatch[0]))
  return Response.json(parsed)
}
