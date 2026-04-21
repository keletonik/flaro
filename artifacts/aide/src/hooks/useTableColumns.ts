import { useCallback, useEffect, useMemo, useState } from "react";

export interface ColumnDef {
  key: string;
  label: string;
}

interface PersistedState {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
}

interface UseTableColumnsReturn<T extends ColumnDef> {
  /** All columns in their current order, filtered to visible. */
  visibleColumns: T[];
  /** All columns including hidden, in order — for the picker. */
  orderedColumns: T[];
  /** Current pixel width for a column (0 = unset / use table default). */
  widthOf: (key: string) => number;
  /** Toggle visibility. */
  toggle: (key: string) => void;
  /** Reorder from → to (array indices). */
  reorder: (from: number, to: number) => void;
  /** Update a column's width. Debounced persistence on drag end. */
  setWidth: (key: string, px: number) => void;
  /** Reset to defaults (clears localStorage entry). */
  reset: () => void;
  /** True when any customisation is applied. */
  customised: boolean;
}

const storageKey = (tableId: string) => `aide-table-cols-${tableId}-v1`;

function load(tableId: string, defaults: ColumnDef[]): PersistedState {
  try {
    const raw = localStorage.getItem(storageKey(tableId));
    if (!raw) return { order: defaults.map(d => d.key), hidden: [], widths: {} };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const defaultKeys = defaults.map(d => d.key);
    const knownSet = new Set(defaultKeys);
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter(k => knownSet.has(k))
      : [];
    // Append any new columns that weren't in the persisted order so upgrades
    // don't hide the newcomers.
    for (const k of defaultKeys) if (!order.includes(k)) order.push(k);
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter(k => knownSet.has(k))
      : [];
    const widths: Record<string, number> = {};
    if (parsed.widths && typeof parsed.widths === "object") {
      for (const [k, v] of Object.entries(parsed.widths)) {
        if (knownSet.has(k) && typeof v === "number" && v > 0) widths[k] = v;
      }
    }
    return { order, hidden, widths };
  } catch {
    return { order: defaults.map(d => d.key), hidden: [], widths: {} };
  }
}

/**
 * Persist table column layout (order, visibility, width) in localStorage
 * keyed by the given tableId. Returns helpers for the header UI.
 */
export function useTableColumns<T extends ColumnDef>(
  tableId: string,
  defaults: T[],
): UseTableColumnsReturn<T> {
  const [state, setState] = useState<PersistedState>(() => load(tableId, defaults));

  // Reload whenever the tableId changes (switching tabs reuses this hook).
  useEffect(() => { setState(load(tableId, defaults)); }, [tableId]);

  // Persist whenever state changes. Cheap enough to do on every update.
  useEffect(() => {
    try { localStorage.setItem(storageKey(tableId), JSON.stringify(state)); } catch {}
  }, [tableId, state]);

  const defaultMap = useMemo(() => {
    const m = new Map<string, T>();
    for (const d of defaults) m.set(d.key, d);
    return m;
  }, [defaults]);

  const orderedColumns = useMemo(() => {
    return state.order.map(k => defaultMap.get(k)).filter(Boolean) as T[];
  }, [state.order, defaultMap]);

  const hiddenSet = useMemo(() => new Set(state.hidden), [state.hidden]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter(c => !hiddenSet.has(c.key)),
    [orderedColumns, hiddenSet],
  );

  const widthOf = useCallback((key: string) => state.widths[key] ?? 0, [state.widths]);

  const toggle = useCallback((key: string) => {
    setState(prev => {
      const hidden = prev.hidden.includes(key)
        ? prev.hidden.filter(k => k !== key)
        : [...prev.hidden, key];
      return { ...prev, hidden };
    });
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    setState(prev => {
      if (from === to || from < 0 || to < 0 || from >= prev.order.length || to >= prev.order.length) return prev;
      const next = [...prev.order];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, order: next };
    });
  }, []);

  const setWidth = useCallback((key: string, px: number) => {
    setState(prev => ({
      ...prev,
      widths: { ...prev.widths, [key]: Math.max(60, Math.round(px)) },
    }));
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(storageKey(tableId)); } catch {}
    setState({ order: defaults.map(d => d.key), hidden: [], widths: {} });
  }, [tableId, defaults]);

  const customised = state.hidden.length > 0
    || Object.keys(state.widths).length > 0
    || state.order.some((k, i) => k !== defaults[i]?.key);

  return { visibleColumns, orderedColumns, widthOf, toggle, reorder, setWidth, reset, customised };
}
