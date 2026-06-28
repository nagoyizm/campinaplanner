import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  try {
    if (body.plan) {
      await prisma.organization.update({
        where: { id },
        data: { plan: body.plan }
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json({ error: 'Error al actualizar organización.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Proteger cuenta maestra del SaaS de ser borrada
    const orgInfo = await prisma.organization.findUnique({ where: { id } })
    if (orgInfo?.slug === 'system-habita') {
      return NextResponse.json({ error: 'No puedes borrar la organización del sistema.' }, { status: 400 })
    }

    // Eliminación en cascada segura
    await prisma.memo.deleteMany({ where: { organizationId: id } })
    await prisma.auditLog.deleteMany({ where: { organizationId: id } })
    await prisma.saasPayment.deleteMany({ where: { organizationId: id } })
    await prisma.payment.deleteMany({ where: { reservation: { organizationId: id } } })
    await prisma.extra.deleteMany({ where: { reservation: { organizationId: id } } })
    
    const resvRooms = await prisma.reservationRoom.findMany({ where: { room: { organizationId: id } } })
    if (resvRooms.length > 0) {
      await prisma.reservationRoom.deleteMany({ where: { id: { in: resvRooms.map(r => r.id) } } })
    }
    
    await prisma.reservation.deleteMany({ where: { organizationId: id } })
    await prisma.rate.deleteMany({ where: { organizationId: id } })
    await prisma.room.deleteMany({ where: { organizationId: id } })
    await prisma.amenity.deleteMany({ where: { organizationId: id } })
    await prisma.unitType.deleteMany({ where: { organizationId: id } })
    await prisma.guest.deleteMany({ where: { organizationId: id } })
    await prisma.user.deleteMany({ where: { organizationId: id } })
    
    await prisma.organization.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Error al borrar la organización en cascada. Podría tener registros bloqueados.' }, { status: 500 })
  }
}
