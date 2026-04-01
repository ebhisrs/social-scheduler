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

function getServiceDetails(keyword: string): { services: string; faq: string; localContext: string } {
  const k = keyword.toLowerCase()

  if (k.includes('vitrier') || k.includes('vitrage') || k.includes('vitre')) return {
    services: 'remplacement de vitre, double vitrage, vitrage simple, bris de glace urgence, fenêtres PVC, baies vitrées, miroirs, velux',
    faq: 'Combien coûte un remplacement de vitre ?|Intervenez-vous en urgence ?|Quelle différence entre simple et double vitrage ?|Combien de temps dure une intervention ?',
    localContext: 'vitrier, vitrerie, miroiterie, pose de fenêtres',
  }
  if (k.includes('serrurier') || k.includes('serrure')) return {
    services: 'ouverture de porte claquée, changement de serrure, serrure multipoints, blindage de porte, urgence 24h/7j, coffre-fort',
    faq: 'Combien coûte une ouverture de porte ?|Intervenez-vous la nuit ?|Quels types de serrures posez-vous ?|Combien de temps pour ouvrir une porte ?',
    localContext: 'serrurier, serrurerie, dépannage serrurerie, sécurité porte',
  }
  if (k.includes('plombier') || k.includes('plomberie')) return {
    services: 'fuite d\'eau urgence, débouchage canalisation, installation chauffe-eau, robinetterie, salle de bain, chauffage, climatisation',
    faq: 'Combien coûte un plombier ?|Intervenez-vous en urgence ?|Réparez-vous les fuites d\'eau ?|Installez-vous des chauffe-eaux ?',
    localContext: 'plombier, plomberie, dépannage plomberie, fuite eau',
  }
  if (k.includes('electricien') || k.includes('électricien')) return {
    services: 'dépannage électrique, tableau électrique, mise aux normes, installation prises, éclairage LED, bornes de recharge voiture',
    faq: 'Combien coûte un électricien ?|Faites-vous des mises aux normes ?|Intervenez-vous en urgence ?|Installez-vous des panneaux solaires ?',
    localContext: 'électricien, électricité, dépannage électrique, installation électrique',
  }
  if (k.includes('peintre') || k.includes('peinture')) return {
    services: 'peinture intérieure, peinture extérieure, ravalement de façade, papier peint, enduit, isolation thermique par l\'extérieur',
    faq: 'Combien coûte un peintre ?|Combien de temps pour peindre une pièce ?|Fournissez-vous les matériaux ?|Faites-vous le ravalement de façade ?',
    localContext: 'peintre, peinture, décoration intérieure, ravalement façade',
  }
  return {
    services: 'services professionnels, devis gratuit, intervention rapide, garantie travaux',
    faq: 'Quels sont vos tarifs ?|Intervenez-vous en urgence ?|Proposez-vous des devis gratuits ?|Quelle est votre zone d\'intervention ?',
    localContext: 'artisan, professionnel, dépannage, travaux',
  }
}

