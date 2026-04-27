/**
 * Glove mode - bigger tap targets and looser spacing for techs working
 * with gloves on. Persists to localStorage so the choice survives a
 * hard reload.
 *
 * Used by:
 *   - TouchTarget primitive (sizes the hit area).
 *   - <html data-glove="on"> set on toggle so CSS can override anywhere.
 */

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "aide-glove-mode";

function readInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useGloveMode(): {
  enabled: boolean;
  toggle: () => void;
  set: (next: boolean) => void;
} {
  const [enabled, setEnabled] = useState<boolean>(readInitial);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-glove", enabled ? "on" : "off");
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch { /* storage disabled */ }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);
  const set = useCallback((next: boolean) => setEnabled(next), []);

  return { enabled, toggle, set };
}

/**
 * Read-only check for any consumer that needs to size something based on
 * the current glove-mode state without subscribing to changes.
 */
export function isGloveModeOn(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-glove") === "on";
}
