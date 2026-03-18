import { randomDelay } from './humanizer'
import { readFile } from 'fs/promises'
import path from 'path'

interface PostOptions {
  text: string
  mediaUrls?: string[]
  platform: string
  accessToken: string
  pageId?: string
  extraData?: any
  humanize?: boolean
}

// Parse extraData — handles single and double stringified JSON
function parseExtraData(raw: any): any {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    let parsed = JSON.parse(raw)
    // Double stringified — parse again
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    return parsed || {}
  } catch {
    return {}
  }
}

function unwrapProxyUrl(url: string): string {
  if (url.includes('/api/proxy-image')) {
    try {
      const match = url.match(/[?&]url=([^&]+)/)
      if (match) return decodeURIComponent(match[1])
    } catch {}
  }
  return url
}

async function fetchImageBuffer(rawUrl: string): Promise<Buffer> {
  const url = unwrapProxyUrl(rawUrl)
  if (url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', url)
    return await readFile(filePath)
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*;q=0.8' },
  })
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function uploadPhotoToFacebook(imageUrl: string, accessToken: string, pageId: string): Promise<string | null> {
  try {
    const imgBuffer = await fetchImageBuffer(imageUrl)
    const form = new FormData()
    form.append('source', new Blob([imgBuffer], { type: 'image/jpeg' }), 'photo.jpg')
    form.append('published', 'false')
    form.append('access_token', accessToken)
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, { method: 'POST', body: form })
    const data = await res.json()
    if (!data?.id) throw new Error(`Photo upload failed: ${JSON.stringify(data)}`)
    return data.id
  } catch (err: any) {
    console.warn('[Facebook] Photo upload failed, text only:', err.message)
    return null
  }
}

async function postToFacebook(options: PostOptions): Promise<string> {
  const { text, mediaUrls = [], accessToken, pageId } = options
  if (!pageId) throw new Error('Facebook page ID is required')

  let photoId: string | null = null
  if (mediaUrls.length > 0) photoId = await uploadPhotoToFacebook(mediaUrls[0], accessToken, pageId)

  const body: any = { message: text, published: 'true', access_token: accessToken }
  if (photoId) body.attached_media = JSON.stringify([{ media_fbid: photoId }])

  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Facebook error: ${data.error.message}`)
  return `https://www.facebook.com/${data.id}`
}

async function postToTwitter(options: PostOptions): Promise<string> {
  const { TwitterApi } = await import('twitter-api-v2')
  const extraData = parseExtraData(options.extraData)
  const client = new TwitterApi({
    appKey: extraData.appKey || '',
    appSecret: extraData.appSecret || '',
    accessToken: options.accessToken,
    accessSecret: extraData.accessSecret || '',
  })
  const tweet = await client.v2.tweet(options.text.substring(0, 280))
  return `https://twitter.com/i/web/status/${tweet.data.id}`
}

async function postToGoogleBusiness(options: PostOptions): Promise<string> {
  const { text, mediaUrls = [], pageId } = options
  
  // Parse extraData — handles double-stringified JSON from DB
  const extraData = parseExtraData(options.extraData)
  const webhookUrl = extraData?.makeWebhookUrl || process.env.MAKE_WEBHOOK_URL
  
  console.log('[GoogleBusiness] extraData parsed:', JSON.stringify(extraData))
  console.log('[GoogleBusiness] webhookUrl:', webhookUrl ? webhookUrl.substring(0, 50) + '...' : 'MISSING')

  if (!webhookUrl) throw new Error('Make.com webhook URL not configured.')

  const MAX_GB = 1500
  const postText = text.length > MAX_GB ? text.substring(0, MAX_GB - 3) + '...' : text

  let photoUrl: string | null = null
  if (mediaUrls.length > 0) photoUrl = mediaUrls[0]

  const payload = {
    text: postText,
    locationName: pageId || '',
    photoUrl,
    postedAt: new Date().toISOString(),
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(`Make.com webhook failed: ${res.status}`)
  console.log('[GoogleBusiness] ✅ Sent to Make.com')
  return 'google_business_posted'
}

export async function sendPost(options: PostOptions): Promise<string> {
  if (options.humanize) await randomDelay(1000, 3000)

  switch (options.platform) {
    case 'facebook':        return postToFacebook(options)
    case 'twitter':         return postToTwitter(options)
    case 'google_business': return postToGoogleBusiness(options)
    default:
      throw new Error(`Platform ${options.platform} not supported`)
  }
}