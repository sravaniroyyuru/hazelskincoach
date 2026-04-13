import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const ReportSchema = z.object({
  skinProfile: z.string(),
  currentRoutine: z.string(),
  recentHistory: z.string(),
  trends: z.string(),
  concerns: z.string(),
  questionsForDerm: z.array(z.string()),
  summary: z.string(),
})

export async function POST(request: Request) {
  const { snapshot, checkins, appointmentDate, patientConcerns, patientQuestions, photoAnalyses } = await request.json()

  const routineText = snapshot?.routineSteps?.length
    ? snapshot.routineSteps.map((s: any) =>
        `${s.timeOfDay.toUpperCase()}: ${s.stepName}${s.product ? ` (${s.product.name})` : ''} — ${s.frequency}`
      ).join('\n')
    : 'No routine recorded'

  const checkinsText = checkins?.length
    ? checkins.slice(0, 7).map((c: any) =>
        `${c.date}: skin=${c.skinFeel}, breakouts=${c.breakouts}, routine=${c.routine}, picking=${c.picking}`
      ).join('\n')
    : 'No check-ins recorded'

  const photoText = photoAnalyses?.length
    ? 'Recent visual observations from skin photos:\n' + photoAnalyses.map((a: any) =>
        `${a.date} (${a.overallCondition}): ${a.summary}${a.notableFindings?.length ? ` Notable: ${a.notableFindings.join('; ')}` : ''}`
      ).join('\n')
    : ''

  const prompt = `Generate a structured dermatology appointment report for a UK private clinic patient.

Patient profile:
- Name: ${snapshot?.userName ?? 'Patient'}
- Skin type: ${snapshot?.skinType ?? 'Unknown'}
- Concerns: ${snapshot?.concerns?.join(', ') ?? 'None listed'}
- Goals: ${snapshot?.goals?.join(', ') ?? 'None listed'}

Current routine:
${routineText}

Recent check-ins (last 7 days):
${checkinsText}

${photoText}
${appointmentDate ? `Appointment date: ${appointmentDate}` : ''}
${patientConcerns ? `Patient's concerns to raise: ${patientConcerns}` : ''}
${patientQuestions ? `Patient's questions: ${patientQuestions}` : ''}

Write each section in clear, plain English suitable for both the patient and dermatologist to read.
Suggest 5 specific, evidence-based questions the patient should ask their dermatologist based on their profile.`

  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: ReportSchema,
      prompt,
    })

    return Response.json(object)
  } catch {
    return Response.json({ error: 'Could not generate report' }, { status: 500 })
  }
}
