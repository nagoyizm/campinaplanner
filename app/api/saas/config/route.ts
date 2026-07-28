import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export interface SignatureConfig {
  name: string
  role: string
  web: string
  email: string
  logoUrl: string
}

export const DEFAULT_SIGNATURE: SignatureConfig = {
  name: 'Andrés Vega',
  role: 'Fundador Agendio',
  web: 'https://agendio.cl',
  email: 'contacto@agendio.cl',
  logoUrl: '/logo-habita-round.png',
}

// GET /api/saas/config — Retrieve SaaS configuration (e.g. signature)
export async function GET() {
  try {
    await requireSuperAdmin()
    
    let signature = DEFAULT_SIGNATURE
    if ((prisma as any).saasConfig) {
      const configRow = await (prisma as any).saasConfig.findUnique({
        where: { key: 'email_signature' },
      })
      if (configRow?.value) {
        try {
          signature = { ...DEFAULT_SIGNATURE, ...JSON.parse(configRow.value) }
        } catch (e) {
          console.error('Error parsing signature config JSON:', e)
        }
      }
    }

    return NextResponse.json({ signature })
  } catch (error: any) {
    console.error('SaasConfig GET error:', error)
    return NextResponse.json({ signature: DEFAULT_SIGNATURE })
  }
}

// POST /api/saas/config — Save SaaS configuration (e.g. signature)
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { signature } = body

    if (!signature) {
      return NextResponse.json({ error: 'Falta objeto de firma' }, { status: 400 })
    }

    if (!(prisma as any).saasConfig) {
      return NextResponse.json({ error: 'Debes reiniciar el servidor (npm run dev) para actualizar Prisma Client.' }, { status: 500 })
    }

    const updated = await (prisma as any).saasConfig.upsert({
      where: { key: 'email_signature' },
      update: { value: JSON.stringify(signature) },
      create: { key: 'email_signature', value: JSON.stringify(signature) },
    })

    return NextResponse.json({ success: true, signature: JSON.parse(updated.value) })
  } catch (error: any) {
    console.error('SaasConfig POST error:', error)
    return NextResponse.json({ error: 'Error al guardar configuración.' }, { status: 500 })
  }
}
