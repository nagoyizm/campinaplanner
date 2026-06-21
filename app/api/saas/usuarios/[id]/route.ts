import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'

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
