import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BriefSchema = z.object({
  brief: z.string(),
  focusTip: z.string(),
})

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'API not configured' }, { status: 500 })
  }

  const { snapshot, recentCheckins, today } = await request.json()

  if (!recentCheckins?.length || recentCheckins.length < 3) {
    return Response.json({ error: 'Not enough data' }, { status: 400 })
  }

  const checkinsText = recentCheckins
    .slice(0, 7)
    .map((c: { date: string; skinFeel: string; breakouts: string; routine: string; picked: boolean; mood: string }) =>
      `${c.date}: skin=${c.skinFeel}, breakouts=${c.breakouts}, routine=${c.routine}, picked=${c.picked}, mood=${c.mood}`
    )
    .join('\n')

  const skinContext = [
    snapshot?.skinType?.length ? `Skin type: ${snapshot.skinType.join(', ')}` : '',
    snapshot?.concerns?.length ? `Known concerns: ${snapshot.concerns.join(', ')}` : '',
    snapshot?.goals?.length ? `Goals: ${snapshot.goals.join(', ')}` : '',
  ].filter(Boolean).join('. ')

  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: BriefSchema,
      system: `You are Hazel, a warm, insightful skin coach. Every morning you give the user a brief, personalised insight based on their recent skin data.

Rules:
- Be specific — reference actual patterns from the data, never be generic
- Be warm and honest — if things are difficult, acknowledge it without drama
- Brief is 1–2 sentences max. No jargon. Written like a trusted friend who happens to know a lot about skin.
- focusTip is one short action-oriented sentence for today. Not a lecture — a gentle nudge.
- NEVER say "Based on your data" or "According to your check-ins" — just say it naturally
- Reference the day of the week if it creates a pattern observation
- Examples of good briefs: "Your skin was clearest the three days you skipped picking — that streak matters.", "You've been consistent all week. Your skin is about to show it.", "Stressed days always seem to bring a spot or two for you. Worth noticing."
- Examples of bad briefs (too generic): "Keep up with your skincare routine!", "Stay hydrated today."`,
      prompt: `Today is ${today}. Generate a morning brief for this person.

Profile: ${skinContext || 'No profile yet'}

Recent check-ins:
${checkinsText}

Write a brief that's genuinely specific to what you see in this data.`,
    })

    return Response.json(object)
  } catch (err) {
    console.error('Daily brief error:', err)
    return Response.json({ error: 'Could not generate brief' }, { status: 500 })
  }
}
