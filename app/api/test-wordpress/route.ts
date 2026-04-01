import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWordPressArticle } from '@/lib/automation'
import { sendPost } from '@/lib/poster'

export const dynamic = 'force-dynamic'

export async function GET() {
  const account = await prisma.account.findFirst({ where: { platform: 'wordpress' } })
  if (!account) return NextResponse.json({ error: 'No WordPress account found' }, { status: 404 })

  const schedule = await prisma.schedule.findFirst({ where: { active: true } })
  if (!schedule) return NextResponse.json({ error: 'No active automation' }, { status: 404 })

  const config = JSON.parse(schedule.platforms)
  const company = { name: schedule.companyName, phone: schedule.companyPhone, address: schedule.companyAddress, website: schedule.companyWebsite }

  try {
    const content = await generateWordPressArticle(schedule.keyword, config.language || 'French', company)
    const url = await sendPost({ text: content, platform: 'wordpress', accessToken: account.accessToken, pageId: account.pageId || undefined, extraData: account.extraData, humanize: false })
    return NextResponse.json({ success: true, url, contentLength: content.length })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
