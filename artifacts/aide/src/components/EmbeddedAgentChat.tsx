/**
 * Always-visible inline agent chat used by the Estimation Workbench.
 *
 * Purpose-built so it can coexist with:
 *   - Replit's floating AidePA widget (read-only / streamChat)
 *   - The legacy AnalyticsPanel drawer (read-only / streamChat)
 * without conflicting with either. This one talks to /api/chat/agent and
 * has the full tool-use surface: search / create / update / delete / navigate.
 *
 * Fills 100% of its parent container — the Workbench mounts it in a 360px
 * right-hand column.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Wrench, Check, AlertCircle, Trash2, Bot } from "lucide-react";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamAgent, type AgentToolEvent, type AttachmentMeta } from "@/lib/api";
import { AttachmentPicker, AttachmentPreviewChip } from "@/components/AttachmentPicker";
import { cn } from "@/lib/utils";

// Page notes — the operator can pin free-text guidance on a page
// (column preferences, "hide anything older than 90 days", "always
// show site name"). Stored in localStorage so they survive reloads;
// read on every send and shipped to /api/chat/agent as `pageNotes`
// so the master prompt can apply them.
export const PAGE_NOTES_KEY_PREFIX = "aide-page-notes:";
export function loadPageNotes(section: string): string {
  try { return localStorage.getItem(PAGE_NOTES_KEY_PREFIX + section) ?? ""; }
  catch { return ""; }
}
export function savePageNotes(section: string, text: string) {
  try { localStorage.setItem(PAGE_NOTES_KEY_PREFIX + section, text); }
  catch { /* ignore */ }
}

interface ToolRun {
  name: string;
  input?: Record<string, unknown>;
  status: "running" | "ok" | "error";
  error?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  tools?: ToolRun[];
}

interface Props {
  section: string;
  title?: string;
  suggestions?: string[];
}

// Message rendering — delegates to react-markdown with GitHub-flavoured
// markdown so the assistant's tables, inline code, headings and lists
// all render properly. The previous hand-rolled parser matched only
// bullets + headings and rendered pipe-delimited tables as raw text,
// which is why operator screenshots were full of "|------|------|" noise.
function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="prose-aide text-[12px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h4 className="text-[13px] font-semibold text-foreground mt-2 mb-1">{children}</h4>,
          h2: ({ children }) => <h4 className="text-[12.5px] font-semibold text-foreground mt-2 mb-1">{children}</h4>,
          h3: ({ children }) => <h5 className="text-[12px] font-semibold text-foreground mt-1.5 mb-0.5 uppercase tracking-wide">{children}</h5>,
          p:  ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-[12px]">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <pre className="bg-muted/50 border border-border rounded-md p-2 my-1.5 overflow-x-auto text-[11px] font-mono">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-muted/70 border border-border/60 rounded px-1 py-[1px] text-[11px] font-mono text-foreground">
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a href={href ?? "#"} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline break-all">{children}</a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-2 my-1.5 text-muted-foreground italic">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 -mx-1 overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-border/60 last:border-0">{children}</tr>,
          th: ({ children }) => <th className="text-left font-semibold px-2 py-1 text-foreground uppercase tracking-wide text-[10px]">{children}</th>,
          td: ({ children }) => <td className="px-2 py-1 align-top text-foreground/90">{children}</td>,
          hr: () => <hr className="my-2 border-border/40" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

const DATA_CHANGED_EVENT = "aide-data-changed";
function emitDataChanged() {
  try { window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT)); } catch { /* ignore */ }
}

