'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { WORKSPACE_TEMPLATES } from '@/lib/workspaceTemplates';

export default function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const addWorkspaceFromTemplate = useWorkspaceStore((s) => s.addWorkspaceFromTemplate);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const renameWorkspace = useWorkspaceStore((s) => s.renameWorkspace);
  const duplicateWorkspace = useWorkspaceStore((s) => s.duplicateWorkspace);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu && !showAddMenu) return;
    const handler = () => { setContextMenu(null); setShowAddMenu(false); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu, showAddMenu]);

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

      <div className="relative ml-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!showAddMenu) {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setAddMenuPos({ x: rect.left, y: rect.bottom + 4 });
            }
            setShowAddMenu(!showAddMenu);
          }}
          className="px-2 py-1 text-xs text-terminal-muted hover:text-terminal-accent hover:bg-terminal-panel/50 rounded transition-colors"
          title="New Workspace"
        >
          +
        </button>

        {showAddMenu && addMenuPos && (
          <div
            className="fixed z-[100] bg-terminal-panel border border-terminal-border rounded shadow-xl py-1 min-w-[200px]"
            style={{ left: addMenuPos.x, top: addMenuPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const id = addWorkspace(`Workspace ${workspaces.length + 1}`);
                setActiveWorkspace(id);
                setShowAddMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-terminal-text hover:bg-terminal-accent/10 transition-colors"
            >
              Empty Workspace
            </button>
            <div className="border-t border-terminal-border my-1" />
            <div className="px-3 py-1 text-[10px] text-terminal-muted uppercase tracking-wider">
              From Template
            </div>
            {WORKSPACE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => {
                  const wsId = addWorkspaceFromTemplate(tpl);
                  setActiveWorkspace(wsId);
                  setShowAddMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-terminal-text hover:bg-terminal-accent/10 transition-colors flex items-center gap-2"
              >
                <span className="flex-shrink-0 w-5 text-center">{tpl.icon}</span>
                <div>
                  <span className="block">{tpl.name}</span>
                  <span className="block text-[10px] text-terminal-muted">{tpl.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
