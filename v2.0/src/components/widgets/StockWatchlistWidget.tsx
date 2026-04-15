'use client';

import { useEffect, useState, useRef } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { WidgetComponentProps } from '../workspace/WidgetRenderer';

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'NFLX',
  'INTC', 'CRM', 'ORCL', 'PYPL', 'BA', 'DIS', 'V', 'JPM', 'WMT', 'KO', 'PEP',
];

interface StockQuote {
  symbol: string;
  price: number | null;
  change: number | null;
}

export default function StockWatchlistWidget({ widget }: WidgetComponentProps) {
  const symbols: string[] = (widget.settings.symbols as string[]) || ['AAPL', 'NVDA', 'MSFT'];
  const updateWidgetSettings = useWorkspaceStore((s) => s.updateWidgetSettings);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuotes() {
      if (symbols.length === 0) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stocks?symbols=${symbols.map(encodeURIComponent).join(',')}`);
        if (!res.ok) throw new Error('Stock API error');
        const data = await res.json();
        if (!cancelled) {
          const arr: Array<{ symbol: string; price: number | null; changePercent: number | null }> =
            data.quotes || [];
          setQuotes(
            symbols.map((sym) => {
              const q = arr.find((item) => item.symbol === sym);
              return q
                ? { symbol: sym, price: q.price, change: q.changePercent }
                : { symbol: sym, price: null, change: null };
            })
          );
        }
      } catch {
        if (!cancelled) setError('Failed to fetch stock data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbols.join(',')]);

  useEffect(() => {
    if (showAdd && inputRef.current) inputRef.current.focus();
  }, [showAdd]);

  const addSymbol = (sym: string) => {
    const upper = sym.trim().toUpperCase();
    if (!upper || symbols.includes(upper)) return;
    updateWidgetSettings(widget.id, { symbols: [...symbols, upper] });
    setSearch('');
  };

  const removeSymbol = (sym: string) => {
    updateWidgetSettings(widget.id, { symbols: symbols.filter((s) => s !== sym) });
  };

  const suggestions = POPULAR_STOCKS.filter(
    (s) => !symbols.includes(s) && (search === '' || s.includes(search.toUpperCase()))
  ).slice(0, 8);

  if (loading && quotes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-muted text-xs animate-pulse">
        Loading stocks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-red text-xs">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-terminal-muted text-[10px] uppercase">
              <th className="text-left py-1 pr-2">Symbol</th>
              <th className="text-right py-1 pr-2">Price</th>
              <th className="text-right py-1 pr-1">Change</th>
              <th className="w-5"></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.symbol} className="border-t border-terminal-border/50 hover:bg-terminal-accent/5 transition-colors group">
                <td className="py-1.5 pr-2 text-terminal-text font-medium">{q.symbol}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-terminal-text">
                  {q.price != null ? `$${q.price.toFixed(2)}` : '—'}
                </td>
                <td
                  className={`py-1.5 pr-1 text-right tabular-nums ${
                    q.change == null
                      ? 'text-terminal-muted'
                      : q.change >= 0
                      ? 'text-terminal-green'
                      : 'text-terminal-red'
                  }`}
                >
                  {q.change != null ? `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)}%` : '—'}
                </td>
                <td className="py-1.5">
                  <button
                    onClick={() => removeSymbol(q.symbol)}
                    className="opacity-0 group-hover:opacity-100 text-terminal-muted hover:text-terminal-red text-[10px] transition-opacity"
                    title="Remove"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {symbols.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-terminal-muted">
                  No symbols — click + to add stocks
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add stock bar */}
      <div className="border-t border-terminal-border p-1.5 shrink-0">
        {showAdd ? (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) addSymbol(search);
                  if (e.key === 'Escape') { setShowAdd(false); setSearch(''); }
                }}
                placeholder="Ticker eingeben..."
                className="flex-1 px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50 font-mono"
              />
              <button
                onClick={() => { setShowAdd(false); setSearch(''); }}
                className="px-1.5 text-terminal-muted hover:text-terminal-text text-xs"
              >
                ×
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSymbol(s)}
                    className="px-1.5 py-0.5 text-[10px] bg-terminal-bg border border-terminal-border rounded text-terminal-muted hover:text-terminal-accent hover:border-terminal-accent/30 transition-colors font-mono"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-1 text-[10px] text-terminal-muted hover:text-terminal-accent transition-colors font-mono"
          >
            + Aktie hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}
