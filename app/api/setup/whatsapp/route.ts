import { NextResponse } from 'next/server'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { role, organizationId } = await requireOrg()
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiUrl = process.env.WHATSAPP_API_URL
  const apiKey = process.env.WHATSAPP_API_KEY

  if (!apiUrl || !apiKey) {
    return NextResponse.json({ status: 'error', message: 'Variables de entorno WHATSAPP_API_URL o WHATSAPP_API_KEY no configuradas.' })
  }

  try {
    const res = await fetch(`${apiUrl}/api/qr`, {
      headers: { 
        'x-api-key': apiKey,
        'x-organization-id': organizationId 
      },
      cache: 'no-store'
    })
    
    if (!res.ok) {
      return NextResponse.json({ status: 'error', message: 'El microservicio de WhatsApp respondió con error.' })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ status: 'offline', message: 'No se pudo conectar con el microservicio de WhatsApp.' })
  }
}
