import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

// Map: URL path prefix → permission module key
const PATH_MODULE_MAP: Array<{ prefix: string; module: string }> = [
  { prefix: '/dashboard',       module: 'dashboard' },
  { prefix: '/api/dashboard',   module: 'dashboard' },
  { prefix: '/recepcion',       module: 'recepcion' },
  { prefix: '/api/recepcion',   module: 'recepcion' },
  { prefix: '/calendario',      module: 'calendario' },
  { prefix: '/api/calendario',  module: 'calendario' },
  { prefix: '/reservas',        module: 'reservas' },
  { prefix: '/api/reservas',    module: 'reservas' },
  { prefix: '/habitaciones',    module: 'habitaciones' },
  { prefix: '/api/habitaciones',module: 'habitaciones' },
  { prefix: '/huespedes',       module: 'huespedes' },
  { prefix: '/api/huespedes',   module: 'huespedes' },
  { prefix: '/pizarra',         module: 'pizarra' },
  { prefix: '/api/pizarra',     module: 'pizarra' },
  { prefix: '/inventario',      module: 'inventario' },
  { prefix: '/api/inventario',  module: 'inventario' },
  { prefix: '/administracion',  module: 'administracion' },
  { prefix: '/api/administracion', module: 'administracion' },
  { prefix: '/reportes',        module: 'reportes' },
  { prefix: '/api/reportes',    module: 'reportes' },
  { prefix: '/setup/tarifas',   module: 'setup_tarifas' },
  { prefix: '/api/setup/tarifas',    module: 'setup_tarifas' },
  { prefix: '/setup/unidades',  module: 'setup_unidades' },
  { prefix: '/api/setup/unidades',   module: 'setup_unidades' },
  { prefix: '/setup/rooms',     module: 'setup_rooms' },
  { prefix: '/api/setup/rooms',      module: 'setup_rooms' },
  { prefix: '/setup/amenities', module: 'setup_amenities' },
  { prefix: '/api/setup/amenities',  module: 'setup_amenities' },
  { prefix: '/setup/pagos',     module: 'setup_pagos' },
  { prefix: '/api/setup/pagos',      module: 'setup_pagos' },
  { prefix: '/setup/usuarios',  module: 'setup_usuarios' },
  { prefix: '/api/setup/usuarios',   module: 'setup_usuarios' },
  { prefix: '/setup/whatsapp',  module: 'setup_whatsapp' },
  { prefix: '/api/setup/whatsapp',   module: 'setup_whatsapp' },
]

const LEVEL_WEIGHT: Record<string, number> = { none: 0, read: 1, write: 2, full: 3 }

function getModuleForPath(path: string): string | null {
  const match = PATH_MODULE_MAP.find(m => path === m.prefix || path.startsWith(m.prefix + '/') || path.startsWith(m.prefix + '?'))
  return match?.module ?? null
}

function getPermissionLevel(permissions: Record<string, string> | null | undefined, module: string): string {
  if (!permissions) return 'none'
  return permissions[module] ?? 'none'
}

export default auth((req) => {
  // ponytail: nonce-based CSP breaks cached pages on Vercel CDN (script nonce mismatch → JS blocked → login broken)
  // Using 'unsafe-inline' instead since nonce injection via layout.tsx is not wired up
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data:;
    font-src 'self' https://fonts.gstatic.com;
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
  
  const userRole = (req.auth?.user as any)?.role as string | undefined
  const userPermissions = (req.auth?.user as any)?.permissions as Record<string, string> | undefined
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

  if (!isLoggedIn && !isPublic) {
    response = NextResponse.redirect(new URL('/login', req.url))
  } else if (isLoggedIn && isAuthPage) {
    response = NextResponse.redirect(new URL(redirectTarget, req.url))
  } else if (isLoggedIn && isRoot) {
    response = NextResponse.redirect(new URL(redirectTarget, req.url))
  } else if (isLoggedIn) {
    const path = nextUrl.pathname

    // SaaS routes: only superadmin
    if ((path.startsWith('/saas') || path.startsWith('/api/saas')) && userRole !== 'superadmin') {
      if (path.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.redirect(new URL(redirectTarget, req.url))
    }

    // admin & superadmin bypass all permission checks
    if (userRole === 'admin' || userRole === 'superadmin') {
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }

    // Permissions-based protection
    const moduleKey = getModuleForPath(path)
    if (moduleKey && userPermissions) {
      const level = getPermissionLevel(userPermissions, moduleKey)
      const isApi = path.startsWith('/api/')
      const isMutating = isApi && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method ?? '')

      if (level === 'none') {
        // No access at all
        if (isApi) return NextResponse.json({ error: 'Forbidden: Sin acceso a este módulo' }, { status: 403 })
        return NextResponse.redirect(new URL(redirectTarget, req.url))
      }

      if (isMutating && LEVEL_WEIGHT[level] < LEVEL_WEIGHT['write']) {
        // Has read access but not write — block mutating API calls
        return NextResponse.json({ error: 'Forbidden: Solo lectura — no puede modificar datos' }, { status: 403 })
      }
    }
  }

  response.headers.set('Content-Security-Policy', cspHeader)

  return response
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
