import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'
import bcrypt from 'bcryptjs'
import { updateUserSchema } from '@/lib/validations'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  
  try {
    const body = await req.json()
    
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.format() }, { status: 400 })
    }
    
    const data: any = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      roleName: parsed.data.roleName,
      active: parsed.data.active !== false
    }

    if (parsed.data.password && parsed.data.password.length >= 6) {
      data.password = await bcrypt.hash(parsed.data.password, 12)
    }

    const updated = await prisma.user.update({
      where: { id },
      data
    })
    
    // Log audit async
    if (parsed.data.password && parsed.data.password.length >= 6) {
      prisma.auditLog.create({
        data: {
          organizationId: updated.organizationId,
          userId: updated.id,
          action: 'user_password_reset',
          details: 'Superadmin cambió la contraseña del usuario'
        }
      }).catch(console.error)
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'No se pudo actualizar el usuario' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verificar que el usuario no se borre a sí mismo (opcional pero recomendado)
    // const session = await auth()
    // if (session?.user?.id === id) return NextResponse.json({ error: 'No puedes borrarte a ti mismo' }, { status: 400 })

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'No se pudo eliminar el usuario' }, { status: 500 })
  }
}
