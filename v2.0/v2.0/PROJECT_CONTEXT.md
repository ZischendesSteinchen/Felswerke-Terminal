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
- Der Fokus der letzten Arbeiten lag auf Ausbau Richtung OpenBB-aehnliches Analyse-Dashboard.

## Zentrale Architektur

### Frontend

- Framework: Next.js 14 App Router
- Sprache: TypeScript
- UI: React Client Components + Tailwind
- Animationen: Framer Motion
- State-Management: Zustand
- Charts: lightweight-charts

### Datenfluss

- Preise werden ueber WebSocket und REST aggregiert.
- REST-Endpunkte liegen unter `src/app/api/*`.
- Die API-Routen nutzen einen TTL-Cache, um externe Quellen zu schonen.
- Zentrale UI-Daten liegen in `src/store/useTerminalStore.ts`.
- Die KI-Chatroute kann interne Tools aufrufen, statt nur statischen Kontext zu benutzen.

### Wichtige Bereiche im Repo

- `src/app/api/` = serverseitige Datenaggregation, Caching, Health, Alerts, Chat
- `src/components/` = Dashboard-Widgets und Analyseansichten
- `src/hooks/` = Polling, Tastatur-Shortcuts, Feed-Integration
- `src/lib/` = Datenprovider, Indikatoren, Alert-Logik, Cache, Utils
- `src/store/` = globaler Client-State
- `deploy/` und `scripts/` = Deployment und Betrieb auf Raspberry Pi / Server

## Bereits umgesetzte Kernfunktionen

### Markt- und Preisdaten

- Multi-Exchange-Preisaggregation fuer BTC und ETH
- Einbindung mehrerer Anbieter: Coinbase, Gate.io, Binance, Kraken, Bybit, CoinGecko-Fallback
- Arbitrage-Monitor fuer Preisabweichungen zwischen Boersen
- EUR-Umrechnung fuer USD-basierte Datenquellen

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
- Serverroute mit Tool-Calling-Unterstuetzung fuer OpenAI und Anthropic
- Interne Tools fuer:
  - Preisabfragen
  - Chart-Historie
  - Marktueberblick
  - Fear & Greed
  - Alerts
  - News
- Antworten koennen Quellenangaben und Follow-up-Fragen enthalten
- Systemprompt ist auf Analyse statt Trading-Empfehlungen ausgerichtet

### Stabilitaet und Infrastruktur

- TTL-Cache fuer mehrere API-Routen
- Health-Endpoint mit Provider-Status und Cache-Infos
- Provider-Registry fuer strukturierte Datenquellen-Verwaltung
- Dokumentation blockierter externer Quellen in `BLOCKED_SOURCES.md`

### Dashboard und UX

- Dashboard-Layout mit mehreren Panels
- PriceWidgets mit Sparkline-Verlauf
- Keyboard-Shortcut-Hilfe
- Watchlist-State mit LocalStorage-Persistenz im Store

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

### Mittlere Prioritaet

- UI fuer Watchlist-Verwaltung ergaenzen, da aktuell vor allem der State vorbereitet ist
- Erweiterung auf mehr Symbole als BTC und ETH
- Verbesserung der Marktkennzahlen und Makro-Uebersicht
- Feinschliff bei Layout, Responsiveness und Lesbarkeit

### Niedrige oder optionale Prioritaet

- Weitere Datenquellen integrieren, wenn im Zielnetz sinnvoll
- Backtesting oder historische Signalauswertung
- Exportfunktionen oder gespeicherte Ansichten

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

## Kurzfassung fuer eine KI

Wenn du eine KI bist, die dieses Projekt weiterentwickeln soll, gehe von folgendem aus:

- Du arbeitest an einem Next.js-Krypto-Dashboard fuer Analyse, nicht fuer automatische Trades.
- Die App ist bereits funktional und enthaelt Preisaggregation, Charts, Alerts, News, Sentiment,
  Fear & Greed und einen KI-Chat mit Tool-Calling.
- Das System wurde absichtlich robust gegen API-Ausfaelle und Netzwerkblockaden gebaut.
- Ein wichtiger Teil der Arbeit war das Ersetzen oder Abfedern geblockter Datenquellen.
- GitHub enthaelt den aktuellen lokalen Stand als frischen Repo-Start.
- Naechste sinnvolle Aufgaben sind reale Zielnetz-Tests, Provider-Validierung, Watchlist-UI,
  mehr Symbole und allgemeiner Produkt-Feinschliff.

## Letzter Satz

Dieses Repository repraesentiert derzeit einen funktionsreichen Analyse-Prototypen mit Fokus auf
Robustheit, Datenaggregation, lokaler Nutzbarkeit und KI-gestuetzter Markteinordnung.