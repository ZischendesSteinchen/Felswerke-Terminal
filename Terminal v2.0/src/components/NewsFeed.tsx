'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTerminalStore } from '@/store/useTerminalStore';
import { formatTimeAgo } from '@/lib/utils';

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-terminal-green/20 text-terminal-green',
  negative: 'bg-terminal-red/20 text-terminal-red',
  neutral: 'bg-terminal-muted/20 text-terminal-muted',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: '▲ Bullish',
  negative: '▼ Bearish',
  neutral: '● Neutral',
};

type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral';

const FILTER_BUTTONS: { label: string; value: SentimentFilter }[] = [
  { label: 'Alle', value: 'all' },
  { label: '▲ Bull', value: 'positive' },
  { label: '▼ Bear', value: 'negative' },
  { label: '● Neutral', value: 'neutral' },
];

export default function NewsFeed() {
  const news = useTerminalStore((s) => s.news);
  const newsError = useTerminalStore((s) => s.newsError);
  const [filter, setFilter] = useState<SentimentFilter>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? news : news.filter((n) => n.sentiment === filter)),
    [news, filter]
  );

  return (
    <motion.div
      className="bg-terminal-panel border border-terminal-border rounded-lg flex flex-col overflow-hidden h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="px-4 py-2 border-b border-terminal-border flex items-center justify-between">
        <span className="text-xs text-terminal-muted font-semibold tracking-wider">
          📰 NEWS FEED
        </span>
        <div className="flex gap-1">
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filter === btn.value
                  ? 'bg-terminal-accent/20 text-terminal-accent'
                  : 'text-terminal-muted/60 hover:text-terminal-muted'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {news.length === 0 && !newsError && (
          <div className="text-center py-8 text-terminal-muted text-xs">
            Loading news...
          </div>
        )}

        {news.length === 0 && newsError && (
          <div className="text-center py-6 text-xs space-y-2">
            <div className="text-terminal-yellow">⚠ News APIs unreachable</div>
            <div className="text-terminal-muted/70">
              CryptoCompare and CoinGecko are blocked
              <br />
              by your network/firewall.
            </div>
            <div className="text-terminal-muted/50 text-[10px]">
              Will retry automatically every 2 minutes.
            </div>
          </div>
        )}

        {filtered.length === 0 && news.length > 0 && (
          <div className="text-center py-8 text-terminal-muted text-xs">
            No {filter} news found.
          </div>
        )}

        {filtered.length > 0 && (
          <AnimatePresence>
            {filtered.map((item, i) => (
              <motion.a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="block px-4 py-3 border-b border-terminal-border/50 hover:bg-terminal-bg/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      SENTIMENT_COLORS[item.sentiment]
                    }`}
                  >
                    {SENTIMENT_LABELS[item.sentiment]}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-terminal-text leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-terminal-muted">
                      <span>{item.source}</span>
                      <span>·</span>
                      <span>{formatTimeAgo(item.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
