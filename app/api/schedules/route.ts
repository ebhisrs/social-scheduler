import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const schedules = await prisma.schedule.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(schedules)
}
