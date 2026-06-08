import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rooms = await prisma.room.findMany({
    include: { unitType: true, defaultRate: true },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(rooms)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const room = await prisma.room.create({
    data: {
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
