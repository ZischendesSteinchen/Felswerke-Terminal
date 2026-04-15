import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface StockQuote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  previousClose: number | null;
  timestamp: number;
  source: string;
}

/**
 * GET /api/stocks?symbols=AAPL,NVDA,MSFT
 *
 * Returns stock quotes from free providers.
 * Provider chain: Finnhub → Yahoo (fallback placeholder for future).
 */
export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols') || 'AAPL,NVDA,MSFT';
  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20); // Max 20 symbols

  const cacheKey = `stocks:${symbols.join(',')}`;
  const cached = cacheGet<StockQuote[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ quotes: cached, cached: true });
  }

  const quotes = await fetchFinnhubQuotes(symbols);

  if (quotes.length > 0) {
    cacheSet(cacheKey, quotes, TTL.QUOTES);
  }

  return NextResponse.json({ quotes, cached: false });
}

async function fetchFinnhubQuotes(symbols: string[]): Promise<StockQuote[]> {
  const apiKey = process.env.FINNHUB_API_KEY || 'demo';

  const results = await Promise.all(
    symbols.map(async (symbol): Promise<StockQuote> => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`,
          { cache: 'no-store' }
        );

        if (!res.ok) {
          return nullQuote(symbol, 'finnhub');
        }

        const data = await res.json();

        // Finnhub returns: c=current, d=change, dp=percent change, h=high, l=low, o=open, pc=previous close, t=timestamp
        return {
          symbol,
          price: data.c || null,
          change: data.d || null,
          changePercent: data.dp || null,
          high: data.h || null,
          low: data.l || null,
          open: data.o || null,
          previousClose: data.pc || null,
          timestamp: data.t ? data.t * 1000 : Date.now(),
          source: 'finnhub',
        };
      } catch {
        return nullQuote(symbol, 'finnhub');
      }
    })
  );

  return results;
}

function nullQuote(symbol: string, source: string): StockQuote {
  return {
    symbol,
    price: null,
    change: null,
    changePercent: null,
    high: null,
    low: null,
    open: null,
    previousClose: null,
    timestamp: Date.now(),
    source,
  };
}
