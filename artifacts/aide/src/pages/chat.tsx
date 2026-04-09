import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, RefreshCw, MessageCircle, Copy, Check, Briefcase,
  FileText, CheckSquare, AlertTriangle, Image, Mail, X,
  Paperclip, Zap
} from "lucide-react";
import {
  useGetAnthropicConversation, getGetAnthropicConversationQueryKey,
  useCreateJob, useCreateNote, useCreateTodo,
  getListJobsQueryKey, getListNotesQueryKey, getListTodosQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Todo } from "@workspace/api-client-react";

const CONVERSATION_ID = "1";

const SUGGESTIONS = [
  "PA Check — what's on today?",
  "Log a job for Westfield Parramatta — smoke detector fault, High priority",
  "Note: call Jamie tomorrow re Q2 resource allocation",
  "Add to my list: chase up Becton Dickinson AFSS report",
  "Draft Uptick notes for the Becton Dickinson job",
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message { id: string; role: "user" | "assistant"; content: string; createdAt: string; }
interface AideAction { type: string; data: Record<string, string | boolean | null>; }
interface ExecutedAction { type: string; label: string; success: boolean; }

interface Attachment {
  id: string;
  type: "image" | "email" | "file";
  name: string;
  preview?: string;       // data URL for images
  emailHtml?: string;     // raw HTML for emails
  emailSummary?: string;  // "From: x | Subject: y"
  size?: number;
}

// ─── Email HTML parsing ───────────────────────────────────────────────────────

function extractEmailMeta(html: string): { from: string; subject: string; date: string } {
  const getMetaField = (label: string) => {
    const patterns = [
      new RegExp(`<b>${label}[: ]*<\\/b>([^<]{1,120})`, "i"),
      new RegExp(`${label}[: ]+([^\\n<]{1,120})`, "i"),
      new RegExp(`<td[^>]*>${label}[: ]*<\\/td><td[^>]*>([^<]{1,120})`, "i"),
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) return m[1].trim().replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    }
    return "";
  };
  return {
    from: getMetaField("From"),
    subject: getMetaField("Subject"),
    date: getMetaField("Date") || getMetaField("Sent"),
  };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n").trim();
}

// ─── Action parsing ───────────────────────────────────────────────────────────

function parseActions(text: string): { cleanText: string; actions: AideAction[] } {
  const actions: AideAction[] = [];
  const cleanText = text.replace(/<aide-action>([\s\S]*?)<\/aide-action>/g, (_, json) => {
    try { actions.push(JSON.parse(json.trim())); } catch {}
    return "";
  }).trim();
  return { cleanText, actions };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: ExecutedAction }) {
  const icons: Record<string, React.ReactNode> = {
    CREATE_JOB: <Briefcase size={11} />, CREATE_NOTE: <FileText size={11} />,
    CREATE_TODO: <CheckSquare size={11} />, UPDATE_JOB_STATUS: <Check size={11} />,
    EMAIL_TRIAGE: <AlertTriangle size={11} />,
  };
  const labels: Record<string, string> = {
    CREATE_JOB: "Job created", CREATE_NOTE: "Note saved",
    CREATE_TODO: "To-do added", UPDATE_JOB_STATUS: "Status updated", EMAIL_TRIAGE: "Email triaged",
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
  const Row = ({ label, value, hl, warn }: { label: string; value: string; hl?: boolean; warn?: boolean }) => (
    <div className={cn("px-3 py-2", hl && "bg-primary/3", warn && "bg-amber-50/50 dark:bg-amber-900/5")}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-xs leading-relaxed", hl ? "text-foreground font-semibold" : "text-foreground")}>{value}</p>
    </div>
  );
  return (
    <div className="mt-2 bg-background border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-amber-50 dark:bg-amber-900/10">
        <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Email Triage</span>
        {data.priority && (
          <span className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border",
            data.priority === "Critical" ? "badge-critical" : data.priority === "High" ? "badge-high" :
            data.priority === "Medium" ? "badge-medium" : "badge-low"
          )}>{String(data.priority).toUpperCase()}</span>
        )}
      </div>
      <div className="divide-y divide-border">
        {data.site && <Row label="Site" value={String(data.site)} />}
        {data.client && <Row label="Client" value={String(data.client)} />}
        {data.contact && <Row label="Contact" value={String(data.contact)} />}
        {data.whatHappened && <Row label="What Happened" value={String(data.whatHappened)} />}
        {data.whereThingsStand && <Row label="Where Things Stand" value={String(data.whereThingsStand)} />}
        {data.whatNeedsToHappen && <Row label="Action Required" value={String(data.whatNeedsToHappen)} hl />}
        {data.watchOutFor && <Row label="Watch Out For" value={String(data.watchOutFor)} warn />}
      </div>
    </div>
  );
}

