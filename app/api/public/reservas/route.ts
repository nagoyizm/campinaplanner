import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, differenceInDays, format } from 'date-fns'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'

// Escapa contenido del huésped para evitar inyección HTML en el correo
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/[&<>"']/g, (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] || ch)

function buildReservaWebEmailHtml(params: {
  orgName: string
  reservationId: number
  status: string
  guest: { firstName: string; lastName: string; rut: string | null; email: string | null; phone: string | null; nationality: string | null; notes: string | null }
  unitTypeName: string
  roomName: string
  arrival: string
  departure: string
  nights: number
  adults: number
  children: number
  pets: number
  unitTotal: number
  currency: string
  paymentMethods: string
  bankAccounts: string
  publicUrl: string
}): string {
  const { orgName, reservationId, guest, unitTypeName, roomName, arrival, departure, nights, unitTotal, currency, paymentMethods, bankAccounts, publicUrl } = params
  const statusLabel = params.status === 'on_hold' ? 'Por Confirmar' : 'Reservada · Pendiente de confirmación'
  const statusColor = params.status === 'on_hold' ? '#d97706' : '#2563eb'
  const money = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(unitTotal || 0)
  const createdAt = new Date().toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:6px 12px;color:#111827;font-size:13px;font-weight:600;">${value}</td>
    </tr>`

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:24px 28px;background:#1f2937;">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;">Nueva Reserva Web</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">${escapeHtml(orgName)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;border-bottom:1px solid #f3f4f6;">
            <span style="display:inline-block;background:${statusColor};color:#ffffff;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;">${statusLabel}</span>
            <span style="color:#6b7280;font-size:13px;">&nbsp;&nbsp;Reserva N° ${reservationId} · ${escapeHtml(createdAt)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;">
            <div style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Huésped</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
              ${row('Nombre', `${escapeHtml(guest.firstName)} ${escapeHtml(guest.lastName)}`)}
              ${row('RUT', escapeHtml(guest.rut))}
              ${row('Email', escapeHtml(guest.email))}
              ${row('Teléfono', escapeHtml(guest.phone))}
              ${row('Nacionalidad', escapeHtml(guest.nationality))}
              ${guest.notes ? row('Notas del huésped', escapeHtml(guest.notes)) : ''}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 18px;">
            <div style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Estancia</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
              ${row('Tipo de estancia', escapeHtml(unitTypeName))}
              ${row('Unidad asignada', escapeHtml(roomName))}
              ${row('Check-In', escapeHtml(arrival))}
              ${row('Check-Out', escapeHtml(departure))}
              ${row('Noches', String(nights))}
              ${row('Adultos', String(params.adults))}
              ${row('Niños', String(params.children))}
              ${row('Mascotas', String(params.pets))}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
              <tr>
                <td style="padding:14px 16px;color:#1e40af;font-size:13px;font-weight:600;">Total estadía</td>
                <td style="padding:14px 16px;color:#1e40af;font-size:16px;font-weight:800;text-align:right;">$${money} ${escapeHtml(currency)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 18px;">
            <div style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Pago y cuentas destino</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
              ${row('Formas de pago', escapeHtml(paymentMethods))}
              ${row('Cuentas destino', escapeHtml(bankAccounts))}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;">
            <div style="font-size:13px;color:#374151;line-height:1.6;">
              Este pasajero reservó desde la web. <strong>Revisa, confirma la reserva en el panel y contacta al huésped</strong> (${escapeHtml(guest.phone || guest.email || 'sin contacto')}) para coordinar el pago o cerrar la reserva.
            </div>
            <div style="margin-top:12px;font-size:12px;color:#9ca3af;">
              Página pública del recinto: <a href="${escapeHtml(publicUrl)}" style="color:#2563eb;">${escapeHtml(publicUrl)}</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, unitTypeId, arrival, departure, adults = 1, children = 0, pets = 0, guest } = body

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
        autoBookingMode: true,
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

    const mode = org.autoBookingMode || 'direct'
    const needsConfirmation = mode !== 'direct'
    const roomIds = unitType.rooms.map(r => r.id)

    // 3. Find rooms already occupied in [arrivalDate, departureDate]
    // Las reservas 'on_hold' (pendientes de pago/confirmación) NO bloquean la disponibilidad.
    const occupiedReservations = await prisma.reservationRoom.findMany({
      where: {
        roomId: { in: roomIds },
        arrival: { lt: departureDate },
        departure: { gt: arrivalDate },
        reservation: {
          organizationId: org.id,
          status: { notIn: ['cancelled', 'on_hold'] }
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
        status: needsConfirmation ? 'on_hold' : 'booked', // Pendiente de confirmación / Reservada
        source: 'Web Directa',
        createdByName: 'Auto-Reserva Web',
        adults: Number(adults),
        children: Number(children),
        pets: Number(pets) || 0,
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
            details: `Reserva online creada por ${guest.firstName} ${guest.lastName} para la unidad ${assignedRoom.name} (${unitType.name})${needsConfirmation ? ' — pendiente de confirmación' : ''}`
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
      const admins = await prisma.user.findMany({
        where: {
          organizationId: org.id,
          role: { in: ['admin', 'superadmin'] },
        }
      })

      const msg = `${needsConfirmation ? '⏳' : '📋'} *${needsConfirmation ? 'AUTO-RESERVA WEB POR CONFIRMAR' : 'AUTO-RESERVA WEB RESERVADA'}*\n` +
        `• *Recinto:* ${org.name}\n` +
        `• *Reserva N°:* ${reservation.id}\n` +
        `• *Huésped:* ${guest.firstName} ${guest.lastName}\n` +
        `• *Contacto:* ${guest.phone || guest.email || 'N/A'}\n` +
        `• *Tipo:* ${unitType.name} (${assignedRoom.name})\n` +
        `• *Fechas:* ${format(arrivalDate, 'dd/MM/yyyy')} al ${format(departureDate, 'dd/MM/yyyy')} (${nights} noche/s)\n` +
        `• *Total:* ${unitTotal.toLocaleString('es-CL')} CLP` +
        (Number(pets) > 0 ? `\n• *Mascota(s):* ${Number(pets)} 🐾` : '') +
        `\n\n⚠️ *Pendiente de confirmación.* Revísala en el panel.`

      const emailHtml = buildReservaWebEmailHtml({
        orgName: org.name,
        reservationId: reservation.id,
        status: reservation.status,
        guest: {
          firstName: guestRecord.firstName,
          lastName: guestRecord.lastName,
          rut: guestRecord.rut,
          email: guestRecord.email,
          phone: guestRecord.phone,
          nationality: guestRecord.nationality,
          notes: guest.notes || null,
        },
        unitTypeName: unitType.name,
        roomName: assignedRoom.name,
        arrival: format(arrivalDate, 'dd/MM/yyyy'),
        departure: format(departureDate, 'dd/MM/yyyy'),
        nights,
        adults: Number(adults),
        children: Number(children),
        pets: Number(pets) || 0,
        unitTotal,
        currency: org.currency || 'CLP',
        paymentMethods: org.paymentMethods || '',
        bankAccounts: org.bankAccounts || '',
        publicUrl: `https://reservas.agendio.cl/${org.slug}`,
      })

      for (const admin of admins) {
        if (admin.notifyWspResConf && admin.phone) {
          await sendWhatsAppMessage(admin.phone, msg, org.id).catch(console.error)
        }
        if (admin.email) {
          await sendEmail(
            admin.email,
            `${needsConfirmation ? 'Nueva Reserva Web por Confirmar' : 'Nueva Reserva Web Reservada'} #${reservation.id} — ${org.name}`,
            emailHtml
          ).catch(console.error)
        }
      }
    } catch (notifyErr) {
      console.error('Error sending notification for auto-booking:', notifyErr)
    }

    const confirmationMessage =
      mode === 'direct'
        ? 'Tu reserva quedó registrada como "Reservada" y está pendiente de confirmación. Nos pondremos en contacto contigo para cerrar la reserva o coordinar el pago.'
        : mode === 'gateway'
          ? 'Tu reserva quedará confirmada cuando el pago se procese en la pasarela.'
          : 'Tu reserva quedará confirmada cuando confirmemos la transferencia. Te contactaremos al correo o teléfono registrado.'

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      assignedRoom: assignedRoom.name,
      unitType: unitType.name,
      arrival: format(arrivalDate, 'yyyy-MM-dd'),
      departure: format(departureDate, 'yyyy-MM-dd'),
      nights,
      unitTotal,
      pets: Number(pets) || 0,
      currency: org.currency || 'CLP',
      bankAccounts: org.bankAccounts,
      paymentMethods: org.paymentMethods,
      mode,
      needsConfirmation,
      status: reservation.status,
      confirmationMessage,
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
