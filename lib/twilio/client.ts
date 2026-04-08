import twilio from 'twilio'

let _client: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
  }
  return _client
}

export async function sendSms(to: string, body: string, from?: string) {
  const client = getTwilioClient()
  return client.messages.create({
    to,
    from: from ?? process.env.TWILIO_PHONE_NUMBER!,
    body,
  })
}

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
) {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  )
}