function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  return (
    <div className={cn(
      "group flex items-center gap-2 rounded-xl border overflow-hidden max-w-xs",
      att.type === "email" ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" :
      att.type === "image" ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" :
      "bg-muted border-border"
    )}>
      {att.type === "image" && att.preview ? (
        <img src={att.preview} alt={att.name} className="w-10 h-10 object-cover flex-shrink-0" />
      ) : (
        <div className={cn(
          "w-10 h-10 flex items-center justify-center flex-shrink-0",
          att.type === "email" ? "bg-amber-100 dark:bg-amber-900/20" : "bg-muted"
        )}>
          {att.type === "email" ? <Mail size={16} className="text-amber-600 dark:text-amber-400" /> : <Paperclip size={16} className="text-muted-foreground" />}
        </div>
      )}
      <div className="flex-1 min-w-0 py-1.5 pr-1">
        <p className="text-xs font-semibold text-foreground truncate">{att.name}</p>
        {att.emailSummary && <p className="text-[10px] text-muted-foreground truncate">{att.emailSummary}</p>}
        {att.size && <p className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</p>}
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 px-3 py-3">
      {[0,1,2].map(i => <div key={i} className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/40" />)}
    </div>
  );
}

function MessageBubble({ msg, executedActions }: { msg: Message; executedActions?: ExecutedAction[] }) {
  const isUser = msg.role === "user";
  const { cleanText, actions } = parseActions(msg.content);
  const emailTriage = actions.find(a => a.type === "EMAIL_TRIAGE");
  const isEmailDrop = msg.content.startsWith("[EMAIL DROPPED]");
  const isImageDrop = msg.content.startsWith("[") && msg.content.includes("image");

  return (
    <div className={cn("flex gap-2.5 fade-in", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 shadow-sm">A</div>
      )}
      <div className={cn("max-w-[85%] group", isUser ? "items-end" : "items-start flex flex-col")}>
        {/* User message indicator for drops */}
        {isUser && (isEmailDrop || isImageDrop) && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold mb-1 self-end",
            isEmailDrop ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
          )}>
            {isEmailDrop ? <><Mail size={10} /> Email dropped</> : <><Image size={10} /> Image attached</>}
          </div>
        )}

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

        {!isUser && emailTriage && <EmailTriageCard data={emailTriage.data} />}

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

// ─── Main Chat Component ──────────────────────────────────────────────────────

