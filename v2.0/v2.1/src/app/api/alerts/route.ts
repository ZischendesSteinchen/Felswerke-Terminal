import { NextRequest, NextResponse } from 'next/server';
import { evaluateAlerts } from '@/lib/alertEngine';
import { cacheGet, cacheSet } from '@/lib/cache';
import type { Alert, ExchangePrice, NewsItem } from '@/types';

export const dynamic = 'force-dynamic';

// In-memory store for alerts + ack state
let alertStore: Alert[] = [];
const MAX_ALERTS = 100;

export async function GET() {
  // Run alert engine with latest cached data
  const pricesData = cacheGet<{ prices: ExchangePrice[] }>('prices');
  const newsData = cacheGet<{ news: NewsItem[] }>('news');
  const fearGreedData = cacheGet<{ value: number }>('fear-greed');
  const marketData = cacheGet<{ marketCapChange24h: number }>('market');

  const prices = pricesData?.prices || [];
  const news = newsData?.news || [];
  const fgValue = fearGreedData?.value ?? null;

  // Find max arbitrage spread
  let maxSpread: number | null = null;
  const bySymbol: Record<string, number[]> = {};
  for (const p of prices) {
    if (!bySymbol[p.symbol]) bySymbol[p.symbol] = [];
    bySymbol[p.symbol].push(p.price);
  }
  for (const arr of Object.values(bySymbol)) {
    if (arr.length >= 2) {
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      if (min > 0) {
        const spread = ((max - min) / min) * 100;
        if (maxSpread === null || spread > maxSpread) maxSpread = spread;
      }
    }
  }

  const newAlerts = evaluateAlerts(prices, news, fgValue, maxSpread);

  // Deduplicate by type+symbol within last 60s
  const now = Date.now();
  for (const alert of newAlerts) {
    const isDupe = alertStore.some(
      (a) =>
        a.type === alert.type &&
        a.symbol === alert.symbol &&
        now - a.timestamp < 60_000
    );
    if (!isDupe) {
      alertStore.unshift(alert);
    }
  }

  // Trim old alerts
  if (alertStore.length > MAX_ALERTS) {
    alertStore = alertStore.slice(0, MAX_ALERTS);
  }

  return NextResponse.json({
    alerts: alertStore,
    total: alertStore.length,
    unacknowledged: alertStore.filter((a) => !a.acknowledged).length,
    timestamp: now,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const alertId = body?.alertId;

  if (!alertId) {
    return NextResponse.json({ error: 'alertId required' }, { status: 400 });
  }

  const alert = alertStore.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
  }

  return NextResponse.json({ success: true });
}
