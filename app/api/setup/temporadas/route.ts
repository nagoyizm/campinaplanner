import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { organizationId } = await requireOrg()
  const seasons = await prisma.season.findMany({
    where: { organizationId },
    include: {
      rates: {
        include: {
          unitType: { select: { id: true, name: true, maxOccupancy: true } },
        },
      },
    },
    orderBy: [{ startDate: 'asc' }, { priority: 'desc' }],
  })
  return NextResponse.json(seasons)
}

export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const body = await req.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'El nombre de la temporada es obligatorio' }, { status: 400 })
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'Las fechas desde y hasta son obligatorias' }, { status: 400 })
  }

  const ratesData = Array.isArray(body.rates)
    ? body.rates
        .filter((r: any) => r.unitTypeId && Number(r.rackRate) >= 0)
        .map((r: any) => ({
          organizationId,
          unitTypeId: r.unitTypeId,
          rackRate: Number(r.rackRate) || 0,
          extraPersonAdult: Number(r.extraPersonAdult) || 0,
          extraPersonChild: Number(r.extraPersonChild) || 0,
          weekendSurcharge: Number(r.weekendSurcharge) || 0,
          includedOccupants: Number(r.includedOccupants) || 2,
        }))
    : []

  const season = await prisma.season.create({
    data: {
      organizationId,
      name: body.name.trim(),
      startDate: body.startDate.split('T')[0],
      endDate: body.endDate.split('T')[0],
      priority: Number(body.priority) || 0,
      active: body.active !== false,
      rates: {
        create: ratesData,
      },
    },
    include: {
      rates: {
        include: {
          unitType: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json(season, { status: 201 })
}
