'use client';

import { useEffect } from 'react';
import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTerminalStore } from '@/store/useTerminalStore';
import { gatherWorkspaceContext, formatContextForAI } from '@/lib/aiContext';
import AiChat from '../AiChat';

/**
 * Before rendering AiChat, we gather workspace context and store a formatted
 * summary on `window.__workspaceContext` so AiChat can include it when posting
 * to /api/chat without a prop-drilling refactor of the existing component.
 */
export default function AiChatWidget({ widget }: WidgetComponentProps) {
  void widget;

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const widgets = useWorkspaceStore((s) => s.widgets);
  const watchlists = useWorkspaceStore((s) => s.watchlists);
  const prices = useTerminalStore((s) => s.prices);
  const news = useTerminalStore((s) => s.news);
  const arbitrageSignals = useTerminalStore((s) => s.arbitrageSignals);

  useEffect(() => {
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!ws) return;
    const ctx = gatherWorkspaceContext(ws, widgets, watchlists, prices, news, arbitrageSignals);
    (window as unknown as Record<string, string>).__workspaceContext = formatContextForAI(ctx);
  }, [workspaces, activeWorkspaceId, widgets, watchlists, prices, news, arbitrageSignals]);

  return (
    <div className="h-full overflow-hidden">
      <AiChat />
    </div>
  );
}
