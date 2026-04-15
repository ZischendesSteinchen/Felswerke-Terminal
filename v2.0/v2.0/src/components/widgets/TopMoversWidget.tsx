'use client';

import { useEffect, useState } from 'react';
import type { WidgetComponentProps } from '../workspace/WidgetRenderer';

interface Mover {
  id: string;
  symbol: string;
  name: string;
  change24h: number;
  price: number;
}

export default function TopMoversWidget({ widget }: WidgetComponentProps) {
  void widget;
  const [movers, setMovers] = useState<Mover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchMovers() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h',
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const mapped: Mover[] = data.map((coin: Record<string, unknown>) => ({
          id: coin.id as string,
          symbol: (coin.symbol as string).toUpperCase(),
          name: coin.name as string,
          change24h: (coin.price_change_percentage_24h as number) || 0,
          price: (coin.current_price as number) || 0,
        }));

        // Sort by absolute change
        mapped.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
        setMovers(mapped.slice(0, 10));
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMovers();
    const interval = setInterval(fetchMovers, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && movers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-muted text-xs animate-pulse">
        Loading top movers...
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2">
      <div className="space-y-1">
        {movers.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-terminal-accent/5 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-terminal-text">{m.symbol}</span>
              <span className="text-[10px] text-terminal-muted truncate">{m.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs tabular-nums text-terminal-text">
                €{m.price >= 1 ? m.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : m.price.toFixed(4)}
              </span>
              <span
                className={`text-xs tabular-nums font-medium ${
                  m.change24h >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                }`}
              >
                {m.change24h >= 0 ? '+' : ''}
                {m.change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
