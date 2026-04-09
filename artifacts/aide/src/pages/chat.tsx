import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Mail, Plus, FileText, CheckSquare, AlertCircle, Briefcase, Trash2, RefreshCw, ChevronDown } from "lucide-react";
import {
  useGetAnthropicConversation,
  useCreateJob,
  useCreateNote,
  getListJobsQueryKey,
  getListNotesQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

interface ParsedContent {
  type: "text" | "email_triage" | "new_job" | "new_note" | "pa_check" | "actions";
  content: string;
  data?: unknown;
}

function parseMessageContent(content: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  let remaining = content;

  const tagPatterns = [
    { open: "[EMAIL_TRIAGE]", close: "[/EMAIL_TRIAGE]", type: "email_triage" as const },
    { open: "[NEW_JOB]", close: "[/NEW_JOB]", type: "new_job" as const },
    { open: "[NEW_NOTE]", close: "[/NEW_NOTE]", type: "new_note" as const },
    { open: "[PA_CHECK]", close: "[/PA_CHECK]", type: "pa_check" as const },
    { open: "[ACTIONS]", close: "[/ACTIONS]", type: "actions" as const },
  ];

  while (remaining.length > 0) {
    let earliestIdx = -1;
    let earliestPattern = null;

    for (const pattern of tagPatterns) {
      const idx = remaining.indexOf(pattern.open);
      if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
        earliestIdx = idx;
        earliestPattern = pattern;
      }
    }

    if (earliestIdx === -1 || !earliestPattern) {
      if (remaining.trim()) {
        parts.push({ type: "text", content: remaining });
      }
      break;
    }

    if (earliestIdx > 0) {
      const textBefore = remaining.slice(0, earliestIdx).trim();
      if (textBefore) {
        parts.push({ type: "text", content: textBefore });
      }
    }

    const closeIdx = remaining.indexOf(earliestPattern.close, earliestIdx + earliestPattern.open.length);
    if (closeIdx === -1) {
      const textContent = remaining.slice(earliestIdx + earliestPattern.open.length).trim();
      parts.push({ type: earliestPattern.type, content: textContent });
      break;
    }

    const innerContent = remaining.slice(earliestIdx + earliestPattern.open.length, closeIdx).trim();
    let data: unknown;
    try {
      data = JSON.parse(innerContent);
    } catch {
      data = null;
    }
    parts.push({ type: earliestPattern.type, content: innerContent, data });
    remaining = remaining.slice(closeIdx + earliestPattern.close.length);
  }

  return parts;
}

