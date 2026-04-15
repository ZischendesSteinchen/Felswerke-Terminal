# Felswerke Terminal v2.1: Projektkontext fuer KI-Weiterarbeit

## Zweck dieser Datei

Diese Datei dient als kompakte Uebergabe fuer eine KI oder einen neuen Entwickler.
Sie beschreibt:

- das Ziel des Projekts
- den aktuellen technischen Stand
- die bereits umgesetzten Funktionen
- bekannte Randbedingungen
- offene oder naechste Schritte

Die Datei soll so geschrieben sein, dass eine KI ohne weitere Historie schnell versteht,
was dieses Repository ist, warum bestimmte Entscheidungen getroffen wurden und worauf bei
weiteren Aenderungen zu achten ist.

## Projektziel

Felswerke Terminal ist ein Next.js 14 Dashboard fuer Krypto-Marktbeobachtung.

Das Ziel ist kein Trading-Bot und kein Order-Execution-System, sondern ein lokales,
visuell starkes Monitoring- und Analyse-Frontend mit folgenden Schwerpunkten:

- Live- und Near-Realtime-Preise ueber mehrere Boersen
- Arbitrage-Erkennung zwischen Boersen
- Charting mit Candles, Volumen und technischen Indikatoren
- News- und Sentiment-Ueberblick
- Fear-and-Greed-Analyse
- KI-gestuetzte Zusammenfassungen und Rueckfragen mit Quellenangaben
- Betrieb lokal sowie spaeter auf einem Raspberry Pi

Die App soll robust gegen API-Ausfaelle und gegen Netzwerkblockaden im Firmennetz sein.

## Produktstatus

Stand dieser Datei: v2.1 (April 2026)

- Das Projekt ist lauffaehig und wird aktiv weiterentwickelt.
- v2.0 war der Umbau auf ein widget-basiertes Workspace-System.
- v2.1 fuegt Login-System, Rollenverwaltung (Admin/User), Admin-Panel und
  signierte Sessions hinzu.
- Das monolithische Dashboard-Layout wurde durch ein flexibles, vom Benutzer konfigurierbares
  Grid-System mit Drag-and-Drop, Resize, mehreren Workspaces und Persistenz ersetzt.
- Authentifizierung erfolgt per 4-stelligem PIN mit bcrypt-Hashes und HMAC-SHA256-Cookies.
- Alte, nicht mehr verwendete Komponenten (Dashboard.tsx, TerminalHeader.tsx) wurden entfernt.

## Zentrale Architektur

### Frontend

- Framework: Next.js 14 App Router
- Sprache: TypeScript
- UI: React Client Components + Tailwind
- Animationen: Framer Motion
- State-Management: Zustand (zwei Stores: Terminal- und Workspace-State)
- Charts: lightweight-charts
- Grid-Layout: react-grid-layout mit react-draggable und react-resizable
- IDs: uuid fuer Widgets und Workspaces

### Datenfluss

- Preise werden ueber WebSocket und REST aggregiert.
- REST-Endpunkte liegen unter `src/app/api/*`.
- Die API-Routen nutzen einen TTL-Cache, um externe Quellen zu schonen.
- Markt- und Preisdaten liegen weiterhin in `src/store/useTerminalStore.ts`.
- Workspace-Zustand (Workspaces, Widgets, Watchlists, Einstellungen) liegt in
  `src/store/useWorkspaceStore.ts` und wird per localStorage persistiert.
- Die KI-Chatroute kann interne Tools aufrufen, statt nur statischen Kontext zu benutzen.
- Der KI-Chat erhaelt zusaetzlich dynamischen Workspace-Kontext (aktive Widgets, sichtbare
  Symbole, aktuelle Preise), der beim Oeffnen des Widgets zusammengestellt wird.

### Wichtige Bereiche im Repo

- `src/app/api/` = serverseitige Datenaggregation, Caching, Health, Alerts, Chat, Stocks
- `src/components/` = Basis-Komponenten (PriceChart, NewsFeed, etc.)
- `src/components/widgets/` = 12 Widget-Wrapper, die Basis-Komponenten ins Grid einbetten
- `src/components/workspace/` = Workspace-Infrastruktur (Grid, Switcher, Header, Settings, Modal)
- `src/hooks/` = Polling, Tastatur-Shortcuts, Feed-Integration
- `src/lib/` = Datenprovider, Indikatoren, Alert-Logik, Cache, Utils, Widget-Registry, Persistenz
- `src/store/` = zwei Zustand-Stores (Terminal-Daten und Workspace-State)
- `src/types/` = TypeScript-Typen fuer Workspace, Widgets, Watchlists und Einstellungen
- `deploy/` und `scripts/` = Deployment und Betrieb auf Raspberry Pi / Server

