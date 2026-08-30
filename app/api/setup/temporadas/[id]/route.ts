import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const season = await prisma.season.findUnique({
    where: { id },
    include: {
      rates: {
        include: {
          unitType: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!season) {
    return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 })
  }
  return NextResponse.json(season)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrg()
  const { id } = await params
  const body = await req.json()

  const ratesData = Array.isArray(body.rates)
    ? body.rates
        .filter((r: any) => r.unitTypeId && Number(r.rackRate) >= 0)
        .map((r: any) => ({
          organizationId,
          seasonId: id,
          unitTypeId: r.unitTypeId,
          rackRate: Number(r.rackRate) || 0,
          extraPersonAdult: Number(r.extraPersonAdult) || 0,
          extraPersonChild: Number(r.extraPersonChild) || 0,
          weekendSurcharge: Number(r.weekendSurcharge) || 0,
          includedOccupants: Number(r.includedOccupants) || 2,
        }))
    : []

  const season = await prisma.$transaction(async (tx) => {
    await tx.seasonRate.deleteMany({
      where: { seasonId: id },
    })

    if (ratesData.length > 0) {
      await tx.seasonRate.createMany({
        data: ratesData,
      })
    }

    return tx.season.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        startDate: body.startDate ? body.startDate.split('T')[0] : undefined,
        endDate: body.endDate ? body.endDate.split('T')[0] : undefined,
        priority: body.priority !== undefined ? Number(body.priority) : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
      },
      include: {
        rates: {
          include: {
            unitType: { select: { id: true, name: true } },
          },
        },
      },
    })
  })

  return NextResponse.json(season)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.season.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
