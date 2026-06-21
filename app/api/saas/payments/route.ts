import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { amount, startDate, endDate, organizationId, status, notes } = body

    if (!amount || !startDate || !endDate || !organizationId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    const created = await prisma.saasPayment.create({
      data: {
        organizationId,
        amount: parseFloat(amount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'pending',
        notes: notes || '',
      }
    })
    return NextResponse.json(created)
  } catch (error: any) {
    console.error('Create SaasPayment Error:', error)
    return NextResponse.json({ error: 'Error al crear cobro' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { id, startDate, endDate, organizationId, amount, status, notes } = body

    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    const updated = await prisma.saasPayment.update({
      where: { id },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(organizationId && { organizationId }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      }
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Update SaasPayment Error:', error)
    return NextResponse.json({ error: 'Error al actualizar cobro' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    await prisma.saasPayment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar cobro' }, { status: 500 })
  }
}

