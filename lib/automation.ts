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
    /^(je vous propose|here is|here's|let me|post publicitaire|voici un post|voici le post)/i,
  ]
  let start = 0
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
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

const SERVICES_MAP: Record<string, string[]> = {
  vitrier: ['remplacement de vitre', 'double vitrage', 'vitrage simple', 'bris de glace urgence', 'fenêtres PVC', 'baies vitrées', 'miroirs sur mesure', 'velux', 'fenêtres aluminium', 'isolation thermique vitrage'],
  serrurier: ['ouverture de porte claquée', 'changement de serrure', 'serrure multipoints', 'blindage de porte', 'urgence 24h/7j', 'cylindre haute sécurité', 'serrure connectée', 'coffre-fort', 'protège-cylindre'],
  plombier: ['fuite eau urgence', 'débouchage canalisation', 'chauffe-eau', 'robinetterie', 'rénovation salle de bain', 'chauffage central', 'remplacement chaudière', 'détartrage'],
  electricien: ['dépannage électrique urgence', 'remplacement tableau électrique', 'mise aux normes', 'installation prises', 'éclairage LED', 'borne recharge voiture électrique'],
  peintre: ['peinture intérieure', 'peinture extérieure', 'ravalement de façade', 'pose papier peint', 'enduit de finition', 'rénovation complète'],
}

