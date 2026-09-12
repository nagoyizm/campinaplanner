import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, format, differenceInCalendarMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const dateType = searchParams.get('dateType') || 'arrival' // 'arrival' | 'created' | 'both'
    const rawUnitTypeIds = searchParams.get('unitTypeIds') || searchParams.get('unitTypeId') || 'all'
    const unitTypeIds = rawUnitTypeIds === 'all' || !rawUnitTypeIds.trim() ? [] : rawUnitTypeIds.split(',').map(s => s.trim()).filter(Boolean)
    const rawRoomIds = searchParams.get('roomIds') || searchParams.get('roomId') || 'all'
    const roomIds = rawRoomIds === 'all' || !rawRoomIds.trim() ? [] : rawRoomIds.split(',').map(s => s.trim()).filter(Boolean)
    const statusFilter = searchParams.get('status') || 'active' // 'active' | 'all' | specific

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 })
    }

    const start = new Date(`${startDate}T00:00:00.000Z`)
    const end = new Date(`${endDate}T23:59:59.999Z`)

    // Build reservation query filter
    const where: any = {}

    if (statusFilter === 'active') {
      where.status = { in: ['booked', 'confirmed', 'checked_in', 'checked_out'] }
    } else if (statusFilter !== 'all') {
      where.status = statusFilter
    }

    // Date condition
    if (dateType === 'created') {
      where.createdAt = { gte: start, lte: end }
    } else {
      // arrival or both
      const roomDateCondition: any = {}
      if (dateType === 'arrival') {
        roomDateCondition.arrival = { gte: start, lte: end }
      } else {
        roomDateCondition.OR = [
          { arrival: { gte: start, lte: end } },
          { departure: { gte: start, lte: end } },
        ]
      }

      if (roomIds.length === 1 && roomIds[0] !== 'all') {
        roomDateCondition.roomId = roomIds[0]
      } else if (roomIds.length > 1) {
        roomDateCondition.roomId = { in: roomIds }
      } else if (unitTypeIds.length === 1 && unitTypeIds[0] !== 'all') {
        roomDateCondition.room = { unitTypeId: unitTypeIds[0] }
      } else if (unitTypeIds.length > 1) {
        roomDateCondition.room = { unitTypeId: { in: unitTypeIds } }
      }

      where.rooms = { some: roomDateCondition }
    }

    // Room / unit type condition if dateType === 'created'
    if (dateType === 'created') {
      if (roomIds.length === 1 && roomIds[0] !== 'all') {
        where.rooms = { some: { roomId: roomIds[0] } }
      } else if (roomIds.length > 1) {
        where.rooms = { some: { roomId: { in: roomIds } } }
      } else if (unitTypeIds.length === 1 && unitTypeIds[0] !== 'all') {
        where.rooms = { some: { room: { unitTypeId: unitTypeIds[0] } } }
      } else if (unitTypeIds.length > 1) {
        where.rooms = { some: { room: { unitTypeId: { in: unitTypeIds } } } }
      }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        guest: true,
        rooms: {
          include: {
            room: {
              include: {
                unitType: true,
              },
            },
            rate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate months count in selected range for averages
    const pStart = parseISO(startDate)
    const pEnd = parseISO(endDate)
    const monthsDiff = Math.max(1, differenceInCalendarMonths(pEnd, pStart) + 1)

    // Summary counters
    const totalReservations = reservations.length
    // 1 pack per reservation for amenities (soap, shampoo pack, etc.)
    const totalPacks = totalReservations

    let totalNights = 0
    let totalPax = 0
    let totalRevenue = 0
    let totalRoomsCount = 0

    // Monthly aggregation map: 'YYYY-MM' -> data
    const monthMap = new Map<string, {
      key: string
      label: string
      reservations: Set<number>
      packs: number
      totalNights: number
      totalPax: number
      totalRevenue: number
      roomsCount: number
    }>()

    // Unit type aggregation map
    const unitTypeMap = new Map<string, {
      id: string
      name: string
      reservations: Set<number>
      packs: number
      nights: number
      pax: number
      revenue: number
    }>()

    // Room aggregation map
    const roomMap = new Map<string, {
      id: string
      code: string
      name: string
      unitTypeName: string
      reservations: Set<number>
      packs: number
      nights: number
      revenue: number
    }>()

    const reservationList = reservations.map(rsv => {
      // Calculate reservation total
      const rsvTotal = (rsv.unitTotal || 0) + (rsv.extraPersonCharge || 0) + (rsv.additionalServices || 0) + (rsv.tax || 0) - (rsv.discounts || 0)
      const rsvNights = rsv.rooms.reduce((acc, rm) => acc + (rm.nights || 0), 0)
      const rsvPax = (rsv.adults || 0) + (rsv.children || 0)

      totalNights += rsvNights
      totalPax += rsvPax
      totalRevenue += rsvTotal
      totalRoomsCount += rsv.rooms.length

      // Reference date for grouping into monthly buckets:
      // If arrival date exists in rooms, use earliest arrival; otherwise createdAt
      const earliestArrival = rsv.rooms.length > 0
        ? rsv.rooms.reduce((min, rm) => (rm.arrival < min ? rm.arrival : min), rsv.rooms[0].arrival)
        : rsv.createdAt

      const monthKey = format(earliestArrival, 'yyyy-MM')
      const monthLabel = format(earliestArrival, "MMMM 'de' yyyy", { locale: es })

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          key: monthKey,
          label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          reservations: new Set(),
          packs: 0,
          totalNights: 0,
          totalPax: 0,
          totalRevenue: 0,
          roomsCount: 0,
        })
      }
      const mData = monthMap.get(monthKey)!
      mData.reservations.add(rsv.id)
      mData.packs = mData.reservations.size
      mData.totalNights += rsvNights
      mData.totalPax += rsvPax
      mData.totalRevenue += rsvTotal
      mData.roomsCount += rsv.rooms.length

      // Cabin / Unit type breakdown
      rsv.rooms.forEach(rm => {
        const uType = rm.room?.unitType
        const utId = uType?.id || 'sin-tipo'
        const utName = uType?.name || 'Sin Categoría'

        if (!unitTypeMap.has(utId)) {
          unitTypeMap.set(utId, {
            id: utId,
            name: utName,
            reservations: new Set(),
            packs: 0,
            nights: 0,
            pax: 0,
            revenue: 0,
          })
        }
        const utData = unitTypeMap.get(utId)!
        utData.reservations.add(rsv.id)
        utData.packs = utData.reservations.size
        utData.nights += rm.nights || 0
        utData.pax += (rm.adults || 0) + (rm.children || 0)
        utData.revenue += rm.unitTotal || 0

        const rId = rm.roomId
        if (!roomMap.has(rId)) {
          roomMap.set(rId, {
            id: rId,
            code: rm.room?.code || '—',
            name: rm.room?.name || '—',
            unitTypeName: utName,
            reservations: new Set(),
            packs: 0,
            nights: 0,
            revenue: 0,
          })
        }
        const rData = roomMap.get(rId)!
        rData.reservations.add(rsv.id)
        rData.packs = rData.reservations.size
        rData.nights += rm.nights || 0
        rData.revenue += rm.unitTotal || 0
      })

      return {
        id: rsv.id,
        guestName: `${rsv.guest?.firstName || ''} ${rsv.guest?.lastName || ''}`.trim() || 'Sin Nombre',
        guestPhone: rsv.guest?.phone || '',
        guestEmail: rsv.guest?.email || '',
        rooms: rsv.rooms.map(rm => ({
          roomId: rm.roomId,
          code: rm.room?.code || '',
          name: rm.room?.name || '',
          unitTypeName: rm.room?.unitType?.name || '',
          arrival: rm.arrival.toISOString(),
          departure: rm.departure.toISOString(),
          nights: rm.nights,
          unitTotal: rm.unitTotal,
        })),
        arrival: earliestArrival.toISOString(),
        departure: rsv.rooms.length > 0
          ? rsv.rooms.reduce((max, rm) => (rm.departure > max ? rm.departure : max), rsv.rooms[0].departure).toISOString()
          : rsv.createdAt.toISOString(),
        nights: rsvNights,
        adults: rsv.adults,
        children: rsv.children,
        pax: rsvPax,
        status: rsv.status,
        source: rsv.source || 'Directa',
        createdAt: rsv.createdAt.toISOString(),
        amenityPacks: 1, // 1 pack per reservation
        total: rsvTotal,
        totalPaid: rsv.totalPaid || 0,
        amountDue: Math.max(0, rsvTotal - (rsv.totalPaid || 0)),
        isMultiRoom: rsv.rooms.length > 1,
      }
    })

    // Sort monthly breakdown chronologically
    const monthlyBreakdown = Array.from(monthMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(m => ({
        key: m.key,
        label: m.label,
        reservationCount: m.reservations.size,
        packCount: m.reservations.size,
        roomsCount: m.roomsCount,
        totalNights: m.totalNights,
        totalPax: m.totalPax,
        totalRevenue: Math.round(m.totalRevenue),
        avgNightsPerReservation: m.reservations.size > 0 ? Number((m.totalNights / m.reservations.size).toFixed(1)) : 0,
      }))

    // Format unit type breakdown
    const unitTypeBreakdown = Array.from(unitTypeMap.values())
      .map(ut => ({
        id: ut.id,
        name: ut.name,
        reservationCount: ut.reservations.size,
        packCount: ut.reservations.size,
        nights: ut.nights,
        pax: ut.pax,
        revenue: Math.round(ut.revenue),
        percentOfTotal: totalReservations > 0 ? Number(((ut.reservations.size / totalReservations) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.reservationCount - a.reservationCount)

    // Format room breakdown
    const roomBreakdown = Array.from(roomMap.values())
      .map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        unitTypeName: r.unitTypeName,
        reservationCount: r.reservations.size,
        packCount: r.reservations.size,
        nights: r.nights,
        revenue: Math.round(r.revenue),
      }))
      .sort((a, b) => b.reservationCount - a.reservationCount)

    // Calculate monthly average
    const monthlyAverageReservations = Number((totalReservations / monthsDiff).toFixed(1))
    const monthlyAveragePacks = monthlyAverageReservations
    const avgStayNights = totalReservations > 0 ? Number((totalNights / totalReservations).toFixed(1)) : 0

    return NextResponse.json({
      period: {
        startDate,
        endDate,
        monthsCount: monthsDiff,
      },
      summary: {
        totalReservations,
        totalPacks,
        monthlyAverageReservations,
        monthlyAveragePacks,
        totalNights,
        avgStayNights,
        totalPax,
        totalRevenue: Math.round(totalRevenue),
        totalRoomsCount,
      },
      monthlyBreakdown,
      unitTypeBreakdown,
      roomBreakdown,
      reservations: reservationList,
    })
  } catch (error: any) {
    console.error('Error in /api/reportes/reservas:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
