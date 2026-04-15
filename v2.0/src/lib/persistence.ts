// ─── Persistence Layer ───────────────────────────────────────────────────────
// Abstracts storage behind a simple interface so we can swap localStorage
// for IndexedDB or a backend API later without touching any consumers.

const STORAGE_PREFIX = 'felswerke-v2';

function key(name: string): string {
  return `${STORAGE_PREFIX}:${name}`;
}

export function persistGet<T>(name: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function persistSet<T>(name: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(name), JSON.stringify(data));
  } catch {
    // storage full or unavailable — silently fail
  }
}

export function persistDelete(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key(name));
  } catch {
    // noop
  }
}

export function persistKeys(): string[] {
  if (typeof window === 'undefined') return [];
  const prefix = `${STORAGE_PREFIX}:`;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) {
      keys.push(k.slice(prefix.length));
    }
  }
  return keys;
}

// ─── Convenience: debounced auto-save ────────────────────────────────────────

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function persistSetDebounced<T>(name: string, data: T, delayMs = 500): void {
  const existing = timers.get(name);
  if (existing) clearTimeout(existing);
  timers.set(
    name,
    setTimeout(() => {
      persistSet(name, data);
      timers.delete(name);
    }, delayMs)
  );
}
