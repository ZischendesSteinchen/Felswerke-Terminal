interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(key: string): void {
  store.delete(key);
}

export function cacheStats(): { entries: number; keys: string[] } {
  // clean expired first
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.expiresAt) store.delete(k);
  }
  return { entries: store.size, keys: [...store.keys()] };
}

// TTL presets (ms)
export const TTL = {
  QUOTES: 10_000,       // 10s for live quotes
  HISTORY: 600_000,     // 10min for chart history
  NEWS: 120_000,        // 2min for news
  MARKET: 60_000,       // 1min for market overview
  FEAR_GREED: 300_000,  // 5min for Fear & Greed
  EUR_RATE: 60_000,     // 1min for USD→EUR rate
} as const;
