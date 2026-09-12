import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const queryBy = searchParams.get('queryBy') || 'arrival' // arrival | departure | both
  const rawUnitTypeIds = searchParams.get('unitTypeIds') || searchParams.get('unitTypeId') || 'all'
  const unitTypeIds = rawUnitTypeIds === 'all' || !rawUnitTypeIds.trim() ? [] : rawUnitTypeIds.split(',').map(s => s.trim()).filter(Boolean)

  const rawRoomIds = searchParams.get('roomIds') || searchParams.get('roomId') || 'all'
  const roomIds = rawRoomIds === 'all' || !rawRoomIds.trim() ? [] : rawRoomIds.split(',').map(s => s.trim()).filter(Boolean)

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
  if (roomIds.length === 1 && roomIds[0] !== 'all') {
    roomFilter.id = roomIds[0]
  } else if (roomIds.length > 1) {
    roomFilter.id = { in: roomIds }
  } else if (unitTypeIds.length === 1 && unitTypeIds[0] !== 'all') {
    roomFilter.unitTypeId = unitTypeIds[0]
  } else if (unitTypeIds.length > 1) {
    roomFilter.unitTypeId = { in: unitTypeIds }
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
          },
          rooms: { select: { id: true, unitTotal: true } }
        } 
      },
      room: { include: { unitType: true } },
      rate: true,
    },
    orderBy: { arrival: 'asc' },
  })

  const data = rows.map((r) => {
    const rsv = r.reservation
    const rsvTotal = rsv.unitTotal + rsv.additionalServices - rsv.discounts + rsv.tax
    const isMultiRoom = (rsv.rooms?.length || 1) > 1

    const ratio = (rsv.unitTotal > 0 && rsv.rooms?.length > 1)
      ? (r.unitTotal / rsv.unitTotal)
      : (1 / (rsv.rooms?.length || 1))

    const roomDiscounts = isMultiRoom ? Math.round(rsv.discounts * ratio) : rsv.discounts
    const roomAdditionalServices = isMultiRoom ? Math.round(rsv.additionalServices * ratio) : rsv.additionalServices
    const roomTax = isMultiRoom ? Math.round(rsv.tax * ratio) : rsv.tax
    const roomTotal = isMultiRoom 
      ? Math.round(r.unitTotal + roomAdditionalServices - roomDiscounts + roomTax)
      : rsvTotal
    const roomPaid = isMultiRoom ? Math.round(rsv.totalPaid * ratio) : rsv.totalPaid
    const roomAmountDue = roomTotal - roomPaid

    return {
      reservationId: rsv.id,
      guestFirstName: rsv.guest.firstName,
      guestLastName: rsv.guest.lastName,
      isRecurring: rsv.guest._count.reservations > 1,
      isMultiRoom,
      reservationTotal: rsvTotal,
      roomCode: r.room.code,
      roomName: r.room.name.replace(/^[a-z]-/i, ''),
      unitType: r.room.unitType.name,
      rateName: r.rate?.name ?? '—',
      arrival: r.arrival.toISOString(),
      departure: r.departure.toISOString(),
      nights: r.nights,
      unitTotal: r.unitTotal,
      discounts: roomDiscounts,
      additionalServices: roomAdditionalServices,
      tax: roomTax,
      total: roomTotal,
      totalPaid: roomPaid,
      amountDue: roomAmountDue,
      status: rsv.status,
      paymentMethod: rsv.paymentMethod ?? '—',
    }
  })

  const countFilter: any = { organizationId, active: true }
  if (roomIds.length === 1 && roomIds[0] !== 'all') {
    countFilter.id = roomIds[0]
  } else if (roomIds.length > 1) {
    countFilter.id = { in: roomIds }
  } else if (unitTypeIds.length === 1 && unitTypeIds[0] !== 'all') {
    countFilter.unitTypeId = unitTypeIds[0]
  } else if (unitTypeIds.length > 1) {
    countFilter.unitTypeId = { in: unitTypeIds }
  }

  const totalActiveRooms = await prisma.room.count({
    where: countFilter
  })

  return NextResponse.json({ rows: data, totalActiveRooms })
}
