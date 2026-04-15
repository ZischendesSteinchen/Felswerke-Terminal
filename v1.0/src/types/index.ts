export interface PriceData {
  symbol: string;
  price: number;
  exchange: string;
  timestamp: number;
}

export interface PriceHistory {
  time: number;
  value: number;
}

export interface ArbitrageSignal {
  symbol: string;
  exchanges: { name: string; price: number }[];
  highExchange: string;
  lowExchange: string;
  highPrice: number;
  lowPrice: number;
  spreadPercent: number;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  body: string;
  publishedAt: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  categories?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: Citation[];
  followUps?: string[];
}

export interface ExchangePrice {
  exchange: string;
  symbol: string;
  price: number;
  timestamp: number;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'price_move' | 'volume_spike' | 'arbitrage_spread' | 'news_spike' | 'fear_greed';

export interface Alert {
  id: string;
  timestamp: number;
  symbol: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  explanation: string;
  sources: string[];
  acknowledged: boolean;
}

export interface Citation {
  source: string;
  endpoint: string;
  retrievedAt: number;
}
