import { NextResponse } from 'next/server';
import { cacheGet, cacheSet, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const NO_STORE: RequestInit = {
  cache: 'no-store',
  headers: { 'Cache-Control': 'no-cache' },
};

interface MarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  marketCapChange24h: number;
}

// Approximate circulating supplies (updated periodically)
const APPROX_SUPPLY: Record<string, number> = {
  BTC: 19_850_000,
  ETH: 120_400_000,
};

// Total crypto market cap is roughly 2.8x BTC market cap (historical ratio)
const TOTAL_MARKET_MULTIPLIER = 2.8;

async function fetchFromCoinGecko(): Promise<MarketData> {
  const res = await fetch('https://api.coingecko.com/api/v3/global', NO_STORE);
  if (!res.ok) throw new Error(`CoinGecko global returned ${res.status}`);

  const json = await res.json();
  const d = json?.data;
  if (!d) throw new Error('No data');

  return {
    totalMarketCap: d.total_market_cap?.eur ?? 0,
    totalVolume24h: d.total_volume?.eur ?? 0,
    btcDominance: d.market_cap_percentage?.btc ?? 0,
    ethDominance: d.market_cap_percentage?.eth ?? 0,
    activeCryptos: d.active_cryptocurrencies ?? 0,
    marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? 0,
  };
}

async function fetchFromCoinbaseAndGateio(): Promise<MarketData> {
  // Coinbase v2 for spot prices, Gate.io for 24h stats
  const [btcRes, ethRes, gateRes] = await Promise.all([
    fetch('https://api.coinbase.com/v2/prices/BTC-EUR/spot', NO_STORE),
    fetch('https://api.coinbase.com/v2/prices/ETH-EUR/spot', NO_STORE),
    fetch('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT', NO_STORE).catch(() => null),
  ]);

  if (!btcRes.ok || !ethRes.ok) throw new Error('Coinbase fetch failed');

  const btcPrice = Number((await btcRes.json())?.data?.amount) || 0;
  const ethPrice = Number((await ethRes.json())?.data?.amount) || 0;

  let change24h = 0;
  let volume24h = 0;

  if (gateRes?.ok) {
    const tickers = await gateRes.json();
    const btcTicker = Array.isArray(tickers) ? tickers[0] : null;
    if (btcTicker) {
      change24h = Number(btcTicker.change_percentage) || 0;
      // quote_volume is in USDT; approximate EUR conversion (close enough)
      volume24h = (Number(btcTicker.quote_volume) || 0) * 0.92;
    }
  }

  const btcMarketCap = btcPrice * APPROX_SUPPLY.BTC;
  const ethMarketCap = ethPrice * APPROX_SUPPLY.ETH;
  const estTotalMarketCap = btcMarketCap * TOTAL_MARKET_MULTIPLIER;

  return {
    totalMarketCap: estTotalMarketCap,
    totalVolume24h: volume24h,
    btcDominance: estTotalMarketCap > 0 ? (btcMarketCap / estTotalMarketCap) * 100 : 60,
    ethDominance: estTotalMarketCap > 0 ? (ethMarketCap / estTotalMarketCap) * 100 : 15,
    activeCryptos: 0,
    marketCapChange24h: change24h,
  };
}

export async function GET() {
  try {
    const cached = cacheGet<MarketData>('market');
    if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'no-store' } });

    let result: MarketData;

    try {
      result = await fetchFromCoinGecko();
    } catch {
      result = await fetchFromCoinbaseAndGateio();
    }

    cacheSet('market', result, TTL.MARKET);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market data' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
      }
    );
  }
}
