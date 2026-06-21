import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { title, startDate, endDate, description, type } = body

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    const created = await prisma.saasEvent.create({
      data: {
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || '',
        type: type || 'reminder'
      }
    })
    return NextResponse.json(created)
  } catch (error: any) {
    console.error('Create SaasEvent Error:', error)
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { id, startDate, endDate, title, description, type } = body

    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    const updated = await prisma.saasEvent.update({
      where: { id },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
      }
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Update SaasEvent Error:', error)
    return NextResponse.json({ error: 'Error al actualizar evento' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    await prisma.saasEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar evento' }, { status: 500 })
  }
}

