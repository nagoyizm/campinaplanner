import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const nonce = btoa(crypto.randomUUID())
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isAuthPage = nextUrl.pathname.startsWith('/login')
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isPublic = isAuthPage || isApiAuth

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (!isLoggedIn && !isPublic) {
    response = NextResponse.redirect(new URL('/login', req.url))
  } else if (isLoggedIn && isAuthPage) {
    response = NextResponse.redirect(new URL('/calendario', req.url))
  }

  response.headers.set('Content-Security-Policy', cspHeader)

  return response
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
