import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  // ponytail: nonce-based CSP breaks cached pages on Vercel CDN (script nonce mismatch → JS blocked → login broken)
  // Using 'unsafe-inline' instead since nonce injection via layout.tsx is not wired up
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim()

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isAuthPage = nextUrl.pathname.startsWith('/login')
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isPublic = isAuthPage || isApiAuth
  const isRoot = nextUrl.pathname === '/'
  
  const userRole = (req.auth?.user as any)?.role
  const userDefaultPage = (req.auth?.user as any)?.defaultHomePage

  let redirectTarget = userDefaultPage || '/dashboard'
  
  if (!userDefaultPage) {
    if (userRole === 'superadmin') redirectTarget = '/saas'
    else if (userRole === 'recepcionista') redirectTarget = '/recepcion'
    else if (userRole === 'empleado') redirectTarget = '/habitaciones'
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Role-based route protection
  const path = nextUrl.pathname
  const isSetupRoute = path.startsWith('/setup')
  const isDashboardRoute = path === '/dashboard' || path.startsWith('/dashboard/')
  const isReportesRoute = path.startsWith('/reportes')
  const isSaasRoute = path.startsWith('/saas')

  if (!isLoggedIn && !isPublic) {
    response = NextResponse.redirect(new URL('/login', req.url))
  } else if (isLoggedIn && isAuthPage) {
    response = NextResponse.redirect(new URL(redirectTarget, req.url))
  } else if (isLoggedIn && isRoot) {
    response = NextResponse.redirect(new URL(redirectTarget, req.url))
  } else if (isLoggedIn) {
    if (userRole === 'empleado' && (isDashboardRoute || isReportesRoute || isSetupRoute || isSaasRoute || path.startsWith('/calendario') || path.startsWith('/huespedes') || path.startsWith('/reservas'))) {
      response = NextResponse.redirect(new URL(redirectTarget, req.url))
    } else if (userRole === 'recepcionista' && (isSetupRoute || isReportesRoute || isDashboardRoute || isSaasRoute)) {
      response = NextResponse.redirect(new URL(redirectTarget, req.url))
    }
  }

  response.headers.set('Content-Security-Policy', cspHeader)

  return response
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
