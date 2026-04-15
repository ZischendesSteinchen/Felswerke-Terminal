import type { ExchangePrice, ArbitrageSignal } from '@/types';
import { registerProvider } from '@/lib/providerRegistry';

const NO_STORE_FETCH: RequestInit = {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache',
  },
};

function convertUsdLikeToEur(price: number, usdToEurRate: number): number {
  return price * usdToEurRate;
}

export async function fetchUsdToEurRate(): Promise<number> {
  try {
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', NO_STORE_FETCH);
    if (!res.ok) return 0.92;

    const data = await res.json();
    const rate = Number(data?.data?.rates?.EUR);
    return Number.isFinite(rate) && rate > 0 ? rate : 0.92;
  } catch {
    return 0.92;
  }
}

export async function fetchBinancePrices(usdToEurRate: number): Promise<ExchangePrice[]> {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', NO_STORE_FETCH),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', NO_STORE_FETCH),
    ]);

    if (!btcRes.ok || !ethRes.ok) return [];

    const [btc, eth] = await Promise.all([btcRes.json(), ethRes.json()]);
    const now = Date.now();

    return [
      {
        exchange: 'Binance',
        symbol: 'BTC',
        price: convertUsdLikeToEur(parseFloat(btc.price), usdToEurRate),
        timestamp: now,
      },
      {
        exchange: 'Binance',
        symbol: 'ETH',
        price: convertUsdLikeToEur(parseFloat(eth.price), usdToEurRate),
        timestamp: now,
      },
    ];
  } catch {
    return [];
  }
}

export async function fetchCoinbasePrices(): Promise<ExchangePrice[]> {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://api.coinbase.com/v2/prices/BTC-EUR/spot', NO_STORE_FETCH),
      fetch('https://api.coinbase.com/v2/prices/ETH-EUR/spot', NO_STORE_FETCH),
    ]);

    if (!btcRes.ok || !ethRes.ok) return [];

    const [btc, eth] = await Promise.all([btcRes.json(), ethRes.json()]);
    const now = Date.now();

    return [
      { exchange: 'Coinbase', symbol: 'BTC', price: parseFloat(btc.data.amount), timestamp: now },
      { exchange: 'Coinbase', symbol: 'ETH', price: parseFloat(eth.data.amount), timestamp: now },
    ];
  } catch {
    return [];
  }
}

export async function fetchCoinGeckoPrices(): Promise<ExchangePrice[]> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=eur',
      NO_STORE_FETCH
    );

    if (!res.ok) return [];

    const data = await res.json();
    const now = Date.now();

    const prices: ExchangePrice[] = [];
    if (data.bitcoin?.eur) {
      prices.push({ exchange: 'CoinGecko', symbol: 'BTC', price: data.bitcoin.eur, timestamp: now });
    }
    if (data.ethereum?.eur) {
      prices.push({ exchange: 'CoinGecko', symbol: 'ETH', price: data.ethereum.eur, timestamp: now });
    }

    return prices;
  } catch {
    return [];
  }
}

export async function fetchKrakenPrices(usdToEurRate: number): Promise<ExchangePrice[]> {
  try {
    const res = await fetch(
      'https://api.kraken.com/0/public/Ticker?pair=XBTUSD,ETHUSD',
      NO_STORE_FETCH
    );

    if (!res.ok) return [];

    const data = await res.json();
    const now = Date.now();
    const prices: ExchangePrice[] = [];

    // Kraken uses XXBTZUSD for BTC/USD and XETHZUSD for ETH/USD
    const btc = data.result?.XXBTZUSD || data.result?.XBTUSD;
    const eth = data.result?.XETHZUSD || data.result?.ETHUSD;

    if (btc?.c?.[0]) {
      prices.push({
        exchange: 'Kraken',
        symbol: 'BTC',
        price: convertUsdLikeToEur(parseFloat(btc.c[0]), usdToEurRate),
        timestamp: now,
      });
    }
    if (eth?.c?.[0]) {
      prices.push({
        exchange: 'Kraken',
        symbol: 'ETH',
        price: convertUsdLikeToEur(parseFloat(eth.c[0]), usdToEurRate),
        timestamp: now,
      });
    }

    return prices;
  } catch {
    return [];
  }
}

