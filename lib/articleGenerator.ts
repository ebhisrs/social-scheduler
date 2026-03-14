import { aiChat } from './ai'

export async function generateArticleContent(topic: string, language = 'French', tone = 'professional'): Promise<string> {
  const raw = await aiChat([
    {
      role: 'system',
      content: `Tu es un rédacteur publicitaire expert. Tu écris UNIQUEMENT en ${language}. Pas d'introduction, pas d'explication. Directement le contenu.`,
    },
    {
      role: 'user',
      content: `Écris un post publicitaire pour: "${topic}". Ton: ${tone}. 3 paragraphes. Appel à l'action. 600-800 caractères.`,
    },
    { role: 'assistant', content: '🔧' },
  ], 0.85)
  return '🔧' + raw
}
