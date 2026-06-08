import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const reservation = await prisma.reservation.findUnique({
    where: { id: parseInt(id) },
    include: {
      guest: true,
      rooms: {
        include: { room: { include: { unitType: true } }, rate: true },
      },
      payments: { orderBy: { date: 'desc' } },
      extras: { include: { amenity: true } },
      auditLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
      },
      checkInStaff: { select: { name: true } },
      checkOutStaff: { select: { name: true } },
    },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  return NextResponse.json(reservation)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.reservation.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
