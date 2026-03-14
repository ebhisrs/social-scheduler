import { prisma } from './prisma'
import { sendPost } from './poster'

export async function processScheduledPosts() {
  const now = new Date()
  const windowMs = parseInt(process.env.CRON_WINDOW_MINUTES || '2') * 60 * 1000

  const posts = await prisma.post.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: new Date(now.getTime() + windowMs) },
    },
    include: { accounts: true },
  })

  let processed = 0
  for (const post of posts) {
    try {
      await prisma.post.update({ where: { id: post.id }, data: { status: 'sending' } })
      const mediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : []
      const platforms = JSON.parse(post.platforms)

      for (const account of post.accounts) {
        await sendPost({
          text: post.content,
          mediaUrls,
          platform: account.platform,
          accessToken: account.accessToken,
          pageId: account.pageId || undefined,
          extraData: account.extraData ? JSON.parse(account.extraData) : undefined,
          humanize: false,
        })
      }

      await prisma.post.update({ where: { id: post.id }, data: { status: 'sent', sentAt: now } })
      processed++
    } catch (err: any) {
      await prisma.post.update({ where: { id: post.id }, data: { status: 'failed', error: err.message } })
    }
  }
  return { processed }
}
