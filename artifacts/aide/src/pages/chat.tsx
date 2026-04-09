import { useState, useEffect, useRef } from "react";
import { Send, RefreshCw, MessageCircle, Zap, Copy, Check } from "lucide-react";
import { useGetAnthropicConversation, getGetAnthropicConversationQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CONVERSATION_ID = "1";

const SUGGESTIONS = [
  "Summarise today's open jobs",
  "What jobs are overdue?",
  "Draft a follow-up email for a delayed inspection",
  "Who is on call this week?",
  "Which jobs have no tech assigned?",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 px-3 py-3">
      {[0,1,2].map(i => (
        <div
          key={i}
          className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/40"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2.5 fade-in", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 shadow-sm">
          A
        </div>
      )}
      <div className={cn("max-w-[82%] group", isUser ? "items-end" : "items-start")}>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-md"
            : "bg-card text-foreground border border-border rounded-tl-md"
        )}>
          {msg.content.split("\n").map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
          {!isUser && (
            <div className="absolute top-1 right-1">
              <CopyButton text={msg.content} />
            </div>
          )}
        </div>
        <p className={cn("text-[10px] text-muted-foreground mt-1 px-1", isUser ? "text-right" : "text-left")}>
          {new Date(msg.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversation, isLoading } = useGetAnthropicConversation(CONVERSATION_ID);

  const allMessages: Message[] = [
    ...((conversation?.messages as Message[] | undefined) || []),
    ...optimisticMessages,
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  };

  useEffect(() => { scrollToBottom(false); }, [conversation]);
  useEffect(() => { if (streaming) scrollToBottom(); }, [streaming, streamingContent]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = {
      id: `opt-${Date.now()}`,
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamingContent("");

    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const res = await fetch(`${base}/api/conversations/${CONVERSATION_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.delta) {
                fullText += parsed.delta;
                setStreamingContent(fullText);
              }
            } catch {}
          }
        }
      }

      setOptimisticMessages([]);
      setStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(CONVERSATION_ID) });
    } catch {
      setStreaming(false);
      setStreamingContent("");
      setOptimisticMessages([]);
      toast({ title: "Couldn't send message", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <MessageCircle size={15} className="text-white" />
          </div>
          <div>
            <p className="text-foreground font-bold text-sm">AIDE</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <p className="text-[10px] text-muted-foreground">claude-sonnet-4-6 · Online</p>
            </div>
          </div>
        </div>
        <button
          data-testid="button-clear-chat"
          onClick={() => {
            if (confirm("Clear this conversation?")) {
              setOptimisticMessages([]);
              queryClient.setQueryData(getGetAnthropicConversationQueryKey(CONVERSATION_ID), null);
            }
          }}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          title="Clear chat"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allMessages.length === 0 && !streaming ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-md">
              <Zap size={24} className="text-white" />
            </div>
            <h2 className="text-foreground font-bold text-base mb-1">Hi Casper, I'm AIDE</h2>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Your operations assistant. I know your jobs, notes, and team. What do you need?
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  data-testid={`suggestion-${s.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => handleSend(s)}
                  className="text-left px-3.5 py-2.5 text-sm text-foreground bg-card border border-border rounded-xl hover:bg-muted transition-colors hover:border-primary/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {allMessages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {streaming && (
              <>
                {streamingContent ? (
                  <MessageBubble
                    msg={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingContent,
                      createdAt: new Date().toISOString(),
                    }}
                  />
                ) : (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      A
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-md">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="flex items-end gap-2.5 bg-card border border-border rounded-2xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-ring transition-all">
          <textarea
            ref={textareaRef}
            data-testid="input-chat-message"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask AIDE anything..."
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed min-h-[20px] max-h-[140px] disabled:opacity-60"
            style={{ height: "auto" }}
          />
          <button
            data-testid="button-send-message"
            onClick={() => handleSend()}
            disabled={!input.trim() || streaming}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
              input.trim() && !streaming
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send size={14} strokeWidth={2} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
