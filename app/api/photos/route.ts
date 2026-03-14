import { NextResponse } from 'next/server'
import { writeFile, readdir, unlink } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
}

export async function GET() {
  ensureDir()
  try {
    const files = await readdir(UPLOAD_DIR)
    const images = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    return NextResponse.json(images.map(filename => ({ filename, url: `/uploads/${filename}` })))
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  ensureDir()
  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const bytes = await file.arrayBuffer()
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(bytes))
  return NextResponse.json({ ok: true, filename })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get('file')
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  const filePath = path.join(UPLOAD_DIR, path.basename(file))
  try { await unlink(filePath) } catch {}
  return NextResponse.json({ ok: true })
}
