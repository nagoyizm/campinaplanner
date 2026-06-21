import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireOrg()
    const { id } = await params
    
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

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Error updating cleaning status:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
