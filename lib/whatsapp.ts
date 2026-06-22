export async function sendWhatsAppMessage(phone: string, message: string, organizationId: string) {
  const apiUrl = process.env.WHATSAPP_API_URL
  const apiKey = process.env.WHATSAPP_API_KEY

  if (!apiUrl || !apiKey) {
    console.warn('WhatsApp API URL or Key not configured. Skipping message.')
    return { success: false, error: 'Not configured' }
  }

  try {
    const res = await fetch(`${apiUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-organization-id': organizationId
      },
      body: JSON.stringify({ phone, message }),
    })

    if (!res.ok) {
      const errorData = await res.text()
      console.error('WhatsApp API Error:', errorData)
      return { success: false, error: errorData }
    }

    const data = await res.json()
    return data
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error)
    return { success: false, error: 'Network error' }
  }
}