export async function fetchBybitPrices(usdToEurRate: number): Promise<ExchangePrice[]> {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT', NO_STORE_FETCH),
      fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=ETHUSDT', NO_STORE_FETCH),
    ]);

    if (!btcRes.ok || !ethRes.ok) return [];

    const [btcData, ethData] = await Promise.all([btcRes.json(), ethRes.json()]);
    const now = Date.now();
    const prices: ExchangePrice[] = [];

    const btcPrice = btcData.result?.list?.[0]?.lastPrice;
    const ethPrice = ethData.result?.list?.[0]?.lastPrice;

    if (btcPrice) {
      prices.push({
        exchange: 'Bybit',
        symbol: 'BTC',
        price: convertUsdLikeToEur(parseFloat(btcPrice), usdToEurRate),
        timestamp: now,
      });
    }
    if (ethPrice) {
      prices.push({
        exchange: 'Bybit',
        symbol: 'ETH',
        price: convertUsdLikeToEur(parseFloat(ethPrice), usdToEurRate),
        timestamp: now,
      });
    }

    return prices;
  } catch {
    return [];
  }
}

export async function fetchGateioPrices(usdToEurRate: number): Promise<ExchangePrice[]> {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT', NO_STORE_FETCH),
      fetch('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=ETH_USDT', NO_STORE_FETCH),
    ]);

    if (!btcRes.ok || !ethRes.ok) return [];

    const [btcData, ethData] = await Promise.all([btcRes.json(), ethRes.json()]);
    const now = Date.now();
    const prices: ExchangePrice[] = [];

    if (btcData?.[0]?.last) {
      prices.push({
        exchange: 'Gate.io',
        symbol: 'BTC',
        price: convertUsdLikeToEur(parseFloat(btcData[0].last), usdToEurRate),
        timestamp: now,
      });
    }
    if (ethData?.[0]?.last) {
      prices.push({
        exchange: 'Gate.io',
        symbol: 'ETH',
        price: convertUsdLikeToEur(parseFloat(ethData[0].last), usdToEurRate),
        timestamp: now,
      });
    }

    return prices;
  } catch {
    return [];
  }
}

export function calculateArbitrage(
  prices: ExchangePrice[],
  threshold: number
): ArbitrageSignal[] {
  const bySymbol: Record<string, ExchangePrice[]> = {};

  for (const p of prices) {
    if (!bySymbol[p.symbol]) bySymbol[p.symbol] = [];
    bySymbol[p.symbol].push(p);
  }

  const signals: ArbitrageSignal[] = [];

  for (const [symbol, exchangePrices] of Object.entries(bySymbol)) {
    if (exchangePrices.length < 2) continue;

    const sorted = [...exchangePrices].sort((a, b) => a.price - b.price);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    const spreadPercent = ((high.price - low.price) / low.price) * 100;

    signals.push({
      symbol,
      exchanges: exchangePrices.map((p) => ({ name: p.exchange, price: p.price })),
      highExchange: high.exchange,
      lowExchange: low.exchange,
      highPrice: high.price,
      lowPrice: low.price,
      spreadPercent,
      timestamp: Date.now(),
    });
  }

  return signals.sort((a, b) => b.spreadPercent - a.spreadPercent);
}

// ─── Provider Registry Registrations ────────────────────────────────────────
registerProvider({
  name: 'binance',
  displayName: 'Binance',
  requiresUsdConversion: true,
  fetchPrices: (rate) => fetchBinancePrices(rate),
});

registerProvider({
  name: 'coinbase',
  displayName: 'Coinbase',
  requiresUsdConversion: false,
  fetchPrices: () => fetchCoinbasePrices(),
});

registerProvider({
  name: 'coingecko',
  displayName: 'CoinGecko',
  requiresUsdConversion: false,
  fetchPrices: () => fetchCoinGeckoPrices(),
});

registerProvider({
  name: 'kraken',
  displayName: 'Kraken',
  requiresUsdConversion: true,
  fetchPrices: (rate) => fetchKrakenPrices(rate),
});

registerProvider({
  name: 'bybit',
  displayName: 'Bybit',
  requiresUsdConversion: true,
  fetchPrices: (rate) => fetchBybitPrices(rate),
});

registerProvider({
  name: 'gateio',
  displayName: 'Gate.io',
  requiresUsdConversion: true,
  fetchPrices: (rate) => fetchGateioPrices(rate),
});
