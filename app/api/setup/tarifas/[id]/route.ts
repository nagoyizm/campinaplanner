import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const rate = await prisma.rate.update({
    where: { id },
    data: {
      name: body.name,
      unitTypeId: body.unitTypeId || null,
      rackRate: Number(body.rackRate),
      includedOccupants: Number(body.includedOccupants) || 2,
      extraPersonAdult: Number(body.extraPersonAdult) || 0,
      extraPersonChild: Number(body.extraPersonChild) || 0,
      weekendSurcharge: Number(body.weekendSurcharge) || 0,
      active: body.active !== false,
    },
  })
  return NextResponse.json(rate)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.rate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
