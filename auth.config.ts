import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.roleName = (user as any).roleName
        token.organizationId = (user as any).organizationId
        token.orgName = (user as any).orgName
        token.orgPlan = (user as any).orgPlan
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).roleName = token.roleName
        ;(session.user as any).organizationId = token.organizationId
        ;(session.user as any).orgName = token.orgName
        ;(session.user as any).orgPlan = token.orgPlan
      }
      return session
    },
  },
  providers: [], // Providers are added in auth.ts to keep this config Edge-compatible
} satisfies NextAuthConfig
