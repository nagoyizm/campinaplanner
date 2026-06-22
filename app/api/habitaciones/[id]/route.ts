import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import { auth } from '@/auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireOrg()
    const { id } = await params
    const session = await auth()
    
    const body = await req.json()
    const { cleaningStatus } = body

    if (!cleaningStatus || !['clean', 'dirty', 'maintenance', 'occupied'].includes(cleaningStatus)) {
      return NextResponse.json({ error: 'Estado de limpieza inválido' }, { status: 400 })
    }

    const room = await prisma.room.update({
      where: {
        id,
        organizationId // Ensure they only update their own rooms
      },
      data: {
        cleaningStatus
      }
    })

    // Send WhatsApp if status is 'clean'
    if (cleaningStatus === 'clean') {
      const admins = await prisma.user.findMany({
        where: {
          organizationId,
          role: { in: ['admin', 'superadmin'] },
          phone: { not: null }
        }
      })

      const authorName = session?.user?.name || 'Un empleado'
      const msg = `✅ *Habitación Limpia*\n${authorName} ha marcado la habitación *${room.name}* como limpia.`

      const promises = []
      for (const admin of admins) {
        if (admin.phone) {
          promises.push(sendWhatsAppMessage(admin.phone, msg, organizationId).catch(console.error))
        }
      }
      await Promise.all(promises)
    }

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Error updating cleaning status:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
