// Simple shared-secret auth for API routes.
// Set ADMIN_SECRET in your Vercel env vars to a long random string.
// Client code reads it from the cookie set by the /login page (see middleware.ts).

export function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false // fail closed if not configured

  // Accept either the header (for scripts/tools) or the cookie (for the browser)
  const header = request.headers.get('x-admin-secret')
  if (header && header === secret) return true

  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)admin_secret=([^;]+)/)
  const cookieSecret = match ? decodeURIComponent(match[1]) : null
  if (cookieSecret && cookieSecret === secret) return true

  return false
}
