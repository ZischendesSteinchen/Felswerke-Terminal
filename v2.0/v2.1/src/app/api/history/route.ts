import { NextRequest, NextResponse } from 'next/server';
import { fetchUsdToEurRate } from '@/lib/exchanges';

export const dynamic = 'force-dynamic';

type ChartRange = '1H' | '1D' | '1W' | '1M' | '1Y' | '5Y' | 'ALL';

interface RangeConfig {
  rangeMs: number;
  granularitySeconds: number;
}

interface OHLCVPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const RANGE_CONFIG: Record<ChartRange, RangeConfig> = {
  '1H': { rangeMs: 60 * 60 * 1000, granularitySeconds: 60 },
  '1D': { rangeMs: 24 * 60 * 60 * 1000, granularitySeconds: 300 },
  '1W': { rangeMs: 7 * 24 * 60 * 60 * 1000, granularitySeconds: 3600 },
  '1M': { rangeMs: 30 * 24 * 60 * 60 * 1000, granularitySeconds: 21600 },
  '1Y': { rangeMs: 365 * 24 * 60 * 60 * 1000, granularitySeconds: 86400 },
  '5Y': { rangeMs: 5 * 365 * 24 * 60 * 60 * 1000, granularitySeconds: 86400 },
  ALL: { rangeMs: 0, granularitySeconds: 86400 },
};

const COIN_START: Record<string, number> = {
  BTC: Date.UTC(2015, 0, 1),
  ETH: Date.UTC(2015, 7, 7),
};

const NO_STORE_FETCH: RequestInit = {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache',
  },
};

function resolveRange(input: string | null): ChartRange {
  const normalized = (input ?? '1D').toUpperCase() as ChartRange;
  return normalized in RANGE_CONFIG ? normalized : '1D';
}

function getRangeStart(symbol: string, range: ChartRange, now: number): number {
  if (range === 'ALL') {
    return COIN_START[symbol] ?? Date.UTC(2015, 0, 1);
  }

  return now - RANGE_CONFIG[range].rangeMs;
}

async function fetchCoinbaseHistory(symbol: string, range: ChartRange): Promise<OHLCVPoint[]> {
  // Coinbase candle format: [time, low, high, open, close, volume]
  const productId = `${symbol}-EUR`;
  const now = Date.now();
  const startTime = getRangeStart(symbol, range, now);
  const granularitySeconds = RANGE_CONFIG[range].granularitySeconds;
  const chunkMs = granularitySeconds * 1000 * 300;
  const points: OHLCVPoint[] = [];

  for (let cursor = startTime; cursor < now; cursor += chunkMs) {
    const chunkEnd = Math.min(cursor + chunkMs, now);
    const url = new URL(`https://api.exchange.coinbase.com/products/${productId}/candles`);
    url.searchParams.set('granularity', String(granularitySeconds));
    url.searchParams.set('start', new Date(cursor).toISOString());
    url.searchParams.set('end', new Date(chunkEnd).toISOString());

    const res = await fetch(url.toString(), NO_STORE_FETCH);
    if (!res.ok) {
      throw new Error(`Coinbase history returned ${res.status}`);
    }

    const candles = await res.json();
    if (!Array.isArray(candles)) continue;

    for (const candle of candles) {
      if (!Array.isArray(candle) || candle.length < 6) continue;
      const [time, low, high, open, close, volume] = candle as [number, number, number, number, number, number];
      if (!Number.isFinite(time) || !Number.isFinite(close)) continue;

      points.push({
        time: time * 1000,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume) || 0,
      });
    }
  }

  const deduped = new Map<number, OHLCVPoint>();
  for (const point of points) {
    deduped.set(point.time, point);
  }

  return [...deduped.values()].sort((left, right) => left.time - right.time);
}

