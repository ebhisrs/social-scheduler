import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await prisma.schedule.findMany({ orderBy: { createdAt: 'desc' } }))
}
