import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const queryBy = searchParams.get('queryBy') || 'arrival' // arrival | departure | both

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate y endDate son requeridos' }, { status: 400 })
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)

  let where: any = {}
  if (queryBy === 'arrival') {
    where = { arrival: { gte: start, lte: end } }
  } else if (queryBy === 'departure') {
    where = { departure: { gte: start, lte: end } }
  } else {
    where = {
      OR: [
        { arrival: { gte: start, lte: end } },
        { departure: { gte: start, lte: end } },
      ],
    }
  }

  const rows = await prisma.reservationRoom.findMany({
    where,
    include: {
      reservation: { include: { guest: true } },
      room: { include: { unitType: true } },
      rate: true,
    },
    orderBy: { arrival: 'asc' },
  })

  const data = rows.map((r) => {
    const rsv = r.reservation
    const total = rsv.unitTotal + rsv.additionalServices - rsv.discounts + rsv.tax
    const amountDue = total - rsv.totalPaid
    return {
      reservationId: rsv.id,
      guestFirstName: rsv.guest.firstName,
      guestLastName: rsv.guest.lastName,
      roomCode: r.room.code,
      roomName: r.room.name.replace(/^[a-z]-/i, ''),
      unitType: r.room.unitType.name,
      rateName: r.rate?.name ?? '—',
      arrival: r.arrival.toISOString(),
      departure: r.departure.toISOString(),
      nights: r.nights,
      unitTotal: r.unitTotal,
      discounts: rsv.discounts,
      additionalServices: rsv.additionalServices,
      tax: rsv.tax,
      total,
      totalPaid: rsv.totalPaid,
      amountDue,
      status: rsv.status,
      paymentMethod: rsv.paymentMethod ?? '—',
    }
  })

  return NextResponse.json(data)
}
