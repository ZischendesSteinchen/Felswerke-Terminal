// ─── AI Context Layer ────────────────────────────────────────────────────────
// Gathers visible workspace context and packages it for the AI assistant.

import type { Widget, Workspace, Watchlist } from '@/types/workspace';
import type { PriceData, NewsItem, ArbitrageSignal } from '@/types';

export interface WorkspaceContext {
  workspace: { id: string; name: string };
  visibleWidgets: { type: string; title: string; settings: Record<string, unknown> }[];
  symbols: string[];
  watchlists: { name: string; symbols: string[] }[];
  recentPrices: { symbol: string; price: number; exchange: string }[];
  recentNews: { title: string; sentiment: string; source: string }[];
  arbitrageSignals: { symbol: string; spread: number; highExchange: string; lowExchange: string }[];
}

export function gatherWorkspaceContext(
  workspace: Workspace,
  widgets: Record<string, Widget>,
  watchlists: Watchlist[],
  prices: Record<string, PriceData[]>,
  news: NewsItem[],
  arbitrageSignals: ArbitrageSignal[]
): WorkspaceContext {
  const workspaceWidgets = workspace.widgetIds
    .map((id) => widgets[id])
    .filter(Boolean);

  // Collect all symbols from visible widgets
  const symbolSet = new Set<string>();
  for (const w of workspaceWidgets) {
    if (w.settings.symbols) {
      for (const s of w.settings.symbols) symbolSet.add(s);
    }
  }

  // Get recent prices for visible symbols
  const recentPrices: WorkspaceContext['recentPrices'] = [];
  for (const sym of symbolSet) {
    const priceSources = prices[sym] || [];
    for (const p of priceSources.slice(0, 3)) {
      recentPrices.push({ symbol: p.symbol, price: p.price, exchange: p.exchange });
    }
  }

  return {
    workspace: { id: workspace.id, name: workspace.name },
    visibleWidgets: workspaceWidgets.map((w) => ({
      type: w.type,
      title: w.title,
      settings: w.settings,
    })),
    symbols: [...symbolSet],
    watchlists: watchlists.map((wl) => ({ name: wl.name, symbols: wl.symbols })),
    recentPrices,
    recentNews: news.slice(0, 10).map((n) => ({
      title: n.title,
      sentiment: n.sentiment,
      source: n.source,
    })),
    arbitrageSignals: arbitrageSignals.slice(0, 5).map((a) => ({
      symbol: a.symbol,
      spread: a.spreadPercent,
      highExchange: a.highExchange,
      lowExchange: a.lowExchange,
    })),
  };
}

export function formatContextForAI(ctx: WorkspaceContext): string {
  const lines: string[] = [];

  lines.push(`## Active Workspace: ${ctx.workspace.name}`);
  lines.push('');

  if (ctx.symbols.length) {
    lines.push(`**Tracked Symbols:** ${ctx.symbols.join(', ')}`);
  }

  if (ctx.recentPrices.length) {
    lines.push('');
    lines.push('**Current Prices:**');
    for (const p of ctx.recentPrices) {
      lines.push(`- ${p.symbol}: €${p.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })} (${p.exchange})`);
    }
  }

  if (ctx.arbitrageSignals.length) {
    lines.push('');
    lines.push('**Arbitrage Spreads:**');
    for (const a of ctx.arbitrageSignals) {
      lines.push(`- ${a.symbol}: ${a.spread.toFixed(3)}% (${a.lowExchange} → ${a.highExchange})`);
    }
  }

  if (ctx.recentNews.length) {
    lines.push('');
    lines.push('**Recent News:**');
    for (const n of ctx.recentNews) {
      lines.push(`- [${n.sentiment}] ${n.title} (${n.source})`);
    }
  }

  if (ctx.visibleWidgets.length) {
    lines.push('');
    lines.push(`**Active Widgets:** ${ctx.visibleWidgets.map((w) => w.title).join(', ')}`);
  }

  return lines.join('\n');
}
