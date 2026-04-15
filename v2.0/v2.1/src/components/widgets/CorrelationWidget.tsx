'use client';

import { useEffect, useState, useMemo } from 'react';
import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

interface ClosingData {
  symbol: string;
  closes: number[];
}

export default function CorrelationWidget({ widget }: WidgetComponentProps) {
  const updateWidgetSettings = useWorkspaceStore((s) => s.updateWidgetSettings);
  const symbols: string[] = (widget.settings.correlationSymbols as string[]) || ['BTC', 'ETH', 'SOL'];

  const [data, setData] = useState<ClosingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState(symbols.join(', '));

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      const results: ClosingData[] = [];

      for (const sym of symbols) {
        try {
          const res = await fetch(`/api/history?symbol=${sym}&range=1M`);
          if (!res.ok) continue;
          const json = await res.json();
          const closes = (json.data || []).map((d: { close: number }) => d.close);
          if (closes.length > 0) {
            results.push({ symbol: sym, closes });
          }
        } catch {
          // skip this symbol
        }
      }

      if (!cancelled) {
        setData(results);
        setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [symbols.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute Pearson correlation between two arrays of numbers
  const correlationMatrix = useMemo(() => {
    if (data.length < 2) return null;

    // Align all series to the same length (shortest)
    const minLen = Math.min(...data.map((d) => d.closes.length));
    const aligned = data.map((d) => d.closes.slice(-minLen));

    const n = data.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (j > i) {
          matrix[i][j] = pearson(aligned[i], aligned[j]);
          matrix[j][i] = matrix[i][j];
        }
      }
    }

    return matrix;
  }, [data]);

  const handleSaveSymbols = () => {
    const syms = editValue
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (syms.length >= 2) {
      updateWidgetSettings(widget.id, { correlationSymbols: syms });
    }
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-muted text-xs animate-pulse">
        Computing correlations...
      </div>
    );
  }

  if (!correlationMatrix || data.length < 2) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-terminal-muted text-xs gap-2 p-4">
        <span>Need at least 2 symbols with price data.</span>
        <button
          onClick={() => setEditMode(true)}
          className="text-terminal-accent hover:underline text-[10px]"
        >
          Configure Symbols
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-2 text-xs">
      {/* Header with edit */}
      <div className="flex items-center justify-between mb-2 px-1">
        {editMode ? (
          <div className="flex gap-1 flex-1">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSymbols()}
              className="flex-1 px-2 py-1 bg-terminal-bg border border-terminal-border rounded text-terminal-text text-xs outline-none focus:border-terminal-accent/50"
              placeholder="BTC, ETH, SOL"
            />
            <button
              onClick={handleSaveSymbols}
              className="px-2 py-1 text-[10px] text-terminal-accent border border-terminal-accent/30 rounded hover:bg-terminal-accent/10"
            >
              OK
            </button>
          </div>
        ) : (
          <>
            <span className="text-terminal-muted">30D Pearson Correlation</span>
            <button
              onClick={() => { setEditMode(true); setEditValue(symbols.join(', ')); }}
              className="text-[10px] text-terminal-accent hover:underline"
            >
              Edit
            </button>
          </>
        )}
      </div>

      {/* Matrix */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-terminal-muted text-left" />
              {data.map((d) => (
                <th key={d.symbol} className="p-1 text-terminal-text font-medium text-center">
                  {d.symbol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.symbol}>
                <td className="p-1 text-terminal-text font-medium">{row.symbol}</td>
                {data.map((_, j) => {
                  const val = correlationMatrix[i][j];
                  return (
                    <td key={j} className="p-1 text-center">
                      <div
                        className="rounded px-1 py-0.5 tabular-nums font-medium"
                        style={{
                          backgroundColor: corrColor(val),
                          color: Math.abs(val) > 0.5 ? '#0a0e17' : '#e2e8f0',
                        }}
                      >
                        {val.toFixed(2)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-terminal-muted">
        <span className="inline-block w-3 h-3 rounded" style={{ background: '#ff3366' }} /> -1.0
        <span className="inline-block w-3 h-3 rounded" style={{ background: '#1e293b' }} /> 0.0
        <span className="inline-block w-3 h-3 rounded" style={{ background: '#00ff88' }} /> +1.0
      </div>
    </div>
  );
}

/** Pearson correlation coefficient */
function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;

  let sumA = 0, sumB = 0, sumA2 = 0, sumB2 = 0, sumAB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
    sumAB += a[i] * b[i];
  }

  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/** Map correlation value to color: -1 → red, 0 → border, +1 → green */
function corrColor(val: number): string {
  if (val >= 0) {
    const g = Math.round(val * 255);
    return `rgba(0, ${g}, ${Math.round(g * 0.53)}, ${0.15 + val * 0.6})`;
  } else {
    const r = Math.round(-val * 255);
    return `rgba(${r}, ${Math.round(r * 0.2)}, ${Math.round(r * 0.4)}, ${0.15 + -val * 0.6})`;
  }
}
