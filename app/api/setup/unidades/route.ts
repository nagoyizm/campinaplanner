import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { organizationId } = await requireOrg()
  const units = await prisma.unitType.findMany({
    where: { organizationId },
    include: { _count: { select: { rooms: true } } },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(units)
}

export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const body = await req.json()
  const unit = await prisma.unitType.create({
    data: {
      organizationId,
      name: body.name,
      description: body.description || null,
      maxOccupancy: Number(body.maxOccupancy) || 2,
      sortOrder: Number(body.sortOrder) || 0,
      active: body.active !== false,
    },
  })
  return NextResponse.json(unit, { status: 201 })
}
