'use client';

import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import MarketOverview from '../MarketOverview';

export default function MarketOverviewWidget({ widget }: WidgetComponentProps) {
  void widget;
  return (
    <div className="h-full overflow-hidden">
      <MarketOverview />
    </div>
  );
}
