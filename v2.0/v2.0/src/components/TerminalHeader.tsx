'use client';

import { useState, useEffect } from 'react';
import { useTerminalStore } from '@/store/useTerminalStore';
import { motion } from 'framer-motion';

export default function TerminalHeader() {
  const isConnected = useTerminalStore((s) => s.isConnected);

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-terminal-panel">
      <div className="flex items-center gap-3">
        <motion.div
          className="text-terminal-accent font-bold text-lg tracking-wider"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          ◆ FELSWERKE TERMINAL
        </motion.div>
        <span className="text-terminal-muted text-xs">v0.1.0</span>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-terminal-green animate-pulse'
                : 'bg-terminal-red'
            }`}
          />
          <span className="text-terminal-muted">
            {isConnected ? 'LIVE' : 'DISCONNECTED'}
          </span>
        </div>
        <span className="text-terminal-muted">
          {new Date().toLocaleDateString('de-DE', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <Clock />
      </div>
    </header>
  );
}

function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('de-DE', { hour12: false }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="text-terminal-accent font-semibold tabular-nums"
      suppressHydrationWarning
    >
      {time || '--:--:--'}
    </span>
  );
}
