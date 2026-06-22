import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import bcrypt from 'bcryptjs'

export async function GET() {
  const { organizationId } = await requireOrg()
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true, phone: true, role: true, roleName: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const body = await req.json()
  if (!body.password) return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
  const hashed = await bcrypt.hash(body.password, 12)
  const user = await prisma.user.create({
    data: {
      organizationId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: hashed,
      role: body.role || 'operator',
      roleName: body.roleName || 'Recepción',
      active: body.active !== false,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, roleName: true, active: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
