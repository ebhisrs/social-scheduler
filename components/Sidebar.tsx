import { prisma } from './prisma'
import { aiChat } from './ai'
import { sendPost } from './poster'
import { generateWordPressPost } from './wordpress-generator'
import path from 'path'

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function parseExtraData(raw: any): any {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    let parsed = JSON.parse(raw)
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    return parsed || {}
  } catch { return {} }
}

function buildFinalPost(postText: string, hashtags: string[]): string {
  return `${postText.trim()}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
}

function stripPreamble(text: string): string {
  const lines = text.split('\n')
  const skip = [
    /^(okay|ok|sure|certainly|absolutely|bien sûr|parfait|d'accord|voici|voilà|here|absolument)/i,
    /^(je vous propose|here is|here's|let me|post publicitaire)/i,
  ]
  let start = 0
  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const line = lines[i].trim()
    if (!line) { start = i + 1; continue }
    if (skip.some(p => p.test(line))) { start = i + 1 } else break
  }
  return lines.slice(start).join('\n').trim()
}

async function sendFailureEmail(email: string, accountName: string, error: string, keyword: string) {
  try {
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    if (!smtpUser || !smtpPass) return
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || 'live.smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: { user: smtpUser, pass: smtpPass },
    })
    await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser, to: email,
      subject: `Auto-post failed on ${accountName}`,
      html: `<p><b>Account:</b> ${accountName}</p><p><b>Keyword:</b> ${keyword}</p><p><b>Error:</b> ${error}</p>`,
    })
  } catch (e: any) { console.error('[Email] Failed:', e.message) }
}

interface CompanyInfo {
  name?: string | null; phone?: string | null; address?: string | null; website?: string | null
}

function getServicesHint(keyword: string): string {
  const k = keyword.toLowerCase()
  if (k.includes('vitrier') || k.includes('vitre')) return 'remplacement de vitre, double vitrage, bris de glace urgence, fenêtres, baies vitrées'
  if (k.includes('serrurier')) return "ouverture de porte claquée, changement de serrure, urgence 24h/7j, blindage de porte"
  if (k.includes('plombier')) return "fuite d'eau urgence, débouchage canalisation, chauffe-eau, robinetterie"
  if (k.includes('electricien') || k.includes('électricien')) return 'dépannage électrique, tableau électrique, mise aux normes'
  if (k.includes('peintre')) return 'peinture intérieure, peinture extérieure, ravalement de façade'
  return ''
}

function buildFallbackHashtags(keyword: string): string[] {
  const words = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter((w: string) => w.length > 2)
  const tags = [...words]
  const k = keyword.toLowerCase()
  if (k.includes('vitrier') || k.includes('vitre')) tags.push('vitrage', 'doublevitrage', 'brisdeglace', 'vitrerie', 'fenetres', 'vitrier')
  if (k.includes('serrurier')) tags.push('serrurerie', 'ouverturedeporte', 'urgence', 'serrure', 'depannage', 'serrurier')
  if (k.includes('plombier')) tags.push('plomberie', 'fuitedeau', 'debouchage', 'urgence', 'depannage', 'plombier')
  if (k.includes('electr')) tags.push('electricite', 'depannageelectrique', 'electricien', 'installation')
  if (k.includes('peintre') || k.includes('peinture')) tags.push('peinture', 'renovation', 'peintre', 'ravalement')
  tags.push('artisan', 'devisgratuit', 'interventionrapide', 'professionnel')
  return [...new Set(tags)].slice(0, 10)
}

// Different article angles to rotate through
const ANGLES = [
  'urgence et rapidité d\'intervention',
  'qualité et expertise professionnelle',
  'prix transparents et devis gratuit',
  'disponibilité 24h/7j',
  'satisfaction client garantie',
  'artisan local de confiance',
  'intervention sans dégât',
  'conseils et recommandations pro',
]

// Get last N articles for this schedule to avoid repetition
async function getLastArticles(scheduleId: string, n = 3): Promise<string[]> {
  try {
    const posts = await prisma.autoPost.findMany({
      where: { scheduleId },
      orderBy: { sentAt: 'desc' },
      take: n,
      include: { article: { select: { content: true } } },
    })
    return posts.map(p => p.article?.content?.substring(0, 100) || '').filter(Boolean)
  } catch { return [] }
}

export async function generateArticle(
  keyword: string,
  language: string,
  tone: string,
  company: CompanyInfo,
  scheduleId?: string
): Promise<string> {
  const servicesHint = getServicesHint(keyword)

  const companyLines: string[] = []
  if (company.name)    companyLines.push(company.name)
  if (company.phone)   companyLines.push(`📞 ${company.phone}`)
  if (company.address) companyLines.push(`📍 ${company.address}`)
  if (company.website) companyLines.push(`🌐 ${company.website}`)
  const companyClosing = companyLines.join(' | ')
  const hasCompany = companyLines.length > 0

  // Pick a random angle — different each time
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]

  // Get last articles to avoid repetition
  const lastArticles = scheduleId ? await getLastArticles(scheduleId) : []
  const avoidNote = lastArticles.length > 0
    ? `\nIMPORTANT: Écris un article COMPLÈTEMENT DIFFÉRENT des précédents. Ne répète pas ces débuts: ${lastArticles.map(a => `"${a.substring(0, 50)}..."`).join(' | ')}`
    : ''

  // Random services to highlight each time
  const allServices = servicesHint ? servicesHint.split(',').map(s => s.trim()) : []
  const selectedServices = allServices.length > 2
    ? allServices.sort(() => Math.random() - 0.5).slice(0, 3).join(', ')
    : servicesHint

  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un rédacteur publicitaire expert. Tu écris UNIQUEMENT en ${language}. Pas d'intro. Directement le post. Termine par ---HASHTAGS--- suivi des hashtags. Article complet 600-800 caractères. Chaque article doit être UNIQUE et différent des précédents.${!hasCompany ? " Ne mentionne AUCUNE information d'entreprise, téléphone, adresse ou site web." : ''}`,
    },
    {
      role: 'user',
      content: `Post publicitaire UNIQUE en ${language} pour: "${keyword}"
Angle de cet article: "${angle}"
${selectedServices ? `Services à mettre en avant (ces services spécifiquement): ${selectedServices}` : ''}
Ton: ${tone}. 3 paragraphes. Appel à l'action fort.${hasCompany ? `\nInfos entreprise à inclure à la fin: ${companyClosing}` : '\nNe pas mentionner d\'informations d\'entreprise.'}${avoidNote}

[post 600-800 chars]
---HASHTAGS---
[8 à 10 hashtags sans # séparés par espaces, TRÈS SPÉCIFIQUES au service et à la localisation]`,
    },
    { role: 'assistant', content: '🔧' },
  ], 0.92) // Higher temperature for more variety

  const full = '🔧' + raw
  const parts = full.split('---HASHTAGS---')
  let postText = stripPreamble(parts[0].trim())
  const hashtagRaw = (parts[1] || '').trim()
  let hashtags = hashtagRaw
    .split(/[\s,\n]+/)
    .map((h: string) => h.replace(/#/g, '').trim())
    .filter((h: string) => h.length > 2 && !/---/.test(h) && !/^\d+$/.test(h))
    .slice(0, 10)

  // Always guarantee 8-10 relevant hashtags
  if (hashtags.length < 8) {
    const fallback = buildFallbackHashtags(keyword)
    hashtags = [...new Set([...hashtags, ...fallback])].slice(0, 10)
  }

  const final = buildFinalPost(postText, hashtags)
  console.log(`[Auto] angle="${angle}" | ${postText.length} chars | ${hashtags.length} hashtags`)
  return final
}

export async function generateWordPressArticle(
  keyword: string,
  language: string,
  company: CompanyInfo,
  siteUrl?: string,
  username?: string,
  appPassword?: string
): Promise<string> {
  console.log(`[WordPress] Generating SEO post: ${keyword}`)
  const wpPost = await generateWordPressPost(keyword, language, company, siteUrl, username, appPassword)
  return JSON.stringify(wpPost)
}

async function getRandomPhoto(): Promise<string[]> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (cloudName && apiKey && apiSecret) {
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=50&type=upload`,
        { headers: { 'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` } }
      )
      const data = await res.json()
      const images = data.resources || []
      if (images.length) {
        const r = images[Math.floor(Math.random() * images.length)]
        return [r.secure_url]
      }
    } catch {}
  }
  try {
    const { readdir } = await import('fs/promises')
    const { existsSync } = await import('fs')
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) return []
    const files = await readdir(uploadDir)
    const images = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    if (!images.length) return []
    return [`/uploads/${images[Math.floor(Math.random() * images.length)]}`]
  } catch { return [] }
}

