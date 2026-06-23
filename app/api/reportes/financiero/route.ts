import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const queryBy = searchParams.get('queryBy') || 'arrival' // arrival | departure | both
  const unitTypeId = searchParams.get('unitTypeId') || 'all'
  const roomId = searchParams.get('roomId') || 'all'

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate y endDate son requeridos' }, { status: 400 })
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)

  let dateFilter: any = {}
  if (queryBy === 'arrival') {
    dateFilter = { arrival: { gte: start, lte: end } }
  } else if (queryBy === 'departure') {
    dateFilter = { departure: { gte: start, lte: end } }
  } else {
    dateFilter = {
      OR: [
        { arrival: { gte: start, lte: end } },
        { departure: { gte: start, lte: end } },
      ],
    }
  }

  const roomFilter: any = { organizationId }
  if (roomId !== 'all') {
    roomFilter.id = roomId
  } else if (unitTypeId !== 'all') {
    roomFilter.unitTypeId = unitTypeId
  }

  const rows = await prisma.reservationRoom.findMany({
    where: { room: roomFilter, ...dateFilter },
    include: {
      reservation: { 
        include: { 
          guest: {
            include: {
              _count: { select: { reservations: true } }
            }
          } 
        } 
      },
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
      isRecurring: rsv.guest._count.reservations > 1,
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

  const countFilter: any = { organizationId, active: true }
  if (roomId !== 'all') {
    countFilter.id = roomId
  } else if (unitTypeId !== 'all') {
    countFilter.unitTypeId = unitTypeId
  }

  const totalActiveRooms = await prisma.room.count({
    where: countFilter
  })

  return NextResponse.json({ rows: data, totalActiveRooms })
}
