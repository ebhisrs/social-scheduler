import { aiChat } from './ai'

interface WordPressPost {
  title: string
  content: string
  metaDescription: string
  metaTitle: string
  slug: string
  focusKeyword: string
  secondaryKeywords: string[]
  tags: string[]
  categories: string[]
}

interface CompanyInfo {
  name?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
}

interface ExistingPost {
  title: string
  slug: string
  url: string
}

function getServiceDetails(keyword: string) {
  const k = keyword.toLowerCase()
  if (k.includes('vitrier') || k.includes('vitrage') || k.includes('vitre')) return {
    services: ['remplacement de vitre', 'double vitrage', 'vitrage simple', 'bris de glace urgence', 'fenêtres PVC', 'baies vitrées', 'miroirs sur mesure', 'velux', 'isolation thermique', 'fenêtres aluminium'],
    faqPool: [
      'Combien coûte un remplacement de vitre ?',
      'Intervenez-vous en urgence le week-end ?',
      'Quelle différence entre simple et double vitrage ?',
      'Combien de temps dure une intervention vitrier ?',
      'Le double vitrage réduit-il vraiment les factures de chauffage ?',
      'Pouvez-vous remplacer une vitre feuilletée ?',
      'Quel délai pour un devis vitrage ?',
      'Travaillez-vous avec les assurances pour bris de glace ?',
      'Quel est le prix d\'un double vitrage par fenêtre ?',
      'Intervenez-vous pour les baies vitrées ?',
    ],
    // LSI keywords — related semantic keywords for Yoast
    lsiKeywords: [
      'vitrier urgence', 'bris de glace', 'double vitrage prix', 'remplacement fenêtre',
      'vitre cassée', 'miroitier', 'pose fenêtre PVC', 'vitrage isolation',
      'fenêtre alu', 'vitrier pas cher', 'urgence vitrage', 'fenêtre double vitrage',
    ],
    localContext: 'vitrier, vitrerie, miroiterie, pose fenêtres',
  }
  if (k.includes('serrurier') || k.includes('serrure')) return {
    services: ['ouverture de porte claquée', 'changement de serrure', 'serrure multipoints', 'blindage de porte', 'urgence 24h/7j', 'coffre-fort', 'serrure connectée', 'cylindre haute sécurité'],
    faqPool: [
      'Combien coûte une ouverture de porte ?',
      'Intervenez-vous la nuit et le week-end ?',
      'Quelle serrure choisir pour une porte blindée ?',
      'Combien de temps pour ouvrir une porte claquée ?',
      'Peut-on ouvrir une porte sans l\'abîmer ?',
      'Quelle différence entre serrure 3 et 5 points ?',
      'Comment choisir un serrurier de confiance ?',
      'Remplacez-vous aussi les cylindres ?',
      'Quel est le prix d\'un blindage de porte ?',
      'Intervenez-vous pour les locaux commerciaux ?',
    ],
    lsiKeywords: [
      'serrurier urgence', 'ouverture porte', 'serrure claquée', 'serrurier pas cher',
      'changer serrure', 'porte blindée', 'cylindre serrure', 'dépannage serrurier',
      'serrurier 24h', 'serrurier agréé', 'blindage porte', 'serrure multipoints prix',
    ],
    localContext: 'serrurier, serrurerie, dépannage serrurerie, sécurité',
  }
  if (k.includes('plombier') || k.includes('plomberie')) return {
    services: ['fuite d\'eau urgence', 'débouchage canalisation', 'installation chauffe-eau', 'robinetterie', 'salle de bain', 'chauffage', 'remplacement chaudière', 'détartrage'],
    faqPool: [
      'Combien coûte un plombier en urgence ?',
      'Comment détecter une fuite d\'eau cachée ?',
      'Quel chauffe-eau choisir pour une famille ?',
      'Combien de temps pour déboucher une canalisation ?',
      'La fuite est couverte par mon assurance ?',
      'Intervenez-vous pour les copropriétés ?',
    ],
    lsiKeywords: [
      'plombier urgence', 'fuite eau', 'débouchage', 'chauffe-eau', 'plombier pas cher',
      'dépannage plomberie', 'plombier 24h', 'robinetterie', 'salle de bain rénovation',
    ],
    localContext: 'plombier, plomberie, dépannage, fuite eau',
  }
  if (k.includes('electricien') || k.includes('électricien')) return {
    services: ['dépannage électrique', 'tableau électrique', 'mise aux normes', 'prises et interrupteurs', 'éclairage LED', 'borne recharge voiture', 'installation électrique complète'],
    faqPool: [
      'Combien coûte un électricien en urgence ?',
      'Comment savoir si mon installation est aux normes ?',
      'Faut-il un électricien pour installer une borne de recharge ?',
      'Peut-on installer un tableau électrique soi-même ?',
      'Combien coûte une mise aux normes électrique ?',
    ],
    lsiKeywords: [
      'électricien urgence', 'dépannage électrique', 'tableau électrique', 'mise aux normes',
      'électricien pas cher', 'installation électrique', 'borne recharge', 'électricien 24h',
    ],
    localContext: 'électricien, électricité, dépannage électrique',
  }
  return {
    services: ['intervention rapide', 'devis gratuit', 'garantie travaux', 'artisan qualifié'],
    faqPool: ['Quels sont vos tarifs ?', 'Proposez-vous des devis gratuits ?', 'Quelle est votre zone d\'intervention ?'],
    lsiKeywords: ['artisan local', 'dépannage urgent', 'devis gratuit', 'intervention rapide'],
    localContext: 'artisan, professionnel, dépannage',
  }
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickN<T>(arr: T[], n: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n) }

