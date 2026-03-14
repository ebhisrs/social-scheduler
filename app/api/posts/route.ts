import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const posts = await prisma.post.findMany({ orderBy: { scheduledAt: 'desc' }, take: 50, include: { accounts: true } })
  return NextResponse.json(posts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { content, accountIds, scheduledAt, mediaUrls } = body
  if (!content || !accountIds?.length) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const post = await prisma.post.create({
    data: {
      content,
      platforms: JSON.stringify(accountIds),
      scheduledAt: new Date(scheduledAt || Date.now()),
      mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
      accounts: { connect: accountIds.map((id: string) => ({ id })) },
    },
    include: { accounts: true },
  })
  return NextResponse.json(post)
}
