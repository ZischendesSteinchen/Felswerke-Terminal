import type { WidgetType, WidgetLayout, WidgetSettings } from '@/types/workspace';

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  widgets: {
    type: WidgetType;
    title: string;
    layout: WidgetLayout;
    settings: WidgetSettings;
  }[];
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'crypto-focus',
    name: 'Crypto Focus',
    description: 'Charts, quotes, arbitrage & news for crypto traders',
    icon: '₿',
    color: '#00d4ff',
    widgets: [
      { type: 'market-quote', title: 'Bitcoin', layout: { x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 }, settings: { symbols: ['BTC'] } },
      { type: 'market-quote', title: 'Ethereum', layout: { x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 2 }, settings: { symbols: ['ETH'] } },
      { type: 'price-chart', title: 'BTC Chart', layout: { x: 0, y: 2, w: 6, h: 6, minW: 3, minH: 4 }, settings: { symbols: ['BTC'], range: '1D', chartType: 'candlestick', indicators: [] } },
      { type: 'arbitrage', title: 'Arbitrage', layout: { x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, settings: { arbThreshold: 0.5 } },
      { type: 'news-feed', title: 'Crypto News', layout: { x: 6, y: 4, w: 3, h: 4, minW: 2, minH: 3 }, settings: { newsQuery: '', newsSource: 'all' } },
      { type: 'top-movers', title: 'Top Movers', layout: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, settings: {} },
      { type: 'fear-greed', title: 'Fear & Greed', layout: { x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 3 }, settings: {} },
    ],
  },
  {
    id: 'stocks-macro',
    name: 'Stocks & Macro',
    description: 'Stock watchlist, market overview & analysis tools',
    icon: '📈',
    color: '#00ff88',
    widgets: [
      { type: 'stock-watchlist', title: 'Tech Stocks', layout: { x: 0, y: 0, w: 4, h: 5, minW: 2, minH: 3 }, settings: { symbols: ['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN'] } },
      { type: 'market-overview', title: 'Market Overview', layout: { x: 4, y: 0, w: 2, h: 2, minW: 2, minH: 2 }, settings: {} },
      { type: 'price-chart', title: 'AAPL Chart', layout: { x: 4, y: 2, w: 5, h: 5, minW: 3, minH: 4 }, settings: { symbols: ['AAPL'], range: '1M', chartType: 'candlestick', indicators: [] } },
      { type: 'news-feed', title: 'Market News', layout: { x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, settings: { newsQuery: '', newsSource: 'all' } },
      { type: 'notes', title: 'Analysis Notes', layout: { x: 9, y: 4, w: 3, h: 3, minW: 2, minH: 2 }, settings: { notesContent: '' } },
      { type: 'correlation-matrix', title: 'Correlation', layout: { x: 0, y: 5, w: 4, h: 4, minW: 3, minH: 3 }, settings: { correlationSymbols: ['BTC', 'ETH', 'AAPL', 'NVDA'] } },
    ],
  },
  {
    id: 'sentiment-monitor',
    name: 'Sentiment Monitor',
    description: 'News, Fear & Greed, AI assistant & market signals',
    icon: '🧠',
    color: '#ffaa00',
    widgets: [
      { type: 'fear-greed', title: 'Fear & Greed Index', layout: { x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 }, settings: {} },
      { type: 'news-feed', title: 'All News', layout: { x: 3, y: 0, w: 4, h: 6, minW: 2, minH: 3 }, settings: { newsQuery: '', newsSource: 'all' } },
      { type: 'ai-chat', title: 'AI Analyst', layout: { x: 7, y: 0, w: 5, h: 6, minW: 3, minH: 4 }, settings: {} },
      { type: 'alerts', title: 'Alerts', layout: { x: 0, y: 4, w: 3, h: 3, minW: 2, minH: 2 }, settings: { severityFilter: ['info', 'warning', 'critical'] } },
      { type: 'top-movers', title: 'Top Movers', layout: { x: 3, y: 6, w: 4, h: 3, minW: 2, minH: 3 }, settings: {} },
      { type: 'market-overview', title: 'Overview', layout: { x: 7, y: 6, w: 2, h: 2, minW: 2, minH: 2 }, settings: {} },
    ],
  },
];
