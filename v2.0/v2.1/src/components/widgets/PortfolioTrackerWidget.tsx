'use client';

import { useState } from 'react';
import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTerminalStore } from '@/store/useTerminalStore';

interface Position {
  symbol: string;
  amount: number;
  avgPrice: number;
}

export default function PortfolioTrackerWidget({ widget }: WidgetComponentProps) {
  const updateWidgetSettings = useWorkspaceStore((s) => s.updateWidgetSettings);
  const prices = useTerminalStore((s) => s.prices);

  const positions: Position[] = (widget.settings.positions as Position[]) || [];

  const [addMode, setAddMode] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newAvgPrice, setNewAvgPrice] = useState('');

  const savePositions = (next: Position[]) => {
    updateWidgetSettings(widget.id, { positions: next });
  };

  const handleAdd = () => {
    const symbol = newSymbol.trim().toUpperCase();
    const amount = parseFloat(newAmount);
    const avgPrice = parseFloat(newAvgPrice);
    if (!symbol || isNaN(amount) || isNaN(avgPrice) || amount <= 0 || avgPrice <= 0) return;

    savePositions([...positions, { symbol, amount, avgPrice }]);
    setNewSymbol('');
    setNewAmount('');
    setNewAvgPrice('');
    setAddMode(false);
  };

  const handleRemove = (index: number) => {
    savePositions(positions.filter((_, i) => i !== index));
  };

  // Get current price for a symbol (best available from any exchange)
  const getCurrentPrice = (symbol: string): number | null => {
    const entries = prices[symbol];
    if (!entries || entries.length === 0) return null;
    // Take the latest price
    return entries.reduce((best, p) => (p.price > best ? p.price : best), 0);
  };

  // Calculate totals
  let totalValue = 0;
  let totalCost = 0;
  const rows = positions.map((pos) => {
    const current = getCurrentPrice(pos.symbol);
    const cost = pos.amount * pos.avgPrice;
    const value = current !== null ? pos.amount * current : null;
    const pnl = value !== null ? value - cost : null;
    const pnlPct = pnl !== null && cost > 0 ? (pnl / cost) * 100 : null;

    if (value !== null) totalValue += value;
    totalCost += cost;

    return { ...pos, current, cost, value, pnl, pnlPct };
  });

  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const fmt = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="h-full flex flex-col overflow-hidden p-2 text-xs">
      {/* Summary bar */}
      {positions.length > 0 && (
        <div className="flex items-center justify-between px-2 py-1.5 mb-2 rounded bg-terminal-bg border border-terminal-border">
          <div>
            <span className="text-terminal-muted">Value: </span>
            <span className="text-terminal-text font-medium">€{fmt(totalValue)}</span>
          </div>
          <div>
            <span className="text-terminal-muted">PnL: </span>
            <span
              className={`font-medium ${
                totalPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'
              }`}
            >
              {totalPnl >= 0 ? '+' : ''}€{fmt(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}
              {totalPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      {/* Positions list */}
      <div className="flex-1 overflow-auto min-h-0">
        {positions.length === 0 && !addMode && (
          <div className="h-full flex items-center justify-center text-terminal-muted">
            No positions yet. Click + to add.
          </div>
        )}

        <div className="space-y-1">
          {rows.map((row, i) => (
            <div
              key={`${row.symbol}-${i}`}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-terminal-accent/5 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-terminal-text">{row.symbol}</span>
                <span className="text-terminal-muted">
                  {row.amount} × €{fmt(row.avgPrice)}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {row.current !== null ? (
                  <>
                    <span className="tabular-nums text-terminal-text">€{fmt(row.value!)}</span>
                    <span
                      className={`tabular-nums font-medium ${
                        row.pnl! >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                      }`}
                    >
                      {row.pnl! >= 0 ? '+' : ''}
                      {row.pnlPct!.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span className="text-terminal-muted">no price</span>
                )}
                <button
                  onClick={() => handleRemove(i)}
                  className="opacity-0 group-hover:opacity-100 text-terminal-red hover:text-terminal-red/80 transition-opacity"
                  title="Remove position"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {addMode && (
          <div className="mt-2 p-2 rounded border border-terminal-border bg-terminal-bg space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol"
                className="px-2 py-1 bg-transparent border border-terminal-border rounded text-terminal-text text-xs outline-none focus:border-terminal-accent/50"
              />
              <input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Amount"
                type="number"
                step="any"
                min="0"
                className="px-2 py-1 bg-transparent border border-terminal-border rounded text-terminal-text text-xs outline-none focus:border-terminal-accent/50"
              />
              <input
                value={newAvgPrice}
                onChange={(e) => setNewAvgPrice(e.target.value)}
                placeholder="Avg Price €"
                type="number"
                step="any"
                min="0"
                className="px-2 py-1 bg-transparent border border-terminal-border rounded text-terminal-text text-xs outline-none focus:border-terminal-accent/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-3 py-1 text-[10px] bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30 rounded hover:bg-terminal-accent/20 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setAddMode(false)}
                className="px-3 py-1 text-[10px] text-terminal-muted border border-terminal-border rounded hover:bg-terminal-accent/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add button */}
      {!addMode && (
        <button
          onClick={() => setAddMode(true)}
          className="mt-2 w-full py-1.5 text-[10px] text-terminal-accent border border-terminal-accent/20 rounded hover:bg-terminal-accent/10 transition-colors"
        >
          + Add Position
        </button>
      )}
    </div>
  );
}
