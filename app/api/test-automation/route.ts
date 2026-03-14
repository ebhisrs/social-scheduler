import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateArticle } from '@/lib/automation'
import { sendPost } from '@/lib/poster'
import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('id')

  const schedule = scheduleId
    ? await prisma.schedule.findUnique({ where: { id: scheduleId } })
    : await prisma.schedule.findFirst({ where: { active: true } })

  if (!schedule) return NextResponse.json({ error: 'No active automation found' }, { status: 404 })

  const config = JSON.parse(schedule.platforms)
  const keyword = schedule.keyword || 'general'
  const language = config.language || 'French'
  const tone = config.tone || 'professional'
  const company = { name: schedule.companyName, phone: schedule.companyPhone, address: schedule.companyAddress, website: schedule.companyWebsite }

  try {
    const fullContent = await generateArticle(keyword, language, tone, company)

    let photoUrls: string[] = []
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      if (existsSync(uploadDir)) {
        const files = await readdir(uploadDir)
        const images = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        if (images.length) photoUrls = [`/uploads/${images[Math.floor(Math.random() * images.length)]}`]
      }
    } catch {}

    const article = await prisma.article.create({
      data: { title: `TEST: ${keyword}`, content: fullContent, topic: keyword, language, published: true },
    })

    const accounts = await prisma.account.findMany({ where: { id: { in: config.accountIds } } })
    const results: any[] = []
    const successNames: string[] = []

    for (const account of accounts) {
      try {
        await sendPost({ text: fullContent, mediaUrls: photoUrls, platform: account.platform, accessToken: account.accessToken, pageId: account.pageId || undefined, extraData: account.extraData ? JSON.parse(account.extraData) : undefined, humanize: false })
        successNames.push(account.username)
        results.push({ account: account.username, success: true })
      } catch (err: any) {
        results.push({ account: account.username, success: false, error: err.message })
      }
    }

    await prisma.autoPost.create({
      data: { scheduleId: schedule.id, articleId: article.id, accounts: JSON.stringify(successNames), success: successNames.length > 0, error: results.find(r => !r.success)?.error || null },
    })

    return NextResponse.json({ success: true, keyword, language, content: fullContent, charCount: fullContent.length, photo: photoUrls[0] || null, postResults: results })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