export async function processAutomation() {
  const now = new Date()
  const currentDay = DAYS_OF_WEEK[now.getDay()]
  console.log(`[Auto] day=${currentDay} time=${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)

  const schedules = await prisma.schedule.findMany({ where: { active: true } })
  let processed = 0

  for (const schedule of schedules) {
    const dayTimes: Record<string, string[]> = JSON.parse(schedule.dayTimes || '{}')
    const timesForToday: string[] = dayTimes[currentDay] || []
    const matchingTime = timesForToday.find(t => {
      const [h, m] = t.split(':').map(Number)
      return Math.abs((h * 60 + m) - (now.getHours() * 60 + now.getMinutes())) <= 1
    })
    if (!matchingTime) continue
    if (schedule.lastRunAt) {
      const minsSince = (now.getTime() - new Date(schedule.lastRunAt).getTime()) / 60000
      if (minsSince < 58) { console.log(`[Auto] Skipping — ${Math.round(minsSince)}min ago`); continue }
    }

    console.log(`[Auto] 🚀 "${schedule.name}"`)
    const config = JSON.parse(schedule.platforms)
    const keyword = schedule.keyword || 'general'
    const language = config.language || 'French'
    const tone = config.tone || 'professional'
    const postsPerSlot = schedule.postsPerSlot || 1
    const company: CompanyInfo = {
      name: schedule.companyName, phone: schedule.companyPhone,
      address: schedule.companyAddress, website: schedule.companyWebsite,
    }

    for (let i = 0; i < postsPerSlot; i++) {
      try {
        const photoUrls = await getRandomPhoto()
        const accounts = await prisma.account.findMany({ where: { id: { in: config.accountIds } } })
        const successAccounts: string[] = []
        let lastError = ''

        const hasSocial = accounts.some(a => ['facebook', 'instagram', 'twitter', 'google_business'].includes(a.platform))
        const hasWordPress = accounts.some(a => a.platform === 'wordpress')

        let socialContent: string | null = null
        let wpContent: string | null = null

        // Pass scheduleId to generateArticle so it avoids repeating last articles
        if (hasSocial) socialContent = await generateArticle(keyword, language, tone, company, schedule.id)

        if (hasWordPress) {
          const wpAccount = accounts.find(a => a.platform === 'wordpress')
          if (wpAccount) {
            const wpExtra = parseExtraData(wpAccount.extraData)
            wpContent = await generateWordPressArticle(
              keyword, language, company,
              wpExtra?.siteUrl || wpAccount.pageId || undefined,
              wpExtra?.username,
              wpAccount.accessToken
            )
          }
        }

        const articleContent = socialContent || keyword
        const article = await prisma.article.create({
          data: { title: `${keyword} — ${now.toLocaleDateString()} #${i + 1}`, content: articleContent, topic: keyword, language, published: true },
        })

        for (const account of accounts) {
          const isWordPress = account.platform === 'wordpress'
          const content = isWordPress ? (wpContent || articleContent) : (socialContent || articleContent)
          try {
            await sendPost({
              text: content, mediaUrls: photoUrls,
              platform: account.platform, accessToken: account.accessToken,
              pageId: account.pageId || undefined,
              extraData: account.extraData,
              humanize: false,
            })
            successAccounts.push(account.username)
            console.log(`[Auto] ✅ ${account.username} (${account.platform})`)
          } catch (err: any) {
            lastError = err.message
            console.error(`[Auto] ❌ ${account.username}:`, err.message)
            if (schedule.notifyEmail) await sendFailureEmail(schedule.notifyEmail, account.username, err.message, keyword)
          }
        }

        await prisma.autoPost.create({
          data: { scheduleId: schedule.id, articleId: article.id, accounts: JSON.stringify(successAccounts), success: successAccounts.length > 0, error: lastError || null },
        })
        processed++
        if (i < postsPerSlot - 1) await new Promise(r => setTimeout(r, 3000))
      } catch (err: any) {
        console.error(`[Auto] Error:`, err.message)
        if (schedule.notifyEmail) await sendFailureEmail(schedule.notifyEmail, 'all accounts', err.message, keyword)
      }
    }
    await prisma.schedule.update({ where: { id: schedule.id }, data: { lastRunAt: now } })
  }
  return { processed }
}