'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { Widget } from '@/types/workspace';

export default function WidgetSettingsPanel() {
  const widgetId = useWorkspaceStore((s) => s.activeSettingsWidgetId);
  const setActiveSettingsWidget = useWorkspaceStore((s) => s.setActiveSettingsWidget);
  const widgets = useWorkspaceStore((s) => s.widgets);
  const updateWidgetSettings = useWorkspaceStore((s) => s.updateWidgetSettings);
  const renameWidget = useWorkspaceStore((s) => s.renameWidget);

  const widget: Widget | null = widgetId ? widgets[widgetId] ?? null : null;

  const close = useCallback(() => setActiveSettingsWidget(null), [setActiveSettingsWidget]);

  if (!widget) return null;

  return (
    <AnimatePresence>
      {widget && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={close}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 bottom-0 w-80 z-50 bg-terminal-panel border-l border-terminal-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
              <h3 className="text-sm font-semibold text-terminal-text">Widget Settings</h3>
              <button onClick={close} className="text-terminal-muted hover:text-terminal-text text-lg">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Title */}
              <Field label="Title">
                <input
                  value={widget.title}
                  onChange={(e) => renameWidget(widget.id, e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
                />
              </Field>

              {/* Type-specific settings */}
              <SettingsForType widget={widget} updateSettings={(s) => updateWidgetSettings(widget.id, s)} />

              {/* Info */}
              <div className="pt-3 border-t border-terminal-border text-[10px] text-terminal-muted space-y-1">
                <div>Type: {widget.type}</div>
                <div>ID: {widget.id}</div>
                <div>Created: {new Date(widget.createdAt).toLocaleString('de-DE')}</div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-terminal-muted mb-1 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function SettingsForType({
  widget,
  updateSettings,
}: {
  widget: Widget;
  updateSettings: (s: Partial<Widget['settings']>) => void;
}) {
  const { type, settings } = widget;

  // Symbols field (used by many widget types)
  const symbolsField = (
    <Field label="Symbols (comma-separated)">
      <input
        value={(settings.symbols || []).join(', ')}
        onChange={(e) => {
          const syms = e.target.value
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);
          updateSettings({ symbols: syms });
        }}
        placeholder="BTC, ETH, SOL"
        className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
      />
    </Field>
  );

  switch (type) {
    case 'market-quote':
    case 'crypto-watchlist':
    case 'top-movers':
      return symbolsField;

    case 'stock-watchlist':
      return (
        <Field label="Stock Symbols (comma-separated)">
          <input
            value={(settings.symbols || []).join(', ')}
            onChange={(e) => {
              const syms = e.target.value
                .split(',')
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean);
              updateSettings({ symbols: syms });
            }}
            placeholder="AAPL, NVDA, MSFT"
            className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
          />
        </Field>
      );

    case 'price-chart':
      return (
        <>
          {symbolsField}
          <Field label="Chart Type">
            <select
              value={settings.chartType || 'candlestick'}
              onChange={(e) => updateSettings({ chartType: e.target.value as 'area' | 'candlestick' })}
              className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
            >
              <option value="candlestick">Candlestick</option>
              <option value="area">Area</option>
            </select>
          </Field>
          <Field label="Range">
            <select
              value={settings.range || '1D'}
              onChange={(e) => updateSettings({ range: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
            >
              {['1H', '1D', '1W', '1M', '1Y', '5Y', 'ALL'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </>
      );

    case 'stock-chart':
      return (
        <>
          <Field label="Stock Symbol">
            <input
              value={(settings.symbols || ['AAPL'])[0] || ''}
              onChange={(e) => updateSettings({ symbols: [e.target.value.toUpperCase().trim()] })}
              placeholder="AAPL"
              className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
            />
          </Field>
          <Field label="Chart Type">
            <select
              value={settings.chartType || 'area'}
              onChange={(e) => updateSettings({ chartType: e.target.value as 'area' | 'candlestick' })}
              className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
            >
              <option value="area">Area</option>
              <option value="candlestick">Candlestick</option>
            </select>
          </Field>
          <Field label="Range">
            <select
              value={settings.range || '1M'}
              onChange={(e) => updateSettings({ range: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
            >
              {['1D', '1W', '1M', '3M', '1Y'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </>
      );

    case 'news-feed':
      return (
        <>
          <Field label="Search Query">
            <input
              value={settings.newsQuery || ''}
              onChange={(e) => updateSettings({ newsQuery: e.target.value })}
              placeholder="Filter news..."
              className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
            />
          </Field>
        </>
      );

    case 'alerts':
      return (
        <Field label="Severity Filter">
          <div className="flex gap-2">
            {['info', 'warning', 'critical'].map((sev) => {
              const active = (settings.severityFilter || []).includes(sev);
              return (
                <button
                  key={sev}
                  onClick={() => {
                    const current = settings.severityFilter || [];
                    const next = active ? current.filter((s) => s !== sev) : [...current, sev];
                    updateSettings({ severityFilter: next });
                  }}
                  className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                    active
                      ? 'bg-terminal-accent/15 border-terminal-accent/30 text-terminal-accent'
                      : 'border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </Field>
      );

    case 'arbitrage':
      return (
        <Field label="Threshold (%)">
          <input
            type="number"
            step="0.1"
            min="0"
            value={settings.arbThreshold ?? 0.5}
            onChange={(e) => updateSettings({ arbThreshold: parseFloat(e.target.value) || 0.5 })}
            className="w-full px-2 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50"
          />
        </Field>
      );

    case 'notes':
      return null; // Notes content is edited inline

    default:
      return (
        <p className="text-[10px] text-terminal-muted">No additional settings for this widget type.</p>
      );
  }
}
