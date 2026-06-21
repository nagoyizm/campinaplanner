import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || undefined
  const q = searchParams.get('q') || ''
  const skip = (page - 1) * limit

  const where: any = { organizationId }
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

export async function POST(req: NextRequest) {
  const { organizationId, userId } = await requireOrg()
  const body = await req.json()

  // Upsert guest scoped to this org
  let guestId = body.guest.id
  if (!guestId) {
    const guest = await prisma.guest.create({
      data: {
        organizationId,
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

  const reservation = await prisma.reservation.create({
    data: {
      organizationId,
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
          organizationId,
          action: 'Reserva creada',
          details: `Estado: ${body.status}`,
          userId,
        },
      },
    },
  })

  await prisma.guest.update({
    where: { id: guestId },
    data: { totalStays: { increment: 1 } },
  })

  return NextResponse.json(reservation, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { organizationId, userId } = await requireOrg()
  const body = await req.json()
  const { reservaId } = body

  if (!reservaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

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

  const old = await prisma.reservation.findUnique({
    where: { id: reservaId, organizationId },
    select: { status: true },
  })
  if (!old) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

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

  const changes: string[] = []
  if (old?.status !== body.status) changes.push(`Estado: ${old?.status} → ${body.status}`)
  if (changes.length > 0) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        reservationId: reservaId,
        action: 'Reserva actualizada',
        details: changes.join(', '),
        userId,
      },
    })
  }

  return NextResponse.json(reservation)
}
