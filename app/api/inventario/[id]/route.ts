import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId, role } = await requireOrg()
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    // Soft delete para no romper historiales de transacciones ni reportes contables
    const item = await prisma.inventoryItem.update({
      where: {
        id,
        organizationId // Ensure they only delete their own items
      },
      data: {
        active: false
      }
    })

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