export default function EmbeddedAgentChat({ section, title = "AIDE Agent", suggestions = [] }: Props) {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pending, setPending] = useState<AttachmentMeta[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Listen for the command palette's "ask AIDE" event. When the user
  // types a question in Cmd-K and hits enter on the Ask-AIDE row, the
  // palette dispatches `aide-open-with-prompt` with the query; we
  // pick it up here and auto-send.
  useEffect(() => {
    const handler = (ev: Event) => {
      const prompt = (ev as CustomEvent).detail?.prompt;
      if (typeof prompt === "string" && prompt.trim()) {
        setTimeout(() => send(prompt), 100);
      }
    };
    window.addEventListener("aide-open-with-prompt", handler);
    return () => window.removeEventListener("aide-open-with-prompt", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = (text?: string) => {
    const msg = (text || input).trim();
    const attachmentIds = pending.length > 0 ? pending.map((p) => p.id) : undefined;
    if ((!msg && !attachmentIds) || streaming) return;
    setInput("");
    setPending([]);
    setMessages(prev => [...prev, { role: "user", content: msg || (attachmentIds ? `(${attachmentIds.length} file attached)` : "") }]);
    setStreaming(true);
    let assistantContent = "";
    const tools: ToolRun[] = [];
    setMessages(prev => [...prev, { role: "assistant", content: "", tools: [] }]);

    const patch = (p: Partial<Message>) => {
      setMessages(prev => {
        const u = [...prev];
        const last = u[u.length - 1];
        if (last?.role === "assistant") u[u.length - 1] = { ...last, ...p };
        return u;
      });
    };

    const pageNotes = loadPageNotes(section);
    controllerRef.current = streamAgent(
      section,
      msg,
      messages.map(m => ({ role: m.role, content: m.content })),
      {
        onText: (chunk) => { assistantContent += chunk; patch({ content: assistantContent }); },
        onToolStart: (ev: AgentToolEvent) => {
          tools.push({ name: ev.name, input: ev.input, status: "running" });
          patch({ tools: [...tools] });
        },
        onToolResult: (ev: AgentToolEvent) => {
          for (let k = tools.length - 1; k >= 0; k--) {
            if (tools[k].name === ev.name && tools[k].status === "running") {
              tools[k] = { ...tools[k], status: ev.ok ? "ok" : "error", error: ev.error };
              break;
            }
          }
          patch({ tools: [...tools] });
        },
        onUiAction: (action) => {
          // navigate + refresh are the original pair.
          // set_filter / open_record / open_modal were added in Pass 3
          // fix #4. Each one dispatches a window custom event that the
          // host page listens for. Pages opt in by adding a single
          // useEffect + event listener — zero prop threading.
          if (action.type === "navigate" && typeof action.path === "string") {
            setLocation(action.path);
          } else if (action.type === "refresh") {
            emitDataChanged();
          } else if (action.type === "set_filter") {
            window.dispatchEvent(new CustomEvent("aide-set-filter", {
              detail: { filter_key: action.filter_key, value: action.value },
            }));
          } else if (action.type === "open_record") {
            window.dispatchEvent(new CustomEvent("aide-open-record", {
              detail: { table: action.table, id: action.id },
            }));
          } else if (action.type === "open_modal") {
            window.dispatchEvent(new CustomEvent("aide-open-modal", {
              detail: { kind: action.kind, id: action.id ?? null },
            }));
          }
        },
        onDone: () => setStreaming(false),
        onError: (err) => { patch({ content: assistantContent || `Error: ${err}` }); setStreaming(false); },
      },
      attachmentIds,
      pageNotes || undefined,
    );
  };

  const clearChat = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setMessages([]);
    setStreaming(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="h-full w-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Bot size={12} className="text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">{title}</p>
            <p className="text-[9px] text-muted-foreground">Tool-use enabled · {section}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="New chat"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-3">
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3">
              <Bot size={18} className="text-primary" />
            </div>
            <p className="text-[13px] font-medium text-foreground mb-1">Action-capable agent</p>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              I can search the catalogue, create estimates, add lines, adjust markup, and navigate. Try:
            </p>
            <div className="space-y-1.5 w-full">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[92%] rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted/40 text-foreground rounded-bl-sm border border-border/50",
            )}>
              {msg.role === "assistant" ? (
                <>
                  {msg.tools && msg.tools.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {msg.tools.map((t, tk) => (
                        <div key={tk} className="flex items-center gap-1.5 text-[10.5px]">
                          {t.status === "running" ? (
                            <Loader2 size={10} className="animate-spin text-primary shrink-0" />
                          ) : t.status === "ok" ? (
                            <Check size={10} className="text-emerald-500 shrink-0" />
                          ) : (
                            <AlertCircle size={10} className="text-destructive shrink-0" />
                          )}
                          <Wrench size={9} className="text-muted-foreground/50 shrink-0" />
                          <span className="font-mono text-muted-foreground truncate">
                            {t.name}
                            {t.input?.table ? `(${String(t.input.table)})` : ""}
                            {t.input?.estimate_id ? ` [#${String(t.input.estimate_id).slice(0, 8)}]` : ""}
                          </span>
                          {t.status === "error" && t.error && (
                            <span className="text-destructive truncate" title={t.error}>— {t.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content ? (
                    <MarkdownMessage text={msg.content} />
                  ) : (streaming && i === messages.length - 1 ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin text-primary" />
                      <span className="text-muted-foreground text-[11px]">Working…</span>
                    </span>
                  ) : "")}
                </>
              ) : msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-3 py-2">
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {pending.map((p) => (
              <AttachmentPreviewChip key={p.id} meta={p} onRemove={() => setPending((prev) => prev.filter((x) => x.id !== p.id))} />
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 bg-muted/30 rounded-xl px-3 py-2 border border-border focus-within:border-primary/30 transition-all">
          <AttachmentPicker
            pending={[]}
            onChange={(added) => setPending((prev) => [...prev, ...added])}
            source="embedded"
            disabled={streaming}
            className="shrink-0"
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search, create, update — ask in plain English"
            rows={1}
            className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none min-h-[18px] max-h-[80px]"
            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 80) + 'px'; }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className={cn(
              "shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all",
              input.trim() && !streaming ? "bg-primary text-white" : "bg-muted text-muted-foreground/30",
            )}
          >
            <Send size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
