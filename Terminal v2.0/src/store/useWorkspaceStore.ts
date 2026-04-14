import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  Workspace,
  Widget,
  WidgetType,
  WidgetLayout,
  WidgetSettings,
  Watchlist,
  UserPreferences,
} from '@/types/workspace';
import { getWidgetDefinition } from '@/lib/widgetRegistry';
import { persistGet, persistSetDebounced } from '@/lib/persistence';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface WorkspaceState {
  workspaces: Workspace[];
  widgets: Record<string, Widget>;
  activeWorkspaceId: string;
  watchlists: Watchlist[];
  preferences: UserPreferences;
  hydrated: boolean;

  // Workspace actions
  addWorkspace: (name: string) => string;
  removeWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  duplicateWorkspace: (id: string) => string;
  setActiveWorkspace: (id: string) => void;

  // Widget actions
  addWidget: (workspaceId: string, type: WidgetType, overrides?: Partial<Pick<Widget, 'title' | 'settings' | 'layout'>>) => string;
  removeWidget: (id: string) => void;
  updateWidgetLayout: (id: string, layout: WidgetLayout) => void;
  updateWidgetSettings: (id: string, settings: Partial<WidgetSettings>) => void;
  renameWidget: (id: string, title: string) => void;
  duplicateWidget: (id: string) => string;
  batchUpdateLayouts: (updates: { id: string; layout: WidgetLayout }[]) => void;

  // Watchlist actions
  addWatchlist: (name: string, type: Watchlist['type'], symbols?: string[]) => string;
  removeWatchlist: (id: string) => void;
  updateWatchlist: (id: string, updates: Partial<Omit<Watchlist, 'id'>>) => void;
  addSymbolToWatchlist: (watchlistId: string, symbol: string) => void;
  removeSymbolFromWatchlist: (watchlistId: string, symbol: string) => void;

  // Preferences
  updatePreferences: (prefs: Partial<UserPreferences>) => void;

  // Hydration
  hydrate: () => void;

  // Getters
  getActiveWorkspace: () => Workspace | undefined;
  getWorkspaceWidgets: (workspaceId: string) => Widget[];
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_WORKSPACE_ID = 'ws-default';

function createDefaultWorkspace(): Workspace {
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Crypto',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    widgetIds: [],
    color: '#00d4ff',
  };
}