// 30 completely different opening sentences — rotated to avoid repetition
const OPENINGS = [
  'Votre {service} de confiance à {city} intervient rapidement pour tous vos besoins.',
  'Besoin d\'un {service} professionnel à {city} ? Nous sommes là pour vous.',
  'À {city}, notre équipe de {service} est disponible 7j/7 pour vous aider.',
  'Un problème urgent ? Votre {service} à {city} répond présent, même la nuit.',
  'Depuis des années, nous sommes le {service} de référence à {city}.',
  'Ne cherchez plus : le meilleur {service} à {city}, c\'est nous.',
  'Intervention rapide et soignée — votre {service} à {city} est à votre service.',
  'Qualité, rapidité, prix justes : votre {service} à {city} tient ses promesses.',
  'Artisans locaux de {city}, nous sommes votre {service} de proximité.',
  'Urgence ou travaux planifiés, votre {service} à {city} s\'adapte à vos besoins.',
  'Faites confiance à des experts : {service} professionnel à {city}.',
  'À {city} et alentours, notre équipe de {service} est prête à intervenir.',
  'Vous méritez le meilleur : choisissez notre service de {service} à {city}.',
  'Problème résolu rapidement grâce à votre {service} local à {city}.',
  'Notre équipe de {service} à {city} met son expertise à votre service.',
  'Devis gratuit, intervention rapide : c\'est la promesse de votre {service} à {city}.',
  'À {city}, nous sommes l\'équipe de {service} qui intervient sans tarder.',
  'Votre tranquillité d\'esprit commence ici : {service} professionnel à {city}.',
  'Un {service} de confiance à {city} — disponible maintenant pour vous aider.',
  'Nos techniciens {service} à {city} sont formés pour toutes les situations.',
  'Choisissez la sécurité et la fiabilité : {service} certifié à {city}.',
  'À votre écoute depuis toujours, votre {service} à {city} fait la différence.',
  'Tarifs transparents, travail impeccable : votre {service} à {city} s\'engage.',
  'Nous intervenons vite et bien : {service} d\'urgence à {city}.',
  'La solution à vos problèmes : un {service} compétent à {city} disponible maintenant.',
  'Votre {service} à {city} agit vite, travaille bien et respecte votre budget.',
  'Faites appel aux meilleurs : {service} agréé à {city} à votre disposition.',
  'Plus besoin de chercher : votre {service} de confiance à {city} est là.',
  'Experts locaux à {city}, nous intervenons pour tous vos besoins en {service}.',
  'Rapide, fiable et professionnel : c\'est votre {service} à {city}.',
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
  const city = keyword.match(/\b(à|a|sur|en|de)\s+([A-ZÀ-Ü][a-zà-ü\-]+(?:\s+[A-ZÀ-Ü][a-zà-ü\-]+)?)/i)?.[2] || ''
  const tradeKey = getTradeKey(keyword)
  const tradeName = keyword.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const cityClean = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const tags: string[] = [tradeName]
  if (cityClean) tags.push(cityClean, `${tradeName}${cityClean}`)
  tags.push(`${tradeName}urgence`, `${tradeName}professionnel`)
  tags.push(...services.slice(0, 3).map(s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')).filter(s => s.length > 3))
  tags.push('devisgratuit', 'artisanlocal', 'interventionrapide')

  if (tradeKey === 'vitrier') tags.push('vitrage', 'brisdeglace', 'doublevitrage')
  else if (tradeKey === 'serrurier') tags.push('serrurerie', 'ouverturedeporte', 'urgenceserrurerie')
  else if (tradeKey === 'plombier') tags.push('plomberie', 'fuitedeau', 'depannageplomberie')
  else if (tradeKey === 'electricien') tags.push('electricite', 'depannageelectrique')
  else if (tradeKey === 'peintre') tags.push('peinture', 'renovation', 'ravalement')

  return [...new Set(tags)].filter(t => t.length > 2).slice(0, 10)
}

async function getLastContents(scheduleId: string, n = 5): Promise<string[]> {
  try {
    const posts = await prisma.autoPost.findMany({
      where: { scheduleId },
      orderBy: { sentAt: 'desc' },
      take: n,
      include: { article: { select: { content: true } } },
    })
    return posts.map(p => p.article?.content?.substring(0, 120) || '').filter(Boolean)
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
  const selectedServices = pickN(allServices, Math.floor(Math.random() * 2) + 2)

  // Build hashtags in code — guaranteed every time
  const hashtags = buildHashtags(keyword, selectedServices)

  const companyLines: string[] = []
  if (company.name)    companyLines.push(company.name)
  if (company.phone)   companyLines.push(`📞 ${company.phone}`)
  if (company.address) companyLines.push(`📍 ${company.address}`)
  if (company.website) companyLines.push(`🌐 ${company.website}`)
  const companyClosing = companyLines.join(' | ')
  const hasCompany = companyLines.length > 0

  // Extract city and service name for opening
  const city = keyword.match(/\b(à|a|sur|en)\s+([A-ZÀ-Ü][a-zà-ü\-]+)/i)?.[2] || ''
  const serviceName = keyword.split(' ')[0]

  // Pick a random opening and customize it
  const openingTemplate = pick(OPENINGS)
  const opening = openingTemplate
    .replace(/{service}/g, serviceName)
    .replace(/{city}/g, city || 'votre région')

  // Get last articles to avoid repetition
  const lastContents = scheduleId ? await getLastContents(scheduleId) : []
  const avoidNote = lastContents.length > 0
    ? `\nÉVITE ABSOLUMENT ces formulations déjà utilisées:\n${lastContents.map((c, i) => `- "${c.substring(0, 60)}"`).join('\n')}`
    : ''

  // Unique timestamp seed
  const seed = Date.now().toString(36) + Math.random().toString(36).substring(2, 6)

  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un rédacteur publicitaire créatif [${seed}]. Tu écris UNIQUEMENT en ${language}. Tu dois écrire directement le corps du post en continuant la phrase d'ouverture donnée. JAMAIS d'intro comme "Voici", "Here is", etc. Chaque article doit être complètement unique.${!hasCompany ? " Ne mentionne AUCUNE info d'entreprise." : ''}`,
    },
    {
      role: 'user',
      content: `Continue ce post publicitaire en ${language} pour "${keyword}" en développant à partir de cette première phrase:

"${opening}"

Services à développer (ces services SPÉCIFIQUEMENT, pas d'autres): ${selectedServices.join(', ')}
Ton: ${tone}. Ajoute 2 paragraphes supplémentaires après l'ouverture. Total: 600-800 caractères.${hasCompany ? `\nFinis avec: ${companyClosing}` : ''}
Appel à l'action fort à la fin.${avoidNote}

Réponds UNIQUEMENT avec le texte du post (sans hashtags, sans intro).`,
    },
  ], 0.95)

  // Clean up the response
  let postText = stripPreamble(raw.trim())

  // Make sure it starts with our opening if AI ignored it
  if (!postText.startsWith(opening.substring(0, 20))) {
    postText = `${opening}\n\n${postText}`
  }

  const final = buildFinalPost(postText, hashtags)
  console.log(`[Auto] opening="${opening.substring(0, 50)}" | ${postText.length} chars | ${hashtags.length} hashtags`)
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
      if (images.length) { const r = images[Math.floor(Math.random() * images.length)]; return [r.secure_url] }
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
            wpContent = await generateWordPressArticle(keyword, language, company, wpExtra?.siteUrl || wpAccount.pageId || undefined, wpExtra?.username, wpAccount.accessToken)
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
            await sendPost({ text: content, mediaUrls: photoUrls, platform: account.platform, accessToken: account.accessToken, pageId: account.pageId || undefined, extraData: account.extraData, humanize: false })
            successAccounts.push(account.username)
            console.log(`[Auto] ✅ ${account.username} (${account.platform})`)
          } catch (err: any) {
            lastError = err.message
            console.error(`[Auto] ❌ ${account.username}:`, err.message)
            if (schedule.notifyEmail) await sendFailureEmail(schedule.notifyEmail, account.username, err.message, keyword)
          }
        }

        await prisma.autoPost.create({ data: { scheduleId: schedule.id, articleId: article.id, accounts: JSON.stringify(successAccounts), success: successAccounts.length > 0, error: lastError || null } })
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