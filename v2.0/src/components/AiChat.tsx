'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTerminalStore } from '@/store/useTerminalStore';
import { generateId, formatCurrency, formatTime } from '@/lib/utils';
import type { ChatMessage, Citation } from '@/types';

export default function AiChat({ workspaceContext }: { workspaceContext?: string }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessages = useTerminalStore((s) => s.chatMessages);
  const addChatMessage = useTerminalStore((s) => s.addChatMessage);
  const chatLoading = useTerminalStore((s) => s.chatLoading);
  const setChatLoading = useTerminalStore((s) => s.setChatLoading);
  const prices = useTerminalStore((s) => s.prices);
  const arbitrageSignals = useTerminalStore((s) => s.arbitrageSignals);
  const news = useTerminalStore((s) => s.news);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function handleSend(overrideMessage?: string) {
    const trimmed = (overrideMessage ?? input).trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    addChatMessage(userMsg);
    setInput('');
    setChatLoading(true);

    try {
      const context = {
        workspaceContext: workspaceContext || null,
        prices: Object.entries(prices).map(([symbol, exPrices]) => ({
          symbol,
          exchanges: exPrices.map((p) => ({
            exchange: p.exchange,
            price: p.price,
          })),
        })),
        arbitrage: arbitrageSignals.map((s) => ({
          symbol: s.symbol,
          spread: s.spreadPercent.toFixed(3) + '%',
          high: `${s.highExchange} ${formatCurrency(s.highPrice)}`,
          low: `${s.lowExchange} ${formatCurrency(s.lowPrice)}`,
        })),
        recentNews: news.slice(0, 5).map((n) => ({
          title: n.title,
          sentiment: n.sentiment,
          source: n.source,
        })),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, context }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response || data.error || 'No response received.',
        timestamp: Date.now(),
        citations: data.citations || undefined,
        followUps: data.followUps || undefined,
      };

      addChatMessage(assistantMsg);
    } catch {
      addChatMessage({
        id: generateId(),
        role: 'assistant',
        content: 'Error: Failed to reach AI assistant. Check your API key configuration.',
        timestamp: Date.now(),
      });
    } finally {
      setChatLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <motion.div
      className="bg-terminal-panel border border-terminal-border rounded-lg flex flex-col overflow-hidden h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="px-4 py-2 border-b border-terminal-border">
        <span className="text-xs text-terminal-muted font-semibold tracking-wider">
          🤖 AI ASSISTANT
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3 min-h-0">
        {chatMessages.length === 0 && (
          <div className="text-center py-6 text-terminal-muted text-xs">
            Ask about market conditions, arbitrage signals, or news sentiment.
            <br />
            <span className="text-terminal-accent/50">
              Try: &quot;What is happening with BTC?&quot;
            </span>
          </div>
        )}

        <AnimatePresence>
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-terminal-accent/15 text-terminal-text'
                    : 'bg-terminal-bg border border-terminal-border text-terminal-text'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.citations && msg.citations.length > 0 && (
                  <CitationList citations={msg.citations} />
                )}

                <div className="text-[10px] text-terminal-muted mt-1">
                  {formatTime(msg.timestamp)}
                </div>

                {msg.followUps && msg.followUps.length > 0 && (
                  <FollowUpButtons
                    followUps={msg.followUps}
                    onSelect={(q) => handleSend(q)}
                    disabled={chatLoading}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {chatLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-terminal-accent text-xs pl-1"
          >
            <span className="animate-pulse">●</span>
            <span
              className="animate-pulse"
              style={{ animationDelay: '0.2s' }}
            >
              ●
            </span>
            <span
              className="animate-pulse"
              style={{ animationDelay: '0.4s' }}
            >
              ●
            </span>
            <span className="text-terminal-muted ml-1">Analyzing...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-terminal-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI assistant..."
            className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs text-terminal-text placeholder-terminal-muted/50 focus:outline-none focus:border-terminal-accent/50 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={chatLoading || !input.trim()}
            className="px-4 py-2 bg-terminal-accent/20 text-terminal-accent text-xs font-semibold rounded border border-terminal-accent/30 hover:bg-terminal-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            SEND
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <div className="mt-1.5 pt-1.5 border-t border-terminal-border/30">
      <span className="text-[10px] text-terminal-muted/70 font-semibold">
        Sources:
      </span>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {citations.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-terminal-accent/10 text-[10px] text-terminal-accent/80"
            title={`${c.endpoint} — ${new Date(c.retrievedAt).toLocaleTimeString()}`}
          >
            📡 {c.source}
          </span>
        ))}
      </div>
    </div>
  );
}

function FollowUpButtons({
  followUps,
  onSelect,
  disabled,
}: {
  followUps: string[];
  onSelect: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {followUps.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="px-2 py-1 rounded text-[10px] bg-terminal-accent/10 text-terminal-accent/80 border border-terminal-accent/20 hover:bg-terminal-accent/20 disabled:opacity-30 transition-colors text-left"
        >
          → {q}
        </button>
      ))}
    </div>
  );
}
