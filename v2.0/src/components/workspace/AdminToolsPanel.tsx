'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { APP_VERSION } from '@/lib/version';

interface AdminToolsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface HealthData {
  status: string;
  version: string;
  uptime: number;
  providers: Record<string, string>;
  ai: { provider: string; configured: boolean };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        ok ? 'bg-terminal-green' : 'bg-terminal-red'
      }`}
    />
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-terminal-muted tracking-[0.2em] font-mono uppercase mb-2">
      {children}
    </div>
  );
}

export default function AdminToolsPanel({ open, onClose }: AdminToolsPanelProps) {
  const router = useRouter();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/health')
        .then((r) => r.json())
        .then(setHealth)
        .catch(() => {});
    }
  }, [open]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[380px] max-w-[calc(100vw-2rem)] bg-terminal-panel border-l border-terminal-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-terminal-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-terminal-accent text-sm font-bold tracking-[0.2em] font-mono">
                  ADMIN TOOLS
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-terminal-muted hover:text-terminal-text text-lg font-mono transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* Section A — ADMIN SESSION */}
              <section>
                <SectionHeader>ADMIN SESSION</SectionHeader>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Role</span>
                    <span className="px-2 py-0.5 bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30 rounded text-[10px] tracking-wider">
                      ADMIN
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Status</span>
                    <span className="flex items-center gap-1.5 text-terminal-green">
                      <StatusDot ok /> ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Session</span>
                    <span className="text-terminal-text">httpOnly · signed</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full mt-2 py-2 bg-terminal-red/10 text-terminal-red border border-terminal-red/30 rounded text-[10px] tracking-[0.15em] font-mono font-semibold hover:bg-terminal-red/20 disabled:opacity-50 transition-all"
                  >
                    {loggingOut ? 'LOGGING OUT...' : 'LOGOUT'}
                  </button>
                </div>
              </section>

              <div className="border-t border-terminal-border" />

              {/* Section B — SYSTEM */}
              <section>
                <SectionHeader>SYSTEM</SectionHeader>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Version</span>
                    <span className="text-terminal-text">{APP_VERSION}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Environment</span>
                    <span className="text-terminal-yellow">
                      {process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'}
                    </span>
                  </div>
                  {health && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-terminal-muted">Uptime</span>
                        <span className="text-terminal-text">
                          {formatUptime(health.uptime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-terminal-muted">Health</span>
                        <span className="flex items-center gap-1.5 text-terminal-green">
                          <StatusDot ok={health.status === 'ok'} />
                          {health.status.toUpperCase()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <div className="border-t border-terminal-border" />

              {/* Section C — PROVIDERS */}
              <section>
                <SectionHeader>PROVIDERS</SectionHeader>
                <div className="space-y-2 text-xs font-mono">
                  {health ? (
                    <>
                      {Object.entries(health.providers).map(([name, status]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between"
                        >
                          <span className="text-terminal-muted">{name}</span>
                          <span
                            className={`flex items-center gap-1.5 ${
                              status === 'reachable'
                                ? 'text-terminal-green'
                                : 'text-terminal-red'
                            }`}
                          >
                            <StatusDot ok={status === 'reachable'} />
                            {status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        <span className="text-terminal-muted">AI Provider</span>
                        <span
                          className={`flex items-center gap-1.5 ${
                            health.ai.configured
                              ? 'text-terminal-green'
                              : 'text-terminal-muted'
                          }`}
                        >
                          <StatusDot ok={health.ai.configured} />
                          {health.ai.provider.toUpperCase()}
                          {!health.ai.configured && ' (NOT SET)'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-terminal-muted animate-pulse">
                      Loading provider status...
                    </div>
                  )}
                </div>
              </section>

              <div className="border-t border-terminal-border" />

              {/* Section D — SECURITY */}
              <section>
                <SectionHeader>SECURITY</SectionHeader>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Auth Method</span>
                    <span className="text-terminal-text">PIN + bcrypt</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Session</span>
                    <span className="text-terminal-text">HMAC-SHA256</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Rate Limit</span>
                    <span className="text-terminal-text">5 attempts / 30s</span>
                  </div>
                  <div className="mt-3 p-3 bg-terminal-bg border border-terminal-border rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-terminal-yellow text-[10px]">⚠</span>
                      <span className="text-terminal-muted text-[10px] tracking-wider uppercase">
                        PIN Management
                      </span>
                    </div>
                    <p className="text-terminal-muted text-[10px] leading-relaxed">
                      PIN management via UI coming in next release. Currently managed
                      via environment variables (ADMIN_PIN_HASH, USER_PIN_HASH).
                    </p>
                  </div>
                </div>
              </section>

              <div className="border-t border-terminal-border" />

              {/* Section E — COMING NEXT */}
              <section>
                <SectionHeader>COMING NEXT</SectionHeader>
                <div className="space-y-1.5">
                  {[
                    { label: 'PIN Management UI', icon: '🔑' },
                    { label: 'Audit Logs', icon: '📋' },
                    { label: 'Provider Controls', icon: '⚙️' },
                    { label: 'Feature Flags', icon: '🚩' },
                    { label: 'Maintenance Mode', icon: '🔧' },
                    { label: 'Session Management', icon: '👤' },
                    { label: 'Workspace Defaults', icon: '📐' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 px-3 py-1.5 bg-terminal-bg/50 border border-terminal-border/50 rounded text-xs font-mono text-terminal-muted/60"
                    >
                      <span className="text-[10px]">{item.icon}</span>
                      <span>{item.label}</span>
                      <span className="ml-auto text-[9px] tracking-wider text-terminal-muted/40">
                        PLANNED
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-3 border-t border-terminal-border text-center">
              <span className="text-[10px] text-terminal-muted font-mono">
                {APP_VERSION} · ADMIN CONTROL
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
