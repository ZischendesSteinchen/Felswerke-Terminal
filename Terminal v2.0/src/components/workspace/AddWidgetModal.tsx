'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { getAllWidgetDefinitions } from '@/lib/widgetRegistry';
import type { WidgetDefinition } from '@/types/workspace';

const CATEGORIES = [
  { id: 'market' as const, label: 'Market' },
  { id: 'analysis' as const, label: 'Analysis' },
  { id: 'news' as const, label: 'News' },
  { id: 'tools' as const, label: 'Tools' },
];

export default function AddWidgetModal() {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WidgetDefinition['category']>('market');
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const addWidget = useWorkspaceStore((s) => s.addWidget);

  const allDefs = getAllWidgetDefinitions();
  const filteredDefs = allDefs.filter((d) => d.category === selectedCategory);

  const handleAdd = (def: WidgetDefinition) => {
    addWidget(activeWorkspaceId, def.type);
    setOpen(false);
  };

  return (
    <>
      {/* Floating Add Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-4 z-40 w-10 h-10 bg-terminal-accent text-terminal-bg rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-lg font-bold"
        title="Add Widget"
      >
        +
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-4 top-[15%] bottom-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[560px] z-50 bg-terminal-panel border border-terminal-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-terminal-border">
                <h2 className="text-sm font-semibold text-terminal-text">Add Widget</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-terminal-muted hover:text-terminal-text transition-colors text-lg"
                >
                  ×
                </button>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-1 px-5 py-2 border-b border-terminal-border">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-terminal-accent/15 text-terminal-accent'
                        : 'text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Widget List */}
              <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-3">
                {filteredDefs.map((def) => (
                  <button
                    key={def.type}
                    onClick={() => handleAdd(def)}
                    className="flex items-start gap-3 p-3 bg-terminal-bg border border-terminal-border rounded hover:border-terminal-accent/40 hover:bg-terminal-accent/5 transition-all text-left group"
                  >
                    <span className="text-xl shrink-0 mt-0.5">{def.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-terminal-text group-hover:text-terminal-accent transition-colors">
                        {def.label}
                      </div>
                      <div className="text-[10px] text-terminal-muted mt-0.5 leading-tight">
                        {def.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
