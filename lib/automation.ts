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

// Remove ANY internal thinking or meta-commentary the AI adds
function cleanAIOutput(text: string): string {
  // Remove lines that look like AI thinking/self-correction
  const lines = text.split('\n')
  const cleaned = lines.filter(line => {
    const l = line.trim()
    if (!l) return true
    // Remove lines with AI thinking patterns
    if (/^(okay|ok|sure|voici|here|absolument|parfait|wait|let me|drafting|self.correction|correction:|note:|thought|rewrite|previous output|re-read|paragraph \d|hook\.|solution\.|cta\.)/i.test(l)) return false
    if (/🪔|🔧-|eyes-on|{_}|\(Self-correction/i.test(l)) return false
    if (/^(p1:|p2:|p3:|intro:|body:|closing:)/i.test(l)) return false
    return true
  })
  return cleaned.join('\n').trim()
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

// Services per trade
const SERVICES_MAP: Record<string, string[][]> = {
  vitrier: [
    ['remplacement de vitre', 'double vitrage'],
    ['bris de glace urgence', 'fenêtres PVC'],
    ['vitrage simple', 'baies vitrées'],
    ['fenêtres aluminium', 'miroirs sur mesure'],
    ['velux', 'isolation thermique'],
    ['double vitrage', 'remplacement fenêtre'],
  ],
  serrurier: [
    ['ouverture de porte claquée', 'changement de serrure'],
    ['serrure multipoints', 'blindage de porte'],
    ['urgence 24h/7j', 'cylindre haute sécurité'],
    ['serrure connectée', 'coffre-fort'],
    ['protège-cylindre', 'porte blindée'],
    ['ouverture de porte', 'remplacement serrure'],
  ],
  plombier: [
    ['fuite eau urgence', 'débouchage canalisation'],
    ['installation chauffe-eau', 'robinetterie'],
    ['rénovation salle de bain', 'chauffage central'],
    ['remplacement chaudière', 'détartrage'],
  ],
  electricien: [
    ['dépannage électrique', 'tableau électrique'],
    ['mise aux normes', 'installation prises'],
    ['éclairage LED', 'borne recharge voiture'],
  ],
  peintre: [
    ['peinture intérieure', 'peinture extérieure'],
    ['ravalement de façade', 'pose papier peint'],
    ['enduit de finition', 'rénovation complète'],
  ],
}

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
  tags.push(...services.map(s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')).filter(s => s.length > 3).slice(0, 3))
  tags.push('devisgratuit', 'artisanlocal', 'interventionrapide')
  if (tradeKey === 'vitrier') tags.push('vitrage', 'brisdeglace', 'doublevitrage')
  else if (tradeKey === 'serrurier') tags.push('serrurerie', 'ouverturedeporte', 'urgenceserrurerie')
  else if (tradeKey === 'plombier') tags.push('plomberie', 'fuitedeau')
  else if (tradeKey === 'electricien') tags.push('electricite', 'depannageelectrique')
  else if (tradeKey === 'peintre') tags.push('peinture', 'renovation')
  return [...new Set(tags)].filter(t => t.length > 2).slice(0, 10)
}

// Pick service pair based on day — cycles through all pairs
function getServicesForToday(keyword: string): string[] {
  const tradeKey = getTradeKey(keyword)
  const pairs = SERVICES_MAP[tradeKey] || [['intervention rapide', 'devis gratuit']]
  // Use day of year to cycle through pairs
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return pairs[dayOfYear % pairs.length]
}

export async function generateArticle(
  keyword: string,
  language: string,
  tone: string,
  company: CompanyInfo,
  scheduleId?: string
): Promise<string> {
  const services = getServicesForToday(keyword)
  const hashtags = buildHashtags(keyword, services)

  const companyLines: string[] = []
  if (company.name)    companyLines.push(company.name)
  if (company.phone)   companyLines.push(`📞 ${company.phone}`)
  if (company.address) companyLines.push(`📍 ${company.address}`)
  if (company.website) companyLines.push(`🌐 ${company.website}`)
  const hasCompany = companyLines.length > 0
  const companyClosing = companyLines.join(' | ')

  const city = keyword.match(/\b(à|a|sur|en)\s+([A-ZÀ-Ü][a-zà-ü\-]+)/i)?.[2] || ''

  // Simple, clean prompt — no complexity that confuses the AI
  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un rédacteur publicitaire. Tu écris en ${language}. Tu produis directement le texte final sans commentaires ni explication.`,
    },
    {
      role: 'user',
      content: `Écris un post publicitaire en ${language} pour un ${keyword}.
Services: ${services.join(' et ')}.
${city ? `Ville: ${city}.` : ''}
Ton: ${tone}.
${hasCompany ? `Entreprise: ${companyClosing}` : ''}

3 paragraphes courts. Appel à l'action à la fin. 600 à 800 caractères. Pas de hashtags dans le texte.`,
    },
  ], 0.8)

  const postText = cleanAIOutput(raw.trim())
  const final = buildFinalPost(postText, hashtags)
  console.log(`[Auto] services=[${services.join(',')}] | ${postText.length} chars | ${hashtags.length} hashtags`)
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