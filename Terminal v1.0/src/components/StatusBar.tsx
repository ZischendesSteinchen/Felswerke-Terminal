'use client';

import { useTerminalStore } from '@/store/useTerminalStore';
import { formatTime } from '@/lib/utils';

export default function StatusBar() {
  const isConnected = useTerminalStore((s) => s.isConnected);
  const lastUpdate = useTerminalStore((s) => s.lastUpdate);
  const signalCount = useTerminalStore((s) => s.arbitrageSignals.length);
  const newsCount = useTerminalStore((s) => s.news.length);

  return (
    <footer className="flex items-center justify-between px-4 py-1.5 border-t border-terminal-border bg-terminal-panel text-[10px] text-terminal-muted">
      <div className="flex items-center gap-4">
        <span>
          WS:{' '}
          {isConnected ? (
            <span className="text-terminal-green">CONNECTED</span>
          ) : (
            <span className="text-terminal-red">DISCONNECTED</span>
          )}
        </span>
        <span>
          Signals: <span className="text-terminal-accent">{signalCount}</span>
        </span>
        <span>
          News: <span className="text-terminal-accent">{newsCount}</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        {lastUpdate > 0 && <span>Last: {formatTime(lastUpdate)}</span>}
        <span>Felswerke Terminal v0.1.0</span>
      </div>
    </footer>
  );
}
