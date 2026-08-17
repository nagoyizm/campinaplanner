import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const { organizationId } = await requireOrg()

  const pendientes = await prisma.reservation.findMany({
    where: {
      organizationId,
      OR: [
        { status: 'on_hold' },
        { status: 'booked', source: 'Web Directa' },
      ],
    },
    include: {
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, rut: true } },
      rooms: {
        include: {
          room: { select: { id: true, name: true, code: true } },
          rate: { select: { id: true, name: true } },
        },
        orderBy: { arrival: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ reservas: pendientes })
}

export async function POST(req: NextRequest) {
  const { organizationId, role } = await requireOrg()

  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { reservaId, action, paymentMethod, accountCode, amount } = await req.json()

  if (!reservaId) {
    return NextResponse.json({ error: 'reservaId es requerido' }, { status: 400 })
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id: Number(reservaId), organizationId, status: { in: ['on_hold', 'booked'] } },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Reserva no encontrada o ya procesada' }, { status: 404 })
  }

  if (action === 'cancel') {
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'cancelled',
        notes: reservation.notes
          ? `${reservation.notes}\n[cancelada desde panel]: Reserva web no confirmada`
          : '[cancelada desde panel]: Reserva web no confirmada',
        auditLogs: {
          create: {
            organizationId,
            action: 'status_changed',
            details: 'Reserva web pendiente cancelada desde el panel (no confirmada)',
          },
        },
      },
    })
    return NextResponse.json({ success: true, reservation: updated })
  }

  // confirmar → pasa a 'confirmed' (confirmación definitiva) y (opcionalmente) se registra el pago
  const data: any = {
    status: 'confirmed',
  }

  if (paymentMethod) data.paymentMethod = paymentMethod
  if (accountCode) data.accountCode = accountCode

  const paidAmount = Number(amount)
  if (paidAmount > 0) {
    data.totalPaid = reservation.totalPaid + paidAmount
    data.payments = {
      create: {
        amount: paidAmount,
        method: paymentMethod || 'transferencia',
        reference: accountCode || null,
        notes: 'Pago registrado al confirmar reserva web',
      },
    }
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      ...data,
      auditLogs: {
        create: {
          organizationId,
          action: 'status_changed',
          details: `Reserva web confirmada desde el panel${paymentMethod ? ` — pago: ${paymentMethod}` : ''}`,
        },
      },
    },
    include: { guest: true, rooms: { include: { room: true } } },
  })

  return NextResponse.json({ success: true, reservation: updated })
}