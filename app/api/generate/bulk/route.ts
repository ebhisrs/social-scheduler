import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateArticle } from '@/lib/automation'

export async function POST(request: Request) {
  const body = await request.json()
  const { keyword, language = 'French', tone = 'professional', count = 3 } = body
  if (!keyword) return NextResponse.json({ error: 'Missing keyword' }, { status: 400 })

  const articles = []
  for (let i = 0; i < Math.min(count, 5); i++) {
    try {
      const content = await generateArticle(keyword, language, tone, {})
      const article = await prisma.article.create({
        data: { title: `${keyword} #${i + 1}`, content, topic: keyword, language, published: false },
      })
      articles.push(article)
    } catch (err: any) {
      console.error('[Bulk] Error:', err.message)
    }
  }
  return NextResponse.json({ ok: true, articles })
}
