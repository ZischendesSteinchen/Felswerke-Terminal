'use client';

import { useMemo } from 'react';
import { usePrices } from '@/hooks/usePrices';
import { useNews } from '@/hooks/useNews';
import { useKeyboardShortcuts, useShortcutHelp } from '@/hooks/useKeyboardShortcuts';
import TerminalHeader from './TerminalHeader';
import PriceWidget from './PriceWidget';
import PriceChart from './PriceChart';
import ArbitrageMonitor from './ArbitrageMonitor';
import NewsFeed from './NewsFeed';
import AiChat from './AiChat';
import StatusBar from './StatusBar';
import FearGreedIndex from './FearGreedIndex';
import MarketOverview from './MarketOverview';
import AlertsPanel from './AlertsPanel';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

export default function Dashboard() {
  usePrices();
  useNews();

  const { showHelp, toggle: toggleHelp, close: closeHelp } = useShortcutHelp();

  const shortcuts = useMemo(
    () => [
      { key: '?', description: 'Shortcut-Hilfe', action: toggleHelp },
      { key: 'Escape', description: 'Overlays schließen', action: closeHelp },
    ],
    [toggleHelp, closeHelp]
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="h-screen flex flex-col bg-terminal-bg">
      <TerminalHeader />
      <KeyboardShortcutsHelp show={showHelp} onClose={closeHelp} />

      <main
        className="flex-1 p-3 min-h-0"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 2fr',
          gridTemplateRows: 'auto 1fr auto 1fr',
          gridTemplateAreas: `
            "btc    eth    market arb"
            "chart  chart  chart  arb"
            "alerts alerts alerts alerts"
            "news   news   fng    chat"
          `,
          gap: '0.75rem',
        }}
      >
        <div style={{ gridArea: 'btc' }}>
          <PriceWidget symbol="BTC" name="Bitcoin" />
        </div>
        <div style={{ gridArea: 'eth' }}>
          <PriceWidget symbol="ETH" name="Ethereum" />
        </div>
        <div style={{ gridArea: 'market' }}>
          <MarketOverview />
        </div>
        <div style={{ gridArea: 'arb' }} className="min-h-0 overflow-hidden">
          <ArbitrageMonitor />
        </div>
        <div style={{ gridArea: 'chart' }} className="min-h-0 overflow-hidden">
          <PriceChart />
        </div>
        <div style={{ gridArea: 'alerts' }} className="min-h-0 overflow-hidden max-h-48">
          <AlertsPanel />
        </div>
        <div style={{ gridArea: 'news' }} className="min-h-0 overflow-hidden">
          <NewsFeed />
        </div>
        <div style={{ gridArea: 'fng' }} className="min-h-0 overflow-hidden">
          <FearGreedIndex />
        </div>
        <div style={{ gridArea: 'chat' }} className="min-h-0 overflow-hidden">
          <AiChat />
        </div>
      </main>

      <StatusBar />
    </div>
  );
}
