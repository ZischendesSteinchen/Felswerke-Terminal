# Felswerke Terminal: Projektkontext fuer KI-Weiterarbeit

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

Stand dieser Datei:

- Das Projekt ist lauffaehig und als kompletter Stand in GitHub gepusht.
- Das Repository wurde neu initialisiert, damit nur der aktuelle Projektstand enthalten ist.
- Alte Commit-Historie wurde entfernt und durch einen frischen Initial-Stand ersetzt.
- Der Fokus der letzten Arbeiten lag auf dem Umbau zu einem vollstaendig widget-basierten
  Workspace-System nach dem Vorbild von OpenBB oder Bloomberg Terminal.
- Das monolithische Dashboard-Layout wurde durch ein flexibles, vom Benutzer konfigurierbares
  Grid-System mit Drag-and-Drop, Resize, mehreren Workspaces und Persistenz ersetzt.

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
- Widget-Registry mit 12 registrierten Widget-Typen in vier Kategorien:
  - Market: Crypto Watchlist, Stock Watchlist, Price Chart, Market Quote, Market Overview, Top Movers
  - Analysis: AI Assistant, Arbitrage Monitor, Fear & Greed Index
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
- `StockWatchlistWidget`: US-Aktien-Kurse ueber Finnhub-API mit 30-Sekunden-Polling
- `PriceChartWidget`: Wrapper um PriceChart, Remount bei Symbolwechsel
- `MarketOverviewWidget`: Wrapper um MarketOverview (Marktkapitalisierung, Dominanz)
- `TopMoversWidget`: Top 10 Krypto-Beweger von CoinGecko mit 60-Sekunden-Polling
- `NewsFeedWidget`: Wrapper um NewsFeed
- `AlertsWidget`: Wrapper um AlertsPanel
- `FearGreedWidget`: Wrapper um FearGreedIndex
- `ArbitrageWidget`: Wrapper um ArbitrageMonitor
- `AiChatWidget`: Sammelt Workspace-Kontext (aktive Widgets, Preise, News, Watchlists)
  und stellt diesen dem KI-Chat ueber `window.__workspaceContext` bereit
- `NotesWidget`: Einfaches Textarea-Widget mit Auto-Speicherung in Widget-Settings

### Markt- und Preisdaten

- Multi-Exchange-Preisaggregation fuer BTC und ETH
- Einbindung mehrerer Anbieter: Coinbase, Gate.io, Binance, Kraken, Bybit, CoinGecko-Fallback
- Arbitrage-Monitor fuer Preisabweichungen zwischen Boersen
- EUR-Umrechnung fuer USD-basierte Datenquellen
- NEU: US-Aktien-Daten ueber Finnhub-API (`/api/stocks`), gecacht fuer 5 Minuten,
  bis zu 20 Symbole pro Anfrage

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
- Health-Endpoint mit Provider-Status und Cache-Infos (Version jetzt v0.2.0)
- Provider-Registry fuer strukturierte Datenquellen-Verwaltung
- Dokumentation blockierter externer Quellen in `BLOCKED_SOURCES.md`
- Persistence-Layer mit Prefix-basiertem localStorage-Namespacing (`felswerke-v2:`)
- Debounced Writes fuer hochfrequente State-Aenderungen
- Server-sichere Persistenz-Funktionen (pruefen auf `typeof window`)
- Widget-Registry als zentraler Katalog mit Metadaten, Icons, Kategorien und Default-Layouts

### Dashboard und UX

- Altes monolithisches Dashboard-Layout wurde durch das Workspace-System ersetzt
- PriceWidgets mit Sparkline-Verlauf (jetzt als MarketQuoteWidget im Grid verfuegbar)
- Keyboard-Shortcut-Hilfe
- Watchlist-Verwaltung im Workspace-Store mit Typen (crypto, stock, mixed)
- Workspace-Header mit Titel, Version (v2.0), Live-Uhr und deutschem Datumsformat
- Workspace-Switcher mit Farbindikatoren, Umbenennung per Doppelklick, Kontextmenue
- StatusBar weiterhin als globale Komponente unterhalb des Grids
- Framer-Motion-Animationen fuer Widget-Eintritt, Modal-Uebergaenge und Settings-Panel
- CSS-Overrides in `globals.css` fuer react-grid-layout-Klassen:
  - Placeholder-Styling beim Drag
  - Resize-Handle-Anpassung
  - Schatten und Opacity beim Ziehen von Widgets

### Veraltete Komponenten

- `Dashboard.tsx` existiert noch im Repository, wird aber nicht mehr verwendet.
  Der Einstiegspunkt ist jetzt `WorkspaceShell`. Die alte Komponente bleibt als
  Referenz erhalten, kann aber entfernt werden.
- `TerminalHeader.tsx` zeigt noch die alte Version v0.1.0. Der neue `WorkspaceHeader`
  zeigt v2.0 an. TerminalHeader wird im aktuellen Layout nicht mehr eingebunden.

### Bekannte Versionsinkonsistenz

- `TerminalHeader.tsx` zeigt v0.1.0 (alt, nicht mehr aktiv eingebunden)
- `WorkspaceHeader.tsx` zeigt v2.0 (aktuell sichtbar im UI)
- Health-Endpoint `/api/health` gibt v0.2.0 zurueck
- Diese Inkonsistenz sollte bei Gelegenheit vereinheitlicht werden.

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

### 5. CustomEvents statt Prop-Drilling

Die Kommunikation zwischen WidgetWrapper und WidgetSettingsPanel laeuft ueber CustomEvents.
Das vermeidet tiefes Prop-Drilling und haelt die Komponenten entkoppelt.

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

- UI fuer Watchlist-Verwaltung innerhalb der Widgets weiter ausbauen
  (Symbole hinzufuegen/entfernen direkt im Widget statt nur ueber Settings)
- Erweiterung auf mehr Krypto-Symbole ueber BTC und ETH hinaus
- Verbesserung der Marktkennzahlen und Makro-Uebersicht
- Feinschliff bei Widget-Responsiveness und Grid-Verhalten auf kleinen Bildschirmen
- Widget-Settings fuer weitere Widget-Typen erweitern (aktuell haben nicht alle Widgets
  typ-spezifische Einstellungen)

### Niedrige oder optionale Prioritaet

- Weitere Datenquellen integrieren, wenn im Zielnetz sinnvoll
- Backtesting oder historische Signalauswertung
- Exportfunktionen oder gespeicherte Workspace-Layouts
- Weitere Widget-Typen (z.B. Portfolio-Tracker, Korrelationsmatrix, Heatmap)
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