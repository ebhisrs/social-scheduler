import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const currentDay = days[now.getDay()]
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  const currentTime = `${String(currentHour).padStart(2,'0')}:${String(currentMin).padStart(2,'0')}`

  const schedules = await prisma.schedule.findMany({
    include: { autoPosts: { take: 3, orderBy: { sentAt: 'desc' } } }
  })

  const debug = schedules.map(s => {
    const dayTimes = JSON.parse(s.dayTimes || '{}')
    const timesForToday = dayTimes[currentDay] || []
    const match = timesForToday.find((t: string) => {
      const [h, m] = t.split(':').map(Number)
      return Math.abs((h * 60 + m) - (currentHour * 60 + currentMin)) <= 1
    })
    return {
      name: s.name,
      active: s.active,
      currentDay,
      currentTime,
      timesForToday,
      matchFound: !!match,
      matchedTime: match || null,
      lastRunAt: s.lastRunAt,
      minutesSinceLastRun: s.lastRunAt ? Math.round((now.getTime() - new Date(s.lastRunAt).getTime()) / 60000) : null,
    }
  })

  return NextResponse.json({ now: now.toISOString(), debug })
}