export default function Chat() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [actionResults, setActionResults] = useState<Record<string, ExecutedAction[]>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversation, isLoading } = useGetAnthropicConversation(CONVERSATION_ID);
  const createJob = useCreateJob();
  const createNote = useCreateNote();
  const createTodo = useCreateTodo();

  const allMessages: Message[] = [
    ...((conversation?.messages as Message[] | undefined) || []),
    ...optimisticMessages,
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const scrollToBottom = (smooth = true) => messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  useEffect(() => { scrollToBottom(false); }, [conversation]);
  useEffect(() => { if (streaming) scrollToBottom(); }, [streaming, streamingContent]);

  // ── File processing ──────────────────────────────────────────────────────────

  const processFile = useCallback((file: File): Promise<Attachment | null> => {
    return new Promise(resolve => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = e => {
          resolve({
            id: crypto.randomUUID(),
            type: "image",
            name: file.name,
            preview: e.target?.result as string,
            size: file.size,
          });
        };
        reader.readAsDataURL(file);
      } else {
        // Non-image file — treat as generic attachment (read as text if possible)
        resolve({
          id: crypto.randomUUID(),
          type: "file",
          name: file.name,
          size: file.size,
        });
      }
    });
  }, []);

  const processHtmlEmail = useCallback((html: string): Attachment | null => {
    if (!html || html.length < 50) return null;
    const meta = extractEmailMeta(html);
    const plainText = htmlToText(html).slice(0, 200);
    const parts = [meta.from && `From: ${meta.from}`, meta.subject && `Subject: ${meta.subject}`, meta.date && meta.date].filter(Boolean);
    return {
      id: crypto.randomUUID(),
      type: "email",
      name: meta.subject ? `Email: ${meta.subject.slice(0, 50)}` : "Email dropped",
      emailHtml: html,
      emailSummary: parts.join(" · ") || plainText.slice(0, 80),
    };
  }, []);

  // ── Drag & Drop handlers ─────────────────────────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragOver(false);

    const newAttachments: Attachment[] = [];

    // 1. Check for HTML (Outlook email drag)
    const html = e.dataTransfer.getData("text/html");
    if (html && html.length > 100) {
      const emailAtt = processHtmlEmail(html);
      if (emailAtt) {
        newAttachments.push(emailAtt);
        toast({ title: "Email captured", description: "AIDE will triage it automatically when you send." });
      }
    }

    // 2. Check for files (images, docs)
    if (e.dataTransfer.files.length > 0) {
      const filePromises = Array.from(e.dataTransfer.files).map(processFile);
      const results = await Promise.all(filePromises);
      results.forEach(r => { if (r) newAttachments.push(r); });
      if (results.some(r => r?.type === "image")) {
        toast({ title: `${results.filter(r => r?.type === "image").length} image(s) attached`, description: "Claude will analyse them when you send." });
      }
    }

    // 3. Plain text fallback (if no HTML/files)
    if (newAttachments.length === 0) {
      const text = e.dataTransfer.getData("text/plain");
      if (text) {
        setInput(prev => prev ? `${prev}\n${text}` : text);
        textareaRef.current?.focus();
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
      textareaRef.current?.focus();
    }
  }, [processHtmlEmail, processFile, toast]);

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  // ── Action execution ─────────────────────────────────────────────────────────

  const executeAction = async (action: AideAction): Promise<ExecutedAction> => {
    try {
      switch (action.type) {
        case "CREATE_JOB": {
          const d = action.data as Record<string, string>;
          await createJob.mutateAsync({ data: {
            site: d.site || "Unknown Site",
            client: d.client || "Unknown Client",
            actionRequired: d.actionRequired || "See notes",
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
            text: d.text || "Note from AIDE",
            category: (d.category as "Urgent" | "To Do" | "To Ask" | "Schedule" | "Done") || "To Do",
            owner: d.owner || "Casper",
          }});
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          return { type: action.type, label: "Note saved", success: true };
        }
        case "CREATE_TODO": {
          const d = action.data as Record<string, string>;
          await createTodo.mutateAsync({ data: {
            text: d.text || "To-do from AIDE",
            priority: (d.priority as Todo["priority"]) || "Medium",
            category: (d.category as Todo["category"]) || "Work",
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
    } catch {
      return { type: action.type, label: action.type, success: false };
    }
  };

  // ── Send message ─────────────────────────────────────────────────────────────

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    const hasAttachments = attachments.length > 0;
    if (!msg && !hasAttachments) return;
    if (streaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const emailAtt = attachments.find(a => a.type === "email");
    const imageAtts = attachments.filter(a => a.type === "image" && a.preview);

    // Build display content for the optimistic message
    let displayContent = msg;
    if (emailAtt) displayContent = `[EMAIL DROPPED]\n${emailAtt.emailSummary || "Email"}${msg ? `\n\n${msg}` : ""}`;
    else if (imageAtts.length > 0) displayContent = `[${imageAtts.length} image(s) attached]${msg ? ` — ${msg}` : ""}`;

    const userMsg: Message = { id: `opt-${Date.now()}`, role: "user", content: displayContent, createdAt: new Date().toISOString() };
    setOptimisticMessages(prev => [...prev, userMsg]);
    setAttachments([]);
    setStreaming(true);
    setStreamingContent("");

    const msgIndex = allMessages.length;

    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const body: Record<string, unknown> = { content: msg || (emailAtt ? "" : `Please analyse the attached content.`) };
      if (emailAtt?.emailHtml) body.emailHtml = emailAtt.emailHtml;
      if (imageAtts.length > 0) body.images = imageAtts.map(a => a.preview!);

      const res = await fetch(`${base}/api/anthropic/conversations/${CONVERSATION_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let streamError: string | null = null;

      if (reader) {
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) { fullText += parsed.content; setStreamingContent(fullText); }
              if (parsed.error)   { streamError = parsed.error; break outer; }
              if (parsed.done)    { break outer; }
            } catch {}
          }
        }
      }

      if (streamError) throw new Error(streamError);

      setOptimisticMessages([]);
      setStreaming(false);
      setStreamingContent("");

      await queryClient.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(CONVERSATION_ID) });

      if (fullText) {
        const { actions } = parseActions(fullText);
        if (actions.length > 0) {
          const results = await Promise.all(actions.map(executeAction));
          const key = `msg-${msgIndex + 1}`;
          setActionResults(prev => ({ ...prev, [key]: results }));
          const succeeded = results.filter(r => r.success);
          if (succeeded.length > 0) toast({ title: `AIDE completed ${succeeded.length} action${succeeded.length > 1 ? "s" : ""}` });
        }
      }
    } catch {
      setStreaming(false);
      setStreamingContent("");
      setOptimisticMessages([]);
      toast({ title: "Couldn't send message", variant: "destructive" });
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

  const canSend = (input.trim() || attachments.length > 0) && !streaming;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={dropZoneRef}
      className="flex flex-col h-screen bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Drop Overlay ── */}
      {dragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/8 backdrop-blur-sm border-4 border-dashed border-primary/50 rounded-none pointer-events-none">
          <div className="bg-card border-2 border-primary/30 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail size={28} className="text-primary" />
            </div>
            <p className="text-foreground font-bold text-lg">Drop it here</p>
            <p className="text-muted-foreground text-sm text-center max-w-xs">
              Drop emails from Outlook, images, or any file — AIDE will analyse and act on them
            </p>
            <div className="flex gap-2 mt-1">
              {[{ icon: Mail, label: "Emails" }, { icon: Image, label: "Images" }, { icon: Paperclip, label: "Files" }].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold">
                  <Icon size={11} />{label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <MessageCircle size={15} className="text-white" />
          </div>
          <div>
            <p className="text-foreground font-bold text-sm">AIDE</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <p className="text-[10px] text-muted-foreground">claude-sonnet-4-6 · Vision enabled</p>
            </div>
          </div>
        </div>
        <button
          data-testid="button-clear-chat"
          onClick={() => { if (confirm("Clear this conversation?")) { setOptimisticMessages([]); setAttachments([]); queryClient.setQueryData(getGetAnthropicConversationQueryKey(CONVERSATION_ID), null); } }}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          title="Clear chat"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Drop hint bar ── */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-1.5 border-b border-border bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <Mail size={10} className="text-amber-500" />
          <span>Drag Outlook emails here</span>
        </div>
        <span className="text-muted-foreground/30">·</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <Image size={10} className="text-blue-500" />
          <span>Drop images for vision analysis</span>
        </div>
        <span className="text-muted-foreground/30">·</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <Zap size={10} className="text-primary" />
          <span>AIDE acts automatically</span>
        </div>
      </div>

      {/* ── Messages ── */}
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
              Drop an Outlook email directly into this window and I'll triage it, extract action items, and log jobs automatically.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-6 max-w-sm">
              {[
                { label: "Drop emails", icon: Mail },
                { label: "Attach images", icon: Image },
                { label: "Create jobs", icon: Briefcase },
                { label: "Add to-dos", icon: CheckSquare },
              ].map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/20 text-primary text-[11px] font-semibold">
                    <Icon size={10} />{c.label}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSend(s)}
                  className="text-left px-3.5 py-2.5 text-sm text-foreground bg-card border border-border rounded-xl hover:bg-muted transition-colors hover:border-primary/30 leading-tight">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {allMessages.map((msg, idx) => (
              <MessageBubble key={msg.id} msg={msg} executedActions={actionResults[`msg-${idx}`]} />
            ))}
            {streaming && (
              streamingContent ? (
                <MessageBubble msg={{ id: "streaming", role: "assistant", content: streamingContent, createdAt: new Date().toISOString() }} />
              ) : (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-md"><TypingIndicator /></div>
                </div>
              )
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 py-3 flex-shrink-0">
        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5">
            {attachments.map(att => (
              <AttachmentChip key={att.id} att={att} onRemove={() => removeAttachment(att.id)} />
            ))}
          </div>
        )}

        <div className={cn(
          "flex items-end gap-2.5 bg-card border rounded-2xl px-3.5 py-2.5 transition-all",
          dragOver ? "border-primary ring-2 ring-primary/20" : "border-border focus-within:ring-2 focus-within:ring-ring"
        )}>
          {/* Attach button */}
          <label className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Attach image">
            <Paperclip size={16} />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async e => {
                if (!e.target.files) return;
                const results = await Promise.all(Array.from(e.target.files).map(processFile));
                setAttachments(prev => [...prev, ...results.filter(Boolean) as Attachment[]]);
                e.target.value = "";
              }}
            />
          </label>

          <textarea
            ref={textareaRef}
            data-testid="input-chat-message"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={attachments.length > 0 ? "Add a note (optional) then send…" : "Tell AIDE what's happening, or drag an email here…"}
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed min-h-[20px] max-h-[140px] disabled:opacity-60"
          />
          <button
            data-testid="button-send-message"
            onClick={() => handleSend()}
            disabled={!canSend}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
              canSend ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send size={14} strokeWidth={2} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Enter to send · Shift+Enter for new line · Drag emails/images anywhere into this window
        </p>
      </div>
    </div>
  );
}
