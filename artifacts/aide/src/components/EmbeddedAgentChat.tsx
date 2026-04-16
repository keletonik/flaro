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
import { streamAgent, type AgentToolEvent, type AttachmentMeta } from "@/lib/api";
import { AttachmentPicker, AttachmentPreviewChip } from "@/components/AttachmentPicker";
import { cn } from "@/lib/utils";

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

function formatInline(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
    .replace(/\$([0-9,.]+)/g, '<span class="font-mono font-semibold">$$$1</span>');
}

function isTableSep(line: string): boolean {
  return /^\|[\s:]*-{2,}[\s:|-]*\|$/.test(line.trim()) || /^[\s:]*-{2,}[\s:|-]*$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);
}

function renderTable(lines: string[], key: number) {
  const headerCells = parseTableRow(lines[0]);
  const bodyRows = lines.slice(2).map(parseTableRow);
  return (
    <div key={key} className="overflow-x-auto my-2 rounded-lg border border-border">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-muted/60">
            {headerCells.map((cell, i) => (
              <th key={i} className="text-left px-2.5 py-1.5 text-muted-foreground font-semibold uppercase tracking-wide text-[10px] whitespace-nowrap border-b border-border"
                dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-card" : "bg-muted/20"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-2.5 py-1.5 text-foreground border-b border-border/40 whitespace-nowrap"
                  dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // GFM table: row starting with |, followed by separator line
    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const tableLines: string[] = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|") && !isTableSep(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(renderTable(tableLines, elements.length));
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { elements.push(<hr key={elements.length} className="my-2 border-border/40" />); i++; continue; }

    // Headers
    if (line.startsWith("### ")) { elements.push(<h4 key={elements.length} className="font-semibold text-foreground mt-2 mb-1 text-[12px]">{line.slice(4)}</h4>); i++; continue; }
    if (line.startsWith("## ")) { elements.push(<h3 key={elements.length} className="font-semibold text-foreground mt-2 mb-1 text-[13px]">{line.slice(3)}</h3>); i++; continue; }

    // Unordered list
    if (line.startsWith("- ") || line.startsWith("* ")) { elements.push(<li key={elements.length} className="ml-3 list-disc text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />); i++; continue; }

    // Ordered list
    if (/^\d+\.\s/.test(line)) { elements.push(<li key={elements.length} className="ml-3 list-decimal text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\.\s/, "")) }} />); i++; continue; }

    // Empty line
    if (line.trim() === "") { elements.push(<div key={elements.length} className="h-2" />); i++; continue; }

    // Normal paragraph
    elements.push(<p key={elements.length} className="text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />);
    i++;
  }
  return elements;
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
                    <div>{renderMarkdown(msg.content)}</div>
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
            pending={pending}
            onChange={setPending}
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
