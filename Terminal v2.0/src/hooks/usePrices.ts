'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTerminalStore } from '@/store/useTerminalStore';
import type { PriceData } from '@/types';

const BINANCE_WS_URL =
  'wss://stream.binance.com:9443/stream?streams=btceur@ticker/etheur@ticker';
const POLL_INTERVAL_MS = 3000;

export function usePrices() {
  const updatePrice = useTerminalStore((s) => s.updatePrice);
  const setConnected = useTerminalStore((s) => s.setConnected);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(BINANCE_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const data = msg.data;
          if (!data?.s || !data?.c) return;

          const symbol = data.s === 'BTCEUR' ? 'BTC' : 'ETH';
          const price = parseFloat(data.c);

          if (isNaN(price) || price <= 0) return;

          const priceData: PriceData = {
            symbol,
            price,
            exchange: 'Binance',
            timestamp: Date.now(),
          };

          updatePrice(priceData);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setConnected(false);
      reconnectRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, [updatePrice, setConnected]);

  const pollOtherExchanges = useCallback(async () => {
    try {
      const res = await fetch('/api/prices', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      const wsConnected = wsRef.current?.readyState === WebSocket.OPEN;

      for (const p of data.prices) {
        // Skip Binance REST data only when WebSocket is connected (WS is faster)
        if (p.exchange === 'Binance' && wsConnected) continue;
        updatePrice({
          symbol: p.symbol,
          price: p.price,
          exchange: p.exchange,
          timestamp: p.timestamp,
        });
      }
    } catch {
      // silently fail
    }
  }, [updatePrice]);

  useEffect(() => {
    connectWebSocket();
    pollOtherExchanges();
    // Poll frequently so REST-only mode remains responsive when WS is blocked.
    pollRef.current = setInterval(pollOtherExchanges, POLL_INTERVAL_MS);

    return () => {
      wsRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connectWebSocket, pollOtherExchanges]);
}
