import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/org'
import { prisma } from '@/lib/prisma'

// GET /api/saas/leads — Retrieve all leads/recipients status & region
export async function GET() {
  try {
    await requireSuperAdmin()
    
    let leads: any[] = []
    if ((prisma as any).saasLead) {
      leads = await (prisma as any).saasLead.findMany({
        orderBy: { updatedAt: 'desc' },
      })
    }

    return NextResponse.json(leads)
  } catch (error: any) {
    console.error('SaasLead GET error:', error)
    return NextResponse.json({ error: 'Error al obtener leads' }, { status: 500 })
  }
}

// POST /api/saas/leads — Update or create lead serviceStatus and region
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { email, alias, region, serviceStatus, notes } = body

    if (!email) {
      return NextResponse.json({ error: 'Falta email de destinatario' }, { status: 400 })
    }

    const validStatus = ['pending', 'accepted', 'rejected'].includes(serviceStatus) ? serviceStatus : 'pending'
    const finalRegion = region?.trim() || 'Algarrobo'

    if (!(prisma as any).saasLead) {
      return NextResponse.json({ error: 'Prisma Client no generado' }, { status: 500 })
    }

    const updated = await (prisma as any).saasLead.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {
        ...(alias !== undefined && { alias: alias ? alias.trim() : null }),
        region: finalRegion,
        serviceStatus: validStatus,
        ...(notes !== undefined && { notes: notes ? notes.trim() : null }),
      },
      create: {
        email: email.toLowerCase().trim(),
        alias: alias ? alias.trim() : null,
        region: finalRegion,
        serviceStatus: validStatus,
        notes: notes ? notes.trim() : null,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('SaasLead POST error:', error)
    return NextResponse.json({ error: 'Error al actualizar estado del cliente' }, { status: 500 })
  }
}
