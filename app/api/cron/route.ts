import { NextResponse } from 'next/server'
import { processScheduledPosts } from '@/lib/scheduler'
import { processAutomation } from '@/lib/automation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  // On Vercel cron, the request comes without token but with a special header
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  if (!isVercelCron && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [posts, automation] = await Promise.all([
    processScheduledPosts(),
    processAutomation(),
  ])

  return NextResponse.json({ ok: true, posts, automation })
}
