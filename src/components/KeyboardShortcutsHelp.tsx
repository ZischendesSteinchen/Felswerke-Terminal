'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Shortcut {
  keys: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: '?', description: 'Shortcut-Hilfe ein-/ausblenden' },
  { keys: '1', description: 'Chart: BTC auswählen' },
  { keys: '2', description: 'Chart: ETH auswählen' },
  { keys: 'C', description: 'Chart: Candlestick/Area umschalten' },
  { keys: 'R', description: 'Chart: nächster Zeitbereich' },
  { keys: 'I', description: 'Indikator-Menü ein-/ausblenden' },
  { keys: 'Esc', description: 'Overlays schließen' },
];

export default function KeyboardShortcutsHelp({ show, onClose }: { show: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-terminal-panel border border-terminal-border rounded-lg p-5 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-terminal-text font-semibold tracking-wider">
                ⌨ KEYBOARD SHORTCUTS
              </span>
              <button
                onClick={onClose}
                className="text-terminal-muted hover:text-terminal-text text-xs"
              >
                ESC
              </button>
            </div>
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className="text-xs text-terminal-muted">{s.description}</span>
                  <kbd className="px-2 py-0.5 text-[10px] bg-terminal-bg border border-terminal-border rounded text-terminal-accent font-mono">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
