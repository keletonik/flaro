import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { streamChat } from "@/lib/api";
import {
  MessageCircle, X, Send, Loader2, Sparkles,
  Trash2, Minimize2, Maximize2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type SectionType = "wip" | "quotes" | "defects" | "invoices" | "suppliers" | "dashboard" | "tasks" | "fip";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const PAGE_SECTION_MAP: Record<string, SectionType> = {
  "/": "dashboard",
  "/operations": "wip",
  "/analytics": "dashboard",
  "/jobs": "wip",
  "/todos": "tasks",
  "/projects": "tasks",
  "/suppliers": "suppliers",
  "/schedule": "dashboard",
  "/notes": "dashboard",
  "/toolbox": "dashboard",
  "/fip": "dashboard",
  "/settings": "dashboard",
  "/chat": "dashboard",
};

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/operations": "Operations",
  "/analytics": "Analytics",
  "/jobs": "WIPs",
  "/todos": "Tasks",
  "/projects": "Projects",
  "/suppliers": "Suppliers",
  "/schedule": "Schedule",
  "/notes": "Notes",
  "/toolbox": "Toolbox",
  "/fip": "FIP Knowledge Base",
  "/settings": "Settings",
  "/chat": "Chat",
};

const SECTION_SUGGESTIONS: Record<SectionType, string[]> = {
  dashboard: [
    "Give me today's summary",
    "What needs attention this week?",
    "Revenue performance update",
  ],
  wip: [
    "Which jobs are overdue?",
    "Top 10 highest value WIPs",
    "Technician workload breakdown",
  ],
  quotes: [
    "Quote conversion rate this month",
    "Highest value pending quotes",
    "Quotes expiring this week",
  ],
  defects: [
    "Critical defects summary",
    "Sites with most defects",
    "Defect resolution rate",
  ],
  invoices: [
    "Outstanding invoices summary",
    "Overdue accounts",
    "Revenue collected this month",
  ],
  suppliers: [
    "Compare prices across suppliers",
    "Best deals on fire panels",
    "Supplier product summary",
  ],
  tasks: [
    "What's overdue?",
    "Today's priority tasks",
    "Tasks by urgency",
  ],
  fip: [
    "Panel models by manufacturer",
    "Compliance standards summary",
    "Common fault codes",
  ],
};

interface AidePAProps {
  currentPath: string;
}

export default function AidePA({ currentPath }: AidePAProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const basePath = currentPath.split("/").slice(0, 2).join("/") || "/";
  const section = PAGE_SECTION_MAP[basePath] || "dashboard";
  const pageLabel = PAGE_LABELS[basePath] || "Page";
  const suggestions = SECTION_SUGGESTIONS[section] || SECTION_SUGGESTIONS.dashboard;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback((text?: string) => {
    const message = text || input.trim();
    if (!message || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    abortRef.current = streamChat(
      section,
      message,
      history,
      (chunk) => {
        setStreamingContent(prev => prev + chunk);
      },
      () => {
        setStreamingContent(prev => {
          const assistantMsg: ChatMessage = {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: prev,
          };
          setMessages(msgs => [...msgs, assistantMsg]);
          return "";
        });
        setIsStreaming(false);
      },
      (err) => {
        const errorMsg: ChatMessage = {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `Something went wrong: ${err}. Please try again.`,
        };
        setMessages(prev => [...prev, errorMsg]);
        setIsStreaming(false);
        setStreamingContent("");
      },
    );
  }, [input, isStreaming, messages, section]);

  const handleClear = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-[100] w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        title="Open AIDE Assistant"
      >
        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed z-[100] bg-card border border-border shadow-2xl flex flex-col transition-all duration-300",
      isExpanded
        ? "bottom-0 right-0 w-full h-full md:bottom-4 md:right-4 md:w-[560px] md:h-[700px] md:rounded-2xl"
        : "bottom-20 md:bottom-6 right-4 w-[360px] h-[480px] rounded-2xl"
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-2xl shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">AIDE Assistant</p>
            <p className="text-[10px] text-muted-foreground">{pageLabel} context</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={handleClear} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Clear chat">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg hover:bg-accent transition-colors hidden md:flex" title={isExpanded ? "Minimise" : "Expand"}>
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" /> : <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Close">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
        {messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Ask me anything</p>
            <p className="text-xs text-muted-foreground mb-4">
              I have context from the {pageLabel} page and can analyse your data.
            </p>
            <div className="w-full space-y-1.5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-accent/50 hover:bg-accent text-xs text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-xs",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            )}>
              {msg.role === "assistant" ? (
                <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:text-xs [&_p]:my-1 [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:text-[10px] [&_pre]:text-[10px] [&_table]:text-[10px] [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs bg-muted text-foreground">
              <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:text-xs [&_p]:my-1 [&_li]:text-xs [&_code]:text-[10px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 bg-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-2 border-t border-border shrink-0">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Ask about ${pageLabel.toLowerCase()}...`}
            disabled={isStreaming}
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
