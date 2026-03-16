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
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${url}`)
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
  if (mediaUrls.length > 0) {
    photoId = await uploadPhotoToFacebook(mediaUrls[0], accessToken, pageId)
  }

  const body: any = {
    message: text,
    published: 'true',
    access_token: accessToken,
  }
  if (photoId) {
    body.attached_media = JSON.stringify([{ media_fbid: photoId }])
  }

  const form = new URLSearchParams(body)
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  const data = await res.json()
  console.log('[Facebook post result]', JSON.stringify(data))
  if (data.error) throw new Error(`Facebook error: ${data.error.message}`)
  return `https://www.facebook.com/${data.id}`
}

async function postToTwitter(options: PostOptions): Promise<string> {
  const { TwitterApi } = await import('twitter-api-v2')
  const extraData = options.extraData || {}
  const client = new TwitterApi({
    appKey: extraData.appKey || '',
    appSecret: extraData.appSecret || '',
    accessToken: options.accessToken,
    accessSecret: extraData.accessSecret || '',
  })
  const tweet = await client.v2.tweet(options.text.substring(0, 280))
  return `https://twitter.com/i/web/status/${tweet.data.id}`
}

// Google Business Profile — max 1500 chars for text
// We keep full article text + hashtags, just truncate if over 1500
async function postToGoogleBusiness(options: PostOptions): Promise<string> {
  const { text, mediaUrls = [], accessToken, pageId } = options
  if (!pageId) throw new Error('Google Business location name is required (e.g. accounts/123/locations/456)')

  // Google Business max 1500 chars
  const MAX_GB = 1500
  const postText = text.length > MAX_GB ? text.substring(0, MAX_GB - 3) + '...' : text

  const body: any = {
    languageCode: 'fr',
    summary: postText,
    topicType: 'STANDARD',
  }

  // Add photo if available
  if (mediaUrls.length > 0) {
    try {
      const imgBuffer = await fetchImageBuffer(mediaUrls[0])
      const base64 = imgBuffer.toString('base64')
      body.media = [{
        mediaFormat: 'PHOTO',
        sourceUrl: `data:image/jpeg;base64,${base64}`,
      }]
    } catch (err: any) {
      console.warn('[GoogleBusiness] Photo failed, text only:', err.message)
    }
  }

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${pageId}/localPosts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  const data = await res.json()
  console.log('[GoogleBusiness post result]', JSON.stringify(data))
  if (data.error) throw new Error(`Google Business error: ${data.error.message}`)
  return data.name || 'posted'
}

export async function sendPost(options: PostOptions): Promise<string> {
  if (options.humanize) {
    await randomDelay(1000, 3000)
  }

  switch (options.platform) {
    case 'facebook':
      return postToFacebook(options)
    case 'twitter':
      return postToTwitter(options)
    case 'google_business':
      return postToGoogleBusiness(options)
    default:
      throw new Error(`Platform ${options.platform} not supported`)
  }
}
