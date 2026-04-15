'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export default function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const renameWorkspace = useWorkspaceStore((s) => s.renameWorkspace);
  const duplicateWorkspace = useWorkspaceStore((s) => s.duplicateWorkspace);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
    setContextMenu(null);
  };

  const handleFinishRename = () => {
    if (editingId && editValue.trim()) {
      renameWorkspace(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleAddWorkspace = () => {
    const id = addWorkspace(`Workspace ${workspaces.length + 1}`);
    setActiveWorkspace(id);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-terminal-bg border-b border-terminal-border shrink-0 overflow-x-auto">
      {workspaces.map((ws) => (
        <div key={ws.id} className="relative">
          {editingId === ws.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="px-3 py-1 text-xs bg-terminal-panel border border-terminal-accent rounded text-terminal-text outline-none w-28"
            />
          ) : (
            <button
              onClick={() => setActiveWorkspace(ws.id)}
              onDoubleClick={() => handleStartRename(ws.id, ws.name)}
              onContextMenu={(e) => handleContextMenu(e, ws.id)}
              className={`
                px-3 py-1 text-xs rounded transition-all duration-150 whitespace-nowrap
                ${
                  ws.id === activeWorkspaceId
                    ? 'bg-terminal-panel text-terminal-accent border border-terminal-accent/30'
                    : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel/50 border border-transparent'
                }
              `}
            >
              {ws.color && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ backgroundColor: ws.color }}
                />
              )}
              {ws.name}
            </button>
          )}
        </div>
      ))}

      <button
        onClick={handleAddWorkspace}
        className="px-2 py-1 text-xs text-terminal-muted hover:text-terminal-accent hover:bg-terminal-panel/50 rounded transition-colors ml-1"
        title="New Workspace"
      >
        +
      </button>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-terminal-panel border border-terminal-border rounded shadow-xl py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleStartRename(contextMenu.id, workspaces.find((w) => w.id === contextMenu.id)?.name || '')}
              className="w-full text-left px-3 py-1.5 text-xs text-terminal-text hover:bg-terminal-accent/10 transition-colors"
            >
              Rename
            </button>
            <button
              onClick={() => {
                const newId = duplicateWorkspace(contextMenu.id);
                setActiveWorkspace(newId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-terminal-text hover:bg-terminal-accent/10 transition-colors"
            >
              Duplicate
            </button>
            {workspaces.length > 1 && (
              <button
                onClick={() => {
                  removeWorkspace(contextMenu.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-terminal-red hover:bg-terminal-red/10 transition-colors"
              >
                Delete
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
