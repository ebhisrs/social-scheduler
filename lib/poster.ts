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

function parseExtraData(raw: any): any {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    let parsed = JSON.parse(raw)
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    return parsed || {}
  } catch { return {} }
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
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' } })
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
    console.warn('[Facebook] Photo upload failed:', err.message)
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

async function postToInstagram(options: PostOptions): Promise<string> {
  const { text, mediaUrls = [], accessToken, pageId } = options
  if (!pageId) throw new Error('Instagram Account ID is required')
  const imageUrl = mediaUrls.length > 0 ? mediaUrls[0] : null
  const caption = text.substring(0, 2200)
  if (!imageUrl || !imageUrl.startsWith('http')) throw new Error('Instagram requires a public photo URL. Upload photos to Cloudinary first.')
  const containerParams = new URLSearchParams({ image_url: imageUrl, caption, access_token: accessToken })
  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: containerParams.toString()
  })
  const containerData = await containerRes.json()
  if (containerData.error) throw new Error(`Instagram container error: ${containerData.error.message}`)
  await new Promise(r => setTimeout(r, 3000))
  const publishParams = new URLSearchParams({ creation_id: containerData.id, access_token: accessToken })
  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: publishParams.toString()
  })
  const publishData = await publishRes.json()
  if (publishData.error) throw new Error(`Instagram publish error: ${publishData.error.message}`)
  return `https://www.instagram.com/p/${publishData.id}`
}

async function postToTwitter(options: PostOptions): Promise<string> {
  const { TwitterApi } = await import('twitter-api-v2')
  const extraData = parseExtraData(options.extraData)
  const client = new TwitterApi({ appKey: extraData.appKey || '', appSecret: extraData.appSecret || '', accessToken: options.accessToken, accessSecret: extraData.accessSecret || '' })
  const tweet = await client.v2.tweet(options.text.substring(0, 280))
  return `https://twitter.com/i/web/status/${tweet.data.id}`
}

async function postToGoogleBusiness(options: PostOptions): Promise<string> {
  const { text, mediaUrls = [], pageId } = options
  const extraData = parseExtraData(options.extraData)
  const webhookUrl = extraData?.makeWebhookUrl || process.env.MAKE_WEBHOOK_URL
  if (!webhookUrl) throw new Error('Make.com webhook URL not configured.')
  const MAX_GB = 1500
  const postText = text.length > MAX_GB ? text.substring(0, MAX_GB - 3) + '...' : text
  const photoUrl = mediaUrls.length > 0 ? mediaUrls[0] : null
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: postText, locationName: pageId || '', photoUrl, postedAt: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`Make.com webhook failed: ${res.status}`)
  return 'google_business_posted'
}

// WordPress REST API posting — full SEO blog post
async function postToWordPress(options: PostOptions): Promise<string> {
  const extraData = parseExtraData(options.extraData)
  const siteUrl = extraData?.siteUrl || options.pageId
  const username = extraData?.username
  const appPassword = options.accessToken

  if (!siteUrl) throw new Error('WordPress site URL is required')
  if (!username) throw new Error('WordPress username is required')
  if (!appPassword) throw new Error('WordPress application password is required')

  // Parse the text — it may contain the full SEO post data as JSON
  let title = ''
  let content = options.text
  let excerpt = ''
  let slug = ''
  let tags: string[] = []
  let focusKeyword = ''

  // Check if text contains JSON SEO data
  try {
    if (options.text.startsWith('{')) {
      const seoData = JSON.parse(options.text)
      title = seoData.title || ''
      content = seoData.content || ''
      excerpt = seoData.metaDescription || ''
      slug = seoData.slug || ''
      tags = seoData.tags || []
      focusKeyword = seoData.focusKeyword || ''
    }
  } catch {}

  // If no JSON, use text as content
  if (!title) {
    title = `Article — ${new Date().toLocaleDateString('fr-FR')}`
    content = options.text
  }

  // Upload featured image to WordPress if available
  let featuredMediaId: number | null = null
  if (options.mediaUrls?.length) {
    try {
      const imgBuffer = await fetchImageBuffer(options.mediaUrls[0])
      const authHeader = `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`
      const imgForm = new FormData()
      imgForm.append('file', new Blob([imgBuffer], { type: 'image/jpeg' }), 'featured.jpg')
      imgForm.append('alt_text', focusKeyword || title)
      imgForm.append('caption', title)
      const uploadRes = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
        method: 'POST',
        headers: { 'Authorization': authHeader },
        body: imgForm,
      })
      const uploadData = await uploadRes.json()
      if (uploadData.id) {
        featuredMediaId = uploadData.id
        console.log('[WordPress] Featured image uploaded:', uploadData.id)
      }
    } catch (err: any) {
      console.warn('[WordPress] Image upload failed:', err.message)
    }
  }

  // Create or get tag IDs
  const authHeader = `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`
  const tagIds: number[] = []
  for (const tag of tags.slice(0, 10)) {
    try {
      const tagRes = await fetch(`${siteUrl}/wp-json/wp/v2/tags`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tag }),
      })
      const tagData = await tagRes.json()
      if (tagData.id) tagIds.push(tagData.id)
      else if (tagData.code === 'term_exists') tagIds.push(tagData.data?.term_id || 0)
    } catch {}
  }

  // Create the WordPress post
  const postBody: any = {
    title,
    content,
    status: 'publish',
    excerpt,
    slug: slug || undefined,
    tags: tagIds.filter(Boolean),
    meta: {
      _yoast_wpseo_focuskw: focusKeyword,
      _yoast_wpseo_metadesc: excerpt,
      _yoast_wpseo_title: title,
      _rank_math_focus_keyword: focusKeyword,
      _rank_math_description: excerpt,
    },
  }

  if (featuredMediaId) postBody.featured_media = featuredMediaId

  const res = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(postBody),
  })

  const data = await res.json()
  console.log('[WordPress post result]', data.id, data.link)
  if (data.code && data.message) throw new Error(`WordPress error: ${data.message}`)
  return data.link || `${siteUrl}/?p=${data.id}`
}

export async function sendPost(options: PostOptions): Promise<string> {
  if (options.humanize) await randomDelay(1000, 3000)
  switch (options.platform) {
    case 'facebook':        return postToFacebook(options)
    case 'instagram':       return postToInstagram(options)
    case 'twitter':         return postToTwitter(options)
    case 'google_business': return postToGoogleBusiness(options)
    case 'wordpress':       return postToWordPress(options)
    default:
      throw new Error(`Platform ${options.platform} not supported`)
  }
}