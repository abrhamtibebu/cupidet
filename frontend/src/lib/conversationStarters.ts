const STARTERS = [
  "What's your favorite coffee spot?",
  "What's one place in Ethiopia everyone should visit?",
  "What's your favorite Ethiopian dish?",
  'Coffee ceremony or café latte?',
  "What's your favorite music to play on a drive?",
  'Beach day or mountain hike?',
  "What's the best concert or event you've been to?",
  'What are you most looking forward to this year?',
  'Injera first — what do you put on it?',
  "What's your go-to weekend plan in your city?",
  'Sunrise person or night owl?',
  "What's something you're learning right now?",
]

/** Pick `count` unique starters, shuffled. */
export function pickConversationStarters(count = 3, seed?: string): string[] {
  const list = [...STARTERS]
  let s = 0
  if (seed) {
    for (let i = 0; i < seed.length; i++) s = (s + seed.charCodeAt(i) * (i + 1)) % 997
  } else {
    s = Math.floor(Math.random() * 997)
  }
  for (let i = list.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647
    const j = s % (i + 1)
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list.slice(0, count)
}
