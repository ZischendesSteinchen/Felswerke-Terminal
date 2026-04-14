# Felswerke Terminal

AI-powered crypto trading terminal — a simplified Bloomberg Terminal for crypto.

## Features

- **Live Market Dashboard** — BTC & ETH prices from Binance (WebSocket), Coinbase, CoinGecko
- **Arbitrage Monitor** — Detects price differences across exchanges with configurable threshold
- **News Feed** — Crypto news with basic sentiment analysis
- **AI Assistant** — Market analysis powered by OpenAI or Anthropic
- **Terminal UI** — Dark theme, grid layout, smooth Framer Motion animations

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd "Felswerke Terminal"
npm install
```

### Configuration

Copy `.env.example` to `.env.local` and add your AI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

> The dashboard works without an AI key — only the AI chat panel requires it.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Raspberry Pi Auto-Deploy

You can run this project on a Raspberry Pi and let it auto-deploy after each push to GitHub.

Repository:

- `https://github.com/ZischendesSteinchen/Felswerke-Terminal.git`

Recommended setup:

1. Clone the repo on the Pi.
2. Copy `.env.example` to `.env.local` on the Pi and add your API keys.
3. Install runtime tools:

```bash
sudo apt update
sudo apt install -y git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Bootstrap the Pi checkout:

```bash
curl -fsSL https://raw.githubusercontent.com/ZischendesSteinchen/Felswerke-Terminal/main/scripts/bootstrap-pi.sh -o bootstrap-pi.sh
chmod +x bootstrap-pi.sh
./bootstrap-pi.sh
```

4. Run the first deployment manually:

```bash
cd /home/pi/felswerke-terminal
chmod +x scripts/deploy.sh scripts/watch-github.sh
./scripts/deploy.sh
```

5. Start the GitHub watcher:

```bash
./scripts/watch-github.sh
```

What it does:

- polls `origin/main` every 60 seconds
- detects a new commit on GitHub
- runs `git pull --ff-only`
- runs `npm ci`
- runs `npm run build`
- restarts the PM2 app

Important:

- the watcher expects a clean working tree on the Pi
- local edits on the Pi block auto-deploy on purpose
- if you change code locally on your PC, the Pi only gets it after a push to GitHub

The expected Pi folder is:

- `/home/pi/felswerke-terminal`

Optional: systemd services

The repo includes service templates in `deploy/`:

- `deploy/felswerke-terminal.service`
- `deploy/felswerke-terminal-watcher.service`

Example installation on the Pi:

```bash
sudo cp deploy/felswerke-terminal-watcher.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now felswerke-terminal-watcher.service
```

If you prefer, you can skip polling entirely and replace it later with GitHub Actions over SSH. Polling is simpler when the Pi is behind NAT and only reachable through outbound connections.

## Architecture

```
Frontend (Next.js 14 + Tailwind + Framer Motion)
  ├── Dashboard Layout (CSS Grid with named areas)
  ├── PriceWidget × 2 (BTC, ETH)
  ├── PriceChart (TradingView Lightweight Charts)
  ├── ArbitrageMonitor (configurable threshold)
  ├── NewsFeed (sentiment-tagged)
  └── AiChat (context-aware)

Backend (Next.js API Routes)
  ├── /api/prices — Aggregates Binance, Coinbase, CoinGecko
  ├── /api/news — CryptoCompare + sentiment analysis
  └── /api/chat — AI analysis via OpenAI/Anthropic

State (Zustand)
  └── useTerminalStore — prices, arbitrage, news, chat

Real-time
  ├── Binance WebSocket (live BTC/ETH ticker)
  └── Polling (Coinbase/CoinGecko every 15s, news every 2m)
```

## APIs Used (Free Tiers)

| API | Purpose | Auth Required |
|-----|---------|---------------|
| Binance | Live prices (WebSocket + REST) | No |
| Coinbase | Price comparison | No |
| CoinGecko | Price comparison | No |
| CryptoCompare | Crypto news | No |
| OpenAI / Anthropic | AI analysis | Yes |

## Disclaimer

This is an informational tool only. It does NOT execute trades or provide financial advice. Crypto markets are volatile — always do your own research.

## Post-MVP Improvements

- More trading pairs (SOL, DOGE, etc.)
- Historical chart data backfill
- Portfolio tracker
- Price alerts with configurable thresholds
- Prediction market data (Polymarket)
- Drag-and-drop panel layout
- Multi-timeframe charts (1m, 5m, 1h, 1d)
- Data export (CSV/JSON)
- Mobile responsive layout
