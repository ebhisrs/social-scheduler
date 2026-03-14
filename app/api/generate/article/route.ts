import { NextResponse } from 'next/server'
import { generateArticle } from '@/lib/automation'

export async function POST(request: Request) {
  const body = await request.json()
  const { topic, language = 'French', tone = 'professional' } = body
  if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 })
  try {
    const content = await generateArticle(topic, language, tone, {})
    return NextResponse.json({ content })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
