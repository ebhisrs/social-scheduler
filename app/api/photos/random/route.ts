import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) return NextResponse.json({ url: null })
    const files = await readdir(uploadDir)
    const images = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    if (!images.length) return NextResponse.json({ url: null })
    const random = images[Math.floor(Math.random() * images.length)]
    return NextResponse.json({ url: `/uploads/${random}` })
  } catch {
    return NextResponse.json({ url: null })
  }
}
