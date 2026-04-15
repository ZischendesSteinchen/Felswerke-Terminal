'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTerminalStore } from '@/store/useTerminalStore';
import { calculateArbitrage } from '@/lib/exchanges';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { ExchangePrice } from '@/types';

export default function ArbitrageMonitor() {
  const prices = useTerminalStore((s) => s.prices);
  const arbitrageSignals = useTerminalStore((s) => s.arbitrageSignals);
  const threshold = useTerminalStore((s) => s.arbitrageThreshold);
  const setArbitrageSignals = useTerminalStore((s) => s.setArbitrageSignals);
  const setArbitrageThreshold = useTerminalStore(
    (s) => s.setArbitrageThreshold
  );

  useEffect(() => {
    const allPrices: ExchangePrice[] = [];
    for (const symbolPrices of Object.values(prices)) {
      for (const p of symbolPrices) {
        allPrices.push({
          exchange: p.exchange,
          symbol: p.symbol,
          price: p.price,
          timestamp: p.timestamp,
        });
      }
    }

    if (allPrices.length > 0) {
      const signals = calculateArbitrage(allPrices, 0);
      setArbitrageSignals(signals);
    }
  }, [prices, setArbitrageSignals]);

  const activeSignals = arbitrageSignals.filter(
    (s) => s.spreadPercent >= threshold
  );
  const belowThreshold = arbitrageSignals.filter(
    (s) => s.spreadPercent < threshold
  );

  return (
    <motion.div
      className="bg-terminal-panel border border-terminal-border rounded-lg flex flex-col overflow-hidden h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
        <span className="text-xs text-terminal-muted font-semibold tracking-wider">
          ⚖ ARBITRAGE MONITOR
        </span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-terminal-muted">Threshold:</label>
          <input
            type="number"
            min={0.01}
            max={10}
            step={0.05}
            value={threshold}
            onChange={(e) =>
              setArbitrageThreshold(parseFloat(e.target.value) || 0.5)
            }
            className="w-16 bg-terminal-bg border border-terminal-border rounded px-1.5 py-0.5 text-xs text-terminal-text tabular-nums focus:outline-none focus:border-terminal-accent/50"
          />
          <span className="text-xs text-terminal-muted">%</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <AnimatePresence mode="popLayout">
          {activeSignals.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-terminal-yellow font-semibold mb-2 tracking-wider">
                ABOVE THRESHOLD
              </div>
              {activeSignals.map((signal) => (
                <SignalCard
                  key={`${signal.symbol}-active`}
                  signal={signal}
                  highlighted
                />
              ))}
            </div>
          )}

          {belowThreshold.length > 0 && (
            <div>
              <div className="text-[10px] text-terminal-muted font-semibold mb-2 tracking-wider">
                ALL PAIRS
              </div>
              {belowThreshold.map((signal) => (
                <SignalCard
                  key={`${signal.symbol}-below`}
                  signal={signal}
                  highlighted={false}
                />
              ))}
            </div>
          )}

          {arbitrageSignals.length === 0 && (
            <motion.div
              key="no-signals"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-xs space-y-2"
            >
              {Object.values(prices).some((p) => p.length > 0) ? (
                <>
                  <div className="text-terminal-yellow">
                    ⚠ Only {new Set(Object.values(prices).flat().map((p) => p.exchange)).size} exchange(s) reachable
                  </div>
                  <div className="text-terminal-muted">
                    Exchanges: {[...new Set(Object.values(prices).flat().map((p) => p.exchange))].join(', ')}
                  </div>
                  <div className="text-terminal-muted/50">
                    Arbitrage requires data from 2+ exchanges per symbol.
                    <br />
                    Some APIs may be blocked by your network.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-terminal-muted">Waiting for price data...</div>
                  <div className="text-terminal-muted/50">Connecting to exchanges...</div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SignalCard({
  signal,
  highlighted,
}: {
  signal: {
    symbol: string;
    spreadPercent: number;
    exchanges: { name: string; price: number }[];
    highExchange: string;
    lowExchange: string;
  };
  highlighted: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`mb-2 p-3 rounded border ${
        highlighted
          ? 'border-terminal-yellow/50 bg-terminal-yellow/5'
          : 'border-terminal-border bg-terminal-bg/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">{signal.symbol}</span>
        <span
          className={`text-sm font-bold tabular-nums ${
            highlighted ? 'text-terminal-yellow' : 'text-terminal-accent'
          }`}
        >
          {formatPercent(signal.spreadPercent)} spread
        </span>
      </div>
      <div className="space-y-1">
        {signal.exchanges.map((ex) => (
          <div key={ex.name} className="flex justify-between text-xs">
            <span
              className={
                ex.name === signal.highExchange
                  ? 'text-terminal-red'
                  : ex.name === signal.lowExchange
                    ? 'text-terminal-green'
                    : 'text-terminal-muted'
              }
            >
              {ex.name}
              {ex.name === signal.highExchange && ' ▲'}
              {ex.name === signal.lowExchange && ' ▼'}
            </span>
            <span className="tabular-nums text-terminal-text">
              {formatCurrency(ex.price)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
