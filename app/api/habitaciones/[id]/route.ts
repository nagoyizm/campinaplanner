import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import { auth } from '@/auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireOrg()
    const { id } = await params
    const session = await auth()
    
    const body = await req.json()
    const { cleaningStatus, cleaningPriority, cleaningNote } = body

    const dataToUpdate: any = {}
    
    if (cleaningStatus !== undefined) {
      if (!['clean', 'dirty', 'maintenance', 'occupied'].includes(cleaningStatus)) {
        return NextResponse.json({ error: 'Estado de limpieza inválido' }, { status: 400 })
      }
      dataToUpdate.cleaningStatus = cleaningStatus
      
      // Auto-remove priority when room is cleaned
      if (cleaningStatus === 'clean') {
        dataToUpdate.cleaningPriority = false
        dataToUpdate.cleaningNote = null
      }
    }
    
    if (cleaningPriority !== undefined) {
      dataToUpdate.cleaningPriority = cleaningPriority
    }
    
    if (cleaningNote !== undefined) {
      dataToUpdate.cleaningNote = cleaningNote
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No se enviaron datos para actualizar' }, { status: 400 })
    }

    const room = await prisma.room.update({
      where: {
        id,
        organizationId // Ensure they only update their own rooms
      },
      data: dataToUpdate
    })

    // Send WhatsApp/Email if status is 'clean'
    if (cleaningStatus === 'clean') {
      try {
        const notifyAdmins = await prisma.user.findMany({
          where: {
            organizationId,
            role: { in: ['admin', 'superadmin'] },
            OR: [{ notifyWspCleaning: true }, { notifyEmailCleaning: true }]
          }
        })

        const message = `✨ *Habitación Limpia:*\nLa cabaña ${room.name} ha sido marcada como limpia por el personal.`

        for (const admin of notifyAdmins) {
          if (admin.notifyWspCleaning && admin.phone) {
            await sendWhatsAppMessage(admin.phone, message, organizationId).catch(console.error)
          }
          if (admin.notifyEmailCleaning && admin.email) {
            await sendEmail(admin.email, `Limpieza Completa: ${room.name}`, `<p>La cabaña ${room.name} ha sido marcada como limpia por el personal.</p>`).catch(console.error)
          }
        }
      } catch (notificationError) {
        console.error('Error al enviar notificaciones de limpieza:', notificationError)
      }
    }

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Error updating cleaning status:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
