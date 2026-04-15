'use client';

import { useEffect, useState } from 'react';
import type { WidgetComponentProps } from '../workspace/WidgetRenderer';

interface StockQuote {
  symbol: string;
  price: number | null;
  change: number | null;
}

export default function StockWatchlistWidget({ widget }: WidgetComponentProps) {
  const symbols = widget.settings.symbols || ['AAPL', 'NVDA', 'MSFT'];
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuotes() {
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
    <div className="h-full overflow-auto p-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-terminal-muted text-[10px] uppercase">
            <th className="text-left py-1 pr-2">Symbol</th>
            <th className="text-right py-1 pr-2">Price</th>
            <th className="text-right py-1">Change</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.symbol} className="border-t border-terminal-border/50 hover:bg-terminal-accent/5 transition-colors">
              <td className="py-1.5 pr-2 text-terminal-text font-medium">{q.symbol}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-terminal-text">
                {q.price != null ? `$${q.price.toFixed(2)}` : '—'}
              </td>
              <td
                className={`py-1.5 text-right tabular-nums ${
                  q.change == null
                    ? 'text-terminal-muted'
                    : q.change >= 0
                    ? 'text-terminal-green'
                    : 'text-terminal-red'
                }`}
              >
                {q.change != null ? `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)}%` : '—'}
              </td>
            </tr>
          ))}
          {symbols.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-terminal-muted">
                No symbols configured
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
