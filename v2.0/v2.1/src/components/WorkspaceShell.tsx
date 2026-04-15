'use client';

import { useState, useEffect } from 'react';
import { usePrices } from '@/hooks/usePrices';
import { useNews } from '@/hooks/useNews';
import { useSession } from '@/hooks/useSession';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import WorkspaceHeader from './workspace/WorkspaceHeader';
import WorkspaceSwitcher from './workspace/WorkspaceSwitcher';
import WorkspaceGrid from './workspace/WorkspaceGrid';
import AddWidgetModal from './workspace/AddWidgetModal';
import WidgetSettingsPanel from './workspace/WidgetSettingsPanel';
import AdminToolsPanel from './workspace/AdminToolsPanel';
import StatusBar from './StatusBar';

// Ensure widget registry is loaded
import '@/lib/widgetRegistry';

export default function WorkspaceShell() {
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const { role } = useSession();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // Initialize data hooks
  usePrices();
  useNews();

  // Hydrate workspace state from persistence on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-terminal-bg">
        <div className="text-terminal-muted text-sm font-mono animate-pulse">
          Loading terminal...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-terminal-bg overflow-hidden">
      <WorkspaceHeader
        role={role}
        onAdminClick={() => setAdminPanelOpen(true)}
      />
      <WorkspaceSwitcher />
      <WorkspaceGrid />
      <StatusBar />
      <AddWidgetModal />
      <WidgetSettingsPanel />
      {role === 'admin' && (
        <AdminToolsPanel
          open={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
        />
      )}
    </div>
  );
}
