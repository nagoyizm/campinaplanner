import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET(req: Request) {
  try {
    const { organizationId, role } = await requireOrg()
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const items = await prisma.inventoryItem.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching inventory items:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { organizationId, role } = await requireOrg()
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { name, category, unitCost, minQuantity } = body

    if (!name || !category || typeof unitCost !== 'number') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const item = await prisma.inventoryItem.create({
      data: {
        organizationId,
        name,
        category,
        unitCost,
        minQuantity: minQuantity || 0,
        currentQuantity: 0 // Starts at 0, must be updated via purchases
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error creating inventory item:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
