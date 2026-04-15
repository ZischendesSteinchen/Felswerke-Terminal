import { create } from 'zustand';
import type { PriceData, PriceHistory, ArbitrageSignal, NewsItem, ChatMessage } from '@/types';

interface TerminalState {
  prices: Record<string, PriceData[]>;
  priceHistory: Record<string, PriceHistory[]>;
  arbitrageSignals: ArbitrageSignal[];
  arbitrageThreshold: number;
  news: NewsItem[];
  newsError: boolean;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  isConnected: boolean;
  lastUpdate: number;

  updatePrice: (data: PriceData) => void;
  setArbitrageSignals: (signals: ArbitrageSignal[]) => void;
  setArbitrageThreshold: (threshold: number) => void;
  setNews: (news: NewsItem[]) => void;
  setNewsError: (error: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  prices: {},
  priceHistory: {},
  arbitrageSignals: [],
  arbitrageThreshold: 0.5,
  news: [],
  newsError: false,
  chatMessages: [],
  chatLoading: false,
  isConnected: false,
  lastUpdate: 0,

  updatePrice: (data) =>
    set((state) => {
      const key = data.symbol;
      const historyKey = `${data.symbol}-${data.exchange}`;
      const existing = state.prices[key] || [];
      const updated = existing.filter((p) => p.exchange !== data.exchange);
      updated.push(data);

      const history = state.priceHistory[historyKey] || [];
      const newHistory = [
        ...history,
        { time: data.timestamp, value: data.price },
      ].slice(-500);

      return {
        prices: { ...state.prices, [key]: updated },
        priceHistory: { ...state.priceHistory, [historyKey]: newHistory },
        lastUpdate: Date.now(),
      };
    }),

  setArbitrageSignals: (signals) => set({ arbitrageSignals: signals }),
  setArbitrageThreshold: (threshold) => set({ arbitrageThreshold: threshold }),
  setNews: (news) => set({ news, newsError: false }),
  setNewsError: (error) => set({ newsError: error }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  setChatLoading: (loading) => set({ chatLoading: loading }),
  setConnected: (connected) => set({ isConnected: connected }),
}));
