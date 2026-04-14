'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimeAgo } from '@/lib/utils';
import type { Alert } from '@/types';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-l-terminal-red bg-terminal-red/5',
  warning: 'border-l-terminal-yellow bg-terminal-yellow/5',
  info: 'border-l-terminal-accent bg-terminal-accent/5',
};

const SEVERITY_BADGE: Record<string, { label: string; cls: string }> = {
  critical: { label: '⚠ CRITICAL', cls: 'bg-terminal-red/20 text-terminal-red' },
  warning: { label: '● WARNING', cls: 'bg-terminal-yellow/20 text-terminal-yellow' },
  info: { label: 'ℹ INFO', cls: 'bg-terminal-accent/20 text-terminal-accent' },
};

const TYPE_ICONS: Record<string, string> = {
  price_move: '📈',
  volume_spike: '📊',
  arbitrage_spread: '↔',
  news_spike: '📰',
  fear_greed: '😱',
};

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unackCount, setUnackCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unack'>('all');

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setUnackCount(data.unacknowledged || 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  async function acknowledge(alertId: string) {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
      );
      setUnackCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }

  const displayed = filter === 'unack' ? alerts.filter((a) => !a.acknowledged) : alerts;

  return (
    <motion.div
      className="bg-terminal-panel border border-terminal-border rounded-lg flex flex-col overflow-hidden h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-terminal-muted font-semibold tracking-wider">
            🚨 ALERTS
          </span>
          {unackCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-terminal-red/20 text-terminal-red">
              {unackCount}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(['all', 'unack'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                filter === f
                  ? 'bg-terminal-accent/20 text-terminal-accent'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              {f === 'all' ? 'Alle' : 'Neu'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {displayed.length === 0 && (
          <div className="text-center py-8 text-terminal-muted text-xs">
            {alerts.length === 0
              ? 'Keine Alerts – Markt ruhig'
              : 'Alle Alerts bestätigt'}
          </div>
        )}

        <AnimatePresence>
          {displayed.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: i * 0.02 }}
              className={`px-4 py-3 border-b border-terminal-border/50 border-l-2 ${
                SEVERITY_STYLES[alert.severity] || ''
              } ${alert.acknowledged ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{TYPE_ICONS[alert.type] || '●'}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                      SEVERITY_BADGE[alert.severity]?.cls || ''
                    }`}
                  >
                    {SEVERITY_BADGE[alert.severity]?.label || alert.severity}
                  </span>
                  <span className="text-[10px] text-terminal-accent font-mono">
                    {alert.symbol}
                  </span>
                </div>
                <span className="text-[10px] text-terminal-muted shrink-0">
                  {formatTimeAgo(alert.timestamp)}
                </span>
              </div>

              <h4 className="text-xs font-medium text-terminal-text mb-1">
                {alert.title}
              </h4>

              <p className="text-[10px] text-terminal-muted leading-relaxed mb-1.5">
                {alert.explanation}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {alert.sources.map((src, j) => (
                    <span
                      key={j}
                      className="text-[9px] text-terminal-muted/70 bg-terminal-bg px-1.5 py-0.5 rounded"
                    >
                      {src}
                    </span>
                  ))}
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledge(alert.id)}
                    className="text-[10px] text-terminal-accent hover:text-terminal-text transition-colors"
                  >
                    ✓ OK
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
