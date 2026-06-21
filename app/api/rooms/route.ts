import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { organizationId } = await requireOrg()
  const rooms = await prisma.room.findMany({
    where: { active: true, organizationId },
    include: { unitType: true, defaultRate: true },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(rooms)
}
