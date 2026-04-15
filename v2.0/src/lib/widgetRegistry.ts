// ─── Widget Registry ─────────────────────────────────────────────────────────
// Central catalog of all available widget types, their metadata, and defaults.

import type { WidgetDefinition, WidgetType } from '@/types/workspace';

const registry = new Map<WidgetType, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition): void {
  registry.set(def.type, def);
}

export function getWidgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return registry.get(type);
}

export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return [...registry.values()];
}

export function getWidgetsByCategory(category: WidgetDefinition['category']): WidgetDefinition[] {
  return [...registry.values()].filter((d) => d.category === category);
}

// ─── Register built-in widgets ───────────────────────────────────────────────

registerWidget({
  type: 'crypto-watchlist',
  label: 'Crypto Watchlist',
  description: 'Live crypto prices across exchanges',
  icon: '₿',
  category: 'market',
  defaultTitle: 'Crypto Watchlist',
  defaultLayout: { x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
  defaultSettings: { symbols: ['BTC', 'ETH'] },
});

registerWidget({
  type: 'stock-watchlist',
  label: 'Stock Watchlist',
  description: 'Track stock prices and changes',
  icon: '📈',
  category: 'market',
  defaultTitle: 'Stock Watchlist',
  defaultLayout: { x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
  defaultSettings: { symbols: ['AAPL', 'NVDA', 'MSFT'] },
});

registerWidget({
  type: 'price-chart',
  label: 'Price Chart',
  description: 'Candlestick or area chart with indicators',
  icon: '📊',
  category: 'market',
  defaultTitle: 'Price Chart',
  defaultLayout: { x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
  defaultSettings: { symbols: ['BTC'], range: '1D', chartType: 'candlestick', indicators: [] },
});

registerWidget({
  type: 'market-quote',
  label: 'Market Quote',
  description: 'Single asset quote with key metrics',
  icon: '💰',
  category: 'market',
  defaultTitle: 'BTC Quote',
  defaultLayout: { x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
  defaultSettings: { symbols: ['BTC'] },
});

registerWidget({
  type: 'news-feed',
  label: 'News Feed',
  description: 'Crypto and market news with sentiment',
  icon: '📰',
  category: 'news',
  defaultTitle: 'News Feed',
  defaultLayout: { x: 0, y: 0, w: 4, h: 5, minW: 2, minH: 3 },
  defaultSettings: { newsQuery: '', newsSource: 'all' },
});

registerWidget({
  type: 'alerts',
  label: 'Alerts',
  description: 'Price and market alerts',
  icon: '🔔',
  category: 'tools',
  defaultTitle: 'Alerts',
  defaultLayout: { x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  defaultSettings: { severityFilter: ['info', 'warning', 'critical'] },
});

registerWidget({
  type: 'ai-chat',
  label: 'AI Assistant',
  description: 'Context-aware AI market analysis',
  icon: '🤖',
  category: 'analysis',
  defaultTitle: 'AI Assistant',
  defaultLayout: { x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
  defaultSettings: {},
});

registerWidget({
  type: 'arbitrage',
  label: 'Arbitrage Monitor',
  description: 'Cross-exchange spread detection',
  icon: '⚡',
  category: 'analysis',
  defaultTitle: 'Arbitrage Monitor',
  defaultLayout: { x: 0, y: 0, w: 3, h: 5, minW: 2, minH: 3 },
  defaultSettings: { arbThreshold: 0.5 },
});

registerWidget({
  type: 'fear-greed',
  label: 'Fear & Greed Index',
  description: 'Market sentiment gauge',
  icon: '😱',
  category: 'analysis',
  defaultTitle: 'Fear & Greed',
  defaultLayout: { x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
  defaultSettings: {},
});

registerWidget({
  type: 'market-overview',
  label: 'Market Overview',
  description: 'Global market cap and dominance',
  icon: '🌍',
  category: 'market',
  defaultTitle: 'Market Overview',
  defaultLayout: { x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
  defaultSettings: {},
});

registerWidget({
  type: 'top-movers',
  label: 'Top Movers',
  description: 'Biggest gainers and losers',
  icon: '🚀',
  category: 'market',
  defaultTitle: 'Top Movers',
  defaultLayout: { x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
  defaultSettings: { symbols: [] },
});

registerWidget({
  type: 'notes',
  label: 'Notes',
  description: 'Personal notes and analysis',
  icon: '📝',
  category: 'tools',
  defaultTitle: 'Notes',
  defaultLayout: { x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 2 },
  defaultSettings: { notesContent: '' },
});

registerWidget({
  type: 'portfolio-tracker',
  label: 'Portfolio Tracker',
  description: 'Track positions, PnL and portfolio value',
  icon: '💼',
  category: 'market',
  defaultTitle: 'Portfolio',
  defaultLayout: { x: 0, y: 0, w: 4, h: 5, minW: 3, minH: 3 },
  defaultSettings: { positions: [] },
});

registerWidget({
  type: 'correlation-matrix',
  label: 'Correlation Matrix',
  description: 'Asset correlation heatmap',
  icon: '🔗',
  category: 'analysis',
  defaultTitle: 'Correlation',
  defaultLayout: { x: 0, y: 0, w: 4, h: 5, minW: 3, minH: 3 },
  defaultSettings: { correlationSymbols: ['BTC', 'ETH', 'SOL'] },
});

registerWidget({
  type: 'stock-chart',
  label: 'Stock Chart',
  description: 'Candlestick or area chart for stocks',
  icon: '📉',
  category: 'market',
  defaultTitle: 'Stock Chart',
  defaultLayout: { x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
  defaultSettings: { symbols: ['AAPL'], range: '1M', chartType: 'area' },
});
