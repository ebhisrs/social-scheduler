import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const schedules = await prisma.schedule.findMany({ orderBy: { createdAt: 'desc' }, include: { autoPosts: { orderBy: { sentAt: 'desc' }, take: 30, include: { article: true } } } })
  return NextResponse.json(schedules)
}
export async function POST(request: Request) {
  const body = await request.json()
  const { name, keyword, dayTimes, accountIds, language, tone, postsPerSlot, notifyEmail, companyName, companyPhone, companyAddress, companyWebsite } = body
  if (!name || !keyword) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const schedule = await prisma.schedule.create({ data: { name, keyword, dayTimes: JSON.stringify(dayTimes || {}), platforms: JSON.stringify({ accountIds, language, tone }), postsPerSlot: postsPerSlot || 1, notifyEmail: notifyEmail || null, companyName: companyName || null, companyPhone: companyPhone || null, companyAddress: companyAddress || null, companyWebsite: companyWebsite || null } })
  return NextResponse.json(schedule)
}
export async function PATCH(request: Request) {
  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const u: any = {}
  if (body.name !== undefined) u.name = body.name
  if (body.keyword !== undefined) u.keyword = body.keyword
  if (body.dayTimes !== undefined) u.dayTimes = JSON.stringify(body.dayTimes)
  if (body.postsPerSlot !== undefined) u.postsPerSlot = body.postsPerSlot
  if (body.notifyEmail !== undefined) u.notifyEmail = body.notifyEmail || null
  if (body.active !== undefined) u.active = body.active
  if (body.companyName !== undefined) u.companyName = body.companyName || null
  if (body.companyPhone !== undefined) u.companyPhone = body.companyPhone || null
  if (body.companyAddress !== undefined) u.companyAddress = body.companyAddress || null
  if (body.companyWebsite !== undefined) u.companyWebsite = body.companyWebsite || null
  if (body.accountIds !== undefined || body.language !== undefined || body.tone !== undefined) {
    const cur = await prisma.schedule.findUnique({ where: { id } })
    const c = cur ? JSON.parse(cur.platforms) : {}
    u.platforms = JSON.stringify({ accountIds: body.accountIds ?? c.accountIds, language: body.language ?? c.language, tone: body.tone ?? c.tone })
  }
  return NextResponse.json(await prisma.schedule.update({ where: { id }, data: u }))
}
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.schedule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
