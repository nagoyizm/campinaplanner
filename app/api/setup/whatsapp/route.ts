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
  } catch {
    return NextResponse.json({ status: 'offline', message: 'No se pudo conectar con el microservicio de WhatsApp.' })
  }
}

export async function DELETE() {
  const { role, organizationId } = await requireOrg()
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiUrl = process.env.WHATSAPP_API_URL
  const apiKey = process.env.WHATSAPP_API_KEY

  if (!apiUrl || !apiKey) {
    return NextResponse.json({ error: 'Variables de entorno no configuradas.' }, { status: 500 })
  }

  try {
    const res = await fetch(`${apiUrl}/api/session`, {
      method: 'DELETE',
      headers: { 
        'x-api-key': apiKey,
        'x-organization-id': organizationId 
      }
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Error al desconectar.' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con el microservicio de WhatsApp.' }, { status: 500 })
  }
}
