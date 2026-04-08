import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { VapiWebhookEvent } from '@/lib/vapi/client'

export async function POST(request: NextRequest) {
  const body: VapiWebhookEvent = await request.json()
  const supabase = await createClient()

  const { type, call } = body

  switch (type) {
    case 'call-started': {
      await supabase.from('call_logs').insert({
        clinic_id: request.headers.get('x-clinic-id') ?? '',
        vapi_call_id: call.id,
        direction: 'inbound',
        from_number: call.customer.number,
        to_number: '',
        status: 'in_progress',
        started_at: call.startedAt ?? new Date().toISOString(),
      })
      break
    }

    case 'call-ended': {
      await supabase
        .from('call_logs')
        .update({
          status: 'completed',
          transcript: call.transcript ?? null,
          summary: call.summary ?? null,
          ended_at: call.endedAt ?? new Date().toISOString(),
          duration_seconds: call.startedAt && call.endedAt
            ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
            : null,
        })
        .eq('vapi_call_id', call.id)
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
