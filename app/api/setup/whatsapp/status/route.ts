import { NextResponse } from 'next/server'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { organizationId } = await requireOrg()
  // Allow operators/receptionists to see status too
  
  const apiUrl = process.env.WHATSAPP_API_URL
  const apiKey = process.env.WHATSAPP_API_KEY

  if (!apiUrl || !apiKey) {
    return NextResponse.json({ connected: false })
  }

  try {
    const res = await fetch(`${apiUrl}/api/status`, {
      headers: { 
        'x-api-key': apiKey,
        'x-organization-id': organizationId 
      },
      cache: 'no-store'
    })
    
    if (!res.ok) {
      return NextResponse.json({ connected: false })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ connected: false })
  }
}
