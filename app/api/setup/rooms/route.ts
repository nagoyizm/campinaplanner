import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { organizationId } = await requireOrg()
  const rooms = await prisma.room.findMany({
    where: { organizationId },
    include: { unitType: true, defaultRate: true },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(rooms)
}

export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const body = await req.json()
  const room = await prisma.room.create({
    data: {
      organizationId,
      code: body.code,
      name: body.name,
      unitTypeId: body.unitTypeId,
      defaultRateId: body.defaultRateId || null,
      sortOrder: Number(body.sortOrder) || 0,
      active: body.active !== false,
    },
  })
  return NextResponse.json(room, { status: 201 })
}
