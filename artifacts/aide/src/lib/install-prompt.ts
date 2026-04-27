/**
 * Install-prompt hook.
 *
 * Captures the browser's `beforeinstallprompt` event so the app can offer
 * its own install button instead of relying on the browser's address-bar
 * affordance. The event is non-standard but supported by Chromium-based
 * browsers (Android Chrome, Edge, Samsung Internet). iOS Safari has no
 * programmatic install prompt - the consumer surfaces a hint instead.
 *
 * Usage:
 *   const { canInstall, promptInstall, installed, dismissed, dismiss } = useInstallPrompt();
 */

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "aide-install-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const t = parseInt(raw, 10);
    return Number.isFinite(t) && Date.now() - t < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // Standalone display mode set via the manifest.
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari exposes navigator.standalone instead.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissed());

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!event) return "unavailable";
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "dismissed") {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* storage disabled */ }
      setDismissed(true);
    }
    setEvent(null);
    return choice.outcome;
  }, [event]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* storage disabled */ }
    setDismissed(true);
  }, []);

  return {
    canInstall: !!event && !installed && !dismissed,
    promptInstall,
    installed,
    dismissed,
    dismiss,
  };
}

/**
 * iOS Safari has no install event. Detect it so the consumer can show
 * a "Tap Share, then Add to Home Screen" hint instead of a button.
 */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  return isIos && isSafari && !isStandalone();
}
