import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";

/**
 * PA Command Centre — standalone pop-out window.
 *
 * Loaded via window.open() from AIDEAssistant. Shares localStorage with the
 * main tab so message history mirrors both ways. Opaque chrome + theme
 * primary accent stripe so it reads as the same surface as the tray.
 */
export default function AidePopout() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section") || "dashboard";
  const title = params.get("title") || "AIDE";

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
