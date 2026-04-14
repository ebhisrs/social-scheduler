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

// All possible services per trade
const SERVICES_MAP: Record<string, string[]> = {
  vitrier: ['remplacement de vitre', 'double vitrage', 'vitrage simple', 'bris de glace urgence', 'fenêtres PVC', 'baies vitrées', 'miroirs sur mesure', 'velux', 'fenêtres aluminium', 'isolation thermique'],
  serrurier: ['ouverture de porte claquée', 'changement de serrure', 'serrure multipoints', 'blindage de porte', 'urgence 24h/7j', 'cylindre haute sécurité', 'serrure connectée', 'coffre-fort'],
  plombier: ['fuite eau urgence', 'débouchage canalisation', 'chauffe-eau', 'robinetterie', 'salle de bain', 'chauffage', 'remplacement chaudière'],
  electricien: ['dépannage électrique', 'tableau électrique', 'mise aux normes', 'prises', 'éclairage LED', 'borne recharge'],
  peintre: ['peinture intérieure', 'peinture extérieure', 'ravalement façade', 'papier peint', 'enduit'],
}

// Opening hooks — 20 different ones
const HOOKS = [
  '🔧 Une urgence ? Notre équipe',
  '🔧 Vous cherchez un professionnel fiable ?',
  '🔧 Besoin d\'une intervention rapide ?',
  '🔧 Votre expert local est là !',
  '🔧 Intervention garantie en moins d\'une heure.',
  '🔧 Devis gratuit et sans engagement.',
  '🔧 Artisan certifié, prix transparents.',
  '🔧 Disponible 7j/7, même le week-end.',
  '🔧 Des professionnels à votre service.',
  '🔧 Qualité artisanale, tarifs compétitifs.',
  '🔧 Votre sécurité est notre priorité.',
  '🔧 Nous intervenons partout dans la région.',
  '🔧 Un savoir-faire reconnu depuis des années.',
  '🔧 Satisfaction client garantie à 100%.',
  '🔧 Problème urgent ? On arrive vite !',
  '🔧 Faites confiance aux vrais professionnels.',
  '🔧 Nos experts sont prêts à intervenir.',
  '🔧 Résultats rapides et travail soigné.',
  '🔧 Le bon artisan au bon moment.',
  '🔧 Appelez-nous, on s\'occupe de tout.',
]

// Different CTA endings
const CTAS = [
  'Appelez-nous maintenant pour un devis gratuit !',
  'Contactez-nous dès aujourd\'hui — intervention rapide !',
  'Devis gratuit en quelques minutes. Appelez !',
  'Ne tardez pas, contactez-nous maintenant !',
  'Réservez votre intervention dès maintenant !',
  'Un coup de fil suffit — on s\'en occupe !',
  'Contactez-nous pour une intervention sans délai.',
  'Disponible maintenant — appelez-nous !',
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickN<T>(arr: T[], n: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n) }

function getTradeKey(keyword: string): string {
  const k = keyword.toLowerCase()
  if (k.includes('vitrier') || k.includes('vitre') || k.includes('vitrage')) return 'vitrier'
  if (k.includes('serrurier') || k.includes('serrure')) return 'serrurier'
  if (k.includes('plombier') || k.includes('plomberie')) return 'plombier'
  if (k.includes('electricien') || k.includes('électricien')) return 'electricien'
  if (k.includes('peintre') || k.includes('peinture')) return 'peintre'
  return 'artisan'
}

