import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEMO_TEXTS_KEY = 'demo_texts'

// GET /api/public/demo-texts — textos de la demo (público: la demo se ve sin sesión)
export async function GET() {
  try {
    if ((prisma as any).saasConfig) {
      const row = await (prisma as any).saasConfig.findUnique({ where: { key: DEMO_TEXTS_KEY } })
      if (row?.value) {
        try {
          const saved = JSON.parse(row.value)
          return NextResponse.json({ agendio: saved.agendio ?? {}, planner: saved.planner ?? {} })
        } catch { /* cae a default */ }
      }
    }
  } catch (e) {
    console.error('demo-texts GET error:', e)
  }
  return NextResponse.json({ agendio: {}, planner: {} })
}
