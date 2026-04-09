import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Trash2, Loader2 } from "lucide-react";
import { streamChat } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AnalyticsPanelProps {
  section: string;
  title?: string;
}

export default function AnalyticsPanel({ section, title = "Analyst" }: AnalyticsPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    let assistantContent = "";
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    controllerRef.current = streamChat(
      section, text, messages,
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
  };

  return (
    <>
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-20 md:bottom-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          title={`Open ${title}`}
        >
          <MessageCircle size={20} />
        </button>
      )}

      {/* Panel */}
      <div className={cn(
        "fixed right-0 top-0 bottom-0 z-50 flex flex-col transition-all duration-300",
        open ? "w-[380px] max-w-[90vw] border-l border-border bg-card shadow-xl" : "w-0 overflow-hidden"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageCircle size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-[10px] text-muted-foreground">Data-aware analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={clearChat} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Clear">
                <Trash2 size={13} />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mb-3">
                <MessageCircle size={20} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Ask me anything</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                I can analyse your {section} data, find patterns, calculate totals, and give you actionable insights.
              </p>
              <div className="mt-4 space-y-1.5 w-full">
                {getSuggestions(section).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border transition-all"
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
                "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted/60 text-foreground rounded-bl-sm"
              )}>
                {msg.role === "assistant" ? (
                  <div className="whitespace-pre-wrap">
                    {msg.content || (streaming && i === messages.length - 1 ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin text-primary" />
                        <span className="text-muted-foreground text-xs">Analysing...</span>
                      </span>
                    ) : "")}
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border px-3 py-2.5">
          <div className="flex items-end gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[20px] max-h-[100px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px'; }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className={cn(
                "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                input.trim() && !streaming
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function getSuggestions(section: string): string[] {
  switch (section) {
    case "wip": return ["What's the total value of open WIP?", "Which tech has the most jobs?", "Show me overdue jobs"];
    case "quotes": return ["What's our quote conversion rate?", "Highest value pending quote?", "Quotes expiring this week"];
    case "defects": return ["How many critical defects are open?", "Which site has the most defects?", "Defects needing quotes"];
    case "invoices": return ["Total outstanding amount?", "Which invoices are overdue?", "Revenue this month"];
    case "suppliers": return ["What's the price for an MFB-1000?", "Compare panel prices", "Which supplier is cheapest for detectors?"];
    case "dashboard": return ["Give me a performance summary", "What should I focus on today?", "How are we tracking this week?"];
    case "tasks": return ["What's overdue?", "Prioritise my tasks for today", "Any blocked items?"];
    default: return ["Summarise the data", "What needs attention?", "Any trends to flag?"];
  }
}