## Bereits umgesetzte Kernfunktionen

### Workspace- und Widget-System (NEU)

- Vollstaendig neues Grid-basiertes Workspace-Layout als Ersatz fuer das bisherige
  monolithische Dashboard
- Einstiegspunkt ist `WorkspaceShell` statt der alten `Dashboard`-Komponente
- Mehrere Workspaces koennen parallel existieren und per Tab-Leiste gewechselt werden
- Workspaces lassen sich umbenennen, duplizieren und loeschen
- Jeder Workspace enthaelt beliebig viele Widgets
- Widgets koennen per Drag-and-Drop verschoben und per Resize angepasst werden
- Responsives Grid mit Breakpoints fuer verschiedene Bildschirmgroessen
  (12/10/6/4/2 Spalten bei lg/md/sm/xs/xxs)
- Zeilenhoehe 60px, kompaktes vertikales Layout
- Widget-Registry mit 15 registrierten Widget-Typen in vier Kategorien:
  - Market: Crypto Watchlist, Stock Watchlist, Stock Chart, Price Chart, Market Quote,
    Market Overview, Top Movers, Portfolio Tracker
  - Analysis: AI Assistant, Arbitrage Monitor, Fear & Greed Index, Correlation Matrix
  - News: News Feed
  - Tools: Alerts, Notes
- Add-Widget-Modal als Floating-Action-Button mit Kategorie-Tabs
- Widget-Settings-Panel als Seitenleiste fuer typ-spezifische Einstellungen
  (Symbole, Charttyp, Zeitraum, Schwellenwerte, Filter)
- Widget-Wrapper mit Drag-Handle, Kontextmenue (Duplizieren, Entfernen, Einstellungen)
  und Loeschbestaetigung per Doppelklick
- Alle Widget-Komponenten werden per `next/dynamic` lazy geladen (kein SSR)
- Workspace-State wird ueber Zustand verwaltet und per localStorage mit dem Prefix
  `felswerke-v2:` persistiert
- Debounced Persistence (500ms) verhindert exzessives Schreiben bei Drag/Resize
- Hydration-Pattern: App zeigt Ladezustand bis der persistierte State geladen ist
- Standardmaessig wird ein "Crypto"-Workspace mit 8 vordefinierten Widgets angelegt

### Widget-Implementierungen (NEU)

- `MarketQuoteWidget`: Wrapper um PriceWidget, zeigt Einzelpreis fuer konfigurierbares Symbol
- `CryptoWatchlistWidget`: Tabelle mit Krypto-Preisen aus dem Terminal-Store (Symbol, Preis, Boerse)
- `StockWatchlistWidget`: US-Aktien-Kurse ueber Finnhub-API mit Yahoo-Finance-Fallback,
  30-Sekunden-Polling, Inline-Symbol-Picker zum Hinzufuegen/Entfernen von Aktien
- `StockChartWidget`: Aktien-Chart mit Candlestick/Area-Modus, Volumen-Histogramm,
  Symbol-Picker, Range-Selector (1D/1W/1M/3M/1Y), nutzt `/api/stock-history`
- `PriceChartWidget`: Wrapper um PriceChart, Remount bei Symbolwechsel
- `MarketOverviewWidget`: Wrapper um MarketOverview (Marktkapitalisierung, Dominanz)
- `TopMoversWidget`: Top 10 Krypto-Beweger von CoinGecko mit 60-Sekunden-Polling
- `NewsFeedWidget`: Wrapper um NewsFeed
- `AlertsWidget`: Wrapper um AlertsPanel
- `FearGreedWidget`: Wrapper um FearGreedIndex
- `ArbitrageWidget`: Wrapper um ArbitrageMonitor
- `AiChatWidget`: Sammelt Workspace-Kontext per `useMemo` und uebergibt diesen als
  `workspaceContext`-Prop an die AiChat-Komponente (kein window-Objekt mehr)
