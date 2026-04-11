import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Trash2, Loader2, Copy, Check, History, ChevronLeft, Maximize2, Minimize2, Download } from "lucide-react";
import { streamChat, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SavedChat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

interface AnalyticsPanelProps {
  section: string;
  title?: string;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors" title="Copy">
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  );
}

function renderMarkdown(text: string) {
  // Simple markdown: **bold**, *italic*, `code`, - lists, ### headers
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### ")) return <h4 key={i} className="font-semibold text-foreground mt-2 mb-1 text-[12px]">{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={i} className="font-semibold text-foreground mt-2 mb-1 text-[13px]">{line.slice(3)}</h3>;
    if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="ml-3 list-disc text-[12px] leading-relaxed">{formatInline(line.slice(2))}</li>;
    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-3 list-decimal text-[12px] leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ""))}</li>;
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-[12px] leading-relaxed">{formatInline(line)}</p>;
  });
}

function formatInline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
    .replace(/\$([0-9,.]+)/g, '<span class="font-mono font-semibold">$$1</span>');
}

export default function AnalyticsPanel({ section, title = "Analyst" }: AnalyticsPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [wide, setWide] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  // Load chat history
  useEffect(() => {
    if (open && showHistory) {
      apiFetch(`/chat-history?section=${section}`).then(setSavedChats).catch(e => console.error(e));
    }
  }, [open, showHistory, section]);

  const handleSend = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    let assistantContent = "";
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    controllerRef.current = streamChat(
      section, msg, messages,
      (chunk) => {
        assistantContent += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      },
      () => setStreaming(false),
      (err) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: `Error: ${err}` };
          return updated;
        });
        setStreaming(false);
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const clearChat = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setMessages([]);
    setStreaming(false);
    setActiveHistoryId(null);
  };

  const saveChat = async () => {
    if (messages.length === 0) return;
    const firstMsg = messages[0]?.content?.slice(0, 50) || "Conversation";
    try {
      if (activeHistoryId) {
        await apiFetch(`/chat-history/${activeHistoryId}`, { method: "PATCH", body: JSON.stringify({ messages }) });
      } else {
        const saved = await apiFetch("/chat-history", { method: "POST", body: JSON.stringify({ section, title: firstMsg, messages }) });
        setActiveHistoryId(saved.id);
      }
    } catch (e) { console.error(e); }
  };

  // Auto-save on every assistant response
  useEffect(() => {
    if (messages.length >= 2 && !streaming) {
      const timer = setTimeout(saveChat, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, streaming]);

  const loadChat = (chat: SavedChat) => {
    setMessages(chat.messages as Message[]);
    setActiveHistoryId(chat.id);
    setShowHistory(false);
  };

  const deleteChat = async (id: string) => {
    try {
      await apiFetch(`/chat-history/${id}`, { method: "DELETE" });
      setSavedChats(prev => prev.filter(c => c.id !== id));
      if (activeHistoryId === id) clearChat();
    } catch (e) { console.error(e); }
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === "user" ? "You" : "Analyst"}: ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${section}-analysis-${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const panelWidth = wide ? "w-[520px] max-w-[95vw]" : "w-[380px] max-w-[90vw]";

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-20 md:bottom-4 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          title={`Open ${title}`}
        >
          <MessageCircle size={18} />
        </button>
      )}

      <div className={cn(
        "fixed right-0 top-0 bottom-0 z-50 flex flex-col transition-all duration-300",
        open ? `${panelWidth} border-l border-border bg-card shadow-xl` : "w-0 overflow-hidden"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {showHistory ? (
              <button onClick={() => setShowHistory(false)} className="p-1 rounded text-muted-foreground hover:text-foreground"><ChevronLeft size={14} /></button>
            ) : (
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <MessageCircle size={12} className="text-primary" />
              </div>
            )}
            <div>
              <p className="text-[13px] font-semibold text-foreground">{showHistory ? "Chat History" : title}</p>
              {!showHistory && <p className="text-[9px] text-muted-foreground">Data-aware · {section}</p>}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && !showHistory && (
              <>
                <button onClick={exportChat} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Export"><Download size={12} /></button>
                <button onClick={clearChat} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="New chat"><Trash2 size={12} /></button>
              </>
            )}
            <button onClick={() => setShowHistory(v => !v)} className={cn("p-1.5 rounded transition-colors", showHistory ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="History"><History size={12} /></button>
            <button onClick={() => setWide(v => !v)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={wide ? "Compact" : "Wide"}>
              {wide ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X size={13} /></button>
          </div>
        </div>

        {/* History View */}
        {showHistory ? (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin">
            {savedChats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No saved conversations yet</p>
            ) : savedChats.map(chat => (
              <div key={chat.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => loadChat(chat)}>
                <MessageCircle size={12} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{chat.title}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(chat.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteChat(chat.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all"><X size={10} /></button>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3">
                    <MessageCircle size={18} className="text-primary" />
                  </div>
                  <p className="text-[13px] font-medium text-foreground mb-1">Ask about your data</p>
                  <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                    Analyses your live {section} data. Ask about revenue, patterns, trends, or specific records.
                  </p>
                  <div className="space-y-1.5 w-full">
                    {getSuggestions(section).map((s, i) => (
                      <button key={i} onClick={() => handleSend(s)}
                        className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[90%] rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed relative group",
                    msg.role === "user"
                      ? "chat-user-bubble rounded-br-sm"
                      : "bg-muted/40 text-foreground rounded-bl-sm border border-border/50"
                  )}>
                    {msg.role === "assistant" ? (
                      <>
                        {msg.content ? (
                          <div>{renderMarkdown(msg.content)}</div>
                        ) : (streaming && i === messages.length - 1 ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={11} className="animate-spin text-primary" />
                            <span className="text-muted-foreground text-[11px]">Analysing...</span>
                          </span>
                        ) : "")}
                        {msg.content && !streaming && (
                          <div className="absolute -bottom-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyBtn text={msg.content} />
                          </div>
                        )}
                      </>
                    ) : msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-border px-3 py-2">
              <div className="flex items-end gap-2 bg-muted/30 rounded-xl px-3 py-2 border border-border focus-within:border-primary/30 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your data..."
                  rows={1}
                  className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none min-h-[18px] max-h-[80px]"
                  style={{ height: 'auto', overflow: 'hidden' }}
                  onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 80) + 'px'; }}
                />
                <button onClick={() => handleSend()} disabled={!input.trim() || streaming}
                  className={cn("shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all",
                    input.trim() && !streaming ? "bg-primary text-white" : "bg-muted text-muted-foreground/30")}>
                  <Send size={11} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function getSuggestions(section: string): string[] {
  switch (section) {
    case "wip": return ["Total value of open WIP?", "Which tech has most jobs?", "Show overdue jobs", "Revenue gap analysis"];
    case "quotes": return ["Quote conversion rate?", "Highest pending quote?", "Quotes expiring soon", "Revenue from accepted quotes"];
    case "defects": return ["Critical defects open?", "Site with most defects?", "Defects needing quotes", "Compliance risk summary"];
    case "invoices": return ["Total outstanding?", "Overdue invoices?", "Revenue this month", "Aged receivables breakdown"];
    case "suppliers": return ["Price for MFB-1000?", "Compare panel prices", "Cheapest detector supplier?", "Total spend by supplier"];
    case "dashboard": return ["Performance summary", "What to focus on today?", "Weekly trend analysis", "Revenue vs target status"];
    case "tasks": return ["Overdue tasks?", "Prioritise for today", "Blocked items?", "Completion rate this week"];
    default: return ["Summarise the data", "What needs attention?", "Trend analysis", "Key metrics overview"];
  }
}
