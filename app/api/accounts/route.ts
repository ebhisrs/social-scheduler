import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Middleware ensures only authenticated users reach here
  return NextResponse.json(await prisma.account.findMany({ orderBy: { createdAt: 'desc' } }))
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
  return NextResponse.json(account)
}
