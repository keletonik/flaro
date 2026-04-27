/**
 * InstallBanner - small one-time nudge to install the AIDE FIP Assistant
 * to the home screen. Renders nothing on desktop, nothing if already
 * installed, nothing if the user has dismissed within the last 7 days.
 *
 * Two surfaces depending on platform:
 *   - Chromium (Android Chrome, Edge): "Install" button that triggers
 *     the captured beforeinstallprompt event.
 *   - iOS Safari: a one-line hint pointing at the Share menu.
 */

import { useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { useInstallPrompt, isIosSafari } from "@/lib/install-prompt";
import { cn } from "@/lib/utils";

export function InstallBanner({ className }: { className?: string }) {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  const [iosDismissed, setIosDismissed] = useState(false);
  const ios = isIosSafari() && !iosDismissed;

  if (!canInstall && !ios) return null;

  return (
    <div
      role="region"
      aria-label="Install the AIDE FIP Assistant"
      className={cn(
        "flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/8 px-3 py-2.5 text-[12px]",
        "shadow-[0_4px_16px_-8px_hsl(var(--primary)/0.4)]",
        className,
      )}
    >
      {ios ? (
        <>
          <Share2 size={16} className="text-primary shrink-0" />
          <p className="flex-1 leading-snug text-foreground/90">
            Tap <span className="inline-flex items-center gap-1 font-medium text-primary">Share <Share2 size={11} /></span> then "Add to Home Screen" to install.
          </p>
          <button
            onClick={() => setIosDismissed(true)}
            aria-label="Dismiss install hint"
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={12} />
          </button>
        </>
      ) : (
        <>
          <Download size={16} className="text-primary shrink-0" />
          <div className="flex-1 leading-snug">
            <p className="font-medium text-foreground">Install on this device</p>
            <p className="text-muted-foreground text-[11px]">
              Use AIDE FIP offline on site. No app store needed.
            </p>
          </div>
          <button
            onClick={() => { void promptInstall(); }}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-95 transition-opacity"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss install banner"
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={12} />
          </button>
        </>
      )}
    </div>
  );
}

export default InstallBanner;
