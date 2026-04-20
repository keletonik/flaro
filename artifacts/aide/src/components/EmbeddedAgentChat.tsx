/**
 * Embedded agent chat used by the AIDE popout and the Estimation Workbench.
 *
 * Talks to /api/chat/agent with the full tool-use surface:
 * search / create / update / delete / navigate.
 *
 * Features:
 *   - GFM markdown rendering with table support
 *   - Follow-up suggestion chips after assistant messages
 *   - File attachment support (images, PDFs, CSV, text)
 *   - Tool execution progress inline
 *
 * Fills 100% of its parent container.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Trash2, Sparkles } from "lucide-react";
import { ThinkingIndicator } from "@/components/ui/ThinkingIndicator";
import { useLocation } from "wouter";
import { streamAgent, type AgentToolEvent, type AttachmentMeta } from "@/lib/api";
import { AttachmentPicker, AttachmentPreviewChip } from "@/components/AttachmentPicker";
import { cn } from "@/lib/utils";

const PAGE_NOTES_KEY = "aide-page-notes";
export function loadPageNotes(section: string): string {
  try { return localStorage.getItem(`${PAGE_NOTES_KEY}:${section}`) || ""; } catch { return ""; }
}
export function savePageNotes(section: string, notes: string): void {
  try { if (notes) localStorage.setItem(`${PAGE_NOTES_KEY}:${section}`, notes); else localStorage.removeItem(`${PAGE_NOTES_KEY}:${section}`); } catch {}
}

const HISTORY_KEY = "aide-chat-history:global";
const HISTORY_LIMIT = 200;
function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m) => m && (m.role === "user" || m.role === "assistant")) as Message[];
  } catch {
    return [];
  }
}
function saveHistory(messages: Message[]): void {
  try {
    const trimmed = messages.slice(-HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}
function clearHistoryStorage(): void {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
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
  followUps?: string[];
}

interface Props {
  section: string;
  title?: string;
  suggestions?: string[];
  hideHeader?: boolean;
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

/** Extract <follow-ups>...</follow-ups> block from assistant text */
function extractFollowUps(text: string): { cleaned: string; followUps: string[] } {
  const match = text.match(/<follow-ups>([\s\S]*?)<\/follow-ups>/);
  if (!match) return { cleaned: text, followUps: [] };
  const cleaned = text.replace(/<follow-ups>[\s\S]*?<\/follow-ups>/, "").trim();
  const followUps = match[1].split("\n").map(l => l.trim()).filter(l => l.length > 0);
  return { cleaned, followUps };
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

export default function EmbeddedAgentChat({ section, title = "AIDE", suggestions = [], hideHeader = false }: Props) {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>(() => loadHistory());
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pending, setPending] = useState<AttachmentMeta[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (streaming) return;
    saveHistory(messages);
  }, [messages, streaming]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) setMessages(loadHistory());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Listen for the command palette / CSV import auto-send events
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

    const recentHistory = messages.slice(-40).map(m => ({ role: m.role, content: m.content }));
    controllerRef.current = streamAgent(
      section,
      msg,
      recentHistory,
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
        onDone: () => {
          setStreaming(false);
          // Extract follow-up suggestions from the final content
          setMessages(prev => {
            const u = [...prev];
            const last = u[u.length - 1];
            if (last?.role === "assistant" && last.content) {
              const { cleaned, followUps } = extractFollowUps(last.content);
              u[u.length - 1] = { ...last, content: cleaned, followUps };
            }
            return u;
          });
        },
        onError: (err) => { patch({ content: assistantContent || `Error: ${err}` }); setStreaming(false); },
      },
      attachmentIds,
    );
  };

  const clearChat = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setMessages([]);
    setStreaming(false);
    clearHistoryStorage();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="h-full w-full flex flex-col bg-card">
      {/* Header (only shown when not embedded in AIDEAssistant popout) */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles size={13} className="text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground tracking-tight">AIDE</p>
              <p className="text-[9px] text-muted-foreground font-medium">{title}</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="New conversation"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}

      {/* Clear chat button when header is hidden (popout mode) */}
      {hideHeader && messages.length > 0 && (
        <div className="absolute top-[52px] right-3 z-10">
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors bg-card/80 backdrop-blur-sm"
            title="New conversation"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4">
              <Sparkles size={20} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">What can I help with?</p>
            <p className="text-[11px] text-muted-foreground mb-5 leading-relaxed max-w-[280px]">
              Search, create, update, analyse data, or paste email trails for a full breakdown.
            </p>
            <div className="space-y-1.5 w-full max-w-[320px]">
              {suggestions.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-[11px] text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-border transition-all leading-relaxed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/40 text-foreground rounded-bl-md border border-border/50",
              )}>
                {msg.role === "assistant" ? (
                  <>
                    {msg.content ? (
                      <div>{renderMarkdown(msg.content)}</div>
                    ) : (streaming && i === messages.length - 1 ? (
                      <ThinkingIndicator size="sm" />
                    ) : "")}
                  </>
                ) : msg.content}
              </div>
            </div>

            {/* Follow-up chips (multiple choice style) */}
            {msg.role === "assistant" && msg.followUps && msg.followUps.length > 0 && !streaming && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                {msg.followUps.map((fu, fi) => (
                  <button
                    key={fi}
                    onClick={() => send(fu)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/50 hover:border-border transition-all"
                  >
                    {fu}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-3 py-2.5">
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pending.map((p) => (
              <AttachmentPreviewChip key={p.id} meta={p} onRemove={() => setPending((prev) => prev.filter((x) => x.id !== p.id))} />
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 bg-muted/30 rounded-xl px-3 py-2.5 border border-border focus-within:border-primary/30 transition-all">
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
            placeholder="Ask anything, paste emails, or upload docs..."
            rows={1}
            className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none min-h-[20px] max-h-[80px]"
            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 80) + 'px'; }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className={cn(
              "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
              input.trim() && !streaming ? "bg-primary text-white hover:bg-primary/90" : "bg-muted text-muted-foreground/30",
            )}
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
