// server.ts — LOCAL DEV ONLY — not used on Vercel
// On Vercel, cron-job.org calls /api/cron every minute instead
import { config } from 'dotenv'
config()

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import cron from 'node-cron'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  }).listen(3000, () => {
    console.log('> Ready on http://localhost:3000')

    cron.schedule('* * * * *', async () => {
      try {
        const token = process.env.CRON_SECRET || 'local-dev'
        const res = await fetch(`http://localhost:3000/api/cron?token=${token}`)
        if (!res.ok) {
          const text = await res.text()
          console.error(`[Cron] HTTP ${res.status}:`, text.substring(0, 150))
          return
        }
        const data = await res.json()
        if (data.automation?.processed > 0) {
          console.log(`[Cron] ✅ ${data.automation.processed} article(s) posted!`)
        } else {
          console.log(`[Cron] ✓ checked ${new Date().toLocaleTimeString()}`)
        }
      } catch (err: any) {
        console.error('[Cron] Error:', err.message)
      }
    })
    console.log('[Cron] ✅ Auto-scheduler running every minute (local mode)')
  })
})
