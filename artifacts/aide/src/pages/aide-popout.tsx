import { useEffect } from "react";
import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";

/**
 * PA Command Centre — standalone pop-out window.
 *
 * Loaded via window.open() from AIDEAssistant. Shares localStorage with the
 * main tab so message history mirrors both ways. Broadcasts its presence
 * on a BroadcastChannel so the bottom tray can hide itself while this
 * window is alive (two competing AI surfaces is noise).
 */
export default function AidePopout() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section") || "dashboard";
  const title = params.get("title") || "AIDE";

  // Broadcast lifecycle so the main tab's bottom tray hides while we're
  // open and reappears when we close. Also heartbeats so a brief network
  // blip doesn't leave the tray thinking we're gone.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("aide-pa");
    const announce = () => ch.postMessage({ type: "popout-opened" });
    announce();
    const heartbeat = window.setInterval(announce, 4000);
    const onClose = () => {
      window.clearInterval(heartbeat);
      try { ch.postMessage({ type: "popout-closed" }); } catch {}
      try { ch.close(); } catch {}
    };
    // beforeunload is unreliable (browser crash, force-quit) but handles
    // the common "click X" case. Heartbeat makes the rest self-healing.
    window.addEventListener("beforeunload", onClose);
    window.addEventListener("pagehide", onClose);
    // Tray just asked who's here — reply so its BroadcastChannel knows.
    ch.addEventListener("message", (ev) => {
      if (ev.data?.type === "tray-hello") announce();
    });
    return () => {
      window.removeEventListener("beforeunload", onClose);
      window.removeEventListener("pagehide", onClose);
      window.clearInterval(heartbeat);
      try { ch.postMessage({ type: "popout-closed" }); } catch {}
      try { ch.close(); } catch {}
    };
  }, []);

  return (
    <div
      className="h-screen w-screen bg-card text-foreground flex flex-col"
      style={{ borderTop: "3px solid hsl(var(--primary))" }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-primary">
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
          </span>
          <span className="font-mono text-[12px] font-bold text-foreground tracking-tight">PA · Command Centre</span>
          <span className="font-mono text-[10px] text-muted-foreground">· {title}</span>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">
          / for commands · drop files to import · history mirrors the main tab
        </span>
      </div>
      <div className="flex-1 overflow-hidden bg-card">
        <EmbeddedAgentChat section={section} title={title} hideHeader />
      </div>
    </div>
  );
}
