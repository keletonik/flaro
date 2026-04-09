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
  emailBody?: string;     // user-pasted body (when drag-drop only captured header)
  emailHasBody?: boolean; // true if body was captured automatically (not just header)
  size?: number;
}

// ─── Email HTML parsing ───────────────────────────────────────────────────────

function extractEmailMeta(html: string): { from: string; subject: string; date: string } {
  // Convert to plain text first — much more reliable than HTML regex
  const plain = htmlToText(html);

  const getField = (label: string): string => {
    // Match "Label: value" or "Label value" at start of line (case-insensitive)
    const re = new RegExp(`^${label}[:\\s]+(.{1,200})`, "im");
    const m = plain.match(re);
    if (m?.[1]) return m[1].trim().replace(/\r/g, "");

    // Also try raw HTML patterns as fallback (Outlook bold/span/td patterns)
    const htmlPatterns = [
      new RegExp(`<b[^>]*>\\s*${label}[:\\s]*<\\/b>\\s*([^<]{1,120})`, "i"),
      new RegExp(`<span[^>]*>\\s*${label}[:\\s]*<\\/span>\\s*([^<]{1,120})`, "i"),
      new RegExp(`<td[^>]*>\\s*${label}[:\\s]*<\\/td>\\s*<td[^>]*>\\s*([^<]{1,120})`, "i"),
      new RegExp(`${label}[:\\s]+([^\\n<]{1,120})`, "i"),
    ];
    for (const p of htmlPatterns) {
      const hm = html.match(p);
      if (hm?.[1]) return hm[1].trim().replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    }
    return "";
  };

  return {
    from: getField("From") || getField("De"),
    subject: getField("Subject") || getField("Objet"),
    date: getField("Sent") || getField("Date") || getField("Envoyé le"),
  };
}

// Detect if plain text looks like an email (has standard headers)
function looksLikeEmail(text: string): boolean {
  const t = text.trim();
  return (
    (/^From:\s*.+/im.test(t) && /^Subject:\s*.+/im.test(t)) ||
    (/^De\s*:/im.test(t) && /^Objet\s*:/im.test(t)) ||   // French Outlook
    (/^From\s*:/im.test(t) && /^Sent\s*:/im.test(t))
  );
}