- `NotesWidget`: Einfaches Textarea-Widget mit Auto-Speicherung in Widget-Settings
- `PortfolioTrackerWidget`: Positionen verwalten (Symbol, Menge, Durchschnittspreis)
  mit Live-PnL-Berechnung aus Terminal-Store-Preisen
- `CorrelationWidget`: Pearson-Korrelation zwischen konfigurierbaren Symbolen als
  Heatmap, nutzt `/api/history` fuer 30-Tage-Schlusskurse

### Markt- und Preisdaten

- Multi-Exchange-Preisaggregation fuer BTC und ETH
- Einbindung mehrerer Anbieter: Coinbase, Gate.io, Binance, Kraken, Bybit, CoinGecko-Fallback
- Arbitrage-Monitor fuer Preisabweichungen zwischen Boersen
- EUR-Umrechnung fuer USD-basierte Datenquellen
- NEU: US-Aktien-Daten ueber Finnhub-API (`/api/stocks`), gecacht fuer 5 Minuten,
  bis zu 20 Symbole pro Anfrage, Yahoo Finance als Fallback bei fehlenden Daten
- NEU: Aktien-Chartdaten ueber `/api/stock-history` mit Finnhub-Candles und
  Yahoo-Finance-Fallback (Ranges: 1D, 1W, 1M, 3M, 1Y)

### Charts und Marktanalyse

- Preis-Chart mit Area- und Candlestick-Modus
- Volumenanzeige
- Technische Indikatoren in TypeScript implementiert:
  - SMA
  - EMA
  - RSI
  - MACD
  - Bollinger Bands
  - VWAP
- Erweiterte Chartinteraktion:
  - vertikales Drag-Panning
  - Reset per Doppelklick
  - Fix fuer leeres Chart nach Reload durch saubere Chart-Initialisierung

### News und Sentiment

- News-Feed mit mehreren Quellen
- Sentiment-Klassifikation fuer Nachrichten
- Filter im News-Feed nach Bullish, Bearish, Neutral oder Alle

### Fear and Greed / Marktueberblick

- Eigene API fuer Fear & Greed Index
- Marktueberblick-Komponente fuer uebergeordnete Lageeinschaetzung

### Alerts

- Alert-Engine fuer wichtige Signale
- Unterstuetzte Alert-Typen:
  - starke Preisbewegungen
  - Arbitrage-Spreads
  - News-Spikes
  - extreme Fear-and-Greed-Werte
- Alerts API
- AlertsPanel im Dashboard mit Anzeige und Acknowledge-Funktion

### KI-Chat

- AI-Assistant-Komponente im Dashboard
- Serverroute mit Tool-Calling-Unterstuetzung fuer OpenAI und Anthropic (steuerbar per
  `AI_PROVIDER`-Umgebungsvariable)
- 6 Tool-Definitionen fuer Function Calling:
  - `get_price_quote`
  - `get_chart_history`
  - `get_market_overview`
  - `get_fear_greed`
  - `get_alerts`
  - `get_news`
- Tool-Ausfuehrung mit Citation-Tracking fuer belegbare Antworten
- Dynamische Follow-up-Fragen-Generierung
- Systemprompt ist auf Analyse statt Trading-Empfehlungen ausgerichtet
- NEU: `aiContext.ts` enthaelt zwei neue Funktionen fuer den Workspace-Kontext:
  - `gatherWorkspaceContext()` sammelt aktive Widgets, sichtbare Symbole, Preise, News,
    Arbitrage-Signale und Watchlists
  - `formatContextForAI()` formatiert den gesammelten Kontext als Markdown-String
    fuer die Uebergabe an `/api/chat`

### Stabilitaet und Infrastruktur

- TTL-Cache fuer mehrere API-Routen
- Health-Endpoint mit Provider-Status und Cache-Infos (Version jetzt v2.1)
- Provider-Registry fuer strukturierte Datenquellen-Verwaltung
- Dokumentation blockierter externer Quellen in `BLOCKED_SOURCES.md`
- Persistence-Layer mit Prefix-basiertem localStorage-Namespacing (`felswerke-v2:`)
- Debounced Writes fuer hochfrequente State-Aenderungen
- Server-sichere Persistenz-Funktionen (pruefen auf `typeof window`)
- Widget-Registry als zentraler Katalog mit Metadaten, Icons, Kategorien und Default-Layouts
- NEU: Alle externen fetch-Aufrufe in `exchanges.ts` haben ein 5s-AbortController-Timeout
- NEU: Standalone WidgetErrorBoundary verhindert, dass ein Widget-Crash das gesamte UI blockiert
- NEU: WebSocket-Reconnect mit exponentiellem Backoff (3s → 6s → 12s → ... → 60s max)
- NEU: AI-Chat-Kontextpayload ist auf 8000 Zeichen begrenzt (gegen ueberlange Anfragen)
- NEU: AUTH_SECRET wird in Production erzwungen (hart-fail), in Dev mit Warnung als Fallback

