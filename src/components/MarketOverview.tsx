'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface MarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  marketCapChange24h: number;
}

function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `€${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `€${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `€${(n / 1e6).toFixed(2)}M`;
  return `€${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
}

export default function MarketOverview() {
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const res = await fetch('/api/market', { cache: 'no-store' });
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
    const interval = setInterval(fetchData, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const stats = data
    ? [
        {
          label: 'Marktkapitalisierung',
          value: formatLargeNumber(data.totalMarketCap),
          change: data.marketCapChange24h,
        },
        {
          label: '24h Volumen',
          value: formatLargeNumber(data.totalVolume24h),
        },
        {
          label: 'BTC Dominanz',
          value: `${data.btcDominance.toFixed(1)}%`,
        },
        {
          label: 'ETH Dominanz',
          value: `${data.ethDominance.toFixed(1)}%`,
        },
        {
          label: 'Aktive Kryptos',
          value: data.activeCryptos.toLocaleString('de-DE'),
        },
      ]
    : [];

  return (
    <motion.div
      className="bg-terminal-panel border border-terminal-border rounded-lg p-3 flex flex-col gap-2 h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <span className="text-xs text-terminal-muted font-semibold tracking-wider">
        MARKTÜBERSICHT
      </span>

      {error && !data ? (
        <div className="flex-1 flex items-center justify-center text-xs text-terminal-muted/60">
          Marktdaten nicht verfügbar
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center text-xs text-terminal-muted/60">
          Lade Marktdaten...
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mt-1">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[11px] text-terminal-muted">{s.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-terminal-text font-medium">{s.value}</span>
                {s.change !== undefined && (
                  <span
                    className={`text-[10px] ${
                      s.change >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                    }`}
                  >
                    {s.change >= 0 ? '+' : ''}
                    {s.change.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Dominance bar */}
          <div className="mt-2">
            <div className="text-[9px] text-terminal-muted mb-1">Dominanz</div>
            <div className="flex h-2 rounded-full overflow-hidden bg-terminal-bg">
              <div
                className="transition-all duration-500"
                style={{
                  width: `${data.btcDominance}%`,
                  backgroundColor: '#ffaa00',
                }}
                title={`BTC ${data.btcDominance.toFixed(1)}%`}
              />
              <div
                className="transition-all duration-500"
                style={{
                  width: `${data.ethDominance}%`,
                  backgroundColor: '#8b5cf6',
                }}
                title={`ETH ${data.ethDominance.toFixed(1)}%`}
              />
              <div
                className="flex-1"
                style={{ backgroundColor: '#334155' }}
                title={`Others ${(100 - data.btcDominance - data.ethDominance).toFixed(1)}%`}
              />
            </div>
            <div className="flex justify-between text-[8px] text-terminal-muted mt-0.5">
              <span style={{ color: '#ffaa00' }}>BTC {data.btcDominance.toFixed(1)}%</span>
              <span style={{ color: '#8b5cf6' }}>ETH {data.ethDominance.toFixed(1)}%</span>
              <span>Other {(100 - data.btcDominance - data.ethDominance).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
