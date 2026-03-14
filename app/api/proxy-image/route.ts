import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  // Local file
  if (url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', url)
    if (!existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const buf = await readFile(filePath)
    return new NextResponse(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } })
  }

  // Remote URL
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
    const buf = await res.arrayBuffer()
    const ct = res.headers.get('content-type') || 'image/jpeg'
    return new NextResponse(buf, { headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
