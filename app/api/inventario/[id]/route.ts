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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, role } = await requireOrg()
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, category, unitCost, minQuantity, active } = body

    const existing = await prisma.inventoryItem.findUnique({
      where: { id }
    })

    if (existing?.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        category: category ?? existing.category,
        unitCost: unitCost ?? existing.unitCost,
        minQuantity: minQuantity ?? existing.minQuantity,
        active: active ?? existing.active,
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
