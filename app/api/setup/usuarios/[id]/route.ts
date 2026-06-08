import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: any = {
    name: body.name,
    email: body.email,
    role: body.role,
    roleName: body.roleName,
    active: body.active !== false,
  }
  if (body.password) {
    data.password = await bcrypt.hash(body.password, 12)
  }
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, roleName: true, active: true, createdAt: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