### Dashboard und UX

- Altes monolithisches Dashboard-Layout wurde durch das Workspace-System ersetzt
- PriceWidgets mit Sparkline-Verlauf (jetzt als MarketQuoteWidget im Grid verfuegbar)
- Keyboard-Shortcut-Hilfe
- Watchlist-Verwaltung im Workspace-Store mit Typen (crypto, stock, mixed)
- Workspace-Header mit Titel, Version (v2.1), Live-Uhr und deutschem Datumsformat
- Workspace-Switcher mit Farbindikatoren, Umbenennung per Doppelklick, Kontextmenue
- StatusBar weiterhin als globale Komponente unterhalb des Grids
- Framer-Motion-Animationen fuer Widget-Eintritt, Modal-Uebergaenge und Settings-Panel
- CSS-Overrides in `globals.css` fuer react-grid-layout-Klassen:
  - Placeholder-Styling beim Drag
  - Resize-Handle-Anpassung
  - Schatten und Opacity beim Ziehen von Widgets

### Authentifizierung und Rollen (NEU in v2.1)

- Login-Screen mit 4-Box-PIN-Input (auto-focus, paste, auto-submit, shake bei Fehler)
- Zwei Rollen: `admin` und `user`, konfiguriert ueber Umgebungsvariablen
- PIN-Hashes werden serverseitig per bcryptjs verglichen (kein Klartext im Client)
- Session-Cookies sind HMAC-SHA256-signiert mit `AUTH_SECRET`
- Middleware (`src/middleware.ts`) verifiziert Token asynchron bei jedem Request
- Rate-Limiting auf Login-Endpoint (5 Versuche, 30s Sperre, in-memory)
- Default-PIN-Hashes sind im Code hinterlegt (Admin: 0408, User: 1234) als Fallback
  wenn keine Umgebungsvariablen gesetzt sind — kein Auto-Login-Bypass mehr
- `src/lib/session.ts` — Token-Erstellung und Verifikation (Edge-Runtime-kompatibel)
- `src/hooks/useSession.ts` — Client-Hook fuer Rollenabfrage via `/api/auth/session`

### Admin Tools Panel (NEU in v2.1)

- Slide-over Panel von rechts, nur fuer `admin`-Rolle sichtbar
- Trigger-Button im `WorkspaceHeader` (nur wenn Rolle = admin)
- 5 Sektionen: Admin Session, System, Providers, Security, Coming Next
- Zeigt Health-Daten, Provider-Status, AI-Konfiguration, Sicherheitsinfos
- Logout-Button fuer alle Rollen im WorkspaceHeader (nicht nur Admin-Panel)
- Geplante Features sind als Placeholder sichtbar vorbereitet

### Workspace Templates (NEU in v2.1)

- 3 vordefinierte Workspace-Vorlagen im WorkspaceSwitcher:
  - Crypto Focus (7 Widgets)
  - Stocks & Macro (6 Widgets)
  - Sentiment Monitor (6 Widgets)
- Template-System ueber `src/lib/workspaceTemplates.ts`
- Zustand-Action `addWorkspaceFromTemplate()` erstellt Workspace + Widgets

### Bereinigte Architektur (v2.1)

- Veraltete Komponenten `Dashboard.tsx` und `TerminalHeader.tsx` wurden entfernt
- Version ist zentral in `src/lib/version.ts` (`APP_VERSION = 'v2.1'`)
  und wird von WorkspaceHeader, StatusBar und Health-Endpoint importiert
- CustomEvent-basierte Kommunikation wurde durch Zustand-Store-Felder ersetzt
  (`activeSettingsWidgetId` statt `window.dispatchEvent`)
- `window.__workspaceContext` Anti-Pattern wurde eliminiert (jetzt Props-basiert)
- `@types/uuid` in devDependencies verschoben

