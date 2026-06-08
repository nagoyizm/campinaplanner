import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const amenities = await prisma.amenity.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(amenities)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const amenity = await prisma.amenity.create({
    data: {
      name: body.name,
      category: body.category || null,
      price: Number(body.price) || 0,
      unit: body.unit || null,
      active: body.active !== false,
    },
  })
  return NextResponse.json(amenity, { status: 201 })
}
