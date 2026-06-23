import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import { differenceInDays, getDay, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate y endDate son requeridos' }, { status: 400 })
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)

  const reservations = await prisma.reservationRoom.findMany({
    where: {
      room: { organizationId },
      arrival: { gte: start, lte: end },
      reservation: { status: { not: 'cancelled' } }
    },
    include: {
      reservation: true
    }
  })

  let totalLeadTime = 0
  let leadTimeCount = 0

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const dayOfWeekCount: Record<string, number> = {
    Domingo: 0, Lunes: 0, Martes: 0, Miércoles: 0, Jueves: 0, Viernes: 0, Sábado: 0
  }

  const monthCount: Record<string, number> = {}

  reservations.forEach(r => {
    const arrivalDate = new Date(r.arrival)
    const creationDate = new Date(r.reservation.createdAt)
    
    const leadTime = differenceInDays(arrivalDate, creationDate)
    if (leadTime >= 0) {
      totalLeadTime += leadTime
      leadTimeCount++
    }

    const dow = getDay(arrivalDate)
    dayOfWeekCount[daysOfWeek[dow]]++

    const monthName = format(arrivalDate, 'MMM yyyy')
    monthCount[monthName] = (monthCount[monthName] || 0) + 1
  })

  const avgLeadTime = leadTimeCount > 0 ? Math.round(totalLeadTime / leadTimeCount) : 0

  const checkinsByDay = Object.entries(dayOfWeekCount).map(([day, count]) => ({ day, count }))
  const checkinsByMonth = Object.entries(monthCount).map(([month, count]) => ({ month, count }))

  return NextResponse.json({
    summary: {
      avgLeadTime,
      totalArrivals: reservations.length
    },
    checkinsByDay,
    checkinsByMonth
  })
}
