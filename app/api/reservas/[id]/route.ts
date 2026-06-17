import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

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
  const reservationId = parseInt(id)
  await prisma.auditLog.deleteMany({ where: { reservationId } })
  await prisma.reservation.delete({ where: { id: reservationId } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  const body = await req.json()

  let validUserId = session?.user?.id || null
  if (validUserId) {
    const userExists = await prisma.user.findUnique({ where: { id: validUserId } })
    if (!userExists) validUserId = null
  }

  const data: any = {}
  if (body.status !== undefined) data.status = body.status
  if (body.isVip !== undefined) data.isVip = body.isVip
  if (body.isNoisy !== undefined) data.isNoisy = body.isNoisy
  if (body.isDirty !== undefined) data.isDirty = body.isDirty
  if (body.isDifficult !== undefined) data.isDifficult = body.isDifficult
  if (body.isNewPax !== undefined) data.isNewPax = body.isNewPax
  if (body.isRecurring !== undefined) data.isRecurring = body.isRecurring
  if (body.isWalkIn !== undefined) data.isWalkIn = body.isWalkIn
  if (body.guaranteeRsv !== undefined) data.guaranteeRsv = body.guaranteeRsv
  if (body.guaranteeGames !== undefined) data.guaranteeGames = body.guaranteeGames

  const old = await prisma.reservation.findUnique({ where: { id: parseInt(id) }, select: { status: true } })

  const reservation = await prisma.reservation.update({
    where: { id: parseInt(id) },
    data,
  })

  const changes: string[] = []
  if (old?.status !== body.status && body.status) changes.push(`Estado: ${old?.status} → ${body.status}`)
  
  await prisma.auditLog.create({
    data: {
      reservationId: parseInt(id),
      action: 'Actualización rápida',
      details: changes.length > 0 ? changes.join(', ') : 'Actualización de etiquetas/garantías',
      userId: validUserId,
    },
  })

  return NextResponse.json(reservation)
}
