'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTerminalStore } from '@/store/useTerminalStore';
import { getPreferredPrice } from '@/lib/utils';
import type {
  OHLCVPoint,
  BollingerBandsPoint,
  MACDPoint,
} from '@/lib/indicators';
import {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  closePrices,
} from '@/lib/indicators';

type ChartRange = '1H' | '1D' | '1W' | '1M' | '1Y' | '5Y' | 'ALL';
type ChartType = 'area' | 'candlestick';
type IndicatorId = 'SMA20' | 'SMA50' | 'EMA12' | 'EMA26' | 'RSI' | 'MACD' | 'BB';

interface IndicatorDef {
  id: IndicatorId;
  label: string;
  color: string;
  type: 'overlay' | 'panel';
}

const INDICATORS: IndicatorDef[] = [
  { id: 'SMA20', label: 'SMA 20', color: '#ffaa00', type: 'overlay' },
  { id: 'SMA50', label: 'SMA 50', color: '#ff6600', type: 'overlay' },
  { id: 'EMA12', label: 'EMA 12', color: '#00ff88', type: 'overlay' },
  { id: 'EMA26', label: 'EMA 26', color: '#ff3366', type: 'overlay' },
  { id: 'BB', label: 'Bollinger', color: '#8b5cf6', type: 'overlay' },
  { id: 'RSI', label: 'RSI 14', color: '#eab308', type: 'panel' },
  { id: 'MACD', label: 'MACD', color: '#00d4ff', type: 'panel' },
];

const rangeOptions: ChartRange[] = ['1H', '1D', '1W', '1M', '1Y', '5Y', 'ALL'];

