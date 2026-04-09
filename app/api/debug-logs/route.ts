import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const logs = await prisma.autoPost.findMany({
      orderBy: { sentAt: 'desc' },
      take: 100,
      include: {
        article: { select: { content: true, topic: true, language: true, title: true } },
        schedule: { select: { name: true, keyword: true } },
      },
    })
    return NextResponse.json(logs)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}