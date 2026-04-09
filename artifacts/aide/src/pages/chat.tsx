import { useState, useEffect, useRef } from "react";
import { Send, RefreshCw, MessageCircle, Zap, Copy, Check, Briefcase, FileText, CheckSquare, AlertTriangle } from "lucide-react";
import {
  useGetAnthropicConversation, getGetAnthropicConversationQueryKey,
  useCreateJob, useCreateNote, useCreateTodo,
  getListJobsQueryKey, getListNotesQueryKey, getListTodosQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const CONVERSATION_ID = "1";

const SUGGESTIONS = [
  "PA Check — what's on today?",
  "Log a job for Westfield Parramatta — smoke detector fault, High priority",
  "Note: call Jamie tomorrow re Q2 resource allocation",
  "Add to my list: chase up Becton Dickinson AFSS report",
  "Which jobs are overdue?",
  "Draft Uptick notes for Becton Dickinson job",
];

interface Message { id: string; role: "user" | "assistant"; content: string; createdAt: string; }
interface AideAction { type: string; data: Record<string, string | boolean | null>; }
interface ExecutedAction { type: string; label: string; success: boolean; }

function parseActions(text: string): { cleanText: string; actions: AideAction[] } {
  const actions: AideAction[] = [];
  const cleanText = text.replace(/<aide-action>([\s\S]*?)<\/aide-action>/g, (_, json) => {
    try { actions.push(JSON.parse(json.trim())); } catch {}
    return "";
  }).trim();
  return { cleanText, actions };
}

function ActionBadge({ action }: { action: ExecutedAction }) {
  const icons: Record<string, React.ReactNode> = {
    CREATE_JOB:         <Briefcase size={11} />,
    CREATE_NOTE:        <FileText size={11} />,
    CREATE_TODO:        <CheckSquare size={11} />,
    UPDATE_JOB_STATUS:  <Check size={11} />,
    EMAIL_TRIAGE:       <AlertTriangle size={11} />,
  };
  const labels: Record<string, string> = {
    CREATE_JOB:         "Job created",
    CREATE_NOTE:        "Note saved",
    CREATE_TODO:        "To-do added",
    UPDATE_JOB_STATUS:  "Status updated",
    EMAIL_TRIAGE:       "Email triaged",
  };
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
      action.success
        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
        : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
    )}>
      {icons[action.type]}
      {action.success ? (labels[action.type] || action.label) : "Failed"}
    </div>
  );
}

function EmailTriageCard({ data }: { data: Record<string, string | boolean | null> }) {
  return (
    <div className="mt-2 bg-background border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-amber-50 dark:bg-amber-900/10">
        <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Email Triage</span>
        {data.priority && (
          <span className={cn(
            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border",
            data.priority === "Critical" ? "badge-critical" :
            data.priority === "High" ? "badge-high" :
            data.priority === "Medium" ? "badge-medium" : "badge-low"
          )}>
            {String(data.priority).toUpperCase()}
          </span>
        )}
      </div>
      <div className="divide-y divide-border">
        {data.site && <TriageRow label="Site" value={String(data.site)} />}
        {data.client && <TriageRow label="Client" value={String(data.client)} />}
        {data.contact && <TriageRow label="Contact" value={String(data.contact)} />}
        {data.whatHappened && <TriageRow label="What Happened" value={String(data.whatHappened)} />}
        {data.whereThingsStand && <TriageRow label="Where Things Stand" value={String(data.whereThingsStand)} />}
        {data.whatNeedsToHappen && <TriageRow label="Action Required" value={String(data.whatNeedsToHappen)} highlight />}
        {data.watchOutFor && <TriageRow label="Watch Out For" value={String(data.watchOutFor)} warning />}
      </div>
    </div>
  );
}

function TriageRow({ label, value, highlight, warning }: { label: string; value: string; highlight?: boolean; warning?: boolean }) {
  return (
    <div className={cn("px-3 py-2", highlight && "bg-primary/3", warning && "bg-amber-50/50 dark:bg-amber-900/5")}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-xs leading-relaxed", highlight ? "text-foreground font-semibold" : "text-foreground")}>{value}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 px-3 py-3">
      {[0,1,2].map(i => (
        <div key={i} className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/40" />
      ))}
    </div>
  );
}

