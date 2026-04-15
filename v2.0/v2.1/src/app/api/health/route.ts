import { NextResponse } from 'next/server';
import { cacheStats } from '@/lib/cache';
import { APP_VERSION } from '@/lib/version';

export const dynamic = 'force-dynamic';

const startTime = Date.now();

export async function GET() {
  const providerChecks = await checkProviders();

  return NextResponse.json({
    status: 'ok',
    version: APP_VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: Date.now(),
    cache: cacheStats(),
    providers: providerChecks,
    ai: {
      provider: process.env.AI_PROVIDER || 'openai',
      configured: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
    },
  });
}

async function checkProviders(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  const checks: [string, string][] = [
    ['coinbase', 'https://api.coinbase.com/v2/prices/BTC-EUR/spot'],
    ['gateio', 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT'],
    ['alternative_me', 'https://api.alternative.me/fng/?limit=1&format=json'],
  ];

  await Promise.all(
    checks.map(async ([name, url]) => {
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        results[name] = res.ok ? 'reachable' : `error:${res.status}`;
      } catch {
        results[name] = 'unreachable';
      }
    })
  );

  return results;
}
