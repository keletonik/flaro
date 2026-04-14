/**
 * /pa — the PA page (replaces /chat).
 *
 * Three-column Notion-style layout per docs/pa-rebuild/BRIEF.md §4.1:
 *   ┌──────────┬─────────────────────────┬──────────────┐
 *   │ Sidebar  │ Messages + input        │ (reserved)   │
 *   │ (260px)  │                         │              │
 *   │ Reminders│                         │              │
 *   └──────────┴─────────────────────────┴──────────────┘
 *
 * On mobile <768px the sidebar collapses into a toggleable drawer and
 * the messages column takes the full viewport.
 *
 * The stream uses streamAgent from lib/api.ts — this is the SAME tool-
 * use endpoint the embedded chat already uses, so the PA inherits
 * every existing agent tool (db_*, metric_*, ui_*, estimate_*,
 * reminder_*) for free.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { streamAgent, type AgentToolEvent } from "@/lib/api";
import { PAInput } from "@/components/pa/PAInput";
import { PAMessage, type PAMessageData, type PAToolCall } from "@/components/pa/PAMessage";
import { PASidebar } from "@/components/pa/PASidebar";
import { AlertCircle, Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DATA_CHANGED_EVENT = "aide-data-changed";

function makeId() {
  return `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const STARTER_PROMPTS: { label: string; prompt: string }[] = [
  { label: "Brief me", prompt: "Give me my daily focus brief — stale tasks, upcoming reminders, key numbers." },
  { label: "What have I been neglecting?", prompt: "What have I been neglecting? Show me the top 5 stale tasks." },
  { label: "Remind me tomorrow 9am", prompt: "Remind me tomorrow 9am to run the morning standup" },
  { label: "Add a training rule", prompt: "From now on, never ask me about the insurance claim — save that as a training rule." },
];

/**
 * Strip the trailing `<follow-ups>...</follow-ups>` block that the PA
 * system prompt asks the model to append, and return the cleaned text
 * plus the extracted list of chips.
 */
function extractFollowUps(content: string): { cleaned: string; followUps: string[] } {
  const match = content.match(/<follow-ups>([\s\S]*?)<\/follow-ups>\s*$/i);
  if (!match) return { cleaned: content, followUps: [] };
  const chips = match[1]
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l.length <= 80);
  const cleaned = content.slice(0, match.index).trimEnd();
  return { cleaned, followUps: chips.slice(0, 5) };
}

export default function PAPage() {
  const [messages, setMessages] = useState<PAMessageData[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const autoBriefDoneRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Auto-brief on first open — runs once per session when there's no
  // conversation history. If the user disables this via a training
  // rule the PA can skip it on subsequent opens.
  useEffect(() => {
    if (autoBriefDoneRef.current) return undefined;
    if (messages.length > 0) return undefined;
    if (typeof window === "undefined") return undefined;
    let cancelled = false;
    try {
      const key = "aide-pa-autobriefed";
      const last = sessionStorage.getItem(key);
      if (last) return undefined;
      autoBriefDoneRef.current = true;
      sessionStorage.setItem(key, new Date().toISOString());
      const t = setTimeout(() => {
        if (!cancelled) send("Give me my daily focus brief.");
      }, 400);
      return () => { cancelled = true; clearTimeout(t); };
    } catch {
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newChat = useCallback(() => {
    controllerRef.current?.abort();
    setMessages([]);
    setError(null);
    setStreaming(false);
    setSidebarOpen(false);
  }, []);

  const send = useCallback((text: string) => {
    if (!text.trim() || streaming) return;
    setError(null);

    const userMsg: PAMessageData = {
      id: makeId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    const assistantMsg: PAMessageData = {
      id: makeId(),
      role: "assistant",
      content: "",
      toolCalls: [],
    };

    setMessages((prev) => {
      const history = prev;
      const next = [...history, userMsg, assistantMsg];
      setStreaming(true);
      controllerRef.current = streamAgent(
        "pa",
        text,
        history.map((m) => ({ role: m.role, content: m.content })),
        {
          onText: (chunk) => {
            setMessages((cur) => {
              const updated = [...cur];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + chunk };
              }
              return updated;
            });
          },
          onToolStart: (ev: AgentToolEvent) => {
            setMessages((cur) => {
              const updated = [...cur];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                const calls = [...(last.toolCalls ?? []), { name: ev.name, input: ev.input } as PAToolCall];
                updated[updated.length - 1] = { ...last, toolCalls: calls };
              }
              return updated;
            });
          },
          onToolResult: (ev: AgentToolEvent) => {
            setMessages((cur) => {
              const updated = [...cur];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant" && last.toolCalls) {
                const calls = [...last.toolCalls];
                for (let i = calls.length - 1; i >= 0; i--) {
                  if (calls[i].name === ev.name && calls[i].ok === undefined) {
                    calls[i] = { ...calls[i], ok: ev.ok, error: ev.error };
                    break;
                  }
                }
                updated[updated.length - 1] = { ...last, toolCalls: calls };
              }
              return updated;
            });
            // When a mutating tool finishes, broadcast so the sidebar
            // re-reads reminders without a full refresh.
            if (ev.ok && /^(reminder_|db_|estimate_)/.test(ev.name)) {
              window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
            }
          },
          onDone: () => {
            // Strip the <follow-ups>...</follow-ups> trailing block from
            // the last assistant message and surface the chips.
            setMessages((cur) => {
              const updated = [...cur];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant" && last.content) {
                const { cleaned, followUps } = extractFollowUps(last.content);
                updated[updated.length - 1] = {
                  ...last,
                  content: cleaned,
                  followUps: followUps.length > 0 ? followUps : last.followUps,
                };
              }
              return updated;
            });
            setStreaming(false);
          },
          onError: (err) => {
            setError(err);
            setStreaming(false);
          },
        },
      );
      return next;
    });
  }, [streaming]);

  return (
    <div className="h-[calc(100vh-3rem)] flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "w-[260px] shrink-0 border-r border-border",
          "md:block md:static",
          sidebarOpen ? "fixed inset-y-0 left-0 z-40" : "hidden",
        )}
      >
        <PASidebar onNewChat={newChat} />
      </div>

      {/* Main column */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="md:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              title="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-semibold text-foreground">AIDE PA</h1>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Voice · slash commands · tool-use agent
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => send("Give me my daily focus brief.")}
              disabled={streaming}
              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded disabled:opacity-40"
              title="Run daily focus brief"
            >
              <Sparkles className="w-3 h-3" />
              Brief me
            </button>
            {messages.length > 0 && (
            <button
              type="button"
              onClick={newChat}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
            >
              New chat
            </button>
            )}
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4"
        >
          {messages.length === 0 && !streaming && (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">How can I help?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                I'm your Personal Assistant for tasks, reminders, and everything on your plate.
                Hold the mic to talk, type "/" for commands, or hit <b>Brief me</b> to see what
                needs attention.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">
                {STARTER_PROMPTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => send(s.prompt)}
                    className="text-left px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-xs font-medium text-foreground">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{s.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <PAMessage
              key={m.id}
              message={m}
              streaming={streaming && m.id === messages[messages.length - 1]?.id}
              onFollowUpClick={send}
            />
          ))}

          {error && (
            <div className="max-w-2xl mx-auto flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="px-4 md:px-6 pb-4 pt-2 border-t border-border bg-background">
          <div className="max-w-3xl mx-auto">
            <PAInput onSubmit={send} disabled={streaming} />
          </div>
        </div>
      </main>
    </div>
  );
}
