import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const room = await prisma.room.update({
    where: { id },
    data: {
      code: body.code,
      name: body.name,
      unitTypeId: body.unitTypeId,
      defaultRateId: body.defaultRateId || null,
      sortOrder: Number(body.sortOrder) || 0,
      active: body.active !== false,
    },
  })
  return NextResponse.json(room)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.room.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
