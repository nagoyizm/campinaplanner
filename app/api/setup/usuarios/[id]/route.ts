import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { updateUserSchema } from '@/lib/validations'
import { requireOrg } from '@/lib/org'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrg()
  const { id } = await params
  const body = await req.json()
  
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.format() }, { status: 400 })
  }
  
  const data: any = {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    role: parsed.data.role,
    roleName: parsed.data.roleName,
    permissions: typeof parsed.data.permissions === 'object' ? JSON.stringify(parsed.data.permissions) : (parsed.data.permissions || null),
    active: parsed.data.active !== false,
  }
  
  if (parsed.data.password && parsed.data.password.length >= 6) {
    data.password = await bcrypt.hash(parsed.data.password, 12)
  }
  
  try {
    const user = await prisma.user.update({
      where: { id, organizationId },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, roleName: true, permissions: true, active: true, createdAt: true },
    })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
