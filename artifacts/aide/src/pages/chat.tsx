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
  const cleanText = text.replace(/<ops-action>([\s\S]*?)<\/ops-action>/g, (_, json) => {
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
  att, onRemove,
}: {
  att: Attachment;
  onRemove: () => void;
  onBodyChange?: (body: string) => void;
}) {
  if (att.type === "email") {
    return (
      <div className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
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
        <div className="border-t border-amber-200 dark:border-amber-800 px-3 py-1.5">
          {att.emailHasBody ? (
            <div className="flex items-center gap-1">
              <Check size={10} className="text-emerald-500 flex-shrink-0" />
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Full email captured — ready to triage</p>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <AlertTriangle size={10} className="text-amber-500 flex-shrink-0" />
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Header only — paste email body (Ctrl+V) for full triage, or send as-is</p>
            </div>
          )}
        </div>
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
      className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all">
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 px-1 py-3">
      {[0,1,2].map(i => <div key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />)}
    </div>
  );
}

// ─── Inline markdown renderer ──────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2] && match[3]) parts.push(<a key={key++} href={match[3]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">{match[2]}</a>);
    else if (match[4]) parts.push(<strong key={key++} className="font-semibold text-foreground">{match[4]}</strong>);
    else if (match[5]) parts.push(<em key={key++}>{match[5]}</em>);
    else if (match[6]) parts.push(<code key={key++} className="px-1.5 py-0.5 rounded-md bg-muted/80 text-[12px] font-mono text-foreground">{match[6]}</code>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : [text];
}

function renderMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const rawLines = text.split("\n");
  let i = 0;
  let key = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    if (/^-{3,}$|^\*{3,}$|^_{3,}$/.test(trimmed)) {
      elements.push(<hr key={key++} className="my-4 border-t border-border/30" />);
      i++; continue;
    }

    if (/^```/.test(trimmed)) {
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !/^```/.test(rawLines[i].trim())) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre key={key++} className="my-3 rounded-lg bg-muted/60 border border-border/30 px-4 py-3 overflow-x-auto">
          <code className="text-[12px] font-mono text-foreground/90 leading-relaxed">{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes = ["text-lg font-bold", "text-base font-bold", "text-sm font-semibold", "text-sm font-semibold"];
      elements.push(
        <div key={key++} className={`${sizes[level - 1]} text-foreground mt-3 mb-1.5`}>
          {renderInline(headingMatch[2])}
        </div>
      );
      i++; continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && /^>\s?/.test(rawLines[i].trim())) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="my-2 pl-3 border-l-2 border-primary/30 text-foreground/70 italic">
          {quoteLines.map((ql, qi) => <span key={qi}>{renderInline(ql)}{qi < quoteLines.length - 1 && <br />}</span>)}
        </blockquote>
      );
      continue;
    }

    if (/^\s*[-•]\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < rawLines.length && /^\s*[-•]\s/.test(rawLines[i].trim())) {
        listItems.push(rawLines[i].trim().replace(/^\s*[-•]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 space-y-1 ml-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex gap-2 items-start">
              <span className="text-muted-foreground/50 mt-[3px] flex-shrink-0 text-[8px]">●</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s/.test(trimmed)) {
      const listItems: { num: string; text: string }[] = [];
      while (i < rawLines.length && /^\s*\d+\.\s/.test(rawLines[i].trim())) {
        const m = rawLines[i].trim().match(/^\s*(\d+)\.\s+(.*)/);
        listItems.push({ num: m?.[1] || `${listItems.length + 1}`, text: m?.[2] || "" });
        i++;
      }
      elements.push(
        <ol key={key++} className="my-2 space-y-1 ml-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex gap-2 items-start">
              <span className="text-muted-foreground/60 text-xs font-mono mt-[1px] flex-shrink-0 min-w-[18px]">{item.num}.</span>
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const paraLines: string[] = [];
    while (i < rawLines.length && rawLines[i].trim() && !/^(#{1,4}\s|```|>\s?|- |\d+\.\s|-{3,}|\*{3,}|_{3,})/.test(rawLines[i].trim())) {
      paraLines.push(rawLines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={key++} className="my-1.5 first:mt-0 last:mb-0">
          {paraLines.map((pl, pli) => (
            <span key={pli}>
              {renderInline(pl)}
              {pli < paraLines.length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    } else {
      i++;
    }
  }
  return elements;
}

// ─── Message components ─────────────────────────────────────────────────────────

function MessageBubble({ msg, executedActions }: { msg: Message; executedActions?: ExecutedAction[] }) {
  const isUser = msg.role === "user";
  const { cleanText, actions } = parseActions(msg.content);
  const emailTriage = actions.find(a => a.type === "EMAIL_TRIAGE");
  const isEmailDrop = msg.content.startsWith("[EMAIL DROPPED]");
  const isImageDrop = msg.content.startsWith("[") && msg.content.includes("image");
  const ts = new Date(msg.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

  // ── User message ──
  if (isUser) {
    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[75%] flex flex-col items-end">
          {(isEmailDrop || isImageDrop) && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold mb-1",
              isEmailDrop ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
            )}>
              {isEmailDrop ? <><Mail size={10} /> Email dropped</> : <><Image size={10} /> Image attached</>}
            </div>
          )}
          <div className="chat-user-bubble text-[13.5px] leading-relaxed">
            {cleanText.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground/40 mt-1 mr-1">{ts}</span>
        </div>
      </div>
    );
  }

  // ── Assistant message — clean layout ──
  return (
    <div className="fade-in">
      <div className="flex items-start gap-3 chat-assistant">
        <div className="w-6 h-6 rounded-full bg-primary/12 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap size={12} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0 group">
          <div className="text-[13.5px] text-foreground/90 leading-[1.75]">
            {renderMarkdown(cleanText)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <CopyButton text={cleanText} />
            <span className="text-[10px] text-muted-foreground/40">{ts}</span>
          </div>
        </div>
      </div>

      {emailTriage && <div className="ml-9 mt-2"><EmailTriageCard data={emailTriage.data} /></div>}

      {executedActions && executedActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
          {executedActions.map((a, i) => <ActionBadge key={i} action={a} />)}
        </div>
      )}
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
        toast({ title: "Email captured", description: "Will be triaged automatically when you send." });
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
      if (imageCount > 0) toast({ title: `${imageCount} image${imageCount > 1 ? "s" : ""} attached`, description: "Will be analysed when you send." });
      if (emlCount > 0) toast({ title: "Email file captured", description: "Will be triaged automatically when you send." });
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
          toast({ title: "Email captured", description: "Will be triaged automatically when you send." });
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
          toast({ title: "Image pasted", description: "Will be analysed when you send." });
        }
        return;
      }
    }

    // 2. Pasted HTML — treat as email if it has email headers
    const html = e.clipboardData.getData("text/html");
    if (html && html.trim().length > 20 && looksLikeEmail(htmlToText(html))) {
      const emailAtt = processHtmlEmail(html);
      if (emailAtt) {
        e.preventDefault();
        // If there's already a header-only email chip, merge the body into it
        setAttachments(prev => {
          const existingIdx = prev.findIndex(a => a.type === "email" && !a.emailHasBody);
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], emailHtml: emailAtt.emailHtml || updated[existingIdx].emailHtml, emailHasBody: true };
            return updated;
          }
          return [...prev, emailAtt];
        });
        toast({ title: "Email body captured", description: "Full email ready — send to triage." });
        return;
      }
    }

    // 3. Pasted plain text — check if it's an email or body content for an existing chip
    const text = e.clipboardData.getData("text/plain");
    if (text && text.trim().length > 30) {
      // If there's a header-only email attachment, merge this paste as the body
      const hasHeaderOnlyEmail = attachments.some(a => a.type === "email" && !a.emailHasBody);
      if (hasHeaderOnlyEmail) {
        e.preventDefault();
        setAttachments(prev => prev.map(a =>
          a.type === "email" && !a.emailHasBody
            ? { ...a, emailHtml: `<div>${a.emailHtml || ""}</div><div style="white-space:pre-wrap;margin-top:12px">${text.replace(/</g, "&lt;")}</div>`, emailHasBody: true }
            : a
        ));
        toast({ title: "Email body merged", description: "Full email ready — send to triage." });
        return;
      }

      // Detect complete email and create a new attachment
      if (looksLikeEmail(text)) {
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
          emailHasBody: true,
        }]);
        toast({ title: "Email pasted", description: "Will be triaged automatically when you send." });
        return;
      }
    }

    // Otherwise: let the browser handle it normally (text into textarea)
  }, [processHtmlEmail, processFile, toast, attachments]);

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
            text: d.text || "Auto-generated note",
            category: (d.category as "Urgent" | "To Do" | "To Ask" | "Schedule" | "Done") || "To Do",
            owner: d.owner || "Casper",
          }});
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          return { type: action.type, label: "Note saved", success: true };
        }
        case "CREATE_TODO": {
          const d = action.data as Record<string, string>;
          await createTodo.mutateAsync({ data: {
            text: d.text || "Auto-generated task",
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
        body.emailHtml = emailAtt.emailHtml;
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
          if (succeeded.length > 0) toast({ title: `Completed ${succeeded.length} action${succeeded.length > 1 ? "s" : ""}` });
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
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md pointer-events-none">
          <div className="bg-card border-2 border-dashed border-primary/40 rounded-3xl px-10 py-8 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail size={24} className="text-primary" />
            </div>
            <p className="text-foreground font-semibold text-lg">Drop to attach</p>
            <p className="text-muted-foreground text-sm text-center max-w-xs">
              Emails, images, or .eml files
            </p>
          </div>
        </div>
      )}

      {/* ── Header — minimal ── */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-2.5 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/12 flex items-center justify-center">
            <Zap size={11} className="text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">Chat</span>
          {streaming && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
        </div>
        <div className="flex items-center gap-1">
          <span className="hidden sm:inline text-[10px] text-muted-foreground/40">Drop emails · images · .eml files</span>
          <button
            data-testid="button-clear-chat"
            onClick={() => { if (confirm("Clear this conversation?")) { setOptimisticMessages([]); setAttachments([]); queryClient.setQueryData(getGetAnthropicConversationQueryKey(CONVERSATION_ID), null); } }}
            className="text-muted-foreground/40 hover:text-foreground p-1.5 rounded-lg hover:bg-muted/60 transition-all ml-2"
            title="New conversation"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allMessages.length === 0 && !streaming ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Zap size={20} className="text-primary" />
            </div>
            <h2 className="text-foreground font-semibold text-xl mb-2 tracking-tight">How can I help today?</h2>
            <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
              Drop an Outlook email, paste content, or just ask — jobs get logged, emails triaged, and tasks created automatically.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.slice(0, 4).map(s => (
                <button key={s} onClick={() => handleSend(s)}
                  className="text-left px-4 py-3 text-[13px] text-muted-foreground bg-card border border-border rounded-2xl hover:text-foreground hover:bg-muted/40 transition-all hover:border-primary/20 leading-snug">
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
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/12 flex items-center justify-center flex-shrink-0">
                    <Zap size={12} className="text-primary" />
                  </div>
                  <TypingIndicator />
                </div>
              )
            )}
          </>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      <div className="px-4 sm:px-6 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
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
            "chat-input-bar flex items-end gap-2.5 px-4 py-3",
            dragOver && "border-primary ring-2 ring-primary/10"
          )}>
            <label className="flex-shrink-0 p-1 text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer" title="Attach file">
              <Paperclip size={17} />
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
              placeholder={attachments.length > 0 ? "Add a note then send..." : "Message..."}
              rows={1}
              disabled={streaming}
              className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none leading-relaxed min-h-[22px] max-h-[140px] disabled:opacity-60"
            />
            <button
              data-testid="button-send-message"
              onClick={() => handleSend()}
              disabled={!canSend}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-95",
                canSend ? "bg-primary text-primary-foreground hover:brightness-110" : "bg-muted text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              <Send size={14} strokeWidth={2.5} />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/25 text-center mt-2">
            Enter to send · Shift+Enter for new line · Drag emails or images anywhere
          </p>
        </div>
      </div>
    </div>
  );
}