const ARTICLE_ANGLES = [
  'guide_complet', 'urgence_focus', 'prix_tarifs', 'comparatif',
  'conseils_pro', 'pourquoi_choisir', 'avant_apres', 'saison',
]

// Fetch existing posts from WordPress for internal linking
async function getExistingWordPressPosts(siteUrl: string, username: string, appPassword: string): Promise<ExistingPost[]> {
  try {
    const authHeader = `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`
    const res = await fetch(`${siteUrl}/wp-json/wp/v2/posts?per_page=20&status=publish&_fields=id,title,slug,link`, {
      headers: { 'Authorization': authHeader },
    })
    if (!res.ok) return []
    const posts = await res.json()
    return posts.map((p: any) => ({
      title: p.title?.rendered || '',
      slug: p.slug || '',
      url: p.link || '',
    }))
  } catch {
    return []
  }
}

export async function generateWordPressPost(
  keyword: string,
  language: string,
  company: CompanyInfo,
  siteUrl?: string,
  username?: string,
  appPassword?: string
): Promise<WordPressPost> {

  const { services, faqPool, lsiKeywords, localContext } = getServiceDetails(keyword)
  const angle = pick(ARTICLE_ANGLES)
  const selectedFaqs = pickN(faqPool, 4)
  const selectedServices = pickN(services, Math.floor(Math.random() * 3) + 3)

  // Pick a DIFFERENT focus keyword from LSI list each time
  const cityMatch = keyword.match(/\b(à|a|en|near|in|sur)\s+([A-ZÀ-Ü][a-zà-ü\-]+(?:\s+[A-ZÀ-Ü][a-zà-ü\-]+)*)/i)
  const city = cityMatch ? cityMatch[2] : ''
  const serviceName = keyword.split(' ')[0]

  // Generate LSI keywords with city
  const lsiWithCity = lsiKeywords.map(k => city ? `${k} ${city}` : k)
  const allKeywords = [keyword, ...lsiWithCity]

  // Pick focus keyword — rotate through LSI keywords so each article targets a different one
  const keywordIndex = Math.floor(Math.random() * Math.min(4, allKeywords.length))
  const focusKeyword = keywordIndex === 0 ? keyword : lsiWithCity[keywordIndex - 1]
  const secondaryKeywords = pickN(allKeywords.filter(k => k !== focusKeyword), 5)

  const companyName = company.name || 'notre équipe'
  const companyPhone = company.phone || ''
  const companyAddress = company.address || city
  const companyWebsite = company.website || ''

  // Get existing posts for internal linking
  let existingPosts: ExistingPost[] = []
  if (siteUrl && username && appPassword) {
    existingPosts = await getExistingWordPressPosts(siteUrl, username, appPassword)
    console.log(`[WordPress] Found ${existingPosts.length} existing posts for internal linking`)
  }

  // Build internal links section
  const internalLinksHtml = existingPosts.length > 0
    ? `\n<h2>Articles liés</h2>\n<ul>\n${pickN(existingPosts, Math.min(3, existingPosts.length)).map(p => `<li><a href="${p.url}" title="${p.title}">${p.title}</a></li>`).join('\n')}\n</ul>\n`
    : ''

  // Different meta title formats
  const metaTitleFormats = [
    `${focusKeyword} | ${companyName}`,
    `${focusKeyword} — Intervention rapide à ${city}`,
    `${companyName} : ${focusKeyword} ${city ? `à ${city}` : ''}`,
    `${focusKeyword} : Devis gratuit | ${companyName}`,
    `Expert ${focusKeyword} ${city ? `à ${city}` : ''} | ${companyName}`,
  ]
  const metaTitle = pick(metaTitleFormats).substring(0, 60)

  // Different meta description formats
  const metaDescFormats = [
    `${companyName}, votre expert ${focusKeyword}${city ? ` à ${city}` : ''}. ${pick(['Intervention rapide', 'Devis gratuit', 'Urgence 24h/7j', 'Artisan qualifié'])}. ☎ ${companyPhone}`,
    `Besoin d'un ${focusKeyword}${city ? ` à ${city}` : ''} ? ${companyName} intervient rapidement. Devis gratuit. ${companyPhone ? `Appelez le ${companyPhone}` : 'Contactez-nous'}`,
    `${focusKeyword}${city ? ` à ${city}` : ''} : faites confiance à ${companyName}. ${pick(['Prix transparents', 'Garantie satisfaction', 'Artisans certifiés'])}. ☎ ${companyPhone}`,
  ]
  const metaDescription = pick(metaDescFormats).substring(0, 160)

  // Title formats per angle
  const titleByAngle: Record<string, string[]> = {
    guide_complet: [`${focusKeyword} : Guide Complet ${new Date().getFullYear()}`, `Tout savoir sur le ${serviceName}${city ? ` à ${city}` : ''}`, `Guide pratique : ${focusKeyword}`],
    urgence_focus: [`${focusKeyword} urgence — Intervention 24h/7j`, `Urgence ${serviceName}${city ? ` à ${city}` : ''} : on intervient vite`, `${serviceName} d'urgence : appelez ${companyName}`],
    prix_tarifs: [`Prix ${focusKeyword} ${new Date().getFullYear()} — Tarifs transparents`, `Combien coûte un ${serviceName}${city ? ` à ${city}` : ''} ?`, `Tarifs ${focusKeyword} : ce qu'il faut savoir`],
    comparatif: [`Comment choisir son ${serviceName}${city ? ` à ${city}` : ''} ?`, `${serviceName} : les critères pour bien choisir`, `Quel ${serviceName} choisir en ${new Date().getFullYear()} ?`],
    conseils_pro: [`${focusKeyword} : Conseils de professionnels`, `Les conseils de votre ${serviceName}`, `${serviceName} : ce que les pros recommandent`],
    pourquoi_choisir: [`Pourquoi choisir ${companyName} pour votre ${serviceName} ?`, `${focusKeyword} — Expertise et confiance`, `Votre ${serviceName} de confiance${city ? ` à ${city}` : ''}`],
    avant_apres: [`${focusKeyword} : avant et après l'intervention`, `Ce que change un bon ${serviceName}`, `${serviceName} : résultats garantis`],
    saison: [`${focusKeyword} : nos conseils saisonniers`, `${serviceName} : préparez-vous à temps`, `${focusKeyword} — Interventions toute l'année`],
  }

  const title = pick(titleByAngle[angle] || titleByAngle.guide_complet)
  const slug = `${focusKeyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}`

  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un expert SEO et rédacteur web. Tu écris UNIQUEMENT en ${language}. Tu crées des articles 100% uniques avec des angles variés. Tu intègres naturellement les mots-clés secondaires sans sur-optimisation. Tu suis exactement le format demandé.`,
    },
    {
      role: 'user',
      content: `Écris un article de blog SEO UNIQUE pour le mot-clé principal: "${focusKeyword}"

ANGLE: ${angle}
TITRE: ${title}
MOTS-CLÉS SECONDAIRES à intégrer naturellement: ${secondaryKeywords.join(', ')}

ENTREPRISE:
- Nom: ${companyName}
- Téléphone: ${companyPhone}
- Adresse: ${companyAddress}
${companyWebsite ? `- Site: ${companyWebsite}` : ''}

SERVICES À METTRE EN AVANT: ${selectedServices.join(', ')}

FAQ:
${selectedFaqs.map((q, i) => `${i + 1}. ${q}`).join('\n')}

FORMAT EXACT:

###CONTENT###
<h1>${title}</h1>

<p>[Introduction 2-3 phrases avec "${focusKeyword}" naturellement intégré. Accroche basée sur l'angle ${angle}.]</p>

<h2>Services de ${serviceName}${city ? ` à ${city}` : ''} : notre expertise</h2>
<p>[Description des services: ${selectedServices.join(', ')}. 3-4 phrases originales avec mots-clés secondaires intégrés naturellement.]</p>
<ul>
${selectedServices.map(s => `<li><strong>${s}</strong> : [description concrète et utile 1-2 phrases]</li>`).join('\n')}
</ul>

<h2>[H2 original basé sur l'angle "${angle}" — différent du précédent]</h2>
<p>[Contenu de 3-4 phrases avec au moins 1 mot-clé secondaire: ${secondaryKeywords[0] || ''}]</p>

<h2>Tarifs et devis ${serviceName}${city ? ` à ${city}` : ''}</h2>
<p>[Information transparente sur les prix, devis gratuit, facteurs influençant le coût. 3 phrases.]</p>

<h2>Zone d'intervention${city ? ` : ${city}` : ''} et alentours</h2>
<p>[Noms de villes voisines de ${city || 'la région'}, disponibilité, temps d'intervention. 2-3 phrases.]</p>

<h2>Questions fréquentes — ${focusKeyword}</h2>
${selectedFaqs.map(q => `<h3>${q}</h3>\n<p>[Réponse précise et honnête 2-3 phrases. Intègre un mot-clé secondaire si possible.]</p>`).join('\n\n')}

<h2>Contactez ${companyName}${city ? ` à ${city}` : ''}</h2>
<p>[CTA fort et personnalisé. Résumé de la valeur ajoutée. 2 phrases.]</p>
<p>📞 <strong>${companyPhone}</strong><br>
📍 ${companyAddress}${companyWebsite ? `<br>🌐 <a href="${companyWebsite}" title="${serviceName} ${city}">${companyWebsite}</a>` : ''}</p>

###END###`,
    },
    { role: 'assistant', content: '###CONTENT###' },
  ], 0.9)

  const fullRaw = '###CONTENT###' + raw
  const contentMatch = fullRaw.match(/###CONTENT###\s*([\s\S]*?)\s*###END###/)
  let content = contentMatch ? contentMatch[1].trim() : fullRaw.replace('###CONTENT###', '').replace('###END###', '').trim()

  // Add internal links section
  if (internalLinksHtml) {
    content += internalLinksHtml
  }

  // Add schema markup for LocalBusiness + Article
  const schemaMarkup = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "name": "${companyName}",
      "description": "${metaDescription.replace(/"/g, '\\"')}",
      ${companyPhone ? `"telephone": "${companyPhone}",` : ''}
      ${companyAddress ? `"address": {"@type": "PostalAddress", "streetAddress": "${companyAddress}", "addressLocality": "${city}"},` : ''}
      ${companyWebsite ? `"url": "${companyWebsite}",` : ''}
      "priceRange": "$$",
      "openingHours": "Mo-Su 00:00-24:00",
      "areaServed": "${city || 'France'}"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        ${selectedFaqs.map(q => `{"@type": "Question", "name": "${q.replace(/"/g, '\\"')}", "acceptedAnswer": {"@type": "Answer", "text": "Contactez ${companyName} pour obtenir une réponse personnalisée. ${companyPhone}"}}`).join(',\n        ')}
      ]
    }
  ]
}
</script>`

  content = content + '\n\n' + schemaMarkup

  const tags = [...new Set([
    ...secondaryKeywords,
    focusKeyword,
    serviceName,
    ...(city ? [city, `${serviceName} ${city}`] : []),
    'devis gratuit', 'artisan local'
  ])].slice(0, 15)

  console.log(`[WordPress] angle=${angle} | focus="${focusKeyword}" | secondary=[${secondaryKeywords.join(', ')}] | content=${content.length} chars`)

  return {
    title,
    content,
    metaDescription,
    metaTitle,
    slug,
    focusKeyword,
    secondaryKeywords,
    tags,
    categories: [serviceName, city || localContext.split(',')[0].trim()].filter(Boolean),
  }
}