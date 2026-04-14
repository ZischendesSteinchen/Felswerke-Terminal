'use client';

import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import PriceChart from '../PriceChart';

export default function PriceChartWidget({ widget }: WidgetComponentProps) {
  // The existing PriceChart manages its own state internally.
  // We pass widget settings as initial hints via a key to force remount on symbol change.
  const symbol = widget.settings.symbols?.[0] || 'BTC';
  return (
    <div className="h-full overflow-hidden">
      <PriceChart key={`${widget.id}-${symbol}`} />
    </div>
  );
}
