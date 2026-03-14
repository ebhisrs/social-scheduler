import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const articles = await prisma.article.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json(articles)
}
