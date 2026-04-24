import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware runs BEFORE every request that matches `config.matcher`.
// It protects all /api/* endpoints AND every page except /login.
//
// How auth works:
//   - Open /login, enter the value of ADMIN_SECRET
//   - The login page sets an `admin_secret` cookie
//   - Every subsequent request includes the cookie and is allowed through
//   - /api/cron keeps its own CRON_SECRET and is exempt here
//
// Set ADMIN_SECRET in Vercel > Project > Settings > Environment Variables.

const PUBLIC_API_ROUTES = [
  '/api/cron',          // has its own CRON_SECRET check
  '/api/proxy-image',   // safe to leave open (serves images)
]

const PUBLIC_PAGES = [
  '/login',
]

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/favicon')
}

function hasValidAuth(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false

  const header = request.headers.get('x-admin-secret')
  if (header && header === secret) return true

  const cookieSecret = request.cookies.get('admin_secret')?.value
  if (cookieSecret && cookieSecret === secret) return true

  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API requests: return 401 JSON on failure
  if (pathname.startsWith('/api/')) {
    if (isPublicApi(pathname)) return NextResponse.next()
    if (hasValidAuth(request)) return NextResponse.next()
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pages: redirect to /login on failure
  if (isPublicPage(pathname)) return NextResponse.next()
  if (hasValidAuth(request)) return NextResponse.next()

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    // Match everything except static files
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
}
