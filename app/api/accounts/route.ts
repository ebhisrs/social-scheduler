import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: 'desc' } })
  // Never return raw tokens to the client. Only a flag that one exists.
  const safe = accounts.map(a => ({
    id: a.id,
    platform: a.platform,
    username: a.username,
    pageId: a.pageId,
    extraData: a.extraData,
    createdAt: a.createdAt,
    hasAccessToken: !!a.accessToken,
    hasRefreshToken: !!a.refreshToken,
  }))
  return NextResponse.json(safe)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { platform, username, accessToken, pageId, extraData } = body
  if (!platform || !username || !accessToken) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const account = await prisma.account.create({
    data: {
      platform,
      username,
      accessToken,
      pageId: pageId || null,
      extraData: typeof extraData === 'object' ? JSON.stringify(extraData) : (extraData || null),
    },
  })
  // Don't echo the token back
  return NextResponse.json({
    id: account.id,
    platform: account.platform,
    username: account.username,
    pageId: account.pageId,
    createdAt: account.createdAt,
  })
}
