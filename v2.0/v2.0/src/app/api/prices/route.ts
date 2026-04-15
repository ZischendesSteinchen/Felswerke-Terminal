import { NextResponse } from 'next/server';
import {
  fetchBinancePrices,
  fetchCoinbasePrices,
  fetchCoinGeckoPrices,
  fetchKrakenPrices,
  fetchBybitPrices,
  fetchGateioPrices,
  fetchUsdToEurRate,
} from '@/lib/exchanges';
import { cacheGet, cacheSet, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'prices';

export async function GET() {
  try {
    const cached = cacheGet<{ prices: unknown[]; reachable: string[]; timestamp: number }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { ...cached, provider: 'cache', warnings: [] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const usdToEurRate = await fetchUsdToEurRate();
    const [binance, coinbase, coingecko, kraken, bybit, gateio] = await Promise.all([
      fetchBinancePrices(usdToEurRate),
      fetchCoinbasePrices(),
      fetchCoinGeckoPrices(),
      fetchKrakenPrices(usdToEurRate),
      fetchBybitPrices(usdToEurRate),
      fetchGateioPrices(usdToEurRate),
    ]);

    const prices = [...binance, ...coinbase, ...coingecko, ...kraken, ...bybit, ...gateio];
    const reachable = [
      binance.length > 0 && 'Binance',
      coinbase.length > 0 && 'Coinbase',
      coingecko.length > 0 && 'CoinGecko',
      kraken.length > 0 && 'Kraken',
      bybit.length > 0 && 'Bybit',
      gateio.length > 0 && 'Gate.io',
    ].filter(Boolean) as string[];

    const warnings: string[] = [];
    if (coingecko.length === 0) warnings.push('CoinGecko unreachable (DNS blocked)');
    if (binance.length === 0) warnings.push('Binance unreachable');

    const result = { prices, reachable, timestamp: Date.now(), provider: 'multi-exchange', warnings };
    cacheSet(CACHE_KEY, result, TTL.QUOTES);

    return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch prices', prices: [], reachable: [] },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
