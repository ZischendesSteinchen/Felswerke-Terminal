// ─── Workspace & Widget Type System ──────────────────────────────────────────

export type WidgetType =
  | 'crypto-watchlist'
  | 'stock-watchlist'
  | 'price-chart'
  | 'market-quote'
  | 'news-feed'
  | 'alerts'
  | 'ai-chat'
  | 'arbitrage'
  | 'fear-greed'
  | 'market-overview'
  | 'top-movers'
  | 'notes';

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetSettings {
  /** Symbol or symbols to track */
  symbols?: string[];
  /** Watchlist ID reference */
  watchlistId?: string;
  /** Data provider to use */
  provider?: string;
  /** Chart interval/timeframe */
  interval?: string;
  /** Chart range */
  range?: string;
  /** Chart type */
  chartType?: 'area' | 'candlestick';
  /** Active indicators for chart */
  indicators?: string[];
  /** News topic or query */
  newsQuery?: string;
  /** News source */
  newsSource?: string;
  /** Alert severity filter */
  severityFilter?: string[];
  /** Arbitrage threshold */
  arbThreshold?: number;
  /** Notes content */
  notesContent?: string;
  /** Columns to display */
  columns?: string[];
  /** Generic key-value for extensibility */
  [key: string]: unknown;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  workspaceId: string;
  layout: WidgetLayout;
  settings: WidgetSettings;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  widgetIds: string[];
  /** Color accent for the workspace tab */
  color?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  type: 'crypto' | 'stock' | 'mixed';
  symbols: string[];
}

export type ProviderCategory = 'crypto' | 'stock' | 'news';

export interface ProviderConfig {
  id: string;
  category: ProviderCategory;
  activeProvider: string;
  fallbackProviders: string[];
  settings: Record<string, unknown>;
}

export interface UserPreferences {
  theme: 'dark';
  defaultWorkspaceId: string;
  currency: string;
  locale: string;
  /** Sidebar collapsed state */
  sidebarCollapsed: boolean;
}

// ─── Widget Registry Metadata ────────────────────────────────────────────────

export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  description: string;
  icon: string;
  category: 'market' | 'analysis' | 'news' | 'tools';
  defaultLayout: WidgetLayout;
  defaultSettings: WidgetSettings;
  /** Default title when added */
  defaultTitle: string;
}
