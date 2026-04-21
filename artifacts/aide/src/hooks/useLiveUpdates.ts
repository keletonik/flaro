import { useEffect, useRef } from "react";

/**
 * Subscribes to the server's SSE bus (`/api/events`) and invokes `onChange`
 * whenever a `data_change` event arrives. One EventSource per mount;
 * auto-reconnects via the browser's built-in SSE retry.
 *
 * Also refetches when the tab regains focus, so a browser that was backgrounded
 * (and may have dropped the connection) never shows stale data.
 */
export function useLiveUpdates(onChange: () => void) {
  // Keep the latest callback in a ref so the effect never has to retear down
  // when the parent component re-renders with a fresh closure.
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${base}/api/events`);
      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === "data_change") cbRef.current();
        } catch {
          // Non-JSON heartbeat or malformed frame — ignore.
        }
      };
      eventSource.onerror = () => {
        // The browser automatically reconnects on SSE error. No manual retry.
      };
    } catch {
      // EventSource unavailable (very old browser). Fall back to visibility refetch.
    }

    const onVisibility = () => { if (!document.hidden) cbRef.current(); };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      eventSource?.close();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
