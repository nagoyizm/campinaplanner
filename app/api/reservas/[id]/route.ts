import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { requireOrg } from '@/lib/org'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'

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
  const { organizationId } = await requireOrg()
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

  const old = await prisma.reservation.findUnique({ 
    where: { id: parseInt(id) }, 
    select: { status: true, rooms: { select: { roomId: true } } } 
  })

  const reservation = await prisma.reservation.update({
    where: { id: parseInt(id) },
    data,
  })

  // Si se hizo checkout, cambiar el estado de las habitaciones a sucias (dirty / sin limpieza)
  if (body.status === 'checked_out' && old?.status !== 'checked_out') {
    if (old?.rooms && old.rooms.length > 0) {
      await prisma.room.updateMany({
        where: { id: { in: old.rooms.map((r: any) => r.roomId) } },
        data: { cleaningStatus: 'dirty' }
      })
    }

    try {
      const notifyAdmins = await prisma.user.findMany({
        where: {
          organizationId,
          role: { in: ['admin', 'superadmin'] },
          OR: [{ notifyWspCheckOut: true }, { notifyEmailCheckOut: true }]
        }
      })

      const msg = `👋 *Checkout Realizado:*\nEl huésped de la reserva #${id} ha realizado el checkout y la(s) cabaña(s) pasaron a estado sucio.`

      for (const admin of notifyAdmins) {
        if (admin.notifyWspCheckOut && admin.phone) {
          await sendWhatsAppMessage(admin.phone, msg, organizationId).catch(console.error)
        }
        if (admin.notifyEmailCheckOut && admin.email) {
          await sendEmail(admin.email, `Checkout: Reserva #${id}`, `<p>El huésped de la reserva #${id} ha hecho checkout.</p>`).catch(console.error)
        }
      }
    } catch (notificationError) {
      console.error('Error al enviar notificaciones de checkout:', notificationError)
    }
  }

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
