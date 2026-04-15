'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { APP_VERSION } from '@/lib/version';
import type { Role } from '@/hooks/useSession';

interface WorkspaceHeaderProps {
  role?: Role | null;
  onAdminClick?: () => void;
}

export default function WorkspaceHeader({ role, onAdminClick }: WorkspaceHeaderProps) {
  const [now, setNow] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const date = now.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-2 bg-terminal-panel border-b border-terminal-border shrink-0"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-terminal-accent animate-pulse" />
          <span className="text-sm font-semibold text-terminal-accent tracking-wider">
            FELSWERKE TERMINAL
          </span>
        </div>
        <span className="text-[10px] text-terminal-muted">{APP_VERSION}</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-terminal-muted">
        {role === 'admin' && onAdminClick && (
          <button
            onClick={onAdminClick}
            className="px-2.5 py-1 bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30 rounded text-[10px] tracking-[0.15em] font-mono font-semibold hover:bg-terminal-accent/20 transition-all"
          >
            ADMIN TOOLS
          </button>
        )}
        <span>{date}</span>
        <span className="text-terminal-text tabular-nums">{time}</span>
      </div>
    </motion.header>
  );
}
