import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";

export default function AidePopout() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section") || "dashboard";
  const title = params.get("title") || "AIDE";

  // Use fixed inset-0 + dvh so the chat input is ALWAYS pinned to the bottom
  // of the actual visible viewport, regardless of window resize, mobile
  // browser chrome, or zoom level. The middle column uses min-h-0 so the
  // messages list can shrink and the input never gets pushed off-screen.
  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[12px] font-bold text-primary shrink-0">AIDE</span>
          <span className="font-mono text-[10px] text-muted-foreground truncate">{title}</span>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground hidden sm:inline shrink-0 ml-2">
          Popout — history syncs with main app
        </span>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        <EmbeddedAgentChat section={section} title={title} hideHeader />
      </main>
    </div>
  );
}
