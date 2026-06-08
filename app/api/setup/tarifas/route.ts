import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rates = await prisma.rate.findMany({
    include: { unitType: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(rates)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const rate = await prisma.rate.create({
    data: {
      name: body.name,
      unitTypeId: body.unitTypeId || null,
      rackRate: Number(body.rackRate),
      includedOccupants: Number(body.includedOccupants) || 2,
      extraPersonAdult: Number(body.extraPersonAdult) || 0,
      extraPersonChild: Number(body.extraPersonChild) || 0,
      weekendSurcharge: Number(body.weekendSurcharge) || 0,
      active: body.active !== false,
    },
  })
  return NextResponse.json(rate, { status: 201 })
}