function buildHashtags(keyword: string, services: string[]): string[] {
  const city = keyword.match(/\b(à|a|sur|en)\s+([A-ZÀ-Ü][a-zà-ü\-]+)/i)?.[2] || ''
  const tradeKey = getTradeKey(keyword)
  const tradeName = keyword.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const tags: string[] = [
    tradeName,
    ...(city ? [city.toLowerCase(), `${tradeName}${city.toLowerCase()}`, `${tradeName}urgence`] : [`${tradeName}urgence`]),
    ...services.map(s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')).slice(0, 4),
    'devisgratuit', 'artisanlocal', 'interventionrapide', 'professionnel',
  ]

  // Add trade-specific hashtags
  if (tradeKey === 'vitrier') tags.push('vitrage', 'brisdeglace', 'doublevitrage')
  if (tradeKey === 'serrurier') tags.push('serrurerie', 'ouverturedeporte', 'urgenceserrurerie')
  if (tradeKey === 'plombier') tags.push('plomberie', 'fuitedeau', 'depannageplomberie')
  if (tradeKey === 'electricien') tags.push('electricite', 'depannageelectrique')
  if (tradeKey === 'peintre') tags.push('peinture', 'renovation', 'ravalement')

  return [...new Set(tags)].slice(0, 10)
}

// Get last articles to avoid repetition
async function getLastContents(scheduleId: string, n = 5): Promise<string[]> {
  try {
    const posts = await prisma.autoPost.findMany({
      where: { scheduleId },
      orderBy: { sentAt: 'desc' },
      take: n,
      include: { article: { select: { content: true } } },
    })
    return posts.map(p => p.article?.content?.substring(0, 150) || '').filter(Boolean)
  } catch { return [] }
}

export async function generateArticle(
  keyword: string,
  language: string,
  tone: string,
  company: CompanyInfo,
  scheduleId?: string
): Promise<string> {
  const tradeKey = getTradeKey(keyword)
  const allServices = SERVICES_MAP[tradeKey] || ['intervention rapide', 'devis gratuit', 'artisan qualifié']

  // Pick 2-3 RANDOM services — different each time
  const selectedServices = pickN(allServices, Math.floor(Math.random() * 2) + 2)

  // Pick random hook and CTA
  const hook = pick(HOOKS)
  const cta = pick(CTAS)

  // Build hashtags from selected services
  const hashtags = buildHashtags(keyword, selectedServices)

  const companyLines: string[] = []
  if (company.name)    companyLines.push(company.name)
  if (company.phone)   companyLines.push(`📞 ${company.phone}`)
  if (company.address) companyLines.push(`📍 ${company.address}`)
  if (company.website) companyLines.push(`🌐 ${company.website}`)
  const companyClosing = companyLines.join(' | ')
  const hasCompany = companyLines.length > 0

  // Get last articles to avoid repetition
  const lastContents = scheduleId ? await getLastContents(scheduleId) : []
  const avoidText = lastContents.length > 0
    ? `\nNE PAS répéter ces formulations déjà utilisées:\n${lastContents.map((c, i) => `${i + 1}. "${c.substring(0, 80)}..."`).join('\n')}`
    : ''

  // Unique seed to force variation
  const seed = `[SEED:${Date.now()}-${Math.random().toString(36).substring(7)}]`

  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un rédacteur publicitaire créatif. Tu écris UNIQUEMENT en ${language}. RÈGLE ABSOLUE: chaque article doit être 100% unique et différent. Tu varies le style, la structure, les formulations à chaque fois. Pas d'intro. Directement le contenu. Termine par ---HASHTAGS--- suivi des hashtags.${!hasCompany ? " Ne mentionne AUCUNE information d'entreprise." : ''}`,
    },
    {
      role: 'user',
      content: `${seed}
Écris un post publicitaire UNIQUE en ${language} pour: "${keyword}"
Commence avec cette accroche (adapte-la): "${hook}"
Services à mettre en avant CETTE FOIS: ${selectedServices.join(', ')}
Termine avec: "${cta}"${hasCompany ? `\nInfos entreprise: ${companyClosing}` : ''}
Ton: ${tone}. 3 paragraphes. 600-800 caractères.${avoidText}

[post 600-800 chars]
---HASHTAGS---
${hashtags.join(' ')}`,
    },
    { role: 'assistant', content: '🔧' },
  ], 0.95)

  const full = '🔧' + raw
  const parts = full.split('---HASHTAGS---')
  let postText = stripPreamble(parts[0].trim())

  // Use our pre-built hashtags + any the AI added
  const aiHashtags = (parts[1] || '').trim()
    .split(/[\s,\n]+/)
    .map((h: string) => h.replace(/#/g, '').trim())
    .filter((h: string) => h.length > 2 && !/---/.test(h) && !/^\d+$/.test(h))
    .slice(0, 5)

  // Merge AI hashtags with our guaranteed ones
  const finalHashtags = [...new Set([...hashtags, ...aiHashtags])].slice(0, 10)

  const final = buildFinalPost(postText, finalHashtags)
  console.log(`[Auto] hook="${hook.substring(0, 30)}" | services=[${selectedServices.join(',')}] | ${postText.length} chars | ${finalHashtags.length} hashtags`)
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