## Wichtige technische Entscheidungen

### 1. Defensive Datenbeschaffung

Das Firmennetz blockiert bestimmte APIs. Deshalb wurde das System so gebaut, dass:

- mehrere Provider existieren
- Fallback-Ketten genutzt werden
- Cache-Schichten Last reduzieren
- Health-Checks sichtbar machen, welche Provider verfuegbar sind

### 2. KI nutzt interne Tools statt nur Frontend-Kontext

Die Chatroute greift nicht nur auf einen statischen Snapshot zu, sondern kann gezielt interne
Endpoints aufrufen. Dadurch sind Antworten strukturierter, frischer und besser belegbar.

### 3. Keine Finanzberatung

Die KI ist absichtlich auf Analyse, Erklaerung und Einordnung begrenzt. Sie soll keine
konkreten Kauf- oder Verkaufsanweisungen geben.

### 4. Widget-System statt monolithisches Layout

Das Dashboard wurde bewusst von einem festen Panel-Layout auf ein flexibles Widget-Grid
umgebaut. Die Gruende dafuer:

- Benutzer koennen sich ihr eigenes Layout konfigurieren
- Verschiedene Workspaces fuer verschiedene Analyse-Szenarien (z.B. Krypto, Aktien, Mixed)
- Neue Widget-Typen koennen ueber die Registry ergaenzt werden, ohne am Layout zu aendern
- Bestehende Basis-Komponenten werden per Wrapper wiederverwendet statt neu geschrieben
- Lazy Loading reduziert die initiale Bundle-Groesse

### 5. Zustand-Store statt CustomEvents

Die Kommunikation zwischen WidgetWrapper und WidgetSettingsPanel laeuft ueber den
Zustand-Store (`activeSettingsWidgetId`). CustomEvents wurden abgeloest, da sie
außerhalb des React-Lifecycles arbeiten und schwerer testbar sind.

### 6. Auth ohne Datenbank

Fuer nur 2 PINs ist keine Datenbank noetig. bcrypt-Hashes liegen in Environment-
Variablen, die Session ist HMAC-signiert. Das System ist spaeter leicht auf
SQLite oder eine Session-Tabelle erweiterbar.

## Bekannte Netzwerk- und API-Randbedingungen

Im Firmennetz sind einige externe Quellen geblockt oder unsicher erreichbar.

Bekannt geblockt:

- CoinGecko API
- Coinbase Exchange API
- CoinCap

Bekannt erreichbar:

- Coinbase v2
- Gate.io
- Alternative.me
- CryptoCompare
- Google News RSS

Nicht sicher getestet im Firmennetz:

- Binance
- Kraken
- Bybit
- OpenAI
- Anthropic
- Finnhub (neu fuer Aktien-Daten)
- Yahoo Finance (neu als Fallback fuer Aktien-Daten)

Die Details stehen in `BLOCKED_SOURCES.md`.

## Aktueller Git-Status

- Das Repository wurde als frischer Stand neu nach GitHub gepusht.
- Die aktuelle Historie startet bewusst neu mit dem aktuellen Projektzustand.
- Damit repraesentiert GitHub jetzt das lokale Verzeichnis in seinem aktuellen Zustand.

## Was als naechstes ansteht

Die folgenden Punkte sind die naechsten sinnvollen Arbeiten. Sie sind nicht alle zwingend,
aber realistisch als Fortsetzung:

### Hohe Prioritaet

- Deployment und Laufzeittest auf Raspberry Pi im Zielnetz
- Verifikation, welche bisher geblockten Provider im Zielnetz wieder direkt erreichbar sind
- API-Key-Konfiguration und End-to-End-Test fuer OpenAI oder Anthropic
- Pruefen, ob Alert-Schwellenwerte im echten Betrieb zu empfindlich oder zu schwach sind
- Finnhub-API-Key konfigurieren und Stocks-Endpunkt im Zielnetz testen

### Mittlere Prioritaet

- PIN-Management UI im Admin-Panel (aktuell nur ueber Env-Variablen)
- Audit-Logging fuer Login-Versuche und Admin-Aktionen
- UI fuer Watchlist-Verwaltung innerhalb der Widgets weiter ausbauen
- Erweiterung auf mehr Krypto-Symbole ueber BTC und ETH hinaus
- Feinschliff bei Widget-Responsiveness und Grid-Verhalten auf kleinen Bildschirmen

