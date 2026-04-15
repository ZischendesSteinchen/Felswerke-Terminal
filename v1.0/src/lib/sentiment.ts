const POSITIVE_WORDS = [
  'bullish', 'surge', 'rally', 'soar', 'gain', 'rise', 'jump', 'high',
  'record', 'growth', 'positive', 'optimistic', 'adoption', 'upgrade',
  'partnership', 'launch', 'milestone', 'breakthrough', 'profit', 'boom',
  'recover', 'momentum', 'outperform', 'strong', 'support', 'approval',
];

const NEGATIVE_WORDS = [
  'bearish', 'crash', 'plunge', 'drop', 'fall', 'decline', 'slump', 'low',
  'sell', 'fear', 'negative', 'pessimistic', 'ban', 'hack', 'fraud',
  'scam', 'lawsuit', 'regulation', 'loss', 'dump', 'risk', 'warning',
  'volatile', 'collapse', 'concern', 'panic', 'uncertainty', 'reject',
];

export function analyzeSentiment(
  text: string
): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  let score = 0;

  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) score++;
  }
  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) score--;
  }

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}
