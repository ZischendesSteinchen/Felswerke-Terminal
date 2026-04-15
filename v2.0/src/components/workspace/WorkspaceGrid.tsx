'use client';

import React, { useMemo, useCallback } from 'react';
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout';
import type { Layout, LayoutItem } from 'react-grid-layout';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import WidgetWrapper from './WidgetWrapper';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const ROW_HEIGHT = 60;
const MARGIN: [number, number] = [8, 8];

export default function WorkspaceGrid() {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const widgets = useWorkspaceStore((s) => s.widgets);
  const batchUpdateLayouts = useWorkspaceStore((s) => s.batchUpdateLayouts);
  const addWidget = useWorkspaceStore((s) => s.addWidget);

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  const workspaceWidgets = useMemo(() => {
    if (!activeWorkspace) return [];
    return activeWorkspace.widgetIds.map((id) => widgets[id]).filter(Boolean);
  }, [activeWorkspace, widgets]);

  const layout: Layout = useMemo(() => {
    return workspaceWidgets.map((w): LayoutItem => ({
      i: w.id,
      x: w.layout.x,
      y: w.layout.y,
      w: w.layout.w,
      h: w.layout.h,
      minW: w.layout.minW,
      minH: w.layout.minH,
      maxW: w.layout.maxW,
      maxH: w.layout.maxH,
    }));
  }, [workspaceWidgets]);

  const onLayoutChange = useCallback(
    (newLayout: Layout) => {
      const updates = newLayout
        .map((item) => {
          const widget = widgets[item.i];
          if (!widget) return null;
          const l = widget.layout;
          if (l.x === item.x && l.y === item.y && l.w === item.w && l.h === item.h) return null;
          return {
            id: item.i,
            layout: {
              ...widget.layout,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
            },
          };
        })
        .filter(Boolean) as { id: string; layout: typeof widgets[string]['layout'] }[];

      if (updates.length > 0) {
        batchUpdateLayouts(updates);
      }
    },
    [widgets, batchUpdateLayouts]
  );

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center text-terminal-muted text-sm">
        No workspace selected
      </div>
    );
  }

  if (workspaceWidgets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-terminal-muted">
        <div className="text-4xl opacity-30">⊞</div>
        <p className="text-sm">This workspace is empty</p>
        <button
          onClick={() => addWidget(activeWorkspaceId, 'market-quote', { title: 'Bitcoin', settings: { symbols: ['BTC'] } })}
          className="px-4 py-2 text-xs bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/20 rounded hover:bg-terminal-accent/20 transition-colors"
        >
          Add your first widget
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className="flex-1 overflow-auto p-1 min-h-0">
      {mounted && (
        <ResponsiveGridLayout
          className="layout"
          width={width}
          layouts={{ lg: layout }}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
          containerPadding={[4, 4]}
          compactor={verticalCompactor}
          dragConfig={{ handle: '.widget-drag-handle' }}
          onLayoutChange={onLayoutChange}
        >
          {workspaceWidgets.map((widget) => (
            <div key={widget.id}>
              <WidgetWrapper widget={widget} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
