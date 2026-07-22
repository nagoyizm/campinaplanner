import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { rateLimit } from '@/lib/rate-limit'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string

        // Rate limiting: max 5 attempts per minute per email
        if (!rateLimit(`login:${email}`, 5, 60 * 1000)) {
          throw new Error('Demasiados intentos. Intenta de nuevo en 1 minuto.')
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true, email: true, name: true, role: true,
            roleName: true, permissions: true, active: true, password: true,
            organizationId: true, defaultHomePage: true,
            organization: { select: { name: true, plan: true } },
          },
        })

        if (!user || !user.active) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        
        if (!valid) {
          // Log failed attempt async without awaiting to not block response
          prisma.auditLog.create({
            data: {
              organizationId: user.organizationId,
              userId: user.id,
              action: 'login_failed',
              details: 'Intento de inicio de sesión fallido (contraseña incorrecta)',
            }
          }).catch(console.error)
          return null
        }

        // Log successful login
        prisma.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'login_success',
            details: 'Inicio de sesión exitoso',
          }
        }).catch(console.error)

        const { parsePermissions } = await import('@/lib/permissions')

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleName: user.roleName,
          permissions: parsePermissions(user.permissions, user.role),
          organizationId: user.organizationId,
          orgName: user.organization.name,
          orgPlan: user.organization.plan,
          defaultHomePage: user.defaultHomePage,
        }
      },
    }),
  ],
})
