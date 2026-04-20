import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";

export default function AidePopout() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section") || "dashboard";
  const title = params.get("title") || "AIDE";

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-bold text-primary">AIDE</span>
          <span className="font-mono text-[10px] text-muted-foreground">{title}</span>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">Popout window — history syncs with main app</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <EmbeddedAgentChat section={section} title={title} hideHeader />
      </div>
    </div>
  );
}
