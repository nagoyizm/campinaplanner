import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = Number.parseInt(searchParams.get('limit') || '20')
  const page = Number.parseInt(searchParams.get('page') || '1')
  const skip = (page - 1) * limit

  const where: any = { organizationId }
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { rut: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ]
  }

  const [guests, total] = await Promise.all([
    prisma.guest.findMany({ where, orderBy: { lastName: 'asc' }, take: limit, skip }),
    prisma.guest.count({ where }),
  ])

  return NextResponse.json(q ? guests : { guests, total, page, limit })
}

export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const body = await req.json()
  const guest = await prisma.guest.create({
    data: {
      organizationId,
      firstName: body.firstName,
      lastName: body.lastName,
      rut: body.rut || null,
      email: body.email || null,
      phone: body.phone || null,
      nationality: body.nationality || 'Chile',
      address: body.address || null,
      notes: body.notes || null,
      tags: body.tags ? JSON.stringify(body.tags) : '[]',
    },
  })
  return NextResponse.json(guest)
}