### Niedrige oder optionale Prioritaet

- SQLite-Migration fuer Sessions, Audit-Logs und PIN-Verwaltung
- Feature Flags und Maintenance Mode
- Weitere Datenquellen integrieren, wenn im Zielnetz sinnvoll
- Backtesting oder historische Signalauswertung
- Exportfunktionen oder gespeicherte Workspace-Layouts
- Weitere Widget-Typen (z.B. Heatmap, Orderbook-Visualisierung)
- Workspace-Templates fuer vordefinierte Analyse-Setups

## Was bei Aenderungen beachtet werden muss

- Vor neuen API-Integrationen immer pruefen, ob die Quelle im Firmennetz erreichbar ist.
- Wenn ein Provider nur im Raspberry-Netz funktioniert, muessen sinnvolle Fallbacks aktiv bleiben.
- Bei Chat-Aenderungen sollte das Sicherheitsprofil erhalten bleiben:
  - keine Trading-Empfehlungen
  - keine Halluzinationen ohne Quellen
  - bevorzugt interne Tools statt freie Spekulation
- Bei Chart-Aenderungen darauf achten, die bestehende Initialisierungslogik nicht wieder in einen
  Race-Condition-Zustand zu bringen.
- Cache-TTLs nur bewusst aendern, weil sie Einfluss auf Last, Frische und Stabilitaet haben.
- Neue Widget-Typen muessen in der Widget-Registry registriert werden (`src/lib/widgetRegistry.ts`),
  einen Eintrag im `WIDGET_MAP` in `WidgetRenderer.tsx` bekommen und als Typ in `workspace.ts`
  aufgenommen werden.
- Der Workspace-Store (`useWorkspaceStore`) hat eine Default-Initialisierung. Aenderungen am
  Default-Layout wirken sich nur auf neue Installationen aus, nicht auf bestehende persistierte
  States.
- Die Persistenz nutzt den Prefix `felswerke-v2:`. Bei Breaking Changes am State-Schema sollte
  eine Migration oder ein neuer Prefix verwendet werden.
- Widget-Wrapper und Settings-Panel kommunizieren per CustomEvent. Aenderungen am Event-Format
  muessen in beiden Komponenten synchron angepasst werden.

## Kurzfassung fuer eine KI

Wenn du eine KI bist, die dieses Projekt weiterentwickeln soll, gehe von folgendem aus:

- Du arbeitest an einem Next.js-Krypto-Dashboard fuer Analyse, nicht fuer automatische Trades.
- Die App ist bereits funktional und enthaelt Preisaggregation, Charts, Alerts, News, Sentiment,
  Fear & Greed und einen KI-Chat mit Tool-Calling.
- Das Dashboard wurde von einem monolithischen Layout auf ein widget-basiertes Workspace-System
  umgebaut. Es gibt 12 Widget-Typen, ein Grid mit Drag-and-Drop, mehrere Workspaces und
  vollstaendige Persistenz im localStorage.
- Die alten Basis-Komponenten (PriceChart, NewsFeed, AlertsPanel, etc.) existieren weiterhin und
  werden von den neuen Widget-Wrappern eingebettet.
- Der Einstiegspunkt ist `WorkspaceShell`, nicht mehr `Dashboard`.
- Es gibt zwei Zustand-Stores: `useTerminalStore` fuer Marktdaten und `useWorkspaceStore` fuer
  Workspace/Widget-State.
- Das System wurde absichtlich robust gegen API-Ausfaelle und Netzwerkblockaden gebaut.
- Ein wichtiger Teil der Arbeit war das Ersetzen oder Abfedern geblockter Datenquellen.
- Neu hinzugekommen ist ein `/api/stocks`-Endpunkt fuer US-Aktien ueber Finnhub.
- GitHub enthaelt den aktuellen lokalen Stand als frischen Repo-Start.
- Naechste sinnvolle Aufgaben sind reale Zielnetz-Tests, Provider-Validierung,
  Widget-Erweiterungen, Finnhub-Integration und allgemeiner Produkt-Feinschliff.

## Letzter Satz

Dieses Repository repraesentiert derzeit ein funktionsreiches, widget-basiertes Analyse-Dashboard
mit Fokus auf Robustheit, Datenaggregation, lokaler Nutzbarkeit, benutzerkonfigurierbarem Layout
und KI-gestuetzter Markteinordnung.