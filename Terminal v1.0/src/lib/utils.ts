import type { PriceData } from '@/types';

const exchangePreference = [
  'Binance',
  'Coinbase',
  'Kraken',
  'Gate.io',
  'Bybit',
  'CoinGecko',
];

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function formatCurrency(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: price >= 1000 ? 2 : 2,
    maximumFractionDigits: price >= 1000 ? 2 : 4,
  }).format(price);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}%`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getPreferredPrice(prices: PriceData[]): PriceData | undefined {
  return [...prices].sort((left, right) => {
    const leftRank = exchangePreference.indexOf(left.exchange);
    const rightRank = exchangePreference.indexOf(right.exchange);
    const normalizedLeftRank = leftRank === -1 ? exchangePreference.length : leftRank;
    const normalizedRightRank = rightRank === -1 ? exchangePreference.length : rightRank;

    if (normalizedLeftRank !== normalizedRightRank) {
      return normalizedLeftRank - normalizedRightRank;
    }

    return right.timestamp - left.timestamp;
  })[0];
}
