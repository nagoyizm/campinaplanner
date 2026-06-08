import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rooms = await prisma.room.findMany({
    where: { active: true },
    include: {
      unitType: true,
      defaultRate: true,
    },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(rooms)
}
