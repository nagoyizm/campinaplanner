import { Resend } from 'resend'

// Avoid constructor crash if process.env isn't loaded yet
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key')

export async function sendEmail(to: string, subject: string, htmlContent: string) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_dummy_key') {
    console.warn('RESEND_API_KEY not configured. Falling back to mock.')
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`)
    return { success: false, error: 'API key missing' }
  }

  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // Default sender for testing in Resend
      to,
      subject,
      html: htmlContent
    })

    console.log('[RESEND SUCCESS]', data)
    return { success: true, data }
  } catch (error) {
    console.error('[RESEND ERROR]', error)
    return { success: false, error }
  }
}
