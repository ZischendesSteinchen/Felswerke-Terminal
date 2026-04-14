'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTerminalStore } from '@/store/useTerminalStore';
import { formatCurrency, formatPercent, getPreferredPrice } from '@/lib/utils';

interface PriceWidgetProps {
  symbol: string;
  name: string;
}

export default function PriceWidget({ symbol, name }: PriceWidgetProps) {
  const prices = useTerminalStore((s) => s.prices[symbol] || []);
  const primaryPrice = getPreferredPrice(prices);
  const priceHistory = useTerminalStore(
    (s) =>
      primaryPrice ? (s.priceHistory[`${symbol}-${primaryPrice.exchange}`] || []) : []
  );
  const currentPrice = primaryPrice?.price || 0;

  const change1m = calculateChange(priceHistory, 60);
  const change5m = calculateChange(priceHistory, 300);

  return (
    <motion.div
      className="bg-terminal-panel border border-terminal-border rounded-lg p-4 h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-terminal-accent font-bold text-sm">
            {symbol}
          </span>
          <span className="text-terminal-muted text-xs">{name}</span>
        </div>
        {currentPrice > 0 && (
          <div className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
        )}
      </div>

      <div className="text-2xl font-bold mb-2 tabular-nums">
        {currentPrice > 0 ? formatCurrency(currentPrice) : '—'}
      </div>

      <div className="flex gap-3 text-xs mb-2">
        <ChangeTag label="1m" value={change1m} />
        <ChangeTag label="5m" value={change5m} />
      </div>

      <Sparkline data={priceHistory} />

      <div className="space-y-1 mt-2">
        {prices.map((p) => (
          <div
            key={p.exchange}
            className="flex justify-between text-xs text-terminal-muted"
          >
            <span>{p.exchange}</span>
            <span className="tabular-nums">{formatCurrency(p.price)}</span>
          </div>
        ))}
        {prices.length === 0 && (
          <div className="text-xs text-terminal-muted/50">
            Waiting for data...
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Sparkline({ data }: { data: { time: number; value: number }[] }) {
  const svgPath = useMemo(() => {
    if (data.length < 2) return null;
    // Use last 60 data points (~5 min at 3s interval)
    const points = data.slice(-60);
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const w = 200;
    const h = 28;
    const stepX = w / (points.length - 1);

    const coords = points.map((p, i) => ({
      x: i * stepX,
      y: h - ((p.value - min) / range) * h,
    }));

    const d = coords
      .map((c, i) => (i === 0 ? `M${c.x},${c.y}` : `L${c.x},${c.y}`))
      .join(' ');

    const isUp = values[values.length - 1] >= values[0];
    return { d, isUp };
  }, [data]);

  if (!svgPath) {
    return <div className="h-7" />;
  }

  return (
    <svg
      viewBox="0 0 200 28"
      className="w-full h-7"
      preserveAspectRatio="none"
    >
      <path
        d={svgPath.d}
        fill="none"
        stroke={svgPath.isUp ? 'var(--color-terminal-green, #22c55e)' : 'var(--color-terminal-red, #ef4444)'}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ChangeTag({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  if (value === null)
    return <span className="text-terminal-muted">{label}: —</span>;

  const color =
    value > 0
      ? 'text-terminal-green'
      : value < 0
        ? 'text-terminal-red'
        : 'text-terminal-muted';

  return (
    <span className={color}>
      {label}: {formatPercent(value)}
    </span>
  );
}

function calculateChange(
  history: { time: number; value: number }[],
  seconds: number
): number | null {
  if (history.length < 2) return null;

  const now = Date.now();
  const cutoff = now - seconds * 1000;
  const past = history.find((h) => h.time >= cutoff) || history[0];
  const current = history[history.length - 1];

  if (!past || !current || past.value === 0) return null;
  return ((current.value - past.value) / past.value) * 100;
}
