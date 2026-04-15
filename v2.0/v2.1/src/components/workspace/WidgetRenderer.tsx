'use client';

import type { Widget } from '@/types/workspace';
import dynamic from 'next/dynamic';

// Lazy-load each widget component so they don't bloat the initial bundle
const CryptoWatchlistWidget = dynamic(() => import('../widgets/CryptoWatchlistWidget'), { ssr: false });
const StockWatchlistWidget = dynamic(() => import('../widgets/StockWatchlistWidget'), { ssr: false });
const PriceChartWidget = dynamic(() => import('../widgets/PriceChartWidget'), { ssr: false });
const MarketQuoteWidget = dynamic(() => import('../widgets/MarketQuoteWidget'), { ssr: false });
const NewsFeedWidget = dynamic(() => import('../widgets/NewsFeedWidget'), { ssr: false });
const AlertsWidget = dynamic(() => import('../widgets/AlertsWidget'), { ssr: false });
const AiChatWidget = dynamic(() => import('../widgets/AiChatWidget'), { ssr: false });
const ArbitrageWidget = dynamic(() => import('../widgets/ArbitrageWidget'), { ssr: false });
const FearGreedWidget = dynamic(() => import('../widgets/FearGreedWidget'), { ssr: false });
const MarketOverviewWidget = dynamic(() => import('../widgets/MarketOverviewWidget'), { ssr: false });
const TopMoversWidget = dynamic(() => import('../widgets/TopMoversWidget'), { ssr: false });
const NotesWidget = dynamic(() => import('../widgets/NotesWidget'), { ssr: false });
const PortfolioTrackerWidget = dynamic(() => import('../widgets/PortfolioTrackerWidget'), { ssr: false });
const CorrelationWidget = dynamic(() => import('../widgets/CorrelationWidget'), { ssr: false });

export interface WidgetComponentProps {
  widget: Widget;
}

const WIDGET_MAP: Record<string, React.ComponentType<WidgetComponentProps>> = {
  'crypto-watchlist': CryptoWatchlistWidget,
  'stock-watchlist': StockWatchlistWidget,
  'price-chart': PriceChartWidget,
  'market-quote': MarketQuoteWidget,
  'news-feed': NewsFeedWidget,
  'alerts': AlertsWidget,
  'ai-chat': AiChatWidget,
  'arbitrage': ArbitrageWidget,
  'fear-greed': FearGreedWidget,
  'market-overview': MarketOverviewWidget,
  'top-movers': TopMoversWidget,
  'notes': NotesWidget,
  'portfolio-tracker': PortfolioTrackerWidget,
  'correlation-matrix': CorrelationWidget,
};

export default function WidgetRenderer({ widget }: { widget: Widget }) {
  const Component = WIDGET_MAP[widget.type];

  if (!Component) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-muted text-xs">
        Unknown widget type: {widget.type}
      </div>
    );
  }

  return <Component widget={widget} />;
}
