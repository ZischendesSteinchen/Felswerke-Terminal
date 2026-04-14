import type { Alert, AlertSeverity, ExchangePrice, NewsItem } from '@/types';

let alertIdCounter = 0;
function nextId(): string {
  return `alert-${Date.now()}-${++alertIdCounter}`;
}

const priceSnapshots: Record<string, { price: number; time: number }[]> = {};
const MAX_SNAPSHOTS = 120; // ~2 min at 1s intervals

export function recordPriceSnapshot(symbol: string, price: number): void {
  if (!priceSnapshots[symbol]) priceSnapshots[symbol] = [];
  const arr = priceSnapshots[symbol];
  arr.push({ price, time: Date.now() });
  if (arr.length > MAX_SNAPSHOTS) arr.splice(0, arr.length - MAX_SNAPSHOTS);
}

function getReturns(symbol: string): number[] {
  const snaps = priceSnapshots[symbol];
  if (!snaps || snaps.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i - 1].price > 0) {
      returns.push((snaps[i].price - snaps[i - 1].price) / snaps[i - 1].price);
    }
  }
  return returns;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function evaluateAlerts(
  prices: ExchangePrice[],
  news: NewsItem[],
  fearGreedValue: number | null,
  arbitrageSpread: number | null,
): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  // Group prices by symbol, take best (newest)
  const bySymbol: Record<string, ExchangePrice> = {};
  for (const p of prices) {
    if (!bySymbol[p.symbol] || p.timestamp > bySymbol[p.symbol].timestamp) {
      bySymbol[p.symbol] = p;
    }
  }

  for (const [symbol, current] of Object.entries(bySymbol)) {
    recordPriceSnapshot(symbol, current.price);

    const returns = getReturns(symbol);
    if (returns.length < 5) continue;

    const sigma = stdDev(returns);
    const lastReturn = returns[returns.length - 1];

    // Large move alert (>2σ)
    if (sigma > 0 && Math.abs(lastReturn) > 2 * sigma) {
      const direction = lastReturn > 0 ? 'up' : 'down';
      const pct = (lastReturn * 100).toFixed(2);
      const severity: AlertSeverity = Math.abs(lastReturn) > 3 * sigma ? 'critical' : 'warning';

      alerts.push({
        id: nextId(),
        timestamp: now,
        symbol,
        severity,
        type: 'price_move',
        title: `${symbol} large ${direction} move (${pct}%)`,
        explanation: `${symbol} moved ${pct}% in a single interval, exceeding ${Math.abs(lastReturn / sigma).toFixed(1)}σ of recent volatility. This is unusual and may indicate significant market activity.`,
        sources: [`Price: ${current.exchange} @ ${current.price.toFixed(2)} EUR`],
        acknowledged: false,
      });
    }
  }

  // Arbitrage spread alert
  if (arbitrageSpread !== null && arbitrageSpread > 1.0) {
    const severity: AlertSeverity = arbitrageSpread > 2.0 ? 'critical' : 'warning';
    alerts.push({
      id: nextId(),
      timestamp: now,
      symbol: 'MULTI',
      severity,
      type: 'arbitrage_spread',
      title: `High arbitrage spread: ${arbitrageSpread.toFixed(2)}%`,
      explanation: `Cross-exchange price spread exceeds ${arbitrageSpread.toFixed(2)}%. This is informational — large spreads can indicate exchange-specific liquidity issues or delayed price updates.`,
      sources: ['Arbitrage Monitor'],
      acknowledged: false,
    });
  }

  // News spike alert (many negative news in short window)
  const recentNews = news.filter(
    (n) => (n.publishedAt < 1e12 ? n.publishedAt * 1000 : n.publishedAt) > now - 3600_000
  );
  const negativeCount = recentNews.filter((n) => n.sentiment === 'negative').length;
  if (negativeCount >= 3) {
    alerts.push({
      id: nextId(),
      timestamp: now,
      symbol: 'MARKET',
      severity: negativeCount >= 5 ? 'critical' : 'warning',
      type: 'news_spike',
      title: `${negativeCount} negative news articles in last hour`,
      explanation: `Multiple bearish headlines detected: ${recentNews.filter((n) => n.sentiment === 'negative').slice(0, 3).map((n) => `"${n.title.slice(0, 60)}"`).join(', ')}. News sentiment can influence short-term price movements.`,
      sources: recentNews.filter((n) => n.sentiment === 'negative').slice(0, 3).map((n) => n.source),
      acknowledged: false,
    });
  }

  // Fear & Greed extreme alert
  if (fearGreedValue !== null) {
    if (fearGreedValue <= 20) {
      alerts.push({
        id: nextId(),
        timestamp: now,
        symbol: 'MARKET',
        severity: 'warning',
        type: 'fear_greed',
        title: `Extreme Fear (Fear & Greed: ${fearGreedValue})`,
        explanation: `The Fear & Greed Index is at ${fearGreedValue}/100 (Extreme Fear). Markets are historically oversold in this range.`,
        sources: ['Alternative.me Fear & Greed Index'],
        acknowledged: false,
      });
    } else if (fearGreedValue >= 80) {
      alerts.push({
        id: nextId(),
        timestamp: now,
        symbol: 'MARKET',
        severity: 'warning',
        type: 'fear_greed',
        title: `Extreme Greed (Fear & Greed: ${fearGreedValue})`,
        explanation: `The Fear & Greed Index is at ${fearGreedValue}/100 (Extreme Greed). Markets may be overheated.`,
        sources: ['Alternative.me Fear & Greed Index'],
        acknowledged: false,
      });
    }
  }

  return alerts;
}
