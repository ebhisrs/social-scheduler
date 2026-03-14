export function humanizeText(text: string): string {
  return text // No rewriting — send exactly as generated
}

export async function randomDelay(min = 1000, max = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  await new Promise(resolve => setTimeout(resolve, delay))
}

export function getRandomUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  ]
  return agents[Math.floor(Math.random() * agents.length)]
}
