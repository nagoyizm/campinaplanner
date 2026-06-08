import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const unit = await prisma.unitType.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      maxOccupancy: Number(body.maxOccupancy) || 2,
      sortOrder: Number(body.sortOrder) || 0,
      active: body.active !== false,
    },
  })
  return NextResponse.json(unit)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.unitType.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
