import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import bcrypt from 'bcryptjs'
import { createUserSchema } from '@/lib/validations'

export async function GET() {
  const { organizationId } = await requireOrg()
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true, phone: true, role: true, roleName: true, permissions: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const body = await req.json()
  
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.format() }, { status: 400 })
  }
  
  const data = parsed.data
  const hashed = await bcrypt.hash(data.password, 12)
  const permissionsStr = typeof data.permissions === 'object' ? JSON.stringify(data.permissions) : (data.permissions || null)
  
  try {
    const user = await prisma.user.create({
      data: {
        organizationId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashed,
        role: data.role,
        roleName: data.roleName,
        permissions: permissionsStr,
        active: data.active,
      },
      select: { id: true, name: true, email: true, phone: true, role: true, roleName: true, permissions: true, active: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
