import type { ExchangePrice } from '@/types';

export interface PriceProvider {
  name: string;
  displayName: string;
  requiresUsdConversion: boolean;
  fetchPrices(usdToEurRate: number): Promise<ExchangePrice[]>;
}

const registry: PriceProvider[] = [];

export function registerProvider(provider: PriceProvider): void {
  if (!registry.find((p) => p.name === provider.name)) {
    registry.push(provider);
  }
}

export function getProvider(name: string): PriceProvider | undefined {
  return registry.find((p) => p.name === name);
}

export function getAllProviders(): PriceProvider[] {
  return [...registry];
}

export function listProviderNames(): string[] {
  return registry.map((p) => p.name);
}

export async function fetchAllPrices(usdToEurRate: number): Promise<{
  prices: ExchangePrice[];
  reachable: string[];
  warnings: string[];
}> {
  const results = await Promise.all(
    registry.map(async (provider) => {
      try {
        const prices = await provider.fetchPrices(usdToEurRate);
        return { provider: provider.displayName, prices, ok: prices.length > 0 };
      } catch {
        return { provider: provider.displayName, prices: [] as ExchangePrice[], ok: false };
      }
    })
  );

  const prices = results.flatMap((r) => r.prices);
  const reachable = results.filter((r) => r.ok).map((r) => r.provider);
  const warnings = results.filter((r) => !r.ok).map((r) => `${r.provider} unreachable`);

  return { prices, reachable, warnings };
}
