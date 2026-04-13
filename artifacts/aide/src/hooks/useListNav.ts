/**
 * Keyboard navigation for any long list/table page.
 *
 * Gives every list page the same Linear-class shortcuts in one hook:
 *
 *   j / ArrowDown     next row
 *   k / ArrowUp       previous row
 *   Home              first row
 *   End               last row
 *   Enter             trigger `onOpen` on the focused row
 *   e                 trigger `onEdit`
 *   x                 toggle selection on the focused row
 *   Shift + X         range-select from the anchor to the focused row
 *   Escape            clear selection and blur the focused row
 *   ?                 show shortcut help (emits a "list-nav-help" event)
 *
 * Usage:
 *   const { focusedIndex, selectedIds, bind } = useListNav({
 *     items, getId: r => r.id,
 *     onOpen: row => openDetail(row.id),
 *     onEdit: row => editRow(row.id),
 *   });
 *   // attach bind.tabIndex / bind.ref to the <table> or <div> that
 *   // holds the rows so keyboard focus lives at the list level and
 *   // the browser can route keydown events into the hook.
 *
 * Shortcuts are suppressed while a text input / textarea / contenteditable
 * element has focus — no hijacking the user's typing.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseListNavOptions<T> {
  items: T[];
  getId: (item: T) => string;
  onOpen?: (item: T) => void;
  onEdit?: (item: T) => void;
  /** Called whenever the selection set changes. */
  onSelectionChange?: (ids: Set<string>) => void;
  /** If false, the hook does nothing. Useful for toggling off in modals. */
  enabled?: boolean;
}

export interface UseListNavResult {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  /** Spread onto the list container to make it focusable and attach the key handler. */
  bind: {
    ref: (el: HTMLElement | null) => void;
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    role: string;
    "aria-label": string;
  };
}

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useListNav<T>({
  items,
  getId,
  onOpen,
  onEdit,
  onSelectionChange,
  enabled = true,
}: UseListNavOptions<T>): UseListNavResult {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [selectedIds, setSelectedIdsState] = useState<Set<string>>(new Set());
  const anchorRef = useRef<number>(-1);
  const containerRef = useRef<HTMLElement | null>(null);

  const setSelectedIds = useCallback(
    (ids: Set<string>) => {
      setSelectedIdsState(ids);
      onSelectionChange?.(ids);
    },
    [onSelectionChange],
  );

  const toggleSelect = useCallback(
    (id: string) => {
      setSelectedIdsState(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, [setSelectedIds]);

  // Reset focus when the item set shrinks past the focused index.
  useEffect(() => {
    if (focusedIndex >= items.length) setFocusedIndex(items.length - 1);
  }, [items.length, focusedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;
      if (isTypingInField(e.target)) return;
      if (items.length === 0) return;

      const key = e.key;

      switch (key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          setFocusedIndex(i => Math.min(items.length - 1, Math.max(0, i + 1)));
          break;
        }
        case "k":
        case "ArrowUp": {
          e.preventDefault();
          setFocusedIndex(i => Math.max(0, i - 1));
          break;
        }
        case "Home": {
          e.preventDefault();
          setFocusedIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
        }
        case "Enter": {
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            e.preventDefault();
            onOpen?.(items[focusedIndex]);
          }
          break;
        }
        case "e": {
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            e.preventDefault();
            onEdit?.(items[focusedIndex]);
          }
          break;
        }
        case "x":
        case "X": {
          if (focusedIndex < 0) return;
          e.preventDefault();
          if (e.shiftKey && anchorRef.current >= 0) {
            // range select between anchor and focused index
            const start = Math.min(anchorRef.current, focusedIndex);
            const end = Math.max(anchorRef.current, focusedIndex);
            const next = new Set(selectedIds);
            for (let i = start; i <= end; i++) next.add(getId(items[i]));
            setSelectedIds(next);
          } else {
            anchorRef.current = focusedIndex;
            toggleSelect(getId(items[focusedIndex]));
          }
          break;
        }
        case "Escape": {
          if (selectedIds.size > 0) {
            e.preventDefault();
            clearSelection();
          } else if (focusedIndex >= 0) {
            e.preventDefault();
            setFocusedIndex(-1);
            (e.target as HTMLElement).blur();
          }
          break;
        }
        case "?": {
          e.preventDefault();
          try {
            window.dispatchEvent(new CustomEvent("list-nav-help"));
          } catch { /* ignore */ }
          break;
        }
      }
    },
    [enabled, items, focusedIndex, selectedIds, getId, onOpen, onEdit, setSelectedIds, toggleSelect, clearSelection],
  );

  const bind = {
    ref: (el: HTMLElement | null) => {
      containerRef.current = el;
    },
    tabIndex: 0,
    onKeyDown: handleKeyDown,
    role: "listbox",
    "aria-label": "Keyboard-navigable list",
  };

  return {
    focusedIndex,
    setFocusedIndex,
    selectedIds,
    setSelectedIds,
    toggleSelect,
    clearSelection,
    bind,
  };
}
