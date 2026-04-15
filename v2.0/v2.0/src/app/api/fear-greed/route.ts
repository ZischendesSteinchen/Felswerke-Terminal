import { NextResponse } from 'next/server';
import { cacheGet, cacheSet, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface FearGreedData {
  value: number;
  classification: string;
  timestamp: number;
  history: { value: number; timestamp: number; classification: string }[];
}

export async function GET() {
  try {
    const cached = cacheGet<FearGreedData>('fear-greed');
    if (cached) return NextResponse.json(cached);

    const res = await fetch('https://api.alternative.me/fng/?limit=30&format=json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      throw new Error(`Fear & Greed API returned ${res.status}`);
    }

    const json = await res.json();
    const entries = Array.isArray(json?.data) ? json.data : [];

    if (entries.length === 0) {
      throw new Error('No Fear & Greed data available');
    }

    const current = entries[0];
    const result: FearGreedData = {
      value: Number(current.value),
      classification: current.value_classification,
      timestamp: Number(current.timestamp) * 1000,
      history: entries.map((e: { value: string; timestamp: string; value_classification: string }) => ({
        value: Number(e.value),
        timestamp: Number(e.timestamp) * 1000,
        classification: e.value_classification,
      })),
    };

    cacheSet('fear-greed', result, TTL.FEAR_GREED);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Fear & Greed Index' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
