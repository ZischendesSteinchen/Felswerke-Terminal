'use client';

import { useCallback } from 'react';
import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export default function NotesWidget({ widget }: WidgetComponentProps) {
  const updateWidgetSettings = useWorkspaceStore((s) => s.updateWidgetSettings);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateWidgetSettings(widget.id, { notesContent: e.target.value });
    },
    [widget.id, updateWidgetSettings]
  );

  return (
    <div className="h-full flex flex-col p-2">
      <textarea
        value={(widget.settings.notesContent as string) || ''}
        onChange={onChange}
        placeholder="Write your notes here..."
        className="flex-1 w-full bg-transparent text-xs text-terminal-text placeholder-terminal-muted resize-none outline-none leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
}
