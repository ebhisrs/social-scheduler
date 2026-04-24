import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured (ADMIN_SECRET missing)' }, { status: 500 })
  }
  let body: any = {}
  try { body = await request.json() } catch {}
  if (body?.secret !== secret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  // 30 days, HttpOnly, Secure (in prod), SameSite=Lax
  res.cookies.set('admin_secret', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_secret', '', { path: '/', maxAge: 0 })
  return res
}
