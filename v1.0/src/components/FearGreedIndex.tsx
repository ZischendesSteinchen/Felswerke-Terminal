'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface FearGreedData {
  value: number;
  classification: string;
  timestamp: number;
  history: { value: number; timestamp: number; classification: string }[];
}

function getColor(value: number): string {
  if (value <= 25) return '#ff3366';
  if (value <= 45) return '#ff6600';
  if (value <= 55) return '#ffaa00';
  if (value <= 75) return '#00ff88';
  return '#00d4ff';
}

function getGaugeRotation(value: number): number {
  return -90 + (value / 100) * 180;
}

export default function FearGreedIndex() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const res = await fetch('/api/fear-greed', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (mounted) {
          setData(json);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const value = data?.value ?? 0;
  const classification = data?.classification ?? '—';
  const color = getColor(value);

  // Recent history for sparkline (last 7 days)
  const spark = (data?.history ?? []).slice(0, 7).reverse();

  return (
    <motion.div
      className="bg-terminal-panel border border-terminal-border rounded-lg p-3 flex flex-col gap-2 h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-terminal-muted font-semibold tracking-wider">
          FEAR &amp; GREED INDEX
        </span>
        <span className="text-[10px] text-terminal-muted">Crypto</span>
      </div>

      {error && !data ? (
        <div className="flex-1 flex items-center justify-center text-xs text-terminal-muted/60">
          Index unavailable
        </div>
      ) : (
        <>
          {/* Gauge */}
          <div className="flex items-center justify-center py-1">
            <div className="relative w-28 h-16 overflow-hidden">
              {/* Arc background */}
              <svg viewBox="0 0 120 65" className="w-full h-full">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff3366" />
                    <stop offset="25%" stopColor="#ff6600" />
                    <stop offset="50%" stopColor="#ffaa00" />
                    <stop offset="75%" stopColor="#00ff88" />
                    <stop offset="100%" stopColor="#00d4ff" />
                  </linearGradient>
                </defs>
                <path
                  d="M 10 60 A 50 50 0 0 1 110 60"
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.3"
                />
                {/* Needle */}
                <g transform={`rotate(${getGaugeRotation(value)}, 60, 60)`}>
                  <line
                    x1="60"
                    y1="60"
                    x2="60"
                    y2="16"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="60" cy="60" r="3" fill={color} />
                </g>
              </svg>
            </div>
          </div>

          {/* Value */}
          <div className="text-center">
            <span className="text-2xl font-bold" style={{ color }}>
              {data ? value : '—'}
            </span>
            <div className="text-xs mt-0.5" style={{ color }}>
              {classification}
            </div>
          </div>

          {/* 7-day sparkline */}
          {spark.length > 1 && (
            <div className="mt-auto">
              <div className="text-[9px] text-terminal-muted mb-1">Last 7 days</div>
              <div className="flex items-end gap-[3px] h-6">
                {spark.map((p, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${Math.max(8, (p.value / 100) * 100)}%`,
                      backgroundColor: getColor(p.value),
                      opacity: 0.7,
                    }}
                    title={`${p.value} - ${p.classification}`}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
