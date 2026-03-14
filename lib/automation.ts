import { prisma } from './prisma'
import { aiChat } from './ai'
import { sendPost } from './poster'
import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function buildFinalPost(postText: string, hashtags: string[]): string {
  const hashLine = hashtags.map(h => `#${h}`).join(' ')
  return `${postText.trim()}\n\n${hashLine}`
}

function stripPreamble(text: string): string {
  const lines = text.split('\n')
  const skipPatterns = [
    /^(okay|ok|sure|certainly|absolutely|bien sûr|parfait|d'accord|voici|voilà|here|absolument|avec plaisir)/i,
    /^(je vous propose|je propose|voici une proposition|here is|here's|let me)/i,
    /^(post publicitaire|un post|une publication|ce post|ce texte)/i,
  ]
  let start = 0
  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const line = lines[i].trim()
    if (!line) { start = i + 1; continue }
    if (skipPatterns.some(p => p.test(line))) { start = i + 1 } else break
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
      from: process.env.SMTP_FROM || smtpUser,
      to: email,
      subject: `Auto-post failed on ${accountName}`,
      html: `<p><b>Account:</b> ${accountName}</p><p><b>Keyword:</b> ${keyword}</p><p><b>Error:</b> ${error}</p>`,
    })
  } catch (e: any) { console.error('[Email] Failed:', e.message) }
}

interface CompanyInfo {
  name?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
}

function getServicesHint(keyword: string): string {
  const k = keyword.toLowerCase()
  if (k.includes('vitrier') || k.includes('vitrage') || k.includes('vitre'))
    return 'remplacement de vitre, double vitrage, vitrage simple, bris de glace urgence, fenêtres, baies vitrées'
  if (k.includes('serrurier') || k.includes('serrure'))
    return "ouverture de porte claquée, changement de serrure, serrure multipoints, urgence 24h/7j, blindage de porte"
  if (k.includes('plombier') || k.includes('plomberie'))
    return "fuite d'eau urgence, débouchage canalisation, chauffe-eau, robinetterie, salle de bain"
  if (k.includes('electricien') || k.includes('électricien') || k.includes('electr'))
    return 'dépannage électrique, tableau électrique, mise aux normes, prises, éclairage'
  if (k.includes('peintre') || k.includes('peinture'))
    return 'peinture intérieure, peinture extérieure, ravalement de façade, papier peint, rénovation'
  if (k.includes('menuisier') || k.includes('menuiserie'))
    return 'portes sur mesure, fenêtres bois, escaliers, parquet, placards'
  if (k.includes('carreleur') || k.includes('carrelage'))
    return 'pose carrelage, salle de bain, cuisine, terrasse, faïence, rénovation sols'
  if (k.includes('maçon') || k.includes('maçonnerie') || k.includes('macon'))
    return 'construction murs, rénovation, extension maison, enduits, réparation fissures'
  return ''
}

function buildFallbackHashtags(keyword: string): string[] {
  const words = keyword.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/).filter((w: string) => w.length > 2)
  const tags = [...words]
  const k = keyword.toLowerCase()
  if (k.includes('vitrier') || k.includes('vitre')) tags.push('vitrage', 'doublevitrage', 'brisdeglace', 'vitrerie', 'fenetres')
  if (k.includes('serrurier')) tags.push('serrurerie', 'ouverturedeporte', 'urgence', 'serrure', 'depannage')
  if (k.includes('plombier')) tags.push('plomberie', 'fuitedeau', 'debouchage', 'urgence', 'depannage')
  if (k.includes('electr')) tags.push('electricite', 'depannageelectrique', 'electricien', 'installation')
  if (k.includes('peintre') || k.includes('peinture')) tags.push('peinture', 'renovation', 'artisan', 'devis')
  tags.push('artisan', 'devisgratuit', 'interventionrapide')
  return [...new Set(tags)].slice(0, 10)
}

export async function generateArticle(
  keyword: string,
  language: string,
  tone: string,
  company: CompanyInfo
): Promise<string> {
  const servicesHint = getServicesHint(keyword)

  const companyLines: string[] = []
  if (company.name)    companyLines.push(company.name)
  if (company.phone)   companyLines.push(`📞 ${company.phone}`)
  if (company.address) companyLines.push(`📍 ${company.address}`)
  if (company.website) companyLines.push(`🌐 ${company.website}`)
  const companyClosing = companyLines.join(' | ')

  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un rédacteur publicitaire expert pour artisans locaux. Tu écris UNIQUEMENT en ${language}. RÈGLE ABSOLUE N°1: tu produis UNIQUEMENT le texte du post, sans aucune phrase d'intro. JAMAIS de "Voici", "Here is", "Absolument" ou toute introduction. RÈGLE ABSOLUE N°2: tu termines TOUJOURS par ---HASHTAGS--- suivi des hashtags. RÈGLE ABSOLUE N°3: l'article doit être complet entre 600 et 800 caractères, jamais coupé.`,
    },
    {
      role: 'user',
      content: `Écris un post publicitaire COMPLET en ${language} pour: "${keyword}"
${servicesHint ? `Services (choisis 2-3): ${servicesHint}` : ''}
Ton: ${tone}. 3 paragraphes complets. Appel à l'action final fort.
${companyClosing ? `Infos entreprise à inclure: ${companyClosing}` : ''}

FORMAT EXACT — respecte absolument:
[post complet en ${language}, 600-800 caractères]
---HASHTAGS---
[8 à 10 hashtags sans #, séparés par espaces, liés au service et à la ville]`,
    },
    { role: 'assistant', content: '🔧' },
  ], 0.85)

  const full = '🔧' + raw
  const parts = full.split('---HASHTAGS---')
  let postText = stripPreamble(parts[0].trim())

  const hashtagRaw = (parts[1] || '').trim()
  let hashtags = hashtagRaw
    .split(/[\s,\n]+/)
    .map((h: string) => h.replace(/#/g, '').trim())
    .filter((h: string) => h.length > 2 && !/---/.test(h) && !/^\d+$/.test(h))
    .slice(0, 10)

  if (hashtags.length < 8) {
    const fallback = buildFallbackHashtags(keyword)
    hashtags = [...new Set([...hashtags, ...fallback])].slice(0, 10)
  }

  const final = buildFinalPost(postText, hashtags)
  console.log(`[Auto] ${postText.length} chars + ${hashtags.length} hashtags`)
  return final
}

async function getRandomPhoto(): Promise<string[]> {
  try {
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
  console.log(`[Auto] day=${currentDay} time=${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`)

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
      if (minsSince < 58) { console.log(`[Auto] Skipping — ran ${Math.round(minsSince)}min ago`); continue }
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
        const fullContent = await generateArticle(keyword, language, tone, company)
        const photoUrls = await getRandomPhoto()
        const article = await prisma.article.create({
          data: { title: `${keyword} — ${now.toLocaleDateString()} #${i + 1}`, content: fullContent, topic: keyword, language, published: true },
        })
        const accounts = await prisma.account.findMany({ where: { id: { in: config.accountIds } } })
        const successAccounts: string[] = []
        let lastError = ''
        for (const account of accounts) {
          try {
            await sendPost({ text: fullContent, mediaUrls: photoUrls, platform: account.platform, accessToken: account.accessToken, pageId: account.pageId || undefined, extraData: account.extraData ? JSON.parse(account.extraData) : undefined, humanize: false })
            successAccounts.push(account.username)
            console.log(`[Auto] ✅ ${account.username}`)
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
