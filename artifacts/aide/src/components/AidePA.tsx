import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { streamChat } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Send, Sparkles, Trash2, Minimize2, Maximize2, Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StreamCursor } from "@/components/ui/StreamCursor";
import { drawerRight, easing } from "@/lib/motion";

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
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleSend = useCallback((text?: string) => {
    const message = text || input.trim();
    if (!message || isStreaming) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: message };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    abortRef.current = streamChat(
      section,
      message,
      history,
      (chunk) => setStreamingContent(prev => prev + chunk),
      () => {
        setStreamingContent(prev => {
          setMessages(msgs => [...msgs, { id: `a-${Date.now()}`, role: "assistant", content: prev }]);
          return "";
        });
        setIsStreaming(false);
      },
      (err) => {
        setMessages(prev => [...prev, {
          id: `e-${Date.now()}`, role: "assistant",
          content: `Something went wrong: ${err}. Please try again.`,
        }]);
        setIsStreaming(false);
        setStreamingContent("");
      },
    );
  }, [input, isStreaming, messages, section]);

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {!isOpen && (
          <motion.button
            key="aide-pa-fab"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22, ease: easing.spring }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="fixed bottom-20 md:bottom-6 right-4 z-[100] w-12 h-12 rounded-full
                       bg-gradient-to-br from-primary to-primary/80 text-primary-foreground
                       shadow-lg flex items-center justify-center group btn-spring"
            title="Open AIDE Assistant"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-40" aria-hidden />
            <Sparkles className="relative w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="aide-pa-panel"
            variants={drawerRight}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn(
              "fixed z-[100] glass-3 flex flex-col overflow-hidden",
              isExpanded
                ? "bottom-0 right-0 w-full h-full md:bottom-4 md:right-4 md:w-[560px] md:h-[700px] md:rounded-2xl"
                : "bottom-20 md:bottom-6 right-4 w-[360px] h-[520px] rounded-2xl"
            )}
            style={{ boxShadow: "var(--depth-4)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {isStreaming && (
                    <span className="absolute inset-0 rounded-lg ring-2 ring-primary/40 animate-pulse" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    AIDE Assistant
                    {isStreaming && <span className="aide-thinking-dots"><span/><span/><span/></span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-mono text-primary/70">{section}</span> · {pageLabel} context
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={handleClear}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors btn-spring"
                    title="Clear chat">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                <button onClick={() => setIsExpanded(v => !v)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors hidden md:flex btn-spring"
                  title={isExpanded ? "Minimise" : "Expand"}>
                  {isExpanded
                    ? <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
                    : <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors btn-spring" title="Close">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {messages.length === 0 && !streamingContent && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: easing.smooth }}
                  className="flex flex-col items-center justify-center h-full text-center px-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5
                                  flex items-center justify-center mb-3
                                  shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">Ask me anything</p>
                  <p className="text-[11px] text-muted-foreground mb-4 max-w-[260px]">
                    I have context from <span className="text-foreground font-medium">{pageLabel}</span> and
                    can analyse your data in real time.
                  </p>
                  <div className="w-full space-y-1.5">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={s}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i + 0.15, duration: 0.25, ease: easing.smooth }}
                        whileHover={{ x: 2 }}
                        onClick={() => handleSend(s)}
                        className="w-full text-left px-3 py-2 rounded-lg
                                   border border-border/60 bg-accent/30 hover:bg-accent
                                   text-xs text-foreground transition-colors
                                   flex items-center gap-2 group"
                      >
                        <span className="font-mono text-[10px] text-primary/60 group-hover:text-primary transition-colors">›</span>
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start",
                    "aide-message",
                    msg.role === "user" ? "aide-message--user" : "aide-message--assist"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/80 text-foreground rounded-bl-md border border-border/60"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none
                                      [&_p]:text-[12.5px] [&_p]:my-1 [&_li]:text-[12.5px]
                                      [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs
                                      [&_code]:text-[11px] [&_pre]:text-[11px]
                                      [&_table]:text-[11px] [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {streamingContent && (
                <div className="flex justify-start aide-message aide-message--assist">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2
                                  text-[12.5px] leading-relaxed bg-muted/80 text-foreground
                                  border border-border/60">
                    <div className="prose prose-sm dark:prose-invert max-w-none
                                    [&_p]:text-[12.5px] [&_p]:my-1 [&_li]:text-[12.5px]
                                    [&_code]:text-[11px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                    </div>
                    <StreamCursor />
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex justify-start aide-message aide-message--assist">
                  <div className="rounded-2xl rounded-bl-md px-3 py-2.5 bg-muted/80 border border-border/60
                                  flex items-center gap-2">
                    <span className="aide-thinking-dots"><span/><span/><span/></span>
                    <span className="text-[11px] text-muted-foreground">reading {section}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pt-2 pb-3 border-t border-border/60 shrink-0">
              <form onSubmit={e => { e.preventDefault(); handleSend(); }}
                    className="chat-input-bar flex items-center gap-1 pl-3 pr-1 py-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`Ask about ${pageLabel.toLowerCase()}…`}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-[12.5px] text-foreground
                             placeholder:text-muted-foreground/60 focus:outline-none
                             disabled:opacity-50 py-1.5"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center btn-spring",
                    input.trim() && !isStreaming
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground/40"
                  )}
                  aria-label="Send"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <p className="mt-1.5 px-1 font-mono text-[9px] text-muted-foreground/60 tracking-wider uppercase">
                Enter to send · Shift+Enter newline · Esc to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
