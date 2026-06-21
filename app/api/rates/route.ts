import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { organizationId } = await requireOrg()
  const rates = await prisma.rate.findMany({
    where: { active: true, organizationId },
    include: { unitType: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(rates)
}