export default function PriceChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const chartRef = useRef<any>(null);
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const overlaySeriesRef = useRef<Map<string, any>>(new Map());
  const rsiChartRef = useRef<any>(null);
  const rsiSeriesRef = useRef<any>(null);
  const macdChartRef = useRef<any>(null);
  const macdSeriesRefs = useRef<{ macd: any; signal: any; histogram: any } | null>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const fittedRangeKeyRef = useRef('');
  const lastLivePointKeyRef = useRef('');
  const priceOffsetRef = useRef(0);
  const dragStateRef = useRef({ active: false, lastY: 0 });
  const rafIdRef = useRef(0);

  const [activeSymbol, setActiveSymbol] = useState<'BTC' | 'ETH'>('BTC');
  const [activeRange, setActiveRange] = useState<ChartRange>('1D');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(new Set());
  const [historySource, setHistorySource] = useState<string | null>(null);
  const [ohlcvData, setOhlcvData] = useState<OHLCVPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  const { liveHistory, activeExchange } = useTerminalStore((s) => {
    const prices = s.prices[activeSymbol] || [];
    const primaryPrice = getPreferredPrice(prices);
    const exchange = primaryPrice?.exchange;
    return {
      activeExchange: exchange ?? null,
      liveHistory: exchange ? (s.priceHistory[`${activeSymbol}-${exchange}`] || []) : [],
    };
  });

  const toggleIndicator = useCallback((id: IndicatorId) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Computed chart data ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const deduped = new Map<number, OHLCVPoint>();
    for (const p of ohlcvData) {
      const t = Math.floor(p.time / 1000);
      deduped.set(t, { ...p, time: t });
    }
    return [...deduped.values()].sort((a, b) => a.time - b.time);
  }, [ohlcvData]);

  const closeData = useMemo(() => closePrices(chartData), [chartData]);

  const indicatorData = useMemo(() => {
    const result: {
      sma20?: ReturnType<typeof sma>;
      sma50?: ReturnType<typeof sma>;
      ema12?: ReturnType<typeof ema>;
      ema26?: ReturnType<typeof ema>;
      bb?: ReturnType<typeof bollingerBands>;
      rsi?: ReturnType<typeof rsi>;
      macd?: ReturnType<typeof macd>;
    } = {};

    if (activeIndicators.has('SMA20')) result.sma20 = sma(closeData, 20);
    if (activeIndicators.has('SMA50')) result.sma50 = sma(closeData, 50);
    if (activeIndicators.has('EMA12')) result.ema12 = ema(closeData, 12);
    if (activeIndicators.has('EMA26')) result.ema26 = ema(closeData, 26);
    if (activeIndicators.has('BB')) result.bb = bollingerBands(closeData, 20, 2);
    if (activeIndicators.has('RSI')) result.rsi = rsi(closeData, 14);
    if (activeIndicators.has('MACD')) result.macd = macd(closeData, 12, 26, 9);

    return result;
  }, [closeData, activeIndicators]);

  const liveChartPoint = useMemo(() => {
    if (historySource && activeExchange && historySource !== activeExchange) return null;
    const latest = liveHistory[liveHistory.length - 1];
    if (!latest) return null;
    return { time: Math.floor(latest.time / 1000), value: latest.value };
  }, [liveHistory, historySource, activeExchange]);

  const hasRsiPanel = activeIndicators.has('RSI');
  const hasMacdPanel = activeIndicators.has('MACD');

  // ─── Initialize main chart ────────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    async function initChart() {
      if (!containerRef.current || disposed) return;
      const lc = await import('lightweight-charts');

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        mainSeriesRef.current = null;
        volumeSeriesRef.current = null;
        overlaySeriesRef.current.clear();
      }
      if (disposed || !containerRef.current) return;

      const chart = lc.createChart(containerRef.current, {
        layout: {
          background: { type: lc.ColorType.Solid, color: '#111827' },
          textColor: '#64748b',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
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
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      // Volume histogram (behind main series)
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
        mainSeriesRef.current = null;
        volumeSeriesRef.current = null;
        overlaySeriesRef.current.clear();
      }
    };
  }, []);

  // ─── Create / swap main series when chart type changes ────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartReady) return;

    let cancelled = false;

    async function swapSeries() {
      const lc = await import('lightweight-charts');
      if (cancelled || !chart) return;

      // Remove old main series
      if (mainSeriesRef.current) {
        try { chart.removeSeries(mainSeriesRef.current); } catch { /* noop */ }
        mainSeriesRef.current = null;
      }

      if (chartType === 'candlestick') {
        mainSeriesRef.current = chart.addCandlestickSeries({
          upColor: '#00ff88',
          downColor: '#ff3366',
          borderUpColor: '#00ff88',
          borderDownColor: '#ff3366',
          wickUpColor: '#00ff88',
          wickDownColor: '#ff3366',
          autoscaleInfoProvider: (original: () => any) => {
            const res = original();
            if (res !== null && priceOffsetRef.current !== 0) {
              res.priceRange.minValue = Math.max(0, res.priceRange.minValue - priceOffsetRef.current);
              res.priceRange.maxValue -= priceOffsetRef.current;
            }
            return res;
          },
        });
      } else {
        mainSeriesRef.current = chart.addAreaSeries({
          lineColor: '#00d4ff',
          topColor: 'rgba(0, 212, 255, 0.15)',
          bottomColor: 'rgba(0, 212, 255, 0.02)',
          lineWidth: 2,
          priceLineVisible: true,
          priceLineColor: '#00d4ff',
          priceLineWidth: 1,
          priceLineStyle: lc.LineStyle.Dotted,
          autoscaleInfoProvider: (original: () => any) => {
            const res = original();
            if (res !== null && priceOffsetRef.current !== 0) {
              res.priceRange.minValue = Math.max(0, res.priceRange.minValue - priceOffsetRef.current);
              res.priceRange.maxValue -= priceOffsetRef.current;
            }
            return res;
          },
        });
      }

      // Force data re-render
      fittedRangeKeyRef.current = '';
    }

    swapSeries();
    return () => { cancelled = true; };
  }, [chartType, chartReady]);

  // ─── Vertical drag panning (navigate price range down to 0) ─────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragStateRef.current = { active: true, lastY: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.active) return;
      const deltaY = e.clientY - dragStateRef.current.lastY;
      dragStateRef.current.lastY = e.clientY;
      if (Math.abs(deltaY) < 0.5) return;

      const series = mainSeriesRef.current;
      const chart = chartRef.current;
      if (!series || !chart || !el) return;

      const topPrice = series.coordinateToPrice(0);
      const bottomPrice = series.coordinateToPrice(el.clientHeight);
      if (topPrice === null || bottomPrice === null) return;

      const pricePerPixel = Math.abs(topPrice - bottomPrice) / el.clientHeight;
      priceOffsetRef.current = priceOffsetRef.current - deltaY * pricePerPixel;

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        const s = mainSeriesRef.current;
        if (!s) return;
        s.applyOptions({
          autoscaleInfoProvider: (original: () => any) => {
            const res = original();
            if (res !== null && priceOffsetRef.current !== 0) {
              res.priceRange.minValue = Math.max(0, res.priceRange.minValue - priceOffsetRef.current);
              res.priceRange.maxValue -= priceOffsetRef.current;
            }
            return res;
          },
        });
      });
    };

    const onPointerUp = () => {
      dragStateRef.current.active = false;
    };

    const onDblClick = () => {
      priceOffsetRef.current = 0;
      const s = mainSeriesRef.current;
      if (s) {
        s.applyOptions({
          autoscaleInfoProvider: (original: () => any) => original(),
        });
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    el.addEventListener('dblclick', onDblClick);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('dblclick', onDblClick);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // ─── RSI sub-chart ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasRsiPanel) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
      }
      return;
    }

    let disposed = false;
    let resizeObs: ResizeObserver | null = null;

    async function init() {
      if (!rsiContainerRef.current || disposed) return;
      const lc = await import('lightweight-charts');
      if (disposed || !rsiContainerRef.current) return;

      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
      }

      const chart = lc.createChart(rsiContainerRef.current, {
        layout: { background: { type: lc.ColorType.Solid, color: '#111827' }, textColor: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
        grid: { vertLines: { color: '#1e293b', style: lc.LineStyle.Dotted }, horzLines: { color: '#1e293b', style: lc.LineStyle.Dotted } },
        rightPriceScale: { borderColor: '#1e293b' },
        timeScale: { visible: false },
        handleScroll: false,
        handleScale: false,
        width: rsiContainerRef.current.clientWidth,
        height: rsiContainerRef.current.clientHeight,
      });

      const series = chart.addLineSeries({
        color: '#eab308',
        lineWidth: 1,
        priceFormat: { type: 'custom', formatter: (v: number) => v.toFixed(0) },
      });
      rsiChartRef.current = chart;
      rsiSeriesRef.current = series;

      resizeObs = new ResizeObserver(() => {
        if (rsiContainerRef.current && rsiChartRef.current) {
          rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth, height: rsiContainerRef.current.clientHeight });
        }
      });
      resizeObs.observe(rsiContainerRef.current);
    }

    init();
    return () => {
      disposed = true;
      resizeObs?.disconnect();
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
      }
    };
  }, [hasRsiPanel]);

  // ─── MACD sub-chart ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMacdPanel) {
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdSeriesRefs.current = null;
      }
      return;
    }

    let disposed = false;
    let resizeObs: ResizeObserver | null = null;

    async function init() {
      if (!macdContainerRef.current || disposed) return;
      const lc = await import('lightweight-charts');
      if (disposed || !macdContainerRef.current) return;

      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdSeriesRefs.current = null;
      }

      const chart = lc.createChart(macdContainerRef.current, {
        layout: { background: { type: lc.ColorType.Solid, color: '#111827' }, textColor: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
        grid: { vertLines: { color: '#1e293b', style: lc.LineStyle.Dotted }, horzLines: { color: '#1e293b', style: lc.LineStyle.Dotted } },
        rightPriceScale: { borderColor: '#1e293b' },
        timeScale: { visible: false },
        handleScroll: false,
        handleScale: false,
        width: macdContainerRef.current.clientWidth,
        height: macdContainerRef.current.clientHeight,
      });

      const macdLine = chart.addLineSeries({ color: '#00d4ff', lineWidth: 1 });
      const signalLine = chart.addLineSeries({ color: '#ff3366', lineWidth: 1 });
      const histogram = chart.addHistogramSeries({ color: '#334155' });

      macdChartRef.current = chart;
      macdSeriesRefs.current = { macd: macdLine, signal: signalLine, histogram };

      resizeObs = new ResizeObserver(() => {
        if (macdContainerRef.current && macdChartRef.current) {
          macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth, height: macdContainerRef.current.clientHeight });
        }
      });
      resizeObs.observe(macdContainerRef.current);
    }

    init();
    return () => {
      disposed = true;
      resizeObs?.disconnect();
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdSeriesRefs.current = null;
      }
    };
  }, [hasMacdPanel]);

  // ─── Fetch history ────────────────────────────────────────────────────────────
  useEffect(() => {
    priceOffsetRef.current = 0;
    const controller = new AbortController();
    const fetchHistory = async () => {
      setIsLoading(true);
      setHistoryError(null);
      try {
        const res = await fetch(`/api/history?symbol=${activeSymbol}&range=${activeRange}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load chart history');
        setOhlcvData(Array.isArray(data.ohlcv) ? data.ohlcv : []);
        setHistorySource(data.source || null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setOhlcvData([]);
        setHistorySource(null);
        setHistoryError(error instanceof Error ? error.message : 'History unavailable');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    fetchHistory();
    return () => controller.abort();
  }, [activeSymbol, activeRange]);

  // ─── Render data to charts ────────────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    const mainSeries = mainSeriesRef.current;
    if (!chart || !mainSeries) return;

    // Main series
    if (chartType === 'candlestick') {
      const candleData = chartData.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      if (liveChartPoint && candleData.length > 0) {
        const last = candleData[candleData.length - 1];
        if (liveChartPoint.time >= last.time) {
          if (liveChartPoint.time === last.time) {
            last.close = liveChartPoint.value;
            last.high = Math.max(last.high, liveChartPoint.value);
            last.low = Math.min(last.low, liveChartPoint.value);
          } else {
            candleData.push({
              time: liveChartPoint.time,
              open: liveChartPoint.value,
              high: liveChartPoint.value,
              low: liveChartPoint.value,
              close: liveChartPoint.value,
            });
          }
        }
      }
      mainSeries.setData(candleData);
    } else {
      const areaData = chartData.map((c) => ({ time: c.time, value: c.close }));
      if (liveChartPoint && (areaData.length === 0 || areaData[areaData.length - 1].time <= liveChartPoint.time)) {
        areaData.push(liveChartPoint);
      }
      mainSeries.setData(areaData);
    }

    // Volume
    if (volumeSeriesRef.current) {
      const volumeData = chartData
        .filter((c) => c.volume > 0)
        .map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(0, 255, 136, 0.25)' : 'rgba(255, 51, 102, 0.25)',
        }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // ─── Overlay indicators ───────────────────────────────────────────────────
    // Remove stale overlay series
    for (const [key, series] of overlaySeriesRef.current) {
      if (key.startsWith('BB_') && activeIndicators.has('BB')) continue;
      if (!activeIndicators.has(key as IndicatorId)) {
        try { chart.removeSeries(series); } catch { /* noop */ }
        overlaySeriesRef.current.delete(key);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getOrCreateLine = (key: string, color: string, width = 1): any => {
      if (!overlaySeriesRef.current.has(key)) {
        const s = chart.addLineSeries({ color, lineWidth: width, priceLineVisible: false });
        overlaySeriesRef.current.set(key, s);
      }
      return overlaySeriesRef.current.get(key);
    };

    if (indicatorData.sma20) getOrCreateLine('SMA20', '#ffaa00').setData(indicatorData.sma20);
    if (indicatorData.sma50) getOrCreateLine('SMA50', '#ff6600').setData(indicatorData.sma50);
    if (indicatorData.ema12) getOrCreateLine('EMA12', '#00ff88').setData(indicatorData.ema12);
    if (indicatorData.ema26) getOrCreateLine('EMA26', '#ff3366').setData(indicatorData.ema26);

    if (indicatorData.bb) {
      getOrCreateLine('BB_upper', '#8b5cf6').setData(indicatorData.bb.map((p: BollingerBandsPoint) => ({ time: p.time, value: p.upper })));
      getOrCreateLine('BB_middle', '#8b5cf680').setData(indicatorData.bb.map((p: BollingerBandsPoint) => ({ time: p.time, value: p.middle })));
      getOrCreateLine('BB_lower', '#8b5cf6').setData(indicatorData.bb.map((p: BollingerBandsPoint) => ({ time: p.time, value: p.lower })));
    } else {
      for (const suffix of ['BB_upper', 'BB_middle', 'BB_lower']) {
        if (overlaySeriesRef.current.has(suffix)) {
          try { chart.removeSeries(overlaySeriesRef.current.get(suffix)); } catch { /* noop */ }
          overlaySeriesRef.current.delete(suffix);
        }
      }
    }

    // RSI panel
    if (rsiSeriesRef.current && indicatorData.rsi) {
      rsiSeriesRef.current.setData(indicatorData.rsi);
    }

    // MACD panel
    if (macdSeriesRefs.current && indicatorData.macd) {
      macdSeriesRefs.current.macd.setData(indicatorData.macd.map((p: MACDPoint) => ({ time: p.time, value: p.macd })));
      macdSeriesRefs.current.signal.setData(indicatorData.macd.map((p: MACDPoint) => ({ time: p.time, value: p.signal })));
      macdSeriesRefs.current.histogram.setData(
        indicatorData.macd.map((p: MACDPoint) => ({
          time: p.time,
          value: p.histogram,
          color: p.histogram >= 0 ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 51, 102, 0.5)',
        }))
      );
    }

    // Fit content on range change
    const rangeKey = `${activeSymbol}-${activeRange}-${historySource ?? 'live'}-${chartType}`;
    if (chartData.length > 0 && fittedRangeKeyRef.current !== rangeKey) {
      fittedRangeKeyRef.current = rangeKey;
      chart.timeScale().fitContent();
    }

    lastLivePointKeyRef.current = liveChartPoint ? `${liveChartPoint.time}-${liveChartPoint.value}` : '';
  }, [chartData, liveChartPoint, activeSymbol, activeRange, historySource, chartType, indicatorData, activeIndicators]);

  // ─── Live point incremental update ────────────────────────────────────────────
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series || !liveChartPoint) return;
    const liveKey = `${liveChartPoint.time}-${liveChartPoint.value}`;
    if (liveKey === lastLivePointKeyRef.current) return;

    if (chartType === 'candlestick') {
      series.update({
        time: liveChartPoint.time,
        open: liveChartPoint.value,
        high: liveChartPoint.value,
        low: liveChartPoint.value,
        close: liveChartPoint.value,
      });
    } else {
      series.update(liveChartPoint);
    }
    lastLivePointKeyRef.current = liveKey;
  }, [liveChartPoint, chartType]);

  return (
    <motion.div
      className="bg-terminal-panel border border-terminal-border rounded-lg flex flex-col overflow-hidden h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border flex-wrap gap-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-terminal-muted font-semibold tracking-wider">PRICE CHART</span>
          {(historySource || activeExchange) && (
            <span className="text-[10px] text-terminal-muted/70">Source: {historySource || activeExchange}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Chart type toggle */}
          <div className="flex gap-1">
            {([
              { type: 'area' as ChartType, icon: '▬' },
              { type: 'candlestick' as ChartType, icon: '⌗' },
            ]).map(({ type, icon }) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  chartType === type ? 'bg-terminal-accent/20 text-terminal-accent' : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title={type === 'area' ? 'Area Chart' : 'Candlestick Chart'}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Symbol selector */}
          <div className="flex gap-1">
            {(['BTC', 'ETH'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSymbol(s)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  activeSymbol === s ? 'bg-terminal-accent/20 text-terminal-accent' : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Range selector */}
          <div className="flex gap-1 flex-wrap justify-end">
            {rangeOptions.map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  activeRange === range ? 'bg-terminal-accent/20 text-terminal-accent' : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Indicators dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu((p) => !p)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                activeIndicators.size > 0 ? 'bg-terminal-accent/20 text-terminal-accent' : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              ƒ Indicators{activeIndicators.size > 0 ? ` (${activeIndicators.size})` : ''}
            </button>
            {showIndicatorMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-terminal-panel border border-terminal-border rounded-md shadow-lg min-w-[160px] py-1">
                {INDICATORS.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => toggleIndicator(ind.id)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] hover:bg-terminal-border/50 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activeIndicators.has(ind.id) ? ind.color : '#334155' }}
                    />
                    <span className={activeIndicators.has(ind.id) ? 'text-terminal-text' : 'text-terminal-muted'}>
                      {ind.label}
                    </span>
                    {ind.type === 'panel' && <span className="ml-auto text-[9px] text-terminal-muted">panel</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main chart area */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="h-full w-full" />
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="chart-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-terminal-panel/55 backdrop-blur-[1px] text-xs text-terminal-muted"
            >
              Loading {activeRange} history...
            </motion.div>
          )}
        </AnimatePresence>
        {!isLoading && chartData.length === 0 && !liveChartPoint && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-terminal-muted/60 pointer-events-none text-center px-6">
            {historyError || 'Waiting for chart data from a reachable exchange...'}
          </div>
        )}
      </div>

      {/* RSI panel */}
      {hasRsiPanel && (
        <div className="border-t border-terminal-border relative" style={{ height: 80 }}>
          <span className="absolute top-1 left-2 text-[9px] text-terminal-muted z-10">RSI 14</span>
          <div ref={rsiContainerRef} className="h-full w-full" />
        </div>
      )}

      {/* MACD panel */}
      {hasMacdPanel && (
        <div className="border-t border-terminal-border relative" style={{ height: 80 }}>
          <span className="absolute top-1 left-2 text-[9px] text-terminal-muted z-10">MACD (12, 26, 9)</span>
          <div ref={macdContainerRef} className="h-full w-full" />
        </div>
      )}
    </motion.div>
  );
}
