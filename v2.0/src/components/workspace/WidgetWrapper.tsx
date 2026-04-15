'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { Widget } from '@/types/workspace';
import WidgetRenderer from './WidgetRenderer';
import WidgetErrorBoundary from './WidgetErrorBoundary';

interface WidgetWrapperProps {
  widget: Widget;
}

export default function WidgetWrapper({ widget }: WidgetWrapperProps) {
  const removeWidget = useWorkspaceStore((s) => s.removeWidget);
  const setActiveSettingsWidget = useWorkspaceStore((s) => s.setActiveSettingsWidget);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const openSettings = () => {
    setActiveSettingsWidget(widget.id);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      removeWidget(widget.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col bg-terminal-panel border border-terminal-border rounded-md overflow-hidden group"
    >
      {/* Widget header - drag handle */}
      <div className="widget-drag-handle flex items-center justify-between px-3 py-1.5 bg-terminal-panel border-b border-terminal-border cursor-grab active:cursor-grabbing shrink-0">
        <span className="text-[11px] font-medium text-terminal-muted truncate select-none">
          {widget.title}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={openSettings}
            className="p-0.5 text-terminal-muted hover:text-terminal-accent transition-colors"
            title="Settings"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.068 0a1 1 0 0 0-.988.837L5.832 2.42a5.994 5.994 0 0 0-1.386.8L3.024 2.7a1 1 0 0 0-1.18.374l-.932 1.614a1 1 0 0 0 .192 1.21l1.422 1.317a6.061 6.061 0 0 0 0 1.57L1.104 10.1a1 1 0 0 0-.192 1.21l.932 1.615a1 1 0 0 0 1.18.374l1.422-.52a5.994 5.994 0 0 0 1.386.8l.248 1.583A1 1 0 0 0 7.068 16h1.864a1 1 0 0 0 .988-.837l.248-1.584a5.994 5.994 0 0 0 1.386-.8l1.422.52a1 1 0 0 0 1.18-.374l.932-1.614a1 1 0 0 0-.192-1.21l-1.422-1.317a6.061 6.061 0 0 0 0-1.57l1.422-1.317a1 1 0 0 0 .192-1.21l-.932-1.614a1 1 0 0 0-1.18-.374l-1.422.52a5.994 5.994 0 0 0-1.386-.8L9.92.836A1 1 0 0 0 8.932 0H7.068ZM8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-0.5 text-terminal-muted hover:text-terminal-text transition-colors"
              title="More"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM8 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM8 11a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/>
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-terminal-panel border border-terminal-border rounded shadow-xl py-1 min-w-[120px]">
                <button
                  onClick={openSettings}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-terminal-text hover:bg-terminal-accent/10 transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    useWorkspaceStore.getState().duplicateWidget(widget.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-terminal-text hover:bg-terminal-accent/10 transition-colors"
                >
                  Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-terminal-red hover:bg-terminal-red/10 transition-colors"
                >
                  {confirmDelete ? 'Confirm Delete' : 'Remove'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <WidgetErrorBoundary widgetId={widget.id} widgetType={widget.type}>
          <WidgetRenderer widget={widget} />
        </WidgetErrorBoundary>
      </div>
    </motion.div>
  );
}
