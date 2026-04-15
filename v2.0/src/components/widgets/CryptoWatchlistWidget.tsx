'use client';

import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import { useTerminalStore } from '@/store/useTerminalStore';
import { formatPrice, getPreferredPrice } from '@/lib/utils';

export default function CryptoWatchlistWidget({ widget }: WidgetComponentProps) {
  const symbols = widget.settings.symbols || ['BTC', 'ETH'];
  const prices = useTerminalStore((s) => s.prices);

  return (
    <div className="h-full overflow-auto p-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-terminal-muted text-[10px] uppercase">
            <th className="text-left py-1 pr-2">Symbol</th>
            <th className="text-right py-1 pr-2">Price</th>
            <th className="text-right py-1">Exchange</th>
          </tr>
        </thead>
        <tbody>
          {symbols.map((sym) => {
            const priceSources = prices[sym] || [];
            const preferred = getPreferredPrice(priceSources);
            return (
              <tr key={sym} className="border-t border-terminal-border/50 hover:bg-terminal-accent/5 transition-colors">
                <td className="py-1.5 pr-2 text-terminal-text font-medium">{sym}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-terminal-text">
                  {preferred ? `€${formatPrice(preferred.price)}` : '—'}
                </td>
                <td className="py-1.5 text-right text-terminal-muted">
                  {preferred?.exchange || '—'}
                </td>
              </tr>
            );
          })}
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
