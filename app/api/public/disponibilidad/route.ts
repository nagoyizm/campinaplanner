import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format, addDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const unitTypeId = searchParams.get('unitTypeId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month') // 1-indexed (1..12)

    if (!slug) {
      return NextResponse.json({ error: 'Parámetro slug es requerido' }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({
      where: { slug, active: true },
      select: { id: true }
    })

    if (!org) {
      return NextResponse.json({ error: 'Recinto no encontrado' }, { status: 404 })
    }

    // Determine date range to check
    let start: Date
    let end: Date

    if (startDateParam && endDateParam) {
      start = parseISO(startDateParam)
      end = parseISO(endDateParam)
    } else if (yearParam && monthParam) {
      const year = parseInt(yearParam)
      const month = parseInt(monthParam) - 1
      const baseDate = new Date(year, month, 1)
      start = startOfMonth(baseDate)
      end = addDays(endOfMonth(baseDate), 1) // extend 1 day for checkout coverage
    } else {
      // Default to current month + next month
      const today = new Date()
      start = startOfMonth(today)
      end = addDays(endOfMonth(addDays(start, 45)), 1)
    }

    // Get active rooms for org (filtered by unitTypeId if provided)
    const roomWhere: any = { organizationId: org.id, active: true }
    if (unitTypeId) {
      roomWhere.unitTypeId = unitTypeId
    }

    const rooms = await prisma.room.findMany({
      where: roomWhere,
      select: { id: true, name: true, code: true, unitTypeId: true }
    })

    const roomIds = rooms.map(r => r.id)

    // Get active reservation rooms overlapping the date range
    const reservationRooms = await prisma.reservationRoom.findMany({
      where: {
        roomId: { in: roomIds },
        arrival: { lt: end },
        departure: { gt: start },
        reservation: {
          organizationId: org.id,
          status: { notIn: ['cancelled', 'on_hold'] }
        }
      },
      select: {
        roomId: true,
        arrival: true,
        departure: true,
      }
    })

    // Generate list of days in interval
    const days = eachDayOfInterval({
      start,
      end: addDays(end, -1) // Interval of nights
    })

    // Group rooms by unitType
    const roomsByUnitType: Record<string, string[]> = {}
    rooms.forEach(r => {
      if (!roomsByUnitType[r.unitTypeId]) roomsByUnitType[r.unitTypeId] = []
      roomsByUnitType[r.unitTypeId].push(r.id)
    })

    // Compute availability per unitType per date string YYYY-MM-DD
    const resultByUnitType: Record<string, Record<string, { available: boolean; freeCount: number; totalRooms: number }>> = {}

    Object.keys(roomsByUnitType).forEach(uId => {
      const unitRoomIds = roomsByUnitType[uId]
      const totalUnits = unitRoomIds.length
      resultByUnitType[uId] = {}

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        
        // Find which room IDs are occupied on this night
        const occupiedRoomIds = new Set<string>()
        reservationRooms.forEach(rr => {
          if (unitRoomIds.includes(rr.roomId)) {
            const arr = format(new Date(rr.arrival), 'yyyy-MM-dd')
            const dep = format(new Date(rr.departure), 'yyyy-MM-dd')
            // Night check: dateStr >= arrival and dateStr < departure
            if (dateStr >= arr && dateStr < dep) {
              occupiedRoomIds.add(rr.roomId)
            }
          }
        })

        const freeCount = totalUnits - occupiedRoomIds.size
        resultByUnitType[uId][dateStr] = {
          available: freeCount > 0,
          freeCount: Math.max(0, freeCount),
          totalRooms: totalUnits
        }
      })
    })

    return NextResponse.json({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      availability: unitTypeId ? resultByUnitType[unitTypeId] || {} : resultByUnitType
    })
  } catch (error: any) {
    console.error('Error computing availability:', error)
    return NextResponse.json({ error: 'Error al consultar disponibilidad' }, { status: 500 })
  }
}