// Parse .eml (RFC 822) file content into an Attachment
function parseEmlContent(raw: string, fileName: string): Attachment | null {
  const lines = raw.split(/\r?\n/);
  const headers: Record<string, string> = {};
  let i = 0;

  // Parse headers
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; break; }
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      let val = line.slice(colonIdx + 1).trim();
      // Fold multi-line header values
      while (i + 1 < lines.length && /^[\t ]/.test(lines[i + 1])) {
        i++;
        val += " " + lines[i].trim();
      }
      headers[key] = val;
    }
    i++;
  }

  const body = lines.slice(i).join("\n").trim();
  const contentType = headers["content-type"] || "text/plain";

  let htmlBody = "";
  let textBody = "";

  if (contentType.toLowerCase().includes("multipart")) {
    // Extract boundary
    const bm = contentType.match(/boundary=["']?([^"';\s]+)["']?/i);
    if (bm) {
      const boundary = bm[1];
      const parts = body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?`));
      for (const part of parts) {
        const partLower = part.toLowerCase();
        if (partLower.includes("content-type: text/html")) {
          const pBodyStart = part.indexOf("\n\n");
          if (pBodyStart !== -1) htmlBody = part.slice(pBodyStart + 2).trim();
        } else if (partLower.includes("content-type: text/plain") && !htmlBody) {
          const pBodyStart = part.indexOf("\n\n");
          if (pBodyStart !== -1) textBody = part.slice(pBodyStart + 2).trim();
        }
      }
    }
  } else if (contentType.toLowerCase().includes("text/html")) {
    htmlBody = body;
  } else {
    textBody = body;
  }

  const finalHtml = htmlBody || `<div><pre style="font-family:sans-serif;white-space:pre-wrap">${textBody.replace(/</g, "&lt;")}</pre></div>`;
  if (!finalHtml.trim()) return null;

  const from    = headers["from"]    || headers["reply-to"] || "";
  const subject = headers["subject"] || fileName.replace(/\.eml$/i, "") || "Email";
  const date    = headers["date"]    || "";

  const parts = [from && `From: ${from}`, subject && `Subject: ${subject}`, date].filter(Boolean);

  return {
    id: crypto.randomUUID(),
    type: "email",
    name: `Email: ${subject.slice(0, 50)}`,
    emailHtml: finalHtml,
    emailSummary: parts.join(" · ").slice(0, 120),
    emailHasBody: true,  // .eml files always include the full body
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

function AttachmentChip({
  att, onRemove, onBodyChange,
}: {
  att: Attachment;
  onRemove: () => void;
  onBodyChange?: (body: string) => void;
}) {
  const [bodyInput, setBodyInput] = useState(att.emailBody || "");

  if (att.type === "email") {
    return (
      <div className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
        {/* ── Header row ── */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{att.name}</p>
            {att.emailSummary && (
              <p className="text-[10px] text-muted-foreground truncate">{att.emailSummary}</p>
            )}
          </div>
          <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
            <X size={12} />
          </button>
        </div>

        {/* ── Body area ── */}
        {att.emailHasBody ? (
          <div className="border-t border-amber-200 dark:border-amber-800 px-3 py-1.5">
            <div className="flex items-center gap-1">
              <Check size={10} className="text-emerald-500 flex-shrink-0" />
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Full email captured — ready to triage</p>
            </div>
          </div>
        ) : (
          <div className="border-t border-amber-200 dark:border-amber-800">
            {!bodyInput && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/60 dark:bg-amber-900/20">
                <AlertTriangle size={10} className="text-amber-600 dark:text-amber-500 flex-shrink-0" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  Body not in drag payload — paste it below for full triage
                </p>
              </div>
            )}
            <textarea
              placeholder={`Open the email → Ctrl+A → Ctrl+C → paste here…`}
              value={bodyInput}
              onChange={e => {
                setBodyInput(e.target.value);
                onBodyChange?.(e.target.value);
              }}
              onPaste={e => e.stopPropagation()}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none px-3 py-2 leading-relaxed min-h-[60px] max-h-[160px]"
            />
          </div>
        )}
      </div>
    );
  }

  // ── Image / file chips ──
  return (
    <div className={cn(
      "group flex items-center gap-2 rounded-xl border overflow-hidden max-w-xs",
      att.type === "image" ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" : "bg-muted border-border"
    )}>
      {att.type === "image" && att.preview ? (
        <img src={att.preview} alt={att.name} className="w-10 h-10 object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 bg-muted">
          <Paperclip size={16} className="text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 py-1.5 pr-1">
        <p className="text-xs font-semibold text-foreground truncate">{att.name}</p>
        {att.size && <p className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</p>}
      </div>
      <button onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
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
        reader.onload = e => resolve({
          id: crypto.randomUUID(), type: "image",
          name: file.name, preview: e.target?.result as string, size: file.size,
        });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      } else if (
        file.name.toLowerCase().endsWith(".eml") ||
        file.type === "message/rfc822" ||
        file.type === "message/rfc2822" ||
        file.type === "application/octet-stream" && file.name.toLowerCase().endsWith(".eml")
      ) {
        // Parse .eml files as RFC 822 email content
        const reader = new FileReader();
        reader.onload = e => {
          const text = e.target?.result as string;
          const att = parseEmlContent(text, file.name);
          resolve(att);
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      } else {
        // Unknown file type — skip silently (don't add useless chips)
        resolve(null);
      }
    });
  }, []);

  const processHtmlEmail = useCallback((html: string): Attachment | null => {
    if (!html || html.trim().length < 20) return null;
    const meta = extractEmailMeta(html);
    const plain = htmlToText(html);
    const parts = [meta.from && `From: ${meta.from}`, meta.subject && `Subject: ${meta.subject}`, meta.date].filter(Boolean);

    // Detect if there's real body content beyond the header fields
    const headerLineRe = /^(From|To|Subject|Date|Sent|Cc|Bcc|Reply-To|De|Objet)\s*[:\s]/i;
    const nonHeaderContent = plain.split("\n").filter(l => l.trim() && !headerLineRe.test(l.trim()));
    const emailHasBody = nonHeaderContent.join("").replace(/\s/g, "").length > 120;

    return {
      id: crypto.randomUUID(),
      type: "email",
      name: meta.subject ? `Email: ${meta.subject.slice(0, 50)}` : "Email dropped",
      emailHtml: html,
      emailSummary: parts.join(" · ") || plain.slice(0, 80),
      emailHasBody,
    };
  }, []);

  // ── Drag & Drop handlers ─────────────────────────────────────────────────────

  const resetDragCounter = useCallback(() => {
    dragCounter.current = 0;
    setDragOver(false);
  }, []);

  // Reset stuck overlay if user cancels drag (ESC, window blur, etc.)
  useEffect(() => {
    window.addEventListener("dragend", resetDragCounter);
    window.addEventListener("blur", resetDragCounter);
    return () => {
      window.removeEventListener("dragend", resetDragCounter);
      window.removeEventListener("blur", resetDragCounter);
    };
  }, [resetDragCounter]);

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
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
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

    // 1. text/html — richest source, works for Outlook desktop drag & OWA drag
    const html = e.dataTransfer.getData("text/html");
    if (html && html.trim().length > 20) {
      const emailAtt = processHtmlEmail(html);
      if (emailAtt) {
        newAttachments.push(emailAtt);
        toast({ title: "Email captured", description: "AIDE will triage it automatically when you send." });
      }
    }

    // 2. Files (images and .eml files)
    if (e.dataTransfer.files.length > 0) {
      const filePromises = Array.from(e.dataTransfer.files).map(processFile);
      const results = await Promise.all(filePromises);
      const valid = results.filter((r): r is Attachment => r !== null);
      valid.forEach(r => {
        // Don't double-add if we already captured an email via text/html
        if (r.type === "email" && newAttachments.some(a => a.type === "email")) return;
        newAttachments.push(r);
      });
      const imageCount = valid.filter(r => r.type === "image").length;
      const emlCount   = valid.filter(r => r.type === "email").length;
      if (imageCount > 0) toast({ title: `${imageCount} image${imageCount > 1 ? "s" : ""} attached`, description: "Claude will analyse them when you send." });
      if (emlCount > 0) toast({ title: "Email file captured", description: "AIDE will triage it automatically when you send." });
    }

    // 3. text/plain — fallback: detect email-like plain text or put in input
    if (newAttachments.length === 0) {
      const text = e.dataTransfer.getData("text/plain");
      if (text && text.trim()) {
        if (looksLikeEmail(text)) {
          // Plain text that looks like an email header block
          const meta = { from: text.match(/^From:\s*(.+)/im)?.[1]?.trim() || "",
                         subject: text.match(/^Subject:\s*(.+)/im)?.[1]?.trim() || "Email",
                         date: text.match(/^(?:Date|Sent):\s*(.+)/im)?.[1]?.trim() || "" };
          const parts = [meta.from && `From: ${meta.from}`, meta.subject && `Subject: ${meta.subject}`, meta.date].filter(Boolean);
          newAttachments.push({
            id: crypto.randomUUID(), type: "email",
            name: `Email: ${meta.subject.slice(0, 50)}`,
            emailHtml: `<pre style="font-family:sans-serif;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</pre>`,
            emailSummary: parts.join(" · ").slice(0, 120),
          });
          toast({ title: "Email captured", description: "AIDE will triage it automatically when you send." });
        } else {
          setInput(prev => prev ? `${prev}\n${text}` : text);
          textareaRef.current?.focus();
        }
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
      textareaRef.current?.focus();
    }
  }, [processHtmlEmail, processFile, toast]);

  // ── Paste handler (Ctrl+V email paste support) ──────────────────────────────
  // IMPORTANT: use synchronous getData() — getAsString is async and can't preventDefault

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);

    // 1. Pasted image — check synchronously via getAsFile()
    const imageItem = items.find(item => item.type.startsWith("image/"));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        e.preventDefault();
        const att = await processFile(file);
        if (att) {
          setAttachments(prev => [...prev, att]);
          toast({ title: "Image pasted", description: "Claude will analyse it when you send." });
        }
        return;
      }
    }

    // 2. Pasted HTML — only treat as email if the plain-text version has email headers
    const html = e.clipboardData.getData("text/html");
    if (html && html.trim().length > 20 && looksLikeEmail(htmlToText(html))) {
      const emailAtt = processHtmlEmail(html);
      if (emailAtt) {
        e.preventDefault();
        setAttachments(prev => [...prev, emailAtt]);
        toast({ title: "Email pasted", description: "AIDE will triage it automatically when you send." });
        return;
      }
    }

    // 3. Pasted plain text — only intercept if it looks like an email
    const text = e.clipboardData.getData("text/plain");
    if (text && looksLikeEmail(text)) {
      e.preventDefault();
      const meta = {
        from:    text.match(/^From:\s*(.+)/im)?.[1]?.trim() || "",
        subject: text.match(/^Subject:\s*(.+)/im)?.[1]?.trim() || "Email",
        date:    text.match(/^(?:Date|Sent):\s*(.+)/im)?.[1]?.trim() || "",
      };
      const parts = [meta.from && `From: ${meta.from}`, meta.subject && `Subject: ${meta.subject}`, meta.date].filter(Boolean);
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(), type: "email",
        name: `Email: ${meta.subject.slice(0, 50)}`,
        emailHtml: `<pre style="font-family:sans-serif;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</pre>`,
        emailSummary: parts.join(" · ").slice(0, 120),
      }]);
      toast({ title: "Email pasted", description: "AIDE will triage it automatically when you send." });
      return;
    }

    // Otherwise: let the browser handle it normally (text into textarea)
  }, [processHtmlEmail, processFile, toast]);

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));
  const updateAttachmentBody = (id: string, body: string) =>
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, emailBody: body } : a));

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
    // Clear attachments now — local vars (emailAtt, imageAtts) already hold the data
    setAttachments([]);
    setStreaming(true);
    setStreamingContent("");

    const msgIndex = allMessages.length;

    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      // Always supply non-empty content — backend will merge with email HTML
      const body: Record<string, unknown> = { content: msg || "Please triage and analyse the attached content." };
      if (emailAtt?.emailHtml) {
        // Merge user-pasted body into the emailHtml if provided
        const pastedBody = emailAtt.emailBody?.trim();
        body.emailHtml = pastedBody
          ? emailAtt.emailHtml + `\n<hr/>\n<div style="white-space:pre-wrap">${pastedBody.replace(/</g, "&lt;")}</div>`
          : emailAtt.emailHtml;
      }
      if (imageAtts.length > 0) body.images = imageAtts.map(a => a.preview as string);

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
      onPaste={handlePaste}
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
      <div className="flex items-center gap-3 px-4 sm:px-6 py-1.5 border-b border-border bg-muted/20 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
          <Mail size={10} className="text-amber-500" />
          <span>Drag or paste Outlook emails</span>
        </div>
        <span className="text-muted-foreground/30">·</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
          <Paperclip size={10} className="text-violet-500" />
          <span>Drop .eml files</span>
        </div>
        <span className="text-muted-foreground/30">·</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
          <Image size={10} className="text-blue-500" />
          <span>Drop images for vision</span>
        </div>
        <span className="text-muted-foreground/30">·</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
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
          <div className="flex flex-col gap-2 mb-2.5">
            {attachments.map(att => (
              <AttachmentChip
                key={att.id}
                att={att}
                onRemove={() => removeAttachment(att.id)}
                onBodyChange={att.type === "email" ? (body) => updateAttachmentBody(att.id, body) : undefined}
              />
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
              accept="image/*,.eml,message/rfc822"
              multiple
              className="hidden"
              onChange={async e => {
                if (!e.target.files) return;
                const results = await Promise.all(Array.from(e.target.files).map(processFile));
                const valid = results.filter(Boolean) as Attachment[];
                if (valid.length > 0) setAttachments(prev => [...prev, ...valid]);
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
