import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rates = await prisma.rate.findMany({
    where: { active: true },
    include: { unitType: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(rates)
}
