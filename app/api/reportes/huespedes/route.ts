import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

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

  // Fetch all non-cancelled reservations in this period to evaluate guest stats
  await prisma.reservation.findMany({
    where: {
      organizationId,
      status: { not: 'cancelled' },
      createdAt: { gte: start, lte: end } // Measure by booking date or stay date? Let's use booking date for guest acquisition, or just fetch guests who had a reservation in this period.
    },
    include: {
      guest: true,
      rooms: true
    }
  })

  // We should fetch reservations that intersect the period
  const intersectingRsv = await prisma.reservation.findMany({
    where: {
      organizationId,
      status: { not: 'cancelled' },
      rooms: {
        some: {
          arrival: { lte: end },
          departure: { gte: start }
        }
      }
    },
    include: {
      guest: {
        include: { _count: { select: { reservations: true } } }
      },
      rooms: true
    }
  })

  // Guest Aggregation
  let totalRevenue = 0
  let totalNights = 0
  let returningGuests = 0
  let newGuests = 0

  const guestMap = new Map<string, any>()
  const nationalityMap: Record<string, number> = {}

  intersectingRsv.forEach(r => {
    const total = r.unitTotal + r.additionalServices - r.discounts + r.tax
    totalRevenue += total
    
    const nights = r.rooms.reduce((sum, rm) => sum + rm.nights, 0)
    totalNights += nights

    const gId = r.guestId
    if (!guestMap.has(gId)) {
      guestMap.set(gId, {
        id: gId,
        firstName: r.guest.firstName,
        lastName: r.guest.lastName,
        rut: r.guest.rut,
        email: r.guest.email,
        phone: r.guest.phone,
        nationality: r.guest.nationality || 'Desconocido',
        totalSpent: 0,
        nightsStayed: 0,
        isRecurring: r.guest._count.reservations > 1
      })

      if (r.guest._count.reservations > 1) {
        returningGuests++
      } else {
        newGuests++
      }

      const nat = r.guest.nationality || 'Desconocido'
      nationalityMap[nat] = (nationalityMap[nat] || 0) + 1
    }

    const g = guestMap.get(gId)
    g.totalSpent += total
    g.nightsStayed += nights
  })

  const uniqueGuestsCount = guestMap.size
  const alos = uniqueGuestsCount > 0 ? (totalNights / intersectingRsv.length) : 0
  const avgSpendPerGuest = uniqueGuestsCount > 0 ? (totalRevenue / uniqueGuestsCount) : 0

  const topGuests = Array.from(guestMap.values()).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 50)
  
  const nationalities = Object.entries(nationalityMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    summary: {
      uniqueGuestsCount,
      newGuests,
      returningGuests,
      alos,
      avgSpendPerGuest
    },
    topGuests,
    nationalities
  })
}
