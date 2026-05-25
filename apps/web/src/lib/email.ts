type EmailPayload = {
  to: string
  subject: string
  text: string
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env['RESEND_API_KEY'] && process.env['EMAIL_FROM'])
}

export async function sendEmail({ to, subject, text }: EmailPayload): Promise<'sent' | 'unconfigured' | 'failed'> {
  const apiKey = process.env['RESEND_API_KEY']
  const from = process.env['EMAIL_FROM']
  if (!apiKey || !from) return 'unconfigured'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    })
    return res.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}
