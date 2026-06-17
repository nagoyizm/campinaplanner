import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// GET /api/reservas — List reservations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || undefined
  const q = searchParams.get('q') || ''
  const skip = (page - 1) * limit

  const where: any = {}
  if (status) where.status = status
  if (q) {
    where.guest = {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
      ],
    }
  }

  const [reservas, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        guest: true,
        rooms: { include: { room: true, rate: true } },
      },
      orderBy: { id: 'desc' },
      take: limit,
      skip,
    }),
    prisma.reservation.count({ where }),
  ])

  return NextResponse.json({ reservas, total, page, limit })
}

// POST /api/reservas — Create reservation
export async function POST(req: NextRequest) {
  const session = await auth()
  const body = await req.json()

  let validUserId = session?.user?.id || null
  if (validUserId) {
    const userExists = await prisma.user.findUnique({ where: { id: validUserId } })
    if (!userExists) validUserId = null
  }

  // Upsert guest
  let guestId = body.guest.id
  if (!guestId) {
    const guest = await prisma.guest.create({
      data: {
        firstName: body.guest.firstName,
        lastName: body.guest.lastName,
        rut: body.guest.rut || null,
        email: body.guest.email || null,
        phone: body.guest.phone || null,
        nationality: body.guest.nationality || 'Chile',
        address: body.guest.address || null,
        notes: body.guest.notes || null,
        referral: body.guest.referral || null,
        tags: '[]',
      },
    })
    guestId = guest.id
  } else {
    await prisma.guest.update({
      where: { id: guestId },
      data: {
        firstName: body.guest.firstName,
        lastName: body.guest.lastName,
        rut: body.guest.rut || null,
        email: body.guest.email || null,
        phone: body.guest.phone || null,
        nationality: body.guest.nationality || 'Chile',
        address: body.guest.address || null,
        notes: body.guest.notes || null,
      },
    })
  }

  // Create reservation
  const reservation = await prisma.reservation.create({
    data: {
      guestId,
      status: body.status,
      isVip: body.isVip,
      isNoisy: body.isNoisy,
      isDirty: body.isDirty,
      isDifficult: body.isDifficult,
      isNewPax: body.isNewPax,
      isRecurring: body.isRecurring,
      isWalkIn: body.isWalkIn,
      lateCheckoutHrs: body.lateCheckoutHrs || null,
      earlyCheckinHrs: body.earlyCheckinHrs || null,
      adults: body.adults,
      children: body.children,
      pets: body.pets,
      paymentMethod: body.paymentMethod || null,
      accountCode: body.accountCode || null,
      totalPaid: body.totalPaid,
      lostItems: body.lostItems || null,
      notes: body.notes || null,
      dte: body.dte || null,
      guaranteeRsv: body.guaranteeRsv || null,
      guaranteeGames: body.guaranteeGames || null,
      unitTotal: body.unitTotal,
      discounts: body.discounts,
      additionalServices: body.additionalServices,
      tax: body.tax,
      rooms: {
        create: body.rooms.map((r: any) => ({
          roomId: r.roomId,
          rateId: r.rateId || null,
          arrival: new Date(r.arrival),
          departure: new Date(r.departure),
          nights: r.nights,
          adults: r.adults,
          children: r.children,
          unitRate: r.unitRate,
          unitTotal: r.unitTotal,
        })),
      },
      auditLogs: {
        create: {
          action: 'Reserva creada',
          details: `Estado: ${body.status}`,
          userId: validUserId,
        },
      },
    },
  })

  // Update guest total stays
  await prisma.guest.update({
    where: { id: guestId },
    data: { totalStays: { increment: 1 } },
  })

  return NextResponse.json(reservation, { status: 201 })
}

// PUT /api/reservas — Update reservation
export async function PUT(req: NextRequest) {
  const session = await auth()
  const body = await req.json()
  const { reservaId } = body

  if (!reservaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  let validUserId = session?.user?.id || null
  if (validUserId) {
    const userExists = await prisma.user.findUnique({ where: { id: validUserId } })
    if (!userExists) validUserId = null
  }

  // Update guest
  if (body.guest.id) {
    await prisma.guest.update({
      where: { id: body.guest.id },
      data: {
        firstName: body.guest.firstName,
        lastName: body.guest.lastName,
        rut: body.guest.rut || null,
        email: body.guest.email || null,
        phone: body.guest.phone || null,
        nationality: body.guest.nationality || 'Chile',
        address: body.guest.address || null,
        notes: body.guest.notes || null,
        referral: body.guest.referral || null,
      },
    })
  }

  // Get old status for audit
  const old = await prisma.reservation.findUnique({ where: { id: reservaId }, select: { status: true } })

  // Update reservation
  const reservation = await prisma.reservation.update({
    where: { id: reservaId },
    data: {
      status: body.status,
      isVip: body.isVip,
      isNoisy: body.isNoisy,
      isDirty: body.isDirty,
      isDifficult: body.isDifficult,
      isNewPax: body.isNewPax,
      isRecurring: body.isRecurring,
      isWalkIn: body.isWalkIn,
      lateCheckoutHrs: body.lateCheckoutHrs || null,
      earlyCheckinHrs: body.earlyCheckinHrs || null,
      adults: body.adults,
      children: body.children,
      pets: body.pets,
      paymentMethod: body.paymentMethod || null,
      accountCode: body.accountCode || null,
      totalPaid: body.totalPaid,
      lostItems: body.lostItems || null,
      notes: body.notes || null,
      dte: body.dte || null,
      guaranteeRsv: body.guaranteeRsv || null,
      guaranteeGames: body.guaranteeGames || null,
      unitTotal: body.unitTotal,
      discounts: body.discounts,
      additionalServices: body.additionalServices,
      tax: body.tax,
    },
  })

  // Update room lines — delete and recreate
  await prisma.reservationRoom.deleteMany({ where: { reservationId: reservaId } })
  await prisma.reservationRoom.createMany({
    data: body.rooms.map((r: any) => ({
      reservationId: reservaId,
      roomId: r.roomId,
      rateId: r.rateId || null,
      arrival: new Date(r.arrival),
      departure: new Date(r.departure),
      nights: r.nights,
      adults: r.adults,
      children: r.children,
      unitRate: r.unitRate,
      unitTotal: r.unitTotal,
    })),
  })

  // Audit log
  const changes: string[] = []
  if (old?.status !== body.status) changes.push(`Estado: ${old?.status} → ${body.status}`)
  if (changes.length > 0) {
    await prisma.auditLog.create({
      data: {
        reservationId: reservaId,
        action: 'Reserva actualizada',
        details: changes.join(', '),
        userId: validUserId,
      },
    })
  }

  return NextResponse.json(reservation)
}
