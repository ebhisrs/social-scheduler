import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const schedules = await prisma.schedule.findMany({
    orderBy: { createdAt: 'desc' },
    include: { autoPosts: { orderBy: { sentAt: 'desc' }, take: 30, include: { article: true } } },
  })
  return NextResponse.json(schedules)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, keyword, dayTimes, accountIds, language, tone, postsPerSlot, notifyEmail, companyName, companyPhone, companyAddress, companyWebsite } = body
  if (!name || !keyword) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const schedule = await prisma.schedule.create({
    data: {
      name, keyword,
      dayTimes: JSON.stringify(dayTimes || {}),
      platforms: JSON.stringify({ accountIds, language, tone }),
      postsPerSlot: postsPerSlot || 1,
      notifyEmail: notifyEmail || null,
      companyName: companyName || null,
      companyPhone: companyPhone || null,
      companyAddress: companyAddress || null,
      companyWebsite: companyWebsite || null,
    },
  })
  return NextResponse.json(schedule)
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.keyword !== undefined) updateData.keyword = body.keyword
  if (body.dayTimes !== undefined) updateData.dayTimes = JSON.stringify(body.dayTimes)
  if (body.postsPerSlot !== undefined) updateData.postsPerSlot = body.postsPerSlot
  if (body.notifyEmail !== undefined) updateData.notifyEmail = body.notifyEmail || null
  if (body.active !== undefined) updateData.active = body.active
  if (body.companyName !== undefined) updateData.companyName = body.companyName || null
  if (body.companyPhone !== undefined) updateData.companyPhone = body.companyPhone || null
  if (body.companyAddress !== undefined) updateData.companyAddress = body.companyAddress || null
  if (body.companyWebsite !== undefined) updateData.companyWebsite = body.companyWebsite || null
  if (body.accountIds !== undefined || body.language !== undefined || body.tone !== undefined) {
    const current = await prisma.schedule.findUnique({ where: { id } })
    const cur = current ? JSON.parse(current.platforms) : {}
    updateData.platforms = JSON.stringify({ accountIds: body.accountIds ?? cur.accountIds, language: body.language ?? cur.language, tone: body.tone ?? cur.tone })
  }
  const schedule = await prisma.schedule.update({ where: { id }, data: updateData })
  return NextResponse.json(schedule)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.schedule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
