'use client';

import type { WidgetComponentProps } from '../workspace/WidgetRenderer';
import PriceWidget from '../PriceWidget';

export default function MarketQuoteWidget({ widget }: WidgetComponentProps) {
  const symbol = widget.settings.symbols?.[0] || 'BTC';
  const nameMap: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    DOGE: 'Dogecoin',
    XRP: 'Ripple',
    ADA: 'Cardano',
    DOT: 'Polkadot',
    AVAX: 'Avalanche',
    MATIC: 'Polygon',
    LINK: 'Chainlink',
  };
  return (
    <div className="h-full overflow-auto">
      <PriceWidget symbol={symbol} name={nameMap[symbol] || symbol} />
    </div>
  );
}
