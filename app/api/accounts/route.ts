import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(accounts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { platform, username, accessToken, pageId, extraData } = body
  if (!platform || !username || !accessToken) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const account = await prisma.account.create({ data: { platform, username, accessToken, pageId: pageId || null, extraData: extraData ? JSON.stringify(extraData) : null } })
  return NextResponse.json(account)
}
