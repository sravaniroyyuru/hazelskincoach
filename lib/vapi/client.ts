const VAPI_BASE_URL = 'https://api.vapi.ai'

function vapiHeaders() {
  return {
    Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

export async function createVapiCall(params: {
  assistantId: string
  customer: { number: string; name?: string }
  phoneNumberId: string
}) {
  const res = await fetch(`${VAPI_BASE_URL}/call/phone`, {
    method: 'POST',
    headers: vapiHeaders(),
    body: JSON.stringify({
      assistantId: params.assistantId,
      customer: params.customer,
      phoneNumberId: params.phoneNumberId,
    }),
  })

  if (!res.ok) {
    throw new Error(`VAPI call failed: ${res.statusText}`)
  }

  return res.json()
}

export async function getVapiCall(callId: string) {
  const res = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
    headers: vapiHeaders(),
  })

  if (!res.ok) {
    throw new Error(`VAPI get call failed: ${res.statusText}`)
  }

  return res.json()
}

export type VapiWebhookEvent = {
  type: 'call-started' | 'call-ended' | 'transcript' | 'function-call'
  call: {
    id: string
    status: string
    customer: { number: string }
    transcript?: string
    summary?: string
    endedReason?: string
    startedAt?: string
    endedAt?: string
  }
}
