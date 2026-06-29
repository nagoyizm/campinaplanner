import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const { organizationId, role } = await requireOrg()
    
    // Only admin or superadmin can broadcast
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores pueden enviar mensajes masivos.' }, { status: 403 })
    }

    const { message } = await req.json()
    if (!message) {
      return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 })
    }

    // Find all checked-in reservations
    const checkedInReservations = await prisma.reservation.findMany({
      where: {
        organizationId,
        status: 'checked_in'
      },
      include: {
        guest: true
      }
    })

    const targetGuests = checkedInReservations
      .map(r => r.guest)
      .filter(g => g?.phone) // Ensure guest exists and has a phone
    
    // Remove duplicates by phone number
    const uniquePhones = new Map<string, typeof targetGuests[0]>()
    targetGuests.forEach(g => {
      if (g.phone && !uniquePhones.has(g.phone)) {
        uniquePhones.set(g.phone, g)
      }
    })

    const guestsToMessage = Array.from(uniquePhones.values())

    if (guestsToMessage.length === 0) {
      return NextResponse.json({ message: 'No hay pasajeros actuales con número de teléfono registrado.' })
    }

    let successCount = 0
    let failCount = 0

    // Send messages (not blocking completely, but we'll wait for them to report back counts)
    const sendPromises = guestsToMessage.map(async (guest) => {
      if (!guest.phone) return
      const res = await sendWhatsAppMessage(guest.phone, message, organizationId)
      if (res.success) {
        successCount++
      } else {
        failCount++
      }
    })

    await Promise.allSettled(sendPromises)

    return NextResponse.json({ 
      success: true, 
      message: `Mensaje enviado a ${successCount} pasajeros. Fallaron ${failCount}.` 
    })

  } catch (error) {
    console.error('Error broadcasting WhatsApp message:', error)
    return NextResponse.json({ error: 'Error al enviar mensajes masivos' }, { status: 500 })
  }
}
