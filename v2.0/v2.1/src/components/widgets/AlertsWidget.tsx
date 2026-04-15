'use client';

import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import AlertsPanel from '../AlertsPanel';

export default function AlertsWidget({ widget }: WidgetComponentProps) {
  void widget;
  return (
    <div className="h-full overflow-hidden">
      <AlertsPanel />
    </div>
  );
}
