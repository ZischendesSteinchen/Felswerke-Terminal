'use client';

import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import NewsFeed from '../NewsFeed';

export default function NewsFeedWidget({ widget }: WidgetComponentProps) {
  // NewsFeed already handles its own data fetching and display
  void widget;
  return (
    <div className="h-full overflow-hidden">
      <NewsFeed />
    </div>
  );
}
