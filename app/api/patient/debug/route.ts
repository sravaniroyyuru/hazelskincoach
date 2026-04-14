export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY

  if (!key) {
    return Response.json({ status: 'missing', message: 'ANTHROPIC_API_KEY not set' })
  }

  // Test the key
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
    const data = await res.json()
    return Response.json({
      status: res.ok ? 'ok' : 'error',
      keyPrefix: key.slice(0, 20) + '...',
      response: data,
    })
  } catch (err) {
    return Response.json({ status: 'fetch_error', error: String(err) })
  }
}
