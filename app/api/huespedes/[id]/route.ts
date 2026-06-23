import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guest = await prisma.guest.findUnique({
    where: { id },
    include: {
      reservations: {
        include: { rooms: { include: { room: true } } },
        orderBy: { id: 'desc' },
        take: 10,
      },
    },
  })
  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(guest)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const guest = await prisma.guest.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      rut: body.rut || null,
      email: body.email || null,
      phone: body.phone || null,
      nationality: body.nationality || 'Chile',
      address: body.address || null,
      notes: body.notes || null,
      tags: body.tags || '[]',
    },
  })
  return NextResponse.json(guest)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo administradores pueden eliminar huéspedes' }, { status: 403 })
  }

  const { id } = await params
  try {
    await prisma.guest.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se puede eliminar: tiene reservas asociadas' }, { status: 409 })
  }
}
