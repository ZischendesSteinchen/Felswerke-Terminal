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
 * Provider chain: Finnhub → Yahoo Finance (fallback).
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

  // Try Finnhub first (needs a real API key for most symbols)
  let quotes = await fetchFinnhubQuotes(symbols);

  // Identify symbols where Finnhub returned no data (price=null or 0)
  const missing = quotes.filter((q) => q.price == null || q.price === 0).map((q) => q.symbol);

  // Fallback: Yahoo Finance for missing symbols
  if (missing.length > 0) {
    const yahooQuotes = await fetchYahooQuotes(missing);
    const yahooMap = new Map(yahooQuotes.map((q) => [q.symbol, q]));
    quotes = quotes.map((q) =>
      (q.price == null || q.price === 0) && yahooMap.has(q.symbol) ? yahooMap.get(q.symbol)! : q
    );
  }

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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`,
          { cache: 'no-store', signal: controller.signal }
        );
        clearTimeout(timeout);

        if (!res.ok) {
          return nullQuote(symbol, 'finnhub');
        }

        const data = await res.json();

        // Finnhub returns c=0, d=null when no data is available
        const hasData = data.c != null && data.c > 0;

        return {
          symbol,
          price: hasData ? data.c : null,
          change: data.d ?? null,
          changePercent: data.dp ?? null,
          high: hasData ? (data.h || null) : null,
          low: hasData ? (data.l || null) : null,
          open: hasData ? (data.o || null) : null,
          previousClose: hasData ? (data.pc || null) : null,
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

async function fetchYahooQuotes(symbols: string[]): Promise<StockQuote[]> {
  const results: StockQuote[] = [];

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
          {
            cache: 'no-store',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' },
          }
        );
        clearTimeout(timeout);

        if (!res.ok) {
          results.push(nullQuote(symbol, 'yahoo'));
          return;
        }

        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;

        if (!meta || meta.regularMarketPrice == null) {
          results.push(nullQuote(symbol, 'yahoo'));
          return;
        }

        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
        const change = prevClose != null ? price - prevClose : null;
        const changePct = prevClose != null && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : null;

        results.push({
          symbol,
          price,
          change,
          changePercent: changePct,
          high: meta.regularMarketDayHigh ?? null,
          low: meta.regularMarketDayLow ?? null,
          open: meta.regularMarketOpen ?? null,
          previousClose: prevClose,
          timestamp: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
          source: 'yahoo',
        });
      } catch {
        results.push(nullQuote(symbol, 'yahoo'));
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
