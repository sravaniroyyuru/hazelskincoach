import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Must match the exact enum values used in the today page CheckIn questions
const CheckInSchema = z.object({
  skinFeel: z.enum(['great', 'good', 'meh', 'bad']),
  breakouts: z.enum(['none', 'minor', 'moderate', 'bad']),
  routine: z.enum(['full', 'partial', 'skipped']),
  picking: z.enum(['none', 'a-bit', 'yes']),
  mood: z.enum(['great', 'good', 'meh', 'stressed']),
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
      schema: CheckInSchema,
      system: `Extract a daily skin check-in from someone's spoken or written description.

skinFeel (how their skin looks/feels today):
- "great", "amazing", "glowing", "love it" → great
- "good", "pretty good", "not bad", "decent" → good
- "okay", "meh", "average", "so-so", "alright", "fine" → meh
- "bad", "not great", "rough", "struggling", "horrible" → bad
- Default if unclear: meh

breakouts (visible spots/blemishes today):
- "no breakouts", "clear", "no spots", "nothing" → none
- "a spot", "one pimple", "small breakout", "minor" → minor
- "a few spots", "some breakouts", "couple" → moderate
- "lots of breakouts", "bad breakout", "cystic", "loads" → bad
- Default if unclear: none

routine (skincare routine done today):
- "full routine", "did everything", "all my steps", "completed it" → full
- "some", "half", "partial", "skipped a few", "most of it" → partial
- "skipped", "didn't do it", "no routine", "forgot", "none" → skipped
- Default if unclear: partial

picking (touching/picking at skin):
- "hands off", "didn't pick", "no picking", "left it alone" → none
- "a little", "a bit", "touched it once", "barely" → a-bit
- "yes", "picked", "squeezed", "couldn't stop" → yes
- Default if unclear: none

mood (emotional state today):
- "great", "amazing", "brilliant", "happy", "wonderful" → great
- "good", "pretty good", "fine", "okay", "decent" → good
- "meh", "average", "so-so", "okay-ish" → meh
- "stressed", "anxious", "worried", "tired", "exhausted", "overwhelmed" → stressed
- Default if unclear: good`,
      prompt: `Extract daily skin check-in from: "${transcript}"`,
    })

    return Response.json(object)
  } catch (err) {
    console.error('Voice check-in error:', err)
    return Response.json({ error: 'Could not process check-in' }, { status: 500 })
  }
}
