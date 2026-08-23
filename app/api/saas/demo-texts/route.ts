import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/org'
import { prisma } from '@/lib/prisma'

const DEMO_TEXTS_KEY = 'demo_texts'

// POST /api/saas/demo-texts — guarda los textos editables de la demo (solo superadmin)
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    if (typeof body.agendio !== 'object' || typeof body.planner !== 'object') {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
    }

    if (!(prisma as any).saasConfig) {
      return NextResponse.json({ error: 'Debes reiniciar el servidor (npm run dev) para actualizar Prisma Client.' }, { status: 500 })
    }

    await (prisma as any).saasConfig.upsert({
      where: { key: DEMO_TEXTS_KEY },
      update: { value: JSON.stringify({ agendio: body.agendio, planner: body.planner }) },
      create: { key: DEMO_TEXTS_KEY, value: JSON.stringify({ agendio: body.agendio, planner: body.planner }) },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('demo-texts POST error:', error)
    return NextResponse.json({ error: 'Error al guardar textos de la demo.' }, { status: 500 })
  }
}
