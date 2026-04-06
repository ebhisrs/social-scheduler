import { aiChat } from './ai'

interface WordPressPost {
  title: string
  content: string
  metaDescription: string
  slug: string
  focusKeyword: string
  tags: string[]
  categories: string[]
}

interface CompanyInfo {
  name?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
}

function getServiceDetails(keyword: string) {
  const k = keyword.toLowerCase()
  if (k.includes('vitrier') || k.includes('vitrage') || k.includes('vitre')) return {
    services: ['remplacement de vitre', 'double vitrage', 'vitrage simple', 'bris de glace urgence', 'fenêtres PVC', 'baies vitrées', 'miroirs sur mesure', 'velux', 'isolation thermique', 'fenêtres alu'],
    faqPool: [
      'Combien coûte un remplacement de vitre ?',
      'Intervenez-vous en urgence le week-end ?',
      'Quelle différence entre simple et double vitrage ?',
      'Combien de temps dure une intervention vitrier ?',
      'Le double vitrage réduit-il vraiment les factures de chauffage ?',
      'Pouvez-vous remplacer une vitre feuilletée ?',
      'Quel délai pour un devis vitrage ?',
      'Travaillez-vous avec les assurances pour bris de glace ?',
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
    localContext: 'électricien, électricité, dépannage électrique',
  }
  return {
    services: ['intervention rapide', 'devis gratuit', 'garantie travaux', 'artisan qualifié', 'service d\'urgence'],
    faqPool: ['Quels sont vos tarifs ?', 'Proposez-vous des devis gratuits ?', 'Quelle est votre zone d\'intervention ?'],
    localContext: 'artisan, professionnel, dépannage',
  }
}

// Random pick from array
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// Different article angles/structures
const ARTICLE_ANGLES = [
  'guide_complet',      // Complete guide
  'urgence_focus',      // Focus on emergency/urgency
  'prix_tarifs',        // Price/cost focused
  'comparatif',         // Comparison article
  'conseils_pro',       // Professional tips
  'pourquoi_choisir',   // Why choose us
  'avant_apres',        // Before/after approach
  'saison',             // Seasonal angle
]

const INTRO_HOOKS = [
  'Vous cherchez un {service} de confiance à {city} ?',
  'Une urgence {service} à {city} ? Voici ce que vous devez savoir.',
  'Choisir le bon {service} à {city} peut faire toute la différence.',
  'Votre {service} à {city} : tout ce qu\'il faut savoir avant d\'appeler.',
  '{city} : notre équipe de {service} intervient rapidement.',
  'Besoin d\'un {service} professionnel à {city} ? Lisez ceci avant tout.',
]

export async function generateWordPressPost(
  keyword: string,
  language: string,
  company: CompanyInfo
): Promise<WordPressPost> {

  const { services, faqPool, localContext } = getServiceDetails(keyword)
  const angle = pick(ARTICLE_ANGLES)
  const selectedFaqs = pickN(faqPool, 4)
  const selectedServices = pickN(services, Math.floor(Math.random() * 3) + 3) // 3-5 services

  const cityMatch = keyword.match(/\b(à|a|en|near|in|sur|chez)\s+([A-ZÀ-Ü][a-zà-ü\-]+(?:\s+[A-ZÀ-Ü][a-zà-ü\-]+)*)/i)
  const city = cityMatch ? cityMatch[2] : 'votre ville'
  const serviceName = keyword.split(' ')[0]

  const companyName = company.name || 'notre équipe'
  const companyPhone = company.phone || ''
  const companyAddress = company.address || city
  const companyWebsite = company.website || ''

  const hook = pick(INTRO_HOOKS).replace('{service}', serviceName).replace('{city}', city)

  // Different title formats based on angle
  const titleFormats: Record<string, string[]> = {
    guide_complet: [
      `${keyword} : Guide Complet ${new Date().getFullYear()}`,
      `Tout savoir sur le ${serviceName} à ${city}`,
      `Guide complet : choisir son ${serviceName} à ${city}`,
    ],
    urgence_focus: [
      `${keyword} urgence — Intervention rapide 24h/7j`,
      `Urgence ${serviceName} à ${city} : qui appeler ?`,
      `${serviceName} d'urgence à ${city} — On se déplace vite`,
    ],
    prix_tarifs: [
      `Prix ${serviceName} à ${city} — Tarifs ${new Date().getFullYear()}`,
      `Combien coûte un ${serviceName} à ${city} ?`,
      `Tarifs ${keyword} : ce qu'il faut savoir`,
    ],
    comparatif: [
      `Comment choisir son ${serviceName} à ${city} ?`,
      `${serviceName} à ${city} : les critères pour bien choisir`,
      `Quel ${serviceName} choisir à ${city} en ${new Date().getFullYear()} ?`,
    ],
    conseils_pro: [
      `${keyword} : Conseils de professionnels`,
      `Les conseils de votre ${serviceName} à ${city}`,
      `${serviceName} à ${city} : ce que les pros ne vous disent pas`,
    ],
    pourquoi_choisir: [
      `Pourquoi choisir ${companyName} pour votre ${serviceName} à ${city} ?`,
      `${keyword} — Faites confiance aux experts locaux`,
      `Votre ${serviceName} de confiance à ${city}`,
    ],
    avant_apres: [
      `${keyword} : avant et après l'intervention`,
      `Ce que change un bon ${serviceName} à ${city}`,
      `${serviceName} à ${city} : résultats garantis`,
    ],
    saison: [
      `${keyword} : nos conseils pour ${pick(['l\'hiver', 'l\'été', 'le printemps', 'l\'automne'])}`,
      `Préparez votre ${serviceName} à ${city} avant la saison`,
      `${serviceName} à ${city} — Interventions toute l'année`,
    ],
  }

  const titleOptions = titleFormats[angle] || titleFormats.guide_complet
  const titleBase = pick(titleOptions)

  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un expert SEO et rédacteur web. Tu écris UNIQUEMENT en ${language}. Tu crées des articles de blog différents à chaque fois, avec des angles variés et du contenu unique. Tu ne répètes jamais le même article. Tu suis exactement le format demandé.`,
    },
    {
      role: 'user',
      content: `Écris un article de blog SEO UNIQUE pour: "${keyword}"
      
ANGLE DE L'ARTICLE: ${angle} — ${hook}
TITRE SUGGÉRÉ: ${titleBase}

ENTREPRISE:
- Nom: ${companyName}
- Téléphone: ${companyPhone}  
- Adresse: ${companyAddress}
${companyWebsite ? `- Site: ${companyWebsite}` : ''}

SERVICES À METTRE EN AVANT (ces services spécifiques cette fois): ${selectedServices.join(', ')}

FAQ À TRAITER (ces questions spécifiques): 
${selectedFaqs.map((q, i) => `${i + 1}. ${q}`).join('\n')}

IMPORTANT: L'article doit être DIFFÉRENT des articles génériques — utilise l'angle "${angle}" pour créer un contenu unique et engageant.

FORMAT EXACT:

###TITLE###
${titleBase}

###METADESC###
[Meta description 150-160 caractères unique avec le mot-clé et un appel à l'action]

###SLUG###
[slug-unique-avec-tirets-et-date-ou-angle]

###TAGS###
[12-15 tags variés séparés par virgules]

###CONTENT###
<h1>${titleBase}</h1>

<p>${hook} ${companyName} vous répond avec expertise et rapidité. Découvrez tout ce qu'il faut savoir.</p>

<h2>Nos services de ${serviceName} à ${city}</h2>
<p>[Description engageante des services sélectionnés avec l'angle ${angle}. 3-4 phrases originales.]</p>
<ul>
${selectedServices.map(s => `<li><strong>${s}</strong> : [description spécifique et utile]</li>`).join('\n')}
</ul>

<h2>[H2 unique basé sur l'angle ${angle}]</h2>
<p>[Contenu original et utile, 3-4 phrases. Évite les formulations génériques.]</p>

<h2>Zone d'intervention : ${city} et communes voisines</h2>
<p>[Paragraphe sur la zone géographique avec noms de villes proches de ${city}]</p>

<h2>Questions fréquentes sur le ${serviceName} à ${city}</h2>
${selectedFaqs.map(q => `<h3>${q}</h3>\n<p>[Réponse concrète, honnête et utile — 2-3 phrases]</p>`).join('\n\n')}

<h2>Contactez ${companyName} — ${serviceName} à ${city}</h2>
<p>[CTA personnalisé avec l'angle ${angle}. Coordonnées complètes.]</p>
<p>📞 <strong>${companyPhone}</strong><br>
📍 ${companyAddress}${companyWebsite ? `<br>🌐 <a href="${companyWebsite}">${companyWebsite}</a>` : ''}</p>

###END###`,
    },
    { role: 'assistant', content: '###TITLE###' },
  ], 0.9) // Higher temperature for more variety

  const fullRaw = '###TITLE###' + raw

  const extract = (tag: string, nextTag: string) => {
    const regex = new RegExp(`###${tag}###\\s*([\\s\\S]*?)\\s*###${nextTag}###`)
    const match = fullRaw.match(regex)
    return match ? match[1].trim() : ''
  }

  const title = extract('TITLE', 'METADESC') || titleBase
  const metaDescription = extract('METADESC', 'SLUG')
  const slugRaw = extract('SLUG', 'TAGS')
  const slug = slugRaw.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').substring(0, 80)
  const tagsRaw = extract('TAGS', 'CONTENT')
  let content = extract('CONTENT', 'END')

  // Add schema markup
  const schemaMarkup = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${companyName}",
  "description": "${metaDescription.replace(/"/g, '\\"')}",
  ${companyPhone ? `"telephone": "${companyPhone}",` : ''}
  ${companyAddress ? `"address": {"@type": "PostalAddress", "streetAddress": "${companyAddress}"},` : ''}
  ${companyWebsite ? `"url": "${companyWebsite}",` : ''}
  "priceRange": "$$",
  "openingHours": "Mo-Su 00:00-24:00",
  "areaServed": "${city}"
}
</script>`

  content = content + '\n\n' + schemaMarkup

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)

  console.log(`[WordPress] Generated: angle=${angle} | title=${title} | content=${content.length} chars`)

  return {
    title,
    content,
    metaDescription: metaDescription || `${companyName} - ${keyword}. ${pick(['Intervention rapide', 'Devis gratuit', 'Urgence 24h/7j'])}. Appelez-nous !`,
    slug: slug || `${serviceName}-${city}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-'),
    focusKeyword: keyword,
    tags,
    categories: [serviceName, localContext.split(',')[0].trim()],
  }
}