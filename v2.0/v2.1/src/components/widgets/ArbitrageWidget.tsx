'use client';

import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import ArbitrageMonitor from '../ArbitrageMonitor';

export default function ArbitrageWidget({ widget }: WidgetComponentProps) {
  void widget;
  return (
    <div className="h-full overflow-hidden">
      <ArbitrageMonitor />
    </div>
  );
}
