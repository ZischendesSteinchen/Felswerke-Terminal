'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { WidgetComponentProps } from '../workspace/WidgetRenderer';

type StockRange = '1D' | '1W' | '1M' | '3M' | '1Y';
type ChartType = 'area' | 'candlestick';

interface OHLCVPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const RANGE_OPTIONS: StockRange[] = ['1D', '1W', '1M', '3M', '1Y'];

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD'];

export default function StockChartWidget({ widget }: WidgetComponentProps) {
  const symbol = ((widget.settings.symbols as string[] | undefined)?.[0]) || 'AAPL';
  const range = ((widget.settings.range as string) || '1M') as StockRange;
  const chartType = ((widget.settings.chartType as string) || 'area') as ChartType;

  const updateWidgetSettings = useWorkspaceStore((s) => s.updateWidgetSettings);

  const containerRef = useRef<HTMLDivElement>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const [data, setData] = useState<OHLCVPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/stock-history?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json.error && (!json.points || json.points.length === 0)) {
          setError(json.error);
        } else {
          setData(json.points || []);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Fehler beim Laden der Kursdaten');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol, range]);

  // ─── Initialize chart ───────────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    async function initChart() {
      if (!containerRef.current || disposed) return;
      const lc = await import('lightweight-charts');

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
      }
      if (disposed || !containerRef.current) return;

      const chart = lc.createChart(containerRef.current, {
        layout: {
          background: { type: lc.ColorType.Solid, color: '#111827' },
          textColor: '#64748b',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: '#1e293b', style: lc.LineStyle.Dotted },
          horzLines: { color: '#1e293b', style: lc.LineStyle.Dotted },
        },
        crosshair: {
          vertLine: { color: '#00d4ff', width: 1, style: lc.LineStyle.Dashed },
          horzLine: { color: '#00d4ff', width: 1, style: lc.LineStyle.Dashed },
        },
        rightPriceScale: { borderColor: '#1e293b' },
        timeScale: { borderColor: '#1e293b', timeVisible: true, secondsVisible: false },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries;

      chartRef.current = chart;
      setChartReady(true);

      resizeObserver = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    initChart();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      setChartReady(false);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
      }
    };
  }, []);

  // ─── Create / swap series when chart type changes ───────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartReady) return;

    let cancelled = false;

    async function swapSeries() {
      await import('lightweight-charts');
      if (cancelled || !chart) return;

      if (seriesRef.current) {
        try { chart.removeSeries(seriesRef.current); } catch { /* noop */ }
        seriesRef.current = null;
      }

      if (chartType === 'candlestick') {
        seriesRef.current = chart.addCandlestickSeries({
          upColor: '#00ff88',
          downColor: '#ff3366',
          borderUpColor: '#00ff88',
          borderDownColor: '#ff3366',
          wickUpColor: '#00ff88',
          wickDownColor: '#ff3366',
        });
      } else {
        seriesRef.current = chart.addAreaSeries({
          lineColor: '#00d4ff',
          topColor: 'rgba(0, 212, 255, 0.25)',
          bottomColor: 'rgba(0, 212, 255, 0.02)',
          lineWidth: 2,
        });
      }
    }

    swapSeries();
    return () => { cancelled = true; };
  }, [chartType, chartReady]);

  // ─── Update data on series ──────────────────────────────────────────────────
  useEffect(() => {
    if (!chartReady || !seriesRef.current || data.length === 0) return;

    const formatted = data.map((p) => ({
      time: p.time as unknown as import('lightweight-charts').UTCTimestamp,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      value: p.close, // for area series
    }));

    seriesRef.current.setData(formatted);

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(
        data.map((p) => ({
          time: p.time as unknown as import('lightweight-charts').UTCTimestamp,
          value: p.volume,
          color: p.close >= p.open ? 'rgba(0,255,136,0.15)' : 'rgba(255,51,102,0.15)',
        }))
      );
    }

    chartRef.current?.timeScale().fitContent();
  }, [data, chartReady, chartType]);

  // ─── Price summary ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (data.length === 0) return null;
    const first = data[0];
    const last = data[data.length - 1];
    const change = last.close - first.open;
    const changePct = (change / first.open) * 100;
    return { price: last.close, change, changePct };
  }, [data]);

  const setSymbol = useCallback(
    (sym: string) => {
      const upper = sym.trim().toUpperCase();
      if (upper) {
        updateWidgetSettings(widget.id, { symbols: [upper] });
        setShowSymbolPicker(false);
        setSymbolSearch('');
      }
    },
    [updateWidgetSettings, widget.id]
  );

  useEffect(() => {
    if (showSymbolPicker && inputRef.current) inputRef.current.focus();
  }, [showSymbolPicker]);

  const filteredSymbols = POPULAR_SYMBOLS.filter(
    (s) => s !== symbol && (symbolSearch === '' || s.includes(symbolSearch.toUpperCase()))
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-terminal-border shrink-0 flex-wrap">
        {/* Symbol selector */}
        <div className="relative">
          <button
            onClick={() => setShowSymbolPicker(!showSymbolPicker)}
            className="px-1.5 py-0.5 text-xs font-bold text-terminal-accent hover:bg-terminal-accent/10 rounded transition-colors font-mono"
          >
            {symbol} ▾
          </button>
          {showSymbolPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-terminal-panel border border-terminal-border rounded shadow-xl p-2 w-48">
              <input
                ref={inputRef}
                value={symbolSearch}
                onChange={(e) => setSymbolSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && symbolSearch.trim()) setSymbol(symbolSearch);
                  if (e.key === 'Escape') { setShowSymbolPicker(false); setSymbolSearch(''); }
                }}
                placeholder="Ticker eingeben..."
                className="w-full px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text outline-none focus:border-terminal-accent/50 font-mono mb-1.5"
              />
              <div className="flex flex-wrap gap-1">
                {filteredSymbols.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSymbol(s)}
                    className="px-1.5 py-0.5 text-[10px] bg-terminal-bg border border-terminal-border rounded text-terminal-muted hover:text-terminal-accent hover:border-terminal-accent/30 transition-colors font-mono"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Price summary */}
        {summary && (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-terminal-text">${summary.price.toFixed(2)}</span>
            <span className={summary.change >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
              {summary.change >= 0 ? '+' : ''}{summary.changePct.toFixed(2)}%
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Chart type toggle */}
        <div className="flex bg-terminal-bg rounded overflow-hidden border border-terminal-border">
          {(['area', 'candlestick'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateWidgetSettings(widget.id, { chartType: t })}
              className={`px-1.5 py-0.5 text-[10px] transition-colors ${
                chartType === t
                  ? 'bg-terminal-accent/15 text-terminal-accent'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              {t === 'area' ? '▁▂▃' : '┃┃'}
            </button>
          ))}
        </div>

        {/* Range selector */}
        <div className="flex bg-terminal-bg rounded overflow-hidden border border-terminal-border">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => updateWidgetSettings(widget.id, { range: r })}
              className={`px-1.5 py-0.5 text-[10px] transition-colors ${
                range === r
                  ? 'bg-terminal-accent/15 text-terminal-accent'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-terminal-panel/80 z-10">
            <span className="text-terminal-muted text-xs animate-pulse font-mono">Lade {symbol}...</span>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-terminal-red text-xs font-mono">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
