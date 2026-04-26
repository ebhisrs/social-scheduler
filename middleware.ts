import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/login',
  '/api/cron',
  '/api/proxy-image',
]

function isPublic(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/favicon')) return true
  if (pathname === '/login') return true
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths
  if (isPublic(pathname)) return NextResponse.next()

  const secret = process.env.ADMIN_SECRET

  // If ADMIN_SECRET is not configured, block everything and redirect to login
  // (login page will show "Server misconfigured" error when they try to submit)
  if (!secret) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check auth: header or cookie
  const header = request.headers.get('x-admin-secret')
  const cookieSecret = request.cookies.get('admin_secret')?.value

  if ((header && header === secret) || (cookieSecret && cookieSecret === secret)) {
    return NextResponse.next()
  }

  // Not authenticated
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}