export async function generateWordPressPost(
  keyword: string,
  language: string,
  company: CompanyInfo
): Promise<WordPressPost> {

  const { services, faq, localContext } = getServiceDetails(keyword)
  const faqItems = faq.split('|')

  // Extract city from keyword if present
  const cityMatch = keyword.match(/\b(à|a|en|near|in)\s+([A-ZÀ-Ü][a-zà-ü\-]+(?:\s+[A-ZÀ-Ü][a-zà-ü\-]+)*)/i)
  const city = cityMatch ? cityMatch[2] : ''
  const companyName = company.name || 'notre équipe'
  const companyPhone = company.phone || ''
  const companyAddress = company.address || city
  const companyWebsite = company.website || ''

  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un expert SEO et rédacteur web professionnel. Tu écris UNIQUEMENT en ${language}. Tu crées des articles de blog ultra-optimisés pour le référencement local. Tu suis exactement le format demandé sans jamais ajouter d'introduction ou d'explication.`,
    },
    {
      role: 'user',
      content: `Écris un article de blog SEO complet pour: "${keyword}"

ENTREPRISE:
- Nom: ${companyName}
- Téléphone: ${companyPhone}
- Adresse: ${companyAddress}
- Site: ${companyWebsite}

SERVICES: ${services}

FORMAT EXACT (respecte absolument cette structure):

###TITLE###
[Titre SEO accrocheur avec le mot-clé principal, max 60 caractères]

###METADESC###
[Meta description 150-160 caractères avec mot-clé et appel à l'action]

###SLUG###
[URL slug en minuscules avec tirets, ex: vitrier-chassieu-urgence]

###TAGS###
[10-15 tags séparés par virgules]

###CONTENT###
[Article HTML complet avec cette structure EXACTE:]

<h1>[Titre H1 avec mot-clé principal]</h1>

<p>[Introduction 2-3 phrases: problème du lecteur + solution + mot-clé naturellement intégré]</p>

<h2>[Titre H2: Nos services de {keyword}]</h2>
<p>[Description détaillée des services: ${services}. 3-4 phrases.]</p>

<ul>
${services.split(',').map(s => `<li><strong>${s.trim()}</strong>: description courte</li>`).join('\n')}
</ul>

<h2>Pourquoi choisir ${companyName} pour votre ${keyword.split(' ')[0]} ?</h2>
<p>[4-5 avantages concurrentiels: rapidité, prix, expertise, garantie, disponibilité]</p>

<h2>Zone d'intervention: ${city || 'votre région'} et alentours</h2>
<p>[Paragraphe sur la zone géographique, villes voisines, disponibilité locale]</p>

<h2>Tarifs et devis ${keyword.split(' ')[0]}</h2>
<p>[Informations sur les prix, transparence tarifaire, devis gratuit]</p>

<h2>Questions fréquentes (FAQ)</h2>
${faqItems.map(q => `<h3>${q}</h3>\n<p>[Réponse détaillée 2-3 phrases]</p>`).join('\n\n')}

<h2>Contactez votre ${keyword.split(' ')[0]} à ${city || 'proximité'}</h2>
<p>[CTA fort: coordonnées complètes, urgence, disponibilité 24h/7j si applicable]</p>
<p><strong>📞 ${companyPhone}</strong><br>
📍 ${companyAddress}<br>
${companyWebsite ? `🌐 <a href="${companyWebsite}">${companyWebsite}</a>` : ''}</p>

###END###`,
    },
    { role: 'assistant', content: '###TITLE###' },
  ], 0.7)

  const fullRaw = '###TITLE###' + raw

  // Parse sections
  const extract = (tag: string, nextTag: string) => {
    const regex = new RegExp(`###${tag}###\\s*([\\s\\S]*?)\\s*###${nextTag}###`)
    const match = fullRaw.match(regex)
    return match ? match[1].trim() : ''
  }

  const title = extract('TITLE', 'METADESC')
  const metaDescription = extract('METADESC', 'SLUG')
  const slug = extract('SLUG', 'TAGS').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
  const tagsRaw = extract('TAGS', 'CONTENT')
  const content = extract('CONTENT', 'END')

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)

  // Add schema markup for local business
  const schemaMarkup = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${companyName}",
  "description": "${metaDescription}",
  ${companyPhone ? `"telephone": "${companyPhone}",` : ''}
  ${companyAddress ? `"address": {"@type": "PostalAddress", "streetAddress": "${companyAddress}"},` : ''}
  ${companyWebsite ? `"url": "${companyWebsite}",` : ''}
  "priceRange": "$$",
  "openingHours": "Mo-Su 00:00-24:00"
}
</script>`

  const finalContent = content + '\n\n' + schemaMarkup

  return {
    title: title || `${keyword} — ${companyName}`,
    content: finalContent,
    metaDescription: metaDescription || `${companyName} - ${keyword}. Intervention rapide, devis gratuit. Appelez-nous!`,
    slug: slug || keyword.toLowerCase().replace(/\s+/g, '-'),
    focusKeyword: keyword,
    tags,
    categories: [keyword.split(' ')[0], localContext.split(',')[0].trim()],
  }
}