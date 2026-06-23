/**
 * lib/org.ts
 * Multi-tenant auth helper.
 * Usage in Server Actions / Route Handlers:
 *   const { organizationId } = await requireOrg()
 */
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export async function requireOrg() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const organizationId = (session.user as any).organizationId as string | undefined
  if (!organizationId) throw new Error('User has no organizationId in session')

  return {
    organizationId,
    userId: session.user.id as string,
    role: (session.user as any).role as string,
    orgName: (session.user as any).orgName as string,
    name: session.user.name as string | undefined,
  }
}
export async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role as string | undefined
  if (role !== 'superadmin') redirect('/dashboard')

  return {
    organizationId: (session.user as any).organizationId as string,
    userId: session.user.id as string,
    role,
  }
}