function createDefaultWidgets(): Record<string, Widget> {
  const now = Date.now();
  const wsId = DEFAULT_WORKSPACE_ID;

  const widgets: Widget[] = [
    {
      id: 'w-quote-btc',
      type: 'market-quote',
      title: 'Bitcoin',
      workspaceId: wsId,
      layout: { x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      settings: { symbols: ['BTC'] },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'w-quote-eth',
      type: 'market-quote',
      title: 'Ethereum',
      workspaceId: wsId,
      layout: { x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      settings: { symbols: ['ETH'] },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'w-market',
      type: 'market-overview',
      title: 'Market Overview',
      workspaceId: wsId,
      layout: { x: 4, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      settings: {},
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'w-chart',
      type: 'price-chart',
      title: 'BTC Chart',
      workspaceId: wsId,
      layout: { x: 0, y: 2, w: 6, h: 6, minW: 3, minH: 4 },
      settings: { symbols: ['BTC'], range: '1D', chartType: 'candlestick', indicators: [] },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'w-arb',
      type: 'arbitrage',
      title: 'Arbitrage Monitor',
      workspaceId: wsId,
      layout: { x: 6, y: 0, w: 3, h: 5, minW: 2, minH: 3 },
      settings: { arbThreshold: 0.5 },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'w-alerts',
      type: 'alerts',
      title: 'Alerts',
      workspaceId: wsId,
      layout: { x: 6, y: 5, w: 3, h: 3, minW: 2, minH: 2 },
      settings: { severityFilter: ['info', 'warning', 'critical'] },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'w-news',
      type: 'news-feed',
      title: 'News Feed',
      workspaceId: wsId,
      layout: { x: 9, y: 0, w: 3, h: 5, minW: 2, minH: 3 },
      settings: { newsQuery: '', newsSource: 'all' },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'w-fng',
      type: 'fear-greed',
      title: 'Fear & Greed',
      workspaceId: wsId,
      layout: { x: 9, y: 5, w: 3, h: 3, minW: 2, minH: 3 },
      settings: {},
      createdAt: now,
      updatedAt: now,
    },
  ];

  const map: Record<string, Widget> = {};
  for (const w of widgets) {
    map[w.id] = w;
  }
  return map;
}

function createDefaultWatchlists(): Watchlist[] {
  return [
    { id: 'wl-crypto-1', name: 'Main Crypto', type: 'crypto', symbols: ['BTC', 'ETH', 'SOL'] },
    { id: 'wl-stocks-1', name: 'Tech Stocks', type: 'stock', symbols: ['AAPL', 'NVDA', 'MSFT'] },
  ];
}

function createDefaultPreferences(): UserPreferences {
  return {
    theme: 'dark',
    defaultWorkspaceId: DEFAULT_WORKSPACE_ID,
    currency: 'EUR',
    locale: 'de-DE',
    sidebarCollapsed: false,
  };
}

// ─── Persistence keys ────────────────────────────────────────────────────────

const PERSIST_KEYS = {
  workspaces: 'workspaces',
  widgets: 'widgets',
  activeWorkspaceId: 'activeWorkspaceId',
  watchlists: 'watchlists',
  preferences: 'preferences',
} as const;

function persistAll(state: WorkspaceState) {
  persistSetDebounced(PERSIST_KEYS.workspaces, state.workspaces);
  persistSetDebounced(PERSIST_KEYS.widgets, state.widgets);
  persistSetDebounced(PERSIST_KEYS.activeWorkspaceId, state.activeWorkspaceId);
  persistSetDebounced(PERSIST_KEYS.watchlists, state.watchlists);
  persistSetDebounced(PERSIST_KEYS.preferences, state.preferences);
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [createDefaultWorkspace()],
  widgets: createDefaultWidgets(),
  activeWorkspaceId: DEFAULT_WORKSPACE_ID,
  watchlists: createDefaultWatchlists(),
  preferences: createDefaultPreferences(),
  hydrated: false,

  // ── Hydrate from persistence ────────────────────────────────────────────
  hydrate: () => {
    const workspaces = persistGet<Workspace[]>(PERSIST_KEYS.workspaces);
    const widgets = persistGet<Record<string, Widget>>(PERSIST_KEYS.widgets);
    const activeWorkspaceId = persistGet<string>(PERSIST_KEYS.activeWorkspaceId);
    const watchlists = persistGet<Watchlist[]>(PERSIST_KEYS.watchlists);
    const preferences = persistGet<UserPreferences>(PERSIST_KEYS.preferences);

    set({
      workspaces: workspaces?.length ? workspaces : [createDefaultWorkspace()],
      widgets: widgets && Object.keys(widgets).length ? widgets : createDefaultWidgets(),
      activeWorkspaceId: activeWorkspaceId || DEFAULT_WORKSPACE_ID,
      watchlists: watchlists?.length ? watchlists : createDefaultWatchlists(),
      preferences: preferences || createDefaultPreferences(),
      hydrated: true,
    });
  },

  // ── Workspace Actions ───────────────────────────────────────────────────
  addWorkspace: (name) => {
    const id = `ws-${uuid().slice(0, 8)}`;
    const workspace: Workspace = {
      id,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      widgetIds: [],
    };
    set((s) => {
      const next = { ...s, workspaces: [...s.workspaces, workspace] };
      persistAll(next);
      return next;
    });
    return id;
  },

  removeWorkspace: (id) => {
    set((s) => {
      if (s.workspaces.length <= 1) return s;
      const ws = s.workspaces.find((w) => w.id === id);
      if (!ws) return s;

      // Remove all widgets in this workspace
      const nextWidgets = { ...s.widgets };
      for (const wId of ws.widgetIds) {
        delete nextWidgets[wId];
      }

      const nextWorkspaces = s.workspaces.filter((w) => w.id !== id);
      const nextActive = s.activeWorkspaceId === id ? nextWorkspaces[0].id : s.activeWorkspaceId;

      const next = {
        ...s,
        workspaces: nextWorkspaces,
        widgets: nextWidgets,
        activeWorkspaceId: nextActive,
      };
      persistAll(next);
      return next;
    });
  },

  renameWorkspace: (id, name) => {
    set((s) => {
      const next = {
        ...s,
        workspaces: s.workspaces.map((w) =>
          w.id === id ? { ...w, name, updatedAt: Date.now() } : w
        ),
      };
      persistAll(next);
      return next;
    });
  },

  duplicateWorkspace: (id) => {
    const s = get();
    const source = s.workspaces.find((w) => w.id === id);
    if (!source) return id;

    const newWsId = `ws-${uuid().slice(0, 8)}`;
    const now = Date.now();
    const newWidgets: Record<string, Widget> = {};
    const newWidgetIds: string[] = [];

    for (const wId of source.widgetIds) {
      const widget = s.widgets[wId];
      if (!widget) continue;
      const newWidgetId = `w-${uuid().slice(0, 8)}`;
      newWidgets[newWidgetId] = {
        ...widget,
        id: newWidgetId,
        workspaceId: newWsId,
        createdAt: now,
        updatedAt: now,
      };
      newWidgetIds.push(newWidgetId);
    }

    const newWorkspace: Workspace = {
      id: newWsId,
      name: `${source.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      widgetIds: newWidgetIds,
      color: source.color,
    };

    set((s2) => {
      const next = {
        ...s2,
        workspaces: [...s2.workspaces, newWorkspace],
        widgets: { ...s2.widgets, ...newWidgets },
      };
      persistAll(next);
      return next;
    });
    return newWsId;
  },

  setActiveWorkspace: (id) => {
    set((s) => {
      const next = { ...s, activeWorkspaceId: id };
      persistAll(next);
      return next;
    });
  },

  // ── Widget Actions ──────────────────────────────────────────────────────
  addWidget: (workspaceId, type, overrides) => {
    const def = getWidgetDefinition(type);
    if (!def) return '';

    const id = `w-${uuid().slice(0, 8)}`;
    const now = Date.now();
    const widget: Widget = {
      id,
      type,
      title: overrides?.title || def.defaultTitle,
      workspaceId,
      layout: overrides?.layout || { ...def.defaultLayout },
      settings: { ...def.defaultSettings, ...overrides?.settings },
      createdAt: now,
      updatedAt: now,
    };

    set((s) => {
      const next = {
        ...s,
        widgets: { ...s.widgets, [id]: widget },
        workspaces: s.workspaces.map((ws) =>
          ws.id === workspaceId
            ? { ...ws, widgetIds: [...ws.widgetIds, id], updatedAt: now }
            : ws
        ),
      };
      persistAll(next);
      return next;
    });
    return id;
  },

  removeWidget: (id) => {
    set((s) => {
      const widget = s.widgets[id];
      if (!widget) return s;

      const nextWidgets = { ...s.widgets };
      delete nextWidgets[id];

      const next = {
        ...s,
        widgets: nextWidgets,
        workspaces: s.workspaces.map((ws) =>
          ws.id === widget.workspaceId
            ? { ...ws, widgetIds: ws.widgetIds.filter((wId) => wId !== id), updatedAt: Date.now() }
            : ws
        ),
      };
      persistAll(next);
      return next;
    });
  },

  updateWidgetLayout: (id, layout) => {
    set((s) => {
      const widget = s.widgets[id];
      if (!widget) return s;
      const next = {
        ...s,
        widgets: { ...s.widgets, [id]: { ...widget, layout, updatedAt: Date.now() } },
      };
      persistAll(next);
      return next;
    });
  },

  updateWidgetSettings: (id, settings) => {
    set((s) => {
      const widget = s.widgets[id];
      if (!widget) return s;
      const next = {
        ...s,
        widgets: {
          ...s.widgets,
          [id]: { ...widget, settings: { ...widget.settings, ...settings }, updatedAt: Date.now() },
        },
      };
      persistAll(next);
      return next;
    });
  },

  renameWidget: (id, title) => {
    set((s) => {
      const widget = s.widgets[id];
      if (!widget) return s;
      const next = {
        ...s,
        widgets: { ...s.widgets, [id]: { ...widget, title, updatedAt: Date.now() } },
      };
      persistAll(next);
      return next;
    });
  },

  duplicateWidget: (id) => {
    const s = get();
    const source = s.widgets[id];
    if (!source) return id;

    const newId = `w-${uuid().slice(0, 8)}`;
    const now = Date.now();
    const newWidget: Widget = {
      ...source,
      id: newId,
      title: `${source.title} (Copy)`,
      layout: { ...source.layout, x: 0, y: Infinity }, // place at bottom
      createdAt: now,
      updatedAt: now,
    };

    set((s2) => {
      const next = {
        ...s2,
        widgets: { ...s2.widgets, [newId]: newWidget },
        workspaces: s2.workspaces.map((ws) =>
          ws.id === source.workspaceId
            ? { ...ws, widgetIds: [...ws.widgetIds, newId], updatedAt: now }
            : ws
        ),
      };
      persistAll(next);
      return next;
    });
    return newId;
  },

  batchUpdateLayouts: (updates) => {
    set((s) => {
      const nextWidgets = { ...s.widgets };
      const now = Date.now();
      for (const { id, layout } of updates) {
        const w = nextWidgets[id];
        if (w) {
          nextWidgets[id] = { ...w, layout, updatedAt: now };
        }
      }
      const next = { ...s, widgets: nextWidgets };
      persistAll(next);
      return next;
    });
  },

  // ── Watchlist Actions ───────────────────────────────────────────────────
  addWatchlist: (name, type, symbols = []) => {
    const id = `wl-${uuid().slice(0, 8)}`;
    set((s) => {
      const next = {
        ...s,
        watchlists: [...s.watchlists, { id, name, type, symbols }],
      };
      persistAll(next);
      return next;
    });
    return id;
  },

  removeWatchlist: (id) => {
    set((s) => {
      const next = { ...s, watchlists: s.watchlists.filter((wl) => wl.id !== id) };
      persistAll(next);
      return next;
    });
  },

  updateWatchlist: (id, updates) => {
    set((s) => {
      const next = {
        ...s,
        watchlists: s.watchlists.map((wl) => (wl.id === id ? { ...wl, ...updates } : wl)),
      };
      persistAll(next);
      return next;
    });
  },

  addSymbolToWatchlist: (watchlistId, symbol) => {
    set((s) => {
      const next = {
        ...s,
        watchlists: s.watchlists.map((wl) =>
          wl.id === watchlistId && !wl.symbols.includes(symbol)
            ? { ...wl, symbols: [...wl.symbols, symbol] }
            : wl
        ),
      };
      persistAll(next);
      return next;
    });
  },

  removeSymbolFromWatchlist: (watchlistId, symbol) => {
    set((s) => {
      const next = {
        ...s,
        watchlists: s.watchlists.map((wl) =>
          wl.id === watchlistId ? { ...wl, symbols: wl.symbols.filter((sym) => sym !== symbol) } : wl
        ),
      };
      persistAll(next);
      return next;
    });
  },

  // ── Preferences ─────────────────────────────────────────────────────────
  updatePreferences: (prefs) => {
    set((s) => {
      const next = { ...s, preferences: { ...s.preferences, ...prefs } };
      persistAll(next);
      return next;
    });
  },

  // ── Getters ─────────────────────────────────────────────────────────────
  getActiveWorkspace: () => {
    const s = get();
    return s.workspaces.find((w) => w.id === s.activeWorkspaceId);
  },

  getWorkspaceWidgets: (workspaceId) => {
    const s = get();
    const ws = s.workspaces.find((w) => w.id === workspaceId);
    if (!ws) return [];
    return ws.widgetIds.map((id) => s.widgets[id]).filter(Boolean);
  },
}));