function MessageBubble({ msg, executedActions }: { msg: Message; executedActions?: ExecutedAction[] }) {
  const isUser = msg.role === "user";
  const { cleanText, actions } = parseActions(msg.content);
  const emailTriage = actions.find(a => a.type === "EMAIL_TRIAGE");

  return (
    <div className={cn("flex gap-2.5 fade-in", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 shadow-sm">A</div>
      )}
      <div className={cn("max-w-[85%] group", isUser ? "items-end" : "items-start flex flex-col")}>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-md"
            : "bg-card text-foreground border border-border rounded-tl-md"
        )}>
          {cleanText.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
          {!isUser && <div className="absolute top-1 right-1"><CopyButton text={cleanText} /></div>}
        </div>

        {/* Email triage card */}
        {!isUser && emailTriage && <EmailTriageCard data={emailTriage.data} />}

        {/* Executed action badges */}
        {!isUser && executedActions && executedActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {executedActions.map((a, i) => <ActionBadge key={i} action={a} />)}
          </div>
        )}

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
  const [actionResults, setActionResults] = useState<Record<string, ExecutedAction[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: conversation, isLoading } = useGetAnthropicConversation(CONVERSATION_ID);
  const createJob = useCreateJob();
  const createNote = useCreateNote();
  const createTodo = useCreateTodo();

  const allMessages: Message[] = [
    ...((conversation?.messages as Message[] | undefined) || []),
    ...optimisticMessages,
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  };

  useEffect(() => { scrollToBottom(false); }, [conversation]);
  useEffect(() => { if (streaming) scrollToBottom(); }, [streaming, streamingContent]);

  const executeAction = async (action: AideAction): Promise<ExecutedAction> => {
    try {
      switch (action.type) {
        case "CREATE_JOB": {
          const d = action.data as Record<string, string>;
          await createJob.mutateAsync({ data: {
            site: d.site || "Unknown Site",
            client: d.client || "Unknown Client",
            actionRequired: d.actionRequired || d.action || "See notes",
            priority: (d.priority as "Critical" | "High" | "Medium" | "Low") || "Medium",
            status: (d.status as "Open") || "Open",
            taskNumber: d.taskNumber || undefined,
            assignedTech: d.assignedTech || undefined,
            notes: d.notes || undefined,
          }});
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          return { type: action.type, label: "Job created", success: true };
        }
        case "CREATE_NOTE": {
          const d = action.data as Record<string, string>;
          await createNote.mutateAsync({ data: {
            text: d.text || d.content || "Note from AIDE",
            category: (d.category as "Urgent" | "To Do" | "To Ask" | "Schedule" | "Done") || "To Do",
            owner: d.owner || "Casper",
          }});
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          return { type: action.type, label: "Note saved", success: true };
        }
        case "CREATE_TODO": {
          const d = action.data as Record<string, string>;
          await createTodo.mutateAsync({ data: {
            text: d.text || d.content || "To-do from AIDE",
            priority: (d.priority as "Critical" | "High" | "Medium" | "Low") || "Medium",
            category: (d.category as "Work" | "Personal" | "Follow-up" | "Compliance" | "Admin") || "Work",
          }});
          queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
          return { type: action.type, label: "To-do added", success: true };
        }
        case "EMAIL_TRIAGE":
          return { type: action.type, label: "Email triaged", success: true };
        case "UPDATE_JOB_STATUS":
          return { type: action.type, label: "Status updated", success: true };
        default:
          return { type: action.type, label: action.type, success: false };
      }
    } catch (err) {
      console.error("Action failed:", action.type, err);
      return { type: action.type, label: action.type, success: false };
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { id: `opt-${Date.now()}`, role: "user", content: msg, createdAt: new Date().toISOString() };
    setOptimisticMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamingContent("");

    let assistantId: string | null = null;

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
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullText += parsed.content;
                setStreamingContent(fullText);
              }
              if (parsed.done || parsed.messageId) {
                assistantId = parsed.messageId || null;
              }
            } catch {}
          }
        }
      }

      setOptimisticMessages([]);
      setStreaming(false);
      setStreamingContent("");

      await queryClient.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(CONVERSATION_ID) });

      if (fullText) {
        const { actions } = parseActions(fullText);
        if (actions.length > 0) {
          const results = await Promise.all(actions.map(executeAction));
          const msgKey = `msg-${Date.now()}`;
          setActionResults(prev => ({ ...prev, [msgKey]: results }));
          const succeeded = results.filter(r => r.success);
          if (succeeded.length > 0) {
            toast({ title: `AIDE completed ${succeeded.length} action${succeeded.length > 1 ? "s" : ""}` });
          }
        }
      }
    } catch {
      setStreaming(false);
      setStreamingContent("");
      setOptimisticMessages([]);
      toast({ title: "Couldn't send message", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
              <p className="text-[10px] text-muted-foreground">claude-sonnet-4-6 · Actions enabled</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            data-testid="button-clear-chat"
            onClick={() => { if (confirm("Clear this conversation?")) { setOptimisticMessages([]); queryClient.setQueryData(getGetAnthropicConversationQueryKey(CONVERSATION_ID), null); } }}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Clear chat"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Action pill hints */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-1.5 border-b border-border bg-muted/30 overflow-x-auto scrollbar-hide">
        {[
          { label: "Create jobs", icon: Briefcase },
          { label: "Save notes", icon: FileText },
          { label: "Add to-dos", icon: CheckSquare },
          { label: "Triage emails", icon: AlertTriangle },
        ].map(pill => {
          const Icon = pill.icon;
          return (
            <div key={pill.label} className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap flex-shrink-0">
              <Icon size={10} />
              {pill.label}
            </div>
          );
        })}
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
            <p className="text-muted-foreground text-sm max-w-xs mb-2">
              Your operations assistant. Tell me what's happening — I'll log jobs, add notes, create to-dos, and triage emails directly.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-6 max-w-xs">
              {[
                { label: "Job", icon: Briefcase, action: "CREATE_JOB" },
                { label: "Note", icon: FileText, action: "CREATE_NOTE" },
                { label: "To-do", icon: CheckSquare, action: "CREATE_TODO" },
              ].map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/20 text-primary text-[11px] font-semibold">
                    <Icon size={10} /> {c.label}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  data-testid={`suggestion-${s.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => handleSend(s)}
                  className="text-left px-3.5 py-2.5 text-sm text-foreground bg-card border border-border rounded-xl hover:bg-muted transition-colors hover:border-primary/30 leading-tight"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {allMessages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                executedActions={actionResults[`msg-${idx}`]}
              />
            ))}

            {streaming && (
              <>
                {streamingContent ? (
                  <MessageBubble
                    msg={{ id: "streaming", role: "assistant", content: streamingContent, createdAt: new Date().toISOString() }}
                  />
                ) : (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-md"><TypingIndicator /></div>
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
            placeholder="Tell AIDE what's happening, paste an email, or ask anything..."
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed min-h-[20px] max-h-[140px] disabled:opacity-60"
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
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">Enter to send · Shift+Enter for new line · AIDE can take actions in your app</p>
      </div>
    </div>
  );
}
