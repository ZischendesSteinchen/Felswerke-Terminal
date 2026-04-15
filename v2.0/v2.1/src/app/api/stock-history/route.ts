import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type StockRange = '1D' | '1W' | '1M' | '3M' | '1Y';

interface FinnhubConfig {
  resolution: string;
  daysBack: number;
}

interface YahooConfig {
  range: string;
  interval: string;
}

const FINNHUB_CONFIG: Record<StockRange, FinnhubConfig> = {
  '1D': { resolution: '5', daysBack: 1 },
  '1W': { resolution: '15', daysBack: 7 },
  '1M': { resolution: '60', daysBack: 30 },
  '3M': { resolution: 'D', daysBack: 90 },
  '1Y': { resolution: 'D', daysBack: 365 },
};

const YAHOO_CONFIG: Record<StockRange, YahooConfig> = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '60m' },
  '3M': { range: '3mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
};

const VALID_RANGES = new Set(Object.keys(FINNHUB_CONFIG));

// Simple in-memory cache (key → { data, expiry })
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Ticker validation: 1-5 uppercase letters, optionally followed by a dot and 1-2 uppercase letters
const TICKER_RE = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') ?? '').toUpperCase().trim();
  const rangeInput = (searchParams.get('range') ?? '1M').toUpperCase();

  if (!symbol || !TICKER_RE.test(symbol)) {
    return NextResponse.json(
      { error: 'Invalid symbol. Use a valid stock ticker like AAPL, NVDA, MSFT.' },
      { status: 400 }
    );
  }

  const range = VALID_RANGES.has(rangeInput) ? (rangeInput as StockRange) : '1M';

  const cacheKey = `${symbol}-${range}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  // Try Finnhub first
  const finnhubResult = await fetchFinnhub(symbol, range);
  if (finnhubResult) {
    cache.set(cacheKey, { data: finnhubResult, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(finnhubResult);
  }

  // Fallback: Yahoo Finance
  const yahooResult = await fetchYahoo(symbol, range);
  if (yahooResult) {
    cache.set(cacheKey, { data: yahooResult, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(yahooResult);
  }

  return NextResponse.json({ error: 'No data available for this symbol/range', points: [] }, { status: 200 });
}

async function fetchFinnhub(symbol: string, range: StockRange) {
  const apiKey = process.env.FINNHUB_API_KEY || 'demo';
  const config = FINNHUB_CONFIG[range];
  const now = Math.floor(Date.now() / 1000);
  const from = now - config.daysBack * 86400;

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${config.resolution}&from=${from}&to=${now}&token=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const raw = await res.json();
    if (raw.s === 'no_data' || !raw.c || !Array.isArray(raw.c) || raw.c.length === 0) return null;

    const points = (raw.t as number[]).map((t: number, i: number) => ({
      time: t,
      open: raw.o[i],
      high: raw.h[i],
      low: raw.l[i],
      close: raw.c[i],
      volume: raw.v[i],
    }));

    return { symbol, range, points, source: 'finnhub' };
  } catch {
    return null;
  }
}

async function fetchYahoo(symbol: string, range: StockRange) {
  const config = YAHOO_CONFIG[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${config.range}&interval=${config.interval}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];
    if (!quote || timestamps.length === 0) return null;

    const points = timestamps
      .map((t: number, i: number) => ({
        time: t,
        open: quote.open?.[i] ?? 0,
        high: quote.high?.[i] ?? 0,
        low: quote.low?.[i] ?? 0,
        close: quote.close?.[i] ?? 0,
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter((p) => p.close > 0);

    if (points.length === 0) return null;
    return { symbol, range, points, source: 'yahoo' };
  } catch {
    return null;
  }
}
