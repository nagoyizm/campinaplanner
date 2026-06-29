import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import { eachDayOfInterval } from 'date-fns'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const unitTypeId = searchParams.get('unitTypeId') || 'all'
  const roomId = searchParams.get('roomId') || 'all'

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate y endDate son requeridos' }, { status: 400 })
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)

  const roomFilter: any = { organizationId, active: true }
  if (roomId !== 'all') {
    roomFilter.id = roomId
  } else if (unitTypeId !== 'all') {
    roomFilter.unitTypeId = unitTypeId
  }

  // Fetch rooms
  const rooms = await prisma.room.findMany({
    where: roomFilter,
    include: { unitType: true },
    orderBy: { sortOrder: 'asc' }
  })

  // Fetch overlapping reservation rooms
  const reservationRooms = await prisma.reservationRoom.findMany({
    where: {
      room: roomFilter,
      arrival: { lte: end },
      departure: { gte: start },
      reservation: { status: { not: 'cancelled' } }
    },
    include: {
      reservation: true
    }
  })

  // Calculate metrics per room
  const daysInPeriod = eachDayOfInterval({ start, end })
  const totalDays = daysInPeriod.length

  const roomMetrics = rooms.map(room => {
    // Find reservations for this room
    const roomReservations = reservationRooms.filter(r => r.roomId === room.id)

    let nightsSold = 0
    let totalRevenue = 0

    roomReservations.forEach(r => {
      // Find overlap days
      const rStart = new Date(r.arrival)
      const rEnd = new Date(r.departure)
      
      let overlapNights = 0
      daysInPeriod.forEach(day => {
        // Night counts if day is >= arrival and < departure
        if (day >= rStart && day < rEnd) {
          overlapNights++
        }
      })

      nightsSold += overlapNights
      
      // Pro-rate revenue
      if (r.nights > 0 && overlapNights > 0) {
        const nightlyRate = r.unitTotal / r.nights
        totalRevenue += (nightlyRate * overlapNights)
      }
    })

    const occupancyRate = totalDays > 0 ? (nightsSold / totalDays) * 100 : 0
    const revPar = totalDays > 0 ? (totalRevenue / totalDays) : 0

    return {
      id: room.id,
      name: room.name,
      code: room.code,
      unitType: room.unitType.name,
      cleaningStatus: room.cleaningStatus,
      totalDays,
      nightsSold,
      occupancyRate,
      totalRevenue,
      revPar
    }
  })

  // Aggregate metrics
  const totalNightsAvailable = rooms.length * totalDays
  const totalNightsSold = roomMetrics.reduce((sum, r) => sum + r.nightsSold, 0)
  const totalRevenue = roomMetrics.reduce((sum, r) => sum + r.totalRevenue, 0)
  const globalOccupancy = totalNightsAvailable > 0 ? (totalNightsSold / totalNightsAvailable) * 100 : 0
  const globalRevPar = totalNightsAvailable > 0 ? (totalRevenue / totalNightsAvailable) : 0

  return NextResponse.json({
    metrics: roomMetrics,
    summary: {
      totalRooms: rooms.length,
      totalNightsAvailable,
      totalNightsSold,
      totalRevenue,
      globalOccupancy,
      globalRevPar
    }
  })
}