async function fetchCoinGeckoHistory(symbol: string, range: ChartRange): Promise<OHLCVPoint[]> {
  // CoinGecko OHLC endpoint for real candle data
  const assetId = symbol === 'BTC' ? 'bitcoin' : 'ethereum';
  const daysParam =
    range === 'ALL'
      ? 'max'
      : String(Math.max(1, Math.ceil(RANGE_CONFIG[range].rangeMs / (24 * 60 * 60 * 1000))));

  // Try OHLC endpoint first (real candle data)
  const ohlcUrl = new URL(`https://api.coingecko.com/api/v3/coins/${assetId}/ohlc`);
  ohlcUrl.searchParams.set('vs_currency', 'eur');
  ohlcUrl.searchParams.set('days', daysParam);

  const ohlcRes = await fetch(ohlcUrl.toString(), NO_STORE_FETCH);
  if (ohlcRes.ok) {
    const ohlcData = await ohlcRes.json();
    if (Array.isArray(ohlcData) && ohlcData.length > 0) {
      const startTime = getRangeStart(symbol, range, Date.now());
      return ohlcData
        .filter((entry: unknown) => Array.isArray(entry) && entry.length >= 4)
        .map((entry: unknown): OHLCVPoint => {
          const [time, open, high, low, close] = entry as [number, number, number, number, number];
          return { time, open, high, low, close, volume: 0 };
        })
        .filter(
          (p: OHLCVPoint) =>
            Number.isFinite(p.time) && Number.isFinite(p.close) && p.time >= startTime
        )
        .sort((left: OHLCVPoint, right: OHLCVPoint) => left.time - right.time);
    }
  }

  // Fallback: market_chart endpoint (line data only)
  const url = new URL(`https://api.coingecko.com/api/v3/coins/${assetId}/market_chart`);
  url.searchParams.set('vs_currency', 'eur');
  url.searchParams.set('days', daysParam);

  const res = await fetch(url.toString(), NO_STORE_FETCH);
  if (!res.ok) {
    throw new Error(`CoinGecko history returned ${res.status}`);
  }

  const data = await res.json();
  const prices = Array.isArray(data?.prices) ? data.prices : [];
  const volumes = Array.isArray(data?.total_volumes) ? data.total_volumes : [];
  const startTime = getRangeStart(symbol, range, Date.now());

  const volumeMap = new Map<number, number>();
  for (const v of volumes) {
    if (Array.isArray(v) && v.length >= 2) volumeMap.set(v[0], v[1]);
  }

  return prices
    .filter((entry: unknown) => Array.isArray(entry) && entry.length >= 2)
    .map((entry: unknown): OHLCVPoint => {
      const [time, value] = entry as [number, number];
      return {
        time,
        open: value,
        high: value,
        low: value,
        close: value,
        volume: volumeMap.get(time) ?? 0,
      };
    })
    .filter(
      (point: OHLCVPoint) =>
        Number.isFinite(point.time) && Number.isFinite(point.close) && point.time >= startTime
    )
    .sort((left: OHLCVPoint, right: OHLCVPoint) => left.time - right.time);
}

function getGateInterval(range: ChartRange): string {
  switch (range) {
    case '1H':
      return '1m';
    case '1D':
      return '5m';
    case '1W':
      return '1h';
    case '1M':
      return '4h';
    case '1Y':
      return '1d';
    case '5Y':
    case 'ALL':
      return '7d';
    default:
      return '1h';
  }
}

async function fetchGateioHistory(symbol: string, range: ChartRange): Promise<OHLCVPoint[]> {
  // Gate.io candle format: [t, volume_quote, close, high, low, open, volume_base]
  const pair = symbol === 'BTC' ? 'BTC_USDT' : 'ETH_USDT';
  const now = Date.now();
  const startTime = getRangeStart(symbol, range, now);
  const url = new URL('https://api.gateio.ws/api/v4/spot/candlesticks');
  url.searchParams.set('currency_pair', pair);
  url.searchParams.set('interval', getGateInterval(range));
  url.searchParams.set('from', String(Math.floor(startTime / 1000)));
  url.searchParams.set('to', String(Math.floor(now / 1000)));
  url.searchParams.set('limit', '1000');

  const res = await fetch(url.toString(), NO_STORE_FETCH);
  if (!res.ok) {
    throw new Error(`Gate.io history returned ${res.status}`);
  }

  const data = await res.json();
  const usdToEurRate = await fetchUsdToEurRate();

  return (Array.isArray(data) ? data : [])
    .filter((entry: unknown) => Array.isArray(entry) && entry.length >= 6)
    .map((entry: unknown): OHLCVPoint => {
      const arr = entry as (string | number)[];
      return {
        time: Number(arr[0]) * 1000,
        open: Number(arr[5]) * usdToEurRate,
        high: Number(arr[3]) * usdToEurRate,
        low: Number(arr[4]) * usdToEurRate,
        close: Number(arr[2]) * usdToEurRate,
        volume: Number(arr[6]) || 0,
      };
    })
    .filter(
      (point: OHLCVPoint) =>
        Number.isFinite(point.time) && Number.isFinite(point.close) && point.time >= startTime
    )
    .sort((left: OHLCVPoint, right: OHLCVPoint) => left.time - right.time);
}

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase();
    const range = resolveRange(request.nextUrl.searchParams.get('range'));

    if (!symbol || !['BTC', 'ETH'].includes(symbol)) {
      return NextResponse.json(
        { error: 'Unsupported symbol' },
        { status: 400 }
      );
    }

    let ohlcv: OHLCVPoint[] = [];
    let source = 'Coinbase';

    try {
      ohlcv = await fetchCoinbaseHistory(symbol, range);
    } catch {
      try {
        ohlcv = await fetchCoinGeckoHistory(symbol, range);
        source = 'CoinGecko';
      } catch {
        ohlcv = await fetchGateioHistory(symbol, range);
        source = 'Gate.io';
      }
    }

    // Backward-compatible: include `points` (close prices) alongside full `ohlcv`
    const points = ohlcv.map((c) => ({ time: c.time, value: c.close }));

    return NextResponse.json(
      { points, ohlcv, source, symbol, range },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch chart history',
        points: [],
      },
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