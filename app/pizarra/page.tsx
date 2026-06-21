import { auth } from '@/auth'
import { requireOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import PizarraClient from './PizarraClient'

export const dynamic = 'force-dynamic'

export default async function PizarraPage() {
  const session = await auth()
  const { organizationId } = await requireOrg()
  const role = (session?.user as any)?.role || 'empleado'
  const userId = (session?.user as any)?.id

  // Definir visibilidad de memos
  const isAdmin = role === 'admin' || role === 'superadmin'
  const whereClause: any = { organizationId }
  
  if (!isAdmin) {
    // Si no es admin, solo ve los memos generales o los dirigidos a él mismo
    whereClause.OR = [
      { targetUserId: null },
      { targetUserId: userId }
    ]
  }

  const memos = await prisma.memo.findMany({
    where: whereClause,
    include: { targetUser: { select: { name: true, roleName: true } } },
    orderBy: { createdAt: 'desc' }
  })

  // Obtener usuarios si es admin para poblar el select
  let orgUsers: any[] = []
  if (isAdmin) {
    orgUsers = await prisma.user.findMany({
      where: { organizationId, active: true },
      select: { id: true, name: true, roleName: true }
    })
  }

  return <PizarraClient initialMemos={memos as any} userRole={role} orgUsers={orgUsers} />
}
