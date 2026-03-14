// lib/ai.ts — Google Gemini with proper systemInstruction
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b-latest',
  'gemini-1.5-pro-latest',
]

export async function aiChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  temperature = 0.8
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing')

  const systemMsg = messages.find(m => m.role === 'system')
  const nonSystem = messages.filter(m => m.role !== 'system')

  const contents = nonSystem.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: any = {
    contents,
    generationConfig: { temperature, maxOutputTokens: 1200 },
  }

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const tryModel = async (model: string): Promise<string | null> => {
    try {
      const res = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 401 || res.status === 403) {
        const err = await res.json()
        throw new Error(`Invalid Gemini API Key: ${err.error?.message}`)
      }
      if (!res.ok) return null
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
    } catch (err: any) {
      if (err.message?.includes('Invalid Gemini API Key')) throw err
      return null
    }
  }

  for (const model of MODELS) {
    const result = await tryModel(model)
    if (result) { console.log(`[AI] ${model}`); return result }
  }

  try {
    const listRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`)
    if (listRes.ok) {
      const listData = await listRes.json()
      const available = listData.models
        ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', '')) || []
      for (const model of available) {
        const result = await tryModel(model)
        if (result) { console.log(`[AI] discovered: ${model}`); return result }
      }
    }
  } catch {}

  throw new Error('Gemini API failed — check your GEMINI_API_KEY')
}
