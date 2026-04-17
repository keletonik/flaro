import { useCallback, useEffect, useState } from "react";

export interface SavedFilter<T = Record<string, unknown>> {
  id: string;
  name: string;
  value: T;
  pinned?: boolean;
  createdAt: number;
}

function storageKey(scope: string) {
  return `aide-saved-filters:${scope}`;
}

function load<T>(scope: string): SavedFilter<T>[] {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedFilter<T>[]) : [];
  } catch {
    return [];
  }
}

function save<T>(scope: string, filters: SavedFilter<T>[]) {
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(filters));
  } catch {}
}

export function useSavedFilters<T = Record<string, unknown>>(scope: string) {
  const [filters, setFilters] = useState<SavedFilter<T>[]>(() => load<T>(scope));

  useEffect(() => {
    save(scope, filters);
  }, [scope, filters]);

  const addFilter = useCallback((name: string, value: T) => {
    const clean = name.trim();
    if (!clean) return null;
    const entry: SavedFilter<T> = {
      id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      value,
      pinned: false,
      createdAt: Date.now(),
    };
    setFilters((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, pinned: !f.pinned } : f)),
    );
  }, []);

  const renameFilter = useCallback((id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: clean } : f)),
    );
  }, []);

  const pinned = filters.filter((f) => f.pinned);
  const unpinned = filters.filter((f) => !f.pinned);

  return {
    filters,
    pinned,
    unpinned,
    addFilter,
    removeFilter,
    togglePin,
    renameFilter,
  };
}
