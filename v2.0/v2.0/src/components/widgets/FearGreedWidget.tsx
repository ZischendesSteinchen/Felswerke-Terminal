'use client';

import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import FearGreedIndex from '../FearGreedIndex';

export default function FearGreedWidget({ widget }: WidgetComponentProps) {
  void widget;
  return (
    <div className="h-full overflow-hidden">
      <FearGreedIndex />
    </div>
  );
}
