# Geblockte / Erreichbare API-Quellen

> Dieses Dokument listet den Status aller externen APIs auf dem **Firmennetzwerk (PDV)**.
> Vor dem `git push` zum Raspberry Pi müssen geblockte Quellen ggf. durch Alternativen ersetzt
> oder Fallback-Ketten angepasst werden, da der Pi ein anderes Netzwerk nutzt.

## ❌ Geblockt (DNS-Sperre im Firmennetz)

| API | URL-Muster | Datei(en) | Verwendung |
|-----|-----------|-----------|------------|
| CoinGecko | `api.coingecko.com/api/v3/*` | `exchanges.ts`, `history/route.ts`, `market/route.ts` | Preise, OHLC-Daten, Marktübersicht |
| Coinbase Exchange | `api.exchange.coinbase.com/*` | `history/route.ts` | Historische Candle-Daten |
| CoinCap | `api.coincap.io/*` | (entfernt, war in market/route.ts) | War Fallback für Marktdaten |

## ✅ Erreichbar

| API | URL-Muster | Datei(en) | Verwendung |
|-----|-----------|-----------|------------|
| Coinbase v2 | `api.coinbase.com/v2/*` | `exchanges.ts`, `market/route.ts` | EUR-Spot-Preise, Wechselkurse |
| Gate.io | `api.gateio.ws/api/v4/*` | `exchanges.ts`, `history/route.ts`, `market/route.ts` | Preise, Candle-Daten, 24h-Stats |
| Alternative.me | `api.alternative.me/fng/*` | `fear-greed/route.ts` | Fear & Greed Index |
| CryptoCompare | `min-api.cryptocompare.com/*` | `news/route.ts` | Krypto-Nachrichten |
| Google News RSS | `news.google.com/rss/*` | `news/route.ts` | News-Fallback |
| Google Fonts | `fonts.googleapis.com/*` | `layout.tsx` | JetBrains Mono Schrift |

## ⚠️ Nicht getestet (vom Firmennetz)

| API | URL-Muster | Datei(en) | Verwendung |
|-----|-----------|-----------|------------|
| Binance | `api.binance.com/api/v3/*` | `exchanges.ts` | BTC/ETH Preise (USD) |
| Kraken | `api.kraken.com/0/public/*` | `exchanges.ts` | BTC/ETH Preise (USD) |
| Bybit | `api.bybit.com/v5/*` | `exchanges.ts` | BTC/ETH Preise (USD) |
| OpenAI | `api.openai.com/v1/*` | `chat/route.ts` | AI-Chat + Tool-Calling |
| Anthropic | `api.anthropic.com/v1/*` | `chat/route.ts` | AI-Chat + Tool-Calling |

## Interne API-Endpunkte (Self-Referencing)

> Die folgenden Endpunkte werden intern vom AI Tool-Calling, Alert-Engine und Auth-System aufgerufen.
> Keine externen Netzwerk-Anfragen — laufen auf `localhost`.

| Endpunkt | Datei | Verwendung |
|----------|-------|------------|
| `/api/auth/login` | `auth/login/route.ts` | PIN-Login mit bcrypt-Vergleich, Rate-Limiting |
| `/api/auth/logout` | `auth/logout/route.ts` | Session-Cookie loeschen |
| `/api/auth/session` | `auth/session/route.ts` | Session-Validierung, Rolle abfragen |
| `/api/prices` | `prices/route.ts` | Preisabfragen (cached, TTL 10s) |
| `/api/news` | `news/route.ts` | Nachrichten (cached, TTL 120s) |
| `/api/fear-greed` | `fear-greed/route.ts` | Fear & Greed Index (cached, TTL 300s) |
| `/api/market` | `market/route.ts` | Marktübersicht (cached, TTL 60s) |
| `/api/history` | `history/route.ts` | OHLCV Chart-Daten (cached, TTL 600s) |
| `/api/alerts` | `alerts/route.ts` | Alert-Engine: Preisbewegung, Arbitrage, News, F&G |
| `/api/health` | `health/route.ts` | System-Status, Provider-Check, Cache-Stats |
| `/api/chat` | `chat/route.ts` | AI-Assistent mit Tool-Calling + Citations |
| `/api/stocks` | `stocks/route.ts` | Finnhub US-Aktien-Daten (cached, TTL 300s) |
| `/api/top-movers` | `top-movers/route.ts` | Top 10 Krypto-Beweger (cached) |

## Aktuelle Fallback-Ketten

### Preise (`exchanges.ts`)
```
Coinbase v2 → Binance → CoinGecko → Kraken → Bybit → Gate.io
```

### Chart-Historie (`history/route.ts`)
```
Coinbase Exchange → CoinGecko OHLC → Gate.io
```
> ⚠️ Coinbase Exchange + CoinGecko sind geblockt → nur Gate.io funktioniert im Firmennetz.

### Marktübersicht (`market/route.ts`)
```
CoinGecko Global → Coinbase v2 + Gate.io (Fallback)
```
> CoinGecko geblockt → Fallback auf Coinbase-Preise + Gate.io 24h-Stats aktiv.

### Fear & Greed (`fear-greed/route.ts`)
```
Alternative.me (einzige Quelle) ✅
```

### News (`news/route.ts`)
```
CryptoCompare → Google News RSS (Fallback)
```

### Alerts (`alerts/route.ts`)
```
Nutzt gecachte Daten aus prices, news, fear-greed (keine eigenen externen Calls)
```

### AI Chat (`chat/route.ts`)
```
OpenAI / Anthropic → Tool-Calls zu internen /api/* Endpunkten
```
> Tools: get_price_quote, get_chart_history, get_market_overview, get_fear_greed, get_alerts, get_news

## Caching-Layer (v0.2.0)

Alle API-Routen nutzen jetzt den TTL-Cache (`src/lib/cache.ts`):

| Endpunkt | TTL | Cache-Key |
|----------|-----|-----------|
| `/api/prices` | 10s | `prices` |
| `/api/news` | 120s | `news` |
| `/api/fear-greed` | 300s | `fear-greed` |
| `/api/market` | 60s | `market` |
| `/api/history` | 600s | `history-{symbol}-{range}` |

Cache-Status abrufbar über `/api/health` → `cache`-Objekt im Response.

---

## Hinweise für den Raspberry Pi

Auf dem Pi (eigenes Netzwerk, keine DNS-Sperre) sollten **alle** APIs erreichbar sein.
Die Fallback-Ketten sorgen dafür, dass die App auch mit geblockten APIs funktioniert,
aber auf dem Pi liefern die primären Quellen (CoinGecko, Coinbase Exchange) bessere Daten:

- **CoinGecko**: Echte OHLC-Candles, vollständige Marktdaten (Market Cap, Volumen, Dominanz)
- **Coinbase Exchange**: Sekundengenaue Candle-Daten für Charts
- **Gate.io**: Guter Fallback, aber USDT-basiert → EUR-Umrechnung nötig
