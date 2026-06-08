import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const amenity = await prisma.amenity.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category || null,
      price: Number(body.price) || 0,
      unit: body.unit || null,
      active: body.active !== false,
    },
  })
  return NextResponse.json(amenity)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.amenity.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
