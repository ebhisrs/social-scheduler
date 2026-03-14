import { NextResponse } from 'next/server'
import { aiChat } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  try {
    const result = await aiChat([{ role: 'user', content: 'Say "OK" in one word.' }], 0.1)
    return NextResponse.json({ ok: true, keyPreview: key.substring(0, 8) + '...', response: result })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
