import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await prisma.article.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }))
}
