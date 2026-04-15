import { NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'top-movers';
const TTL = 60_000; // 60 s

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
}

export async function GET() {
  const cached = cacheGet<CoinGeckoMarket[]>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h',
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `CoinGecko returned ${res.status}` },
        { status: 502 }
      );
    }

    const data: CoinGeckoMarket[] = await res.json();
    cacheSet(CACHE_KEY, data, TTL);

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch top movers' },
      { status: 502 }
    );
  }
}
