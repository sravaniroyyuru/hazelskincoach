import { NextRequest, NextResponse } from 'next/server'
import { validateTwilioSignature } from '@/lib/twilio/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const params = Object.fromEntries(formData.entries()) as Record<string, string>

  const signature = request.headers.get('x-twilio-signature') ?? ''
  const url = request.url

  if (!validateTwilioSignature(signature, url, params)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const supabase = await createClient()

  // Look up patient by phone number
  const from = params.From
  const body = params.Body ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: patient } = await db
    .from('patients')
    .select('id, clinic_id')
    .eq('phone', from)
    .maybeSingle()

  await db.from('sms_logs').insert({
    clinic_id: patient?.clinic_id ?? '',
    patient_id: patient?.id ?? null,
    twilio_sid: params.MessageSid,
    direction: 'inbound',
    from_number: from,
    to_number: params.To,
    body,
    status: 'received',
    sent_at: new Date().toISOString(),
  })

  // Return empty TwiML — AI handles response via VAPI or separate logic
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