function EmailTriageCard({ data, onSaveJob, onDismiss }: { data: unknown; onSaveJob: (d: unknown) => void; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const d = data as Record<string, string>;
  if (!d) return null;

  const sections = [
    { key: "whatHappened", label: "What's Happened" },
    { key: "whereThingsStand", label: "Where Things Stand" },
    { key: "whatNeedsToHappen", label: "What Needs to Happen" },
    { key: "watchOutFor", label: "Watch Out For" },
  ];

  return (
    <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl overflow-hidden my-2">
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] px-4 py-2.5 flex items-center gap-2">
        <Mail size={14} className="text-white" />
        <span className="text-white font-bold text-xs uppercase tracking-widest">Email Triage</span>
      </div>
      <div className="p-4 space-y-2">
        {d.site && <div className="flex gap-2 text-sm"><span className="text-[#475569] w-16 flex-shrink-0">Site</span><span className="text-[#E2E8F0] font-medium">{d.site}</span></div>}
        {d.client && <div className="flex gap-2 text-sm"><span className="text-[#475569] w-16 flex-shrink-0">Client</span><span className="text-[#E2E8F0]">{d.client}</span></div>}
        {d.contact && <div className="flex gap-2 text-sm"><span className="text-[#475569] w-16 flex-shrink-0">Contact</span><span className="text-[#E2E8F0]">{d.contact}</span></div>}
        {d.priority && (
          <div className="flex gap-2 text-sm items-center">
            <span className="text-[#475569] w-16 flex-shrink-0">Priority</span>
            <span className={cn("px-2 py-0.5 rounded text-xs font-bold", {
              "bg-[#EF4444] text-white": d.priority === "Critical",
              "bg-[#F59E0B] text-black": d.priority === "High",
              "bg-[#3B82F6] text-white": d.priority === "Medium",
              "bg-[#475569] text-white": d.priority === "Low",
            })}>{d.priority}</span>
          </div>
        )}

        <div className="border-t border-[#2E2E45] mt-3 pt-3 space-y-2">
          {sections.map(s => (
            <div key={s.key} className="rounded-lg overflow-hidden border border-[#2E2E45]">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-left"
                onClick={() => setExpanded(prev => prev.includes(s.key) ? prev.filter(k => k !== s.key) : [...prev, s.key])}
              >
                <span className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                <ChevronDown size={12} className={cn("text-[#475569] transition-transform", expanded.includes(s.key) && "rotate-180")} />
              </button>
              {expanded.includes(s.key) && (
                <div className="px-3 pb-3 text-[#E2E8F0] text-sm">{d[s.key]}</div>
              )}
            </div>
          ))}
        </div>

        {d.actionRequired && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
            <AlertCircle size={12} className="text-[#EF4444] flex-shrink-0" />
            <span className="text-[#EF4444] text-xs font-semibold uppercase tracking-wide">Action Required</span>
            <span className="text-[#E2E8F0] text-xs ml-1">— {d.actionRequired}</span>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button
            data-testid="button-save-to-jobs"
            onClick={() => onSaveJob(data)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg hover:bg-[#A855F7] transition-colors"
          >
            <Briefcase size={12} />Save to Jobs
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(data, null, 2))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#242433] text-[#94A3B8] text-xs font-semibold rounded-lg hover:text-white transition-colors"
          >
            Copy
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#242433] text-[#94A3B8] text-xs font-semibold rounded-lg hover:text-[#EF4444] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function NewJobCard({ data, onSave }: { data: unknown; onSave: () => void }) {
  const d = data as Record<string, string>;
  if (!d) return null;
  return (
    <div className="bg-[#1A1A24] border border-[#10B981]/40 rounded-2xl overflow-hidden my-2">
      <div className="bg-[#10B981] px-4 py-2.5 flex items-center gap-2">
        <Briefcase size={14} className="text-white" />
        <span className="text-white font-bold text-xs uppercase tracking-widest">Job Logged</span>
      </div>
      <div className="p-4 space-y-1.5 text-sm">
        {d.taskNumber && <div className="flex gap-2"><span className="text-[#475569] w-20">Task #</span><span className="text-[#E2E8F0]">{d.taskNumber}</span></div>}
        {d.site && <div className="flex gap-2"><span className="text-[#475569] w-20">Site</span><span className="text-[#E2E8F0] font-medium">{d.site}</span></div>}
        {d.priority && <div className="flex gap-2 items-center"><span className="text-[#475569] w-20">Priority</span><span className="px-2 py-0.5 rounded text-xs font-bold bg-[#F59E0B] text-black">{d.priority}</span></div>}
        {d.status && <div className="flex gap-2"><span className="text-[#475569] w-20">Status</span><span className="text-[#10B981]">{d.status}</span></div>}
        <button
          data-testid="button-view-job"
          onClick={onSave}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-xs font-semibold rounded-lg hover:bg-[#10B981]/30 transition-colors"
        >
          View Job →
        </button>
      </div>
    </div>
  );
}

function NewNoteCard({ data }: { data: unknown }) {
  const d = data as Record<string, string>;
  if (!d) return null;
  return (
    <div className="bg-[#1A1A24] border border-[#3B82F6]/40 rounded-2xl overflow-hidden my-2">
      <div className="bg-[#3B82F6] px-4 py-2.5 flex items-center gap-2">
        <FileText size={14} className="text-white" />
        <span className="text-white font-bold text-xs uppercase tracking-widest">Note Logged</span>
      </div>
      <div className="p-4 text-sm">
        {d.category && <span className="px-2 py-0.5 rounded text-xs font-semibold border bg-[#1A1A24] border-[#3B82F6]/40 text-[#3B82F6]">{d.category}</span>}
        <p className="text-[#E2E8F0] mt-2">{d.text}</p>
      </div>
    </div>
  );
}

function PACheckCard({ content }: { content: string }) {
  return (
    <div className="bg-[#1A1A24] border border-[#7C3AED]/40 rounded-2xl overflow-hidden my-2">
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] px-4 py-2.5">
        <span className="text-white font-bold text-xs uppercase tracking-widest">PA Check Complete</span>
      </div>
      <div className="p-4 text-sm text-[#E2E8F0] whitespace-pre-wrap">{content}</div>
    </div>
  );
}

function ActionListCard({ data }: { data: unknown }) {
  const [checked, setChecked] = useState<number[]>([]);
  const items = Array.isArray(data) ? data as string[] : [];
  if (!items.length) return null;
  return (
    <div className="bg-[#1A1A24] border border-[#F59E0B]/40 rounded-2xl overflow-hidden my-2">
      <div className="bg-[#F59E0B] px-4 py-2.5">
        <span className="text-black font-bold text-xs uppercase tracking-widest">Action List</span>
      </div>
      <div className="p-4 space-y-2">
        {items.map((item, i) => (
          <button
            key={i}
            data-testid={`action-item-${i}`}
            onClick={() => setChecked(prev => prev.includes(i) ? prev.filter(n => n !== i) : [...prev, i])}
            className="w-full flex items-start gap-3 text-left"
          >
            <div className={cn("w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
              checked.includes(i) ? "bg-[#10B981] border-[#10B981]" : "border-[#475569]"
            )}>
              {checked.includes(i) && <span className="text-white text-[10px]">✓</span>}
            </div>
            <span className={cn("text-sm", checked.includes(i) ? "line-through text-[#475569]" : "text-[#E2E8F0]")}>
              {typeof item === "string" ? item : JSON.stringify(item)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg, onSaveJob, onDismissEmailTriage }: {
  msg: Message;
  onSaveJob: (d: unknown) => void;
  onDismissEmailTriage: () => void;
}) {
  const isUser = msg.role === "user";
  const parts = parseMessageContent(msg.content);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%]", isUser ? "items-end" : "items-start")} >
        {!isUser && (
          <div className="text-[#7C3AED] text-[11px] font-bold uppercase tracking-widest mb-1.5 px-1">AIDE</div>
        )}
        {parts.map((part, i) => {
          if (part.type === "email_triage") {
            return <EmailTriageCard key={i} data={part.data} onSaveJob={onSaveJob} onDismiss={onDismissEmailTriage} />;
          }
          if (part.type === "new_job") {
            return <NewJobCard key={i} data={part.data} onSave={() => {}} />;
          }
          if (part.type === "new_note") {
            return <NewNoteCard key={i} data={part.data} />;
          }
          if (part.type === "pa_check") {
            return <PACheckCard key={i} content={part.content} />;
          }
          if (part.type === "actions") {
            return <ActionListCard key={i} data={part.data} />;
          }
          return (
            <div
              key={i}
              className={cn(
                "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                isUser
                  ? "bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white rounded-br-md"
                  : "bg-[#1A1A24] text-[#E2E8F0] border border-[#2E2E45] rounded-bl-md"
              )}
            >
              <span className="whitespace-pre-wrap">{part.content}</span>
            </div>
          );
        })}
        <div className={cn("text-[10px] text-[#475569] mt-1 px-1", isUser ? "text-right" : "text-left")}>
          {new Date(msg.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#7C3AED] typing-dot" />
          <div className="w-2 h-2 rounded-full bg-[#7C3AED] typing-dot" />
          <div className="w-2 h-2 rounded-full bg-[#7C3AED] typing-dot" />
        </div>
      </div>
    </div>
  );
}

const CONVERSATION_ID = 1;

export default function Chat() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [dismissedCards, setDismissedCards] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversation, refetch } = useGetAnthropicConversation(CONVERSATION_ID);

  const messages = conversation?.messages || localMessages;

  const createJob = useCreateJob();
  const createNote = useCreateNote();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, streaming]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const content = input.trim();
    setInput("");

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamingContent("");

    try {
      const resp = await fetch(`/api/anthropic/conversations/${CONVERSATION_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Request failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let doneReceived = false;
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.content) {
                full += parsed.content;
                setStreamingContent(full);
              }
              if (parsed.done) {
                doneReceived = true;
              }
              if (parsed.error) {
                hasError = true;
                full = parsed.error;
              }
            } catch {}
          }
        }
      }

      if (hasError) {
        toast({ title: "Error", description: full, variant: "destructive" });
      }

      await refetch();
      setLocalMessages([]);

      const parsed = parseMessageContent(full);
      for (const part of parsed) {
        if (part.type === "new_job" && part.data) {
          const d = part.data as Record<string, string>;
          try {
            await createJob.mutateAsync({ data: {
              site: d.site || "Unknown Site",
              client: d.client || "Unknown Client",
              actionRequired: d.actionRequired || "Action required",
              priority: (d.priority as "Critical" | "High" | "Medium" | "Low") || "Medium",
              status: (d.status as "Open") || "Open",
              taskNumber: d.taskNumber,
            }});
            queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
            toast({ title: "Job created", description: `${d.site} logged successfully.` });
          } catch {}
        }
        if (part.type === "new_note" && part.data) {
          const d = part.data as Record<string, string>;
          try {
            await createNote.mutateAsync({ data: {
              text: d.text || "",
              category: (d.category as "Urgent" | "To Do" | "To Ask" | "Schedule" | "Done") || "To Do",
              owner: d.owner || "Casper",
            }});
            queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
            toast({ title: "Note logged", description: "Note saved successfully." });
          } catch {}
        }
      }
    } catch {
      toast({ title: "Connection error", description: "Couldn't reach AIDE. Check your connection.", variant: "destructive" });
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }, [input, streaming, refetch, createJob, createNote, queryClient, toast]);

  const handleSaveJobFromTriage = useCallback(async (data: unknown) => {
    const d = data as Record<string, string>;
    try {
      await createJob.mutateAsync({ data: {
        site: d.site || "Unknown Site",
        client: d.client || "Unknown Client",
        actionRequired: d.actionRequired || "Action required",
        priority: (d.priority as "Critical" | "High" | "Medium" | "Low") || "Medium",
        status: "Open",
        contactName: d.contact,
      }});
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: "Job created", description: `${d.site} saved to jobs.` });
    } catch {
      toast({ title: "Error", description: "Couldn't save job.", variant: "destructive" });
    }
  }, [createJob, queryClient, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: "Triage Email", icon: Mail, prompt: "Triage this email:\n\n[Paste your email here]" },
    { label: "Log Job", icon: Plus, prompt: "Log a new job: " },
    { label: "Drop Note", icon: FileText, prompt: "Log this note: " },
    { label: "PA Check", icon: CheckSquare, prompt: "PA Check — review everything open and flag what needs attention." },
  ];

  const handleClearChat = useCallback(async () => {
    if (!confirm("Clear chat history? This cannot be undone.")) return;
    try {
      await fetch(`/api/anthropic/conversations/${CONVERSATION_ID}`, { method: "DELETE" });
      await fetch("/api/anthropic/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "AIDE" }),
      });
      setLocalMessages([]);
      await refetch();
      toast({ title: "Chat cleared" });
    } catch {
      toast({ title: "Error", description: "Couldn't clear chat.", variant: "destructive" });
    }
  }, [refetch, toast]);

  return (
    <div className="flex flex-col h-screen bg-[#0F0F13]">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#0F0F13]/90 backdrop-blur-md border-b border-[#2E2E45] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#F8FAFC] font-bold text-sm">AIDE</span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] pulse-dot" />
              </div>
              <p className="text-[#475569] text-xs">Your personal operations assistant</p>
            </div>
          </div>
          <button
            data-testid="button-clear-chat"
            onClick={handleClearChat}
            className="text-[#475569] hover:text-[#EF4444] transition-colors p-2"
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex justify-center pt-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center mx-auto shadow-lg shadow-[rgba(124,58,237,0.3)]">
                <span className="text-white font-bold text-2xl">A</span>
              </div>
              <div>
                <h2 className="text-[#F8FAFC] font-bold text-lg">AIDE is ready</h2>
                <p className="text-[#475569] text-sm max-w-[260px]">
                  Drop an email, log a job, or ask anything about your operations.
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          !dismissedCards.has(msg.id) && (
            <MessageBubble
              key={msg.id || i}
              msg={msg}
              onSaveJob={handleSaveJobFromTriage}
              onDismissEmailTriage={() => setDismissedCards(prev => new Set([...prev, msg.id]))}
            />
          )
        ))}

        {streaming && (
          <div>
            {streamingContent ? (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-[#7C3AED] text-[11px] font-bold uppercase tracking-widest mb-1.5 px-1">AIDE</div>
                  <div className="bg-[#1A1A24] text-[#E2E8F0] border border-[#2E2E45] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 bg-[#7C3AED] ml-0.5 animate-pulse rounded-sm" />
                  </div>
                </div>
              </div>
            ) : (
              <TypingIndicator />
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 px-4 pt-2 pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => {
                  setInput(action.prompt);
                  inputRef.current?.focus();
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A24] border border-[#2E2E45] rounded-full text-[#94A3B8] text-xs font-medium hover:border-[#7C3AED] hover:text-[#A855F7] transition-all duration-200"
              >
                <Icon size={12} />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Bar */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <div className={cn(
          "flex items-end gap-3 bg-[#1A1A24] border rounded-2xl px-4 py-3 transition-colors",
          streaming ? "border-[#7C3AED]/30" : "border-[#2E2E45] focus-within:border-[#7C3AED]"
        )}>
          <textarea
            ref={inputRef}
            data-testid="input-chat-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk to AIDE..."
            disabled={streaming}
            rows={1}
            className="flex-1 bg-transparent text-[#F8FAFC] placeholder:text-[#475569] resize-none text-sm outline-none max-h-32 leading-relaxed"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              data-testid="button-attach"
              className="text-[#475569] hover:text-[#94A3B8] transition-colors"
              onClick={() => {
                const text = prompt("Paste large text or email:");
                if (text) setInput(text);
              }}
            >
              <Paperclip size={16} />
            </button>
            <button
              data-testid="button-send"
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                input.trim() && !streaming
                  ? "bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white shadow-lg shadow-[rgba(124,58,237,0.3)] hover:opacity-90"
                  : "bg-[#242433] text-[#475569]"
              )}
            >
              {streaming ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
