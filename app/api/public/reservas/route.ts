import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, differenceInDays, format } from 'date-fns'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, unitTypeId, arrival, departure, adults = 1, children = 0, guest } = body

    if (!slug || !unitTypeId || !arrival || !departure || !guest?.firstName || !guest?.lastName) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios para realizar la reserva' },
        { status: 400 }
      )
    }

    const arrivalDate = parseISO(arrival)
    const departureDate = parseISO(departure)
    const nights = differenceInDays(departureDate, arrivalDate)

    if (nights <= 0) {
      return NextResponse.json(
        { error: 'La fecha de salida debe ser posterior a la fecha de llegada' },
        { status: 400 }
      )
    }

    // 1. Fetch organization
    const org = await prisma.organization.findUnique({
      where: { slug, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        bankAccounts: true,
        paymentMethods: true,
        currency: true,
      }
    })

    if (!org) {
      return NextResponse.json({ error: 'Recinto no encontrado' }, { status: 404 })
    }

    // 2. Fetch unit type and active rooms
    const unitType = await prisma.unitType.findFirst({
      where: { id: unitTypeId, organizationId: org.id, active: true },
      include: {
        rooms: { where: { active: true } },
        rates: { where: { active: true }, orderBy: { rackRate: 'asc' }, take: 1 }
      }
    })

    if (!unitType || unitType.rooms.length === 0) {
      return NextResponse.json(
        { error: 'El tipo de estancia seleccionado no tiene unidades disponibles' },
        { status: 400 }
      )
    }

    const roomIds = unitType.rooms.map(r => r.id)

    // 3. Find rooms already occupied in [arrivalDate, departureDate]
    const occupiedReservations = await prisma.reservationRoom.findMany({
      where: {
        roomId: { in: roomIds },
        arrival: { lt: departureDate },
        departure: { gt: arrivalDate },
        reservation: {
          organizationId: org.id,
          status: { notIn: ['cancelled'] }
        }
      },
      select: { roomId: true }
    })

    const occupiedRoomIds = new Set(occupiedReservations.map(r => r.roomId))
    const availableRooms = unitType.rooms.filter(r => !occupiedRoomIds.has(r.id))

    if (availableRooms.length === 0) {
      return NextResponse.json(
        { error: 'Lo sentimos, ya no hay cabañas/habitaciones disponibles de este tipo para las fechas seleccionadas.' },
        { status: 409 }
      )
    }

    // Pick first available room
    const assignedRoom = availableRooms[0]

    // 4. Rate calculation
    const rate = unitType.rates[0]
    const rackRate = rate?.rackRate || 0
    const included = rate?.includedOccupants || 2
    const extraAdultRate = rate?.extraPersonAdult || 0
    const extraChildRate = rate?.extraPersonChild || 0

    const extraAdults = Math.max(0, Number(adults) - included)
    const extraChildren = extraAdults > 0 ? Number(children) : Math.max(0, (Number(adults) + Number(children)) - included)

    const nightExtraCharge = (extraAdults * extraAdultRate) + (extraChildren * extraChildRate)
    const unitRate = rackRate + nightExtraCharge
    const unitTotal = unitRate * nights

    // 5. Upsert Guest in this Organization
    let guestRecord
    if (guest.email || guest.rut) {
      guestRecord = await prisma.guest.findFirst({
        where: {
          organizationId: org.id,
          OR: [
            ...(guest.email ? [{ email: guest.email }] : []),
            ...(guest.rut ? [{ rut: guest.rut }] : []),
          ]
        }
      })
    }

    if (guestRecord) {
      guestRecord = await prisma.guest.update({
        where: { id: guestRecord.id },
        data: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone || guestRecord.phone,
          rut: guest.rut || guestRecord.rut,
          nationality: guest.nationality || guestRecord.nationality || 'Chile',
          notes: guest.notes ? `${guestRecord.notes || ''}\n[Web]: ${guest.notes}` : guestRecord.notes,
          totalStays: { increment: 1 }
        }
      })
    } else {
      guestRecord = await prisma.guest.create({
        data: {
          organizationId: org.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email || null,
          phone: guest.phone || null,
          rut: guest.rut || null,
          nationality: guest.nationality || 'Chile',
          notes: guest.notes ? `[Web]: ${guest.notes}` : null,
          tags: '["Auto-Reserva Web"]',
          totalStays: 1
        }
      })
    }

    // 6. Create Reservation & ReservationRoom
    const reservation = await prisma.reservation.create({
      data: {
        organizationId: org.id,
        guestId: guestRecord.id,
        status: 'booked', // Pendiente / Reservada
        source: 'Web Directa',
        createdByName: 'Auto-Reserva Web',
        adults: Number(adults),
        children: Number(children),
        unitTotal: unitTotal,
        notes: guest.notes || null,
        rooms: {
          create: [{
            roomId: assignedRoom.id,
            rateId: rate?.id || null,
            arrival: arrivalDate,
            departure: departureDate,
            nights: nights,
            adults: Number(adults),
            children: Number(children),
            unitRate: unitRate,
            unitTotal: unitTotal,
          }]
        },
        auditLogs: {
          create: {
            organizationId: org.id,
            action: 'Auto-Reserva Web Creada',
            details: `Reserva online creada por ${guest.firstName} ${guest.lastName} para la unidad ${assignedRoom.name} (${unitType.name})`
          }
        }
      },
      include: {
        guest: true,
        rooms: { include: { room: true } }
      }
    })

    // 7. Send notifications to admins
    try {
      const adminsToNotify = await prisma.user.findMany({
        where: {
          organizationId: org.id,
          role: { in: ['admin', 'superadmin'] },
          OR: [{ notifyWspResConf: true }, { notifyEmailResConf: true }]
        }
      })

      const msg = `🌐 *NUEVA AUTO-RESERVA WEB*\n` +
        `• *Recinto:* ${org.name}\n` +
        `• *Reserva N°:* ${reservation.id}\n` +
        `• *Huésped:* ${guest.firstName} ${guest.lastName}\n` +
        `• *Contacto:* ${guest.phone || guest.email || 'N/A'}\n` +
        `• *Tipo:* ${unitType.name} (${assignedRoom.name})\n` +
        `• *Fechas:* ${format(arrivalDate, 'dd/MM/yyyy')} al ${format(departureDate, 'dd/MM/yyyy')} (${nights} noche/s)\n` +
        `• *Total:* ${unitTotal.toLocaleString('es-CL')} CLP`

      for (const admin of adminsToNotify) {
        if (admin.notifyWspResConf && admin.phone) {
          await sendWhatsAppMessage(admin.phone, msg, org.id).catch(console.error)
        }
        if (admin.notifyEmailResConf && admin.email) {
          await sendEmail(
            admin.email,
            `Nueva Auto-Reserva Web #${reservation.id} - ${org.name}`,
            `<p>Se ha recibido una nueva reserva directa desde la web para <strong>${unitType.name}</strong> (${assignedRoom.name}).</p>` +
            `<p><strong>Huésped:</strong> ${guest.firstName} ${guest.lastName} (${guest.email || ''} ${guest.phone || ''})</p>` +
            `<p><strong>Total:</strong> $${unitTotal.toLocaleString('es-CL')}</p>`
          ).catch(console.error)
        }
      }
    } catch (notifyErr) {
      console.error('Error sending notification for auto-booking:', notifyErr)
    }

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      assignedRoom: assignedRoom.name,
      unitType: unitType.name,
      arrival: format(arrivalDate, 'yyyy-MM-dd'),
      departure: format(departureDate, 'yyyy-MM-dd'),
      nights,
      unitTotal,
      currency: org.currency || 'CLP',
      bankAccounts: org.bankAccounts,
      paymentMethods: org.paymentMethods,
      guest: {
        firstName: guestRecord.firstName,
        lastName: guestRecord.lastName,
        email: guestRecord.email,
        phone: guestRecord.phone
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating public reservation:', error)
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar la reserva. Por favor reintenta.' },
      { status: 500 }
    )
  }
}
