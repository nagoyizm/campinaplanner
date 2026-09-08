import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días en segundos (hace la cookie persistente en disco)
    updateAge: 24 * 60 * 60,   // Renueva el token automáticamente cada 24h si hay actividad
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.roleName = (user as any).roleName
        token.permissions = (user as any).permissions
        token.organizationId = (user as any).organizationId
        token.orgName = (user as any).orgName
        token.orgPlan = (user as any).orgPlan
        token.defaultHomePage = (user as any).defaultHomePage
        token.rememberMe = (user as any).rememberMe !== false

        // 30 días si 'Recuérdame' está activado, 1 día (24 horas) si no lo está
        const maxAge = token.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60
        token.exp = Math.floor(Date.now() / 1000) + maxAge
      } else if (token.rememberMe === false) {
        // Para sesiones no recordadas, limitar a 24 horas y no permitir extensión automática a 30 días
        const maxAllowed = Math.floor(Date.now() / 1000) + 24 * 60 * 60
        if (!token.exp || (token.exp as number) > maxAllowed) {
          token.exp = maxAllowed
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).roleName = token.roleName
        ;(session.user as any).permissions = token.permissions
        ;(session.user as any).organizationId = token.organizationId
        ;(session.user as any).orgName = token.orgName
        ;(session.user as any).orgPlan = token.orgPlan
        ;(session.user as any).defaultHomePage = token.defaultHomePage
        ;(session.user as any).rememberMe = token.rememberMe !== false
      }
      return session
    },
  },
  providers: [], // Providers are added in auth.ts to keep this config Edge-compatible
} satisfies NextAuthConfig
