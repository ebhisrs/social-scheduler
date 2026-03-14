import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPost } from '@/lib/poster'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { accountIds } = body
  const article = await prisma.article.findUnique({ where: { id: params.id } })
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  const accounts = await prisma.account.findMany({ where: { id: { in: accountIds } } })
  const results = []
  for (const account of accounts) {
    try {
      const url = await sendPost({ text: article.content, platform: account.platform, accessToken: account.accessToken, pageId: account.pageId || undefined, extraData: account.extraData ? JSON.parse(account.extraData) : undefined, humanize: false })
      results.push({ account: account.username, success: true, url })
    } catch (err: any) {
      results.push({ account: account.username, success: false, error: err.message })
    }
  }
  await prisma.article.update({ where: { id: params.id }, data: { published: true } })
  return NextResponse.json({ ok: true, results })
}
