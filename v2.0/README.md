# Felswerke Terminal v2.1

AI-powered crypto trading terminal — a simplified Bloomberg Terminal for crypto.

## Features

### Core
- **Widget-based Workspace System** — Drag-and-drop grid with multiple workspaces, 15 widget types
- **Live Market Dashboard** — BTC & ETH prices from Coinbase, Gate.io, Binance, Kraken, Bybit
- **Arbitrage Monitor** — Cross-exchange spread detection with configurable thresholds
- **Price Charts** — Candlestick/area charts with SMA, EMA, RSI, MACD, Bollinger Bands, VWAP
- **News Feed** — Crypto news with sentiment analysis (Bullish/Bearish/Neutral)
- **AI Assistant** — Context-aware market analysis via OpenAI or Anthropic with tool-calling
- **Fear & Greed Index** — Market sentiment gauge from Alternative.me
- **Portfolio Tracker** — Position management with live PnL calculation
- **Correlation Matrix** — Pearson correlation heatmap between assets

### Auth & Security (v2.1)
- **PIN Login** — 4-box PIN input with auto-focus, paste support, auto-submit
- **Role-based Access** — Admin (PIN 0408) and User (PIN 1234) roles
- **Signed Sessions** — HMAC-SHA256 signed httpOnly cookies, no plaintext PINs
- **bcrypt Hashing** — PINs stored as bcrypt hashes in environment variables
- **Rate Limiting** — 5 attempts / 30s lockout on login endpoint
- **Admin Tools Panel** — Slide-over panel with system info, provider status, security overview
- **AUTH_SECRET Hard-Fail** — Production requires explicit secret, dev uses fallback with warning
- **Fetch Timeouts** — All external API calls have a 5s AbortController timeout
- **Widget Error Boundaries** — Standalone React error boundary prevents single widget crashes from breaking the app
- **Context Size Limit** — AI chat context payload capped at 8,000 characters
- **WebSocket Exponential Backoff** — Reconnect delay: 3s → 6s → 12s → ... → 60s max

### UI
- **Terminal UI** — Dark theme (#0a0e17), cyan accent, monospace font
- **Framer Motion** — Smooth animations throughout (boot sequence, widget transitions, shake on error)
- **Workspace Templates** — 3 pre-built workspace configurations (Crypto Focus, Stocks & Macro, Sentiment)
- **Logout** — Available for all roles (Admin and User)

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Generate your own PIN hashes and session secret:

```bash
# Generate PIN hashes (change PINs as needed)
node -e "console.log(require('bcryptjs').hashSync('0408', 10))"  # Admin
node -e "console.log(require('bcryptjs').hashSync('1234', 10))"  # User

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env.local`:

```env
ADMIN_PIN_HASH=$2b$10$...
USER_PIN_HASH=$2b$10$...
AUTH_SECRET=your-64-char-hex-string
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

> Default PINs (Admin: 0408, User: 1234) are hardcoded as fallback when no hashes are set.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
Frontend (Next.js 14 App Router + TypeScript + Tailwind + Framer Motion)
  ├── LoginScreen (4-box PIN, boot animation)
  ├── WorkspaceShell (main shell after auth)
  │   ├── WorkspaceHeader (title, clock, admin trigger)
  │   ├── WorkspaceSwitcher (tabs, templates)
  │   ├── WorkspaceGrid (react-grid-layout, drag-and-drop)
  │   ├── AdminToolsPanel (slide-over, admin only)
  │   └── StatusBar
  └── 14 Widget Types across 4 categories

Backend (Next.js API Routes)
  ├── /api/auth/login — bcrypt PIN verification, role detection, signed cookie
  ├── /api/auth/logout — Session cookie deletion
  ├── /api/auth/session — Session validation, role retrieval
  ├── /api/prices — Multi-exchange price aggregation (cached)
  ├── /api/news — CryptoCompare + Google News RSS
  ├── /api/chat — AI analysis with 6 tool-calling functions
  ├── /api/health — Provider status, cache stats, uptime
  └── /api/history, /api/market, /api/fear-greed, /api/stocks, /api/stock-history, /api/alerts, /api/top-movers

Middleware
  └── HMAC-SHA256 token verification, route protection

State (Zustand)
  ├── useTerminalStore — prices, arbitrage, news, chat
  └── useWorkspaceStore — workspaces, widgets, watchlists, settings

Auth
  └── bcrypt PIN hashes → signed session cookie → middleware verification
```

## Widget Types (15)

| Category | Widgets |
|----------|---------|
| Market | Crypto Watchlist, Stock Watchlist, Stock Chart, Price Chart, Market Quote, Market Overview, Top Movers, Portfolio Tracker |
| Analysis | AI Assistant, Arbitrage Monitor, Fear & Greed Index, Correlation Matrix |
| News | News Feed |
| Tools | Alerts, Notes |

## APIs Used

| API | Purpose | Status (Firmennetz) |
|-----|---------|---------------------|
| Coinbase v2 | EUR spot prices | ✅ Erreichbar |
| Gate.io | Prices, candles, 24h stats | ✅ Erreichbar |
| Alternative.me | Fear & Greed Index | ✅ Erreichbar |
| CryptoCompare | Crypto news | ✅ Erreichbar |
| Google News RSS | News fallback | ✅ Erreichbar |
| CoinGecko | Prices, OHLC, market overview | ❌ Geblockt |
| Coinbase Exchange | Candle data | ❌ Geblockt |
| Binance, Kraken, Bybit | Price comparison | ⚠️ Nicht getestet |
| Finnhub | Stock quotes & candles | ⚠️ Nicht getestet |
| Yahoo Finance | Stock quotes & chart fallback | ⚠️ Nicht getestet |
| OpenAI / Anthropic | AI analysis | ⚠️ Nicht getestet |

See `BLOCKED_SOURCES.md` for details.

## Raspberry Pi Deployment

```bash
# Bootstrap
curl -fsSL https://raw.githubusercontent.com/ZischendesSteinchen/Felswerke-Terminal/main/scripts/bootstrap-pi.sh -o bootstrap-pi.sh
chmod +x bootstrap-pi.sh
./bootstrap-pi.sh

# Deploy
cd /home/pi/felswerke-terminal
./scripts/deploy.sh

# Auto-deploy watcher (polls GitHub every 60s)
./scripts/watch-github.sh
```

Systemd services available in `deploy/` directory.

## Disclaimer

This is an informational tool only. It does NOT execute trades or provide financial advice.
