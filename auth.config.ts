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
      }
      return session
    },
  },
  providers: [], // Providers are added in auth.ts to keep this config Edge-compatible
} satisfies NextAuthConfig
