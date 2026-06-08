import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isAuthPage = nextUrl.pathname.startsWith('/login')
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isPublic = isAuthPage || isApiAuth

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/calendario', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
