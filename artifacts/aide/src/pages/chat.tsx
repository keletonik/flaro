import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Send, RefreshCw, Copy, Check, Briefcase,
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CONVERSATION_ID = 1;

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
  preview?: string;
  emailHtml?: string;
  emailPlainText?: string;
  emailSummary?: string;
  emailHasBody?: boolean;
  fileText?: string;
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
  const d = document.createElement("div");
  d.innerHTML = html;
  const styles = d.querySelectorAll("style, script, head, meta, link");
  styles.forEach(el => el.remove());
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") return "\n";
    const kids = Array.from(el.childNodes).map(walk).join("");
    if (["p", "div", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote"].includes(tag)) return `\n${kids}\n`;
    if (tag === "td" || tag === "th") return `${kids}\t`;
    return kids;
  };
  return walk(d)
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
      <div className={cn(
        "w-full rounded-xl overflow-hidden border",
        att.emailHasBody
          ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
          : "bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700"
      )}>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
            att.emailHasBody
              ? "bg-emerald-100 dark:bg-emerald-900/20"
              : "bg-amber-100 dark:bg-amber-900/20"
          )}>
            <Mail size={14} className={att.emailHasBody ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
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
        <div className={cn(
          "border-t px-3 py-1.5",
          att.emailHasBody ? "border-emerald-200 dark:border-emerald-800" : "border-amber-300 dark:border-amber-700"
        )}>
          {att.emailHasBody ? (
            <div className="flex items-center gap-1.5">
              <Check size={12} className="text-emerald-500 flex-shrink-0" />
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Full email captured — ready to triage</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Header only — body text not captured by Outlook</p>
              </div>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 pl-5">
                Open the email in Outlook, press Ctrl+A then Ctrl+C, then click here and press Ctrl+V
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Image / file chips ──
  const ext = att.name.toLowerCase().split(".").pop() || "";
  const isPdf = ext === "pdf";
  const isDoc = ["doc", "docx"].includes(ext);
  const isXls = ["xls", "xlsx", "csv"].includes(ext);
  const isText = att.fileText !== undefined;
  const chipColor = att.type === "image"
    ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
    : isPdf ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
    : isDoc ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
    : isXls ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
    : "bg-muted border-border";
  const iconColor = isPdf ? "text-red-500" : isDoc ? "text-blue-500" : isXls ? "text-emerald-500" : "text-muted-foreground";

  return (
    <div className={cn("group flex items-center gap-2.5 rounded-xl border overflow-hidden", chipColor)}>
      {att.type === "image" && att.preview ? (
        <img src={att.preview} alt={att.name} className="w-10 h-10 object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
          <FileText size={18} className={iconColor} />
        </div>
      )}
      <div className="flex-1 min-w-0 py-2 pr-1">
        <p className="text-xs font-semibold text-foreground truncate">{att.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {att.size ? `${(att.size / 1024).toFixed(0)} KB` : ""}
          {isText ? " · Text extracted" : isPdf || isDoc || isXls ? " · Binary attached" : ""}
        </p>
      </div>
      <button onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mr-1">
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

// ─── Rich markdown renderer (react-markdown + remark-gfm) ──────────────────

function MarkdownContent({ content }: { content: string }) {
  const components = useMemo(() => ({
    h1: ({ children, ...props }: any) => <h1 className="text-lg font-bold text-foreground mt-4 mb-2 tracking-tight" {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 className="text-base font-bold text-foreground mt-3.5 mb-1.5 tracking-tight" {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 className="text-sm font-semibold text-foreground mt-3 mb-1" {...props}>{children}</h3>,
    h4: ({ children, ...props }: any) => <h4 className="text-sm font-semibold text-foreground mt-2 mb-1" {...props}>{children}</h4>,
    p: ({ children, ...props }: any) => <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed" {...props}>{children}</p>,
    strong: ({ children, ...props }: any) => <strong className="font-semibold text-foreground" {...props}>{children}</strong>,
    em: ({ children, ...props }: any) => <em className="italic text-foreground/80" {...props}>{children}</em>,
    a: ({ children, href, ...props }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors" {...props}>{children}</a>,
    ul: ({ children, className, ...props }: any) => {
      const isTaskList = className === "contains-task-list";
      return <ul className={cn("my-2 space-y-1.5", isTaskList ? "pl-0 list-none" : "pl-0 list-none chat-ul")} {...props}>{children}</ul>;
    },
    ol: ({ children, ...props }: any) => <ol className="my-2 space-y-1.5 pl-0 list-none chat-ol" {...props}>{children}</ol>,
    li: ({ children, className, node, ...props }: any) => {
      const isTask = className === "task-list-item";
      const parentTag = node?.parentNode?.tagName;
      const isOrdered = parentTag === "ol";
      if (isTask) {
        return <li className="flex gap-2 items-start leading-relaxed" {...props}>{children}</li>;
      }
      const siblings = node?.parentNode?.children?.filter((c: any) => c.tagName === "li") || [];
      const idx = siblings.indexOf(node);
      return (
        <li className="flex gap-2.5 items-start leading-relaxed" {...props}>
          {isOrdered ? (
            <span className="text-primary/70 text-xs font-semibold mt-[2px] flex-shrink-0 min-w-[20px] tabular-nums">{idx + 1}.</span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-[7px] flex-shrink-0" />
          )}
          <span className="flex-1">{children}</span>
        </li>
      );
    },
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="my-3 pl-4 border-l-[3px] border-primary/30 bg-primary/[0.03] rounded-r-lg py-2 pr-3 text-foreground/75 italic" {...props}>{children}</blockquote>
    ),
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return <code className="px-1.5 py-0.5 rounded-md bg-muted text-[12.5px] font-mono text-primary/90 border border-border/40" {...props}>{children}</code>;
      }
      return (
        <code className="text-[12px] font-mono text-foreground/85 leading-relaxed block" {...props}>{children}</code>
      );
    },
    pre: ({ children, ...props }: any) => (
      <pre className="my-3 rounded-xl bg-[hsl(var(--foreground)/0.04)] border border-border/40 px-4 py-3.5 overflow-x-auto" {...props}>{children}</pre>
    ),
    hr: (props: any) => <hr className="my-5 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" {...props} />,
    table: ({ children, ...props }: any) => (
      <div className="my-3 overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm" {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }: any) => <thead className="bg-muted/50 border-b border-border/40" {...props}>{children}</thead>,
    th: ({ children, ...props }: any) => <th className="px-3 py-2 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wider" {...props}>{children}</th>,
    td: ({ children, ...props }: any) => <td className="px-3 py-2 text-sm border-t border-border/20" {...props}>{children}</td>,
    input: ({ checked, ...props }: any) => (
      <span className={cn("inline-flex items-center justify-center w-4 h-4 rounded border mr-2 flex-shrink-0 mt-[2px]",
        checked ? "bg-primary border-primary text-primary-foreground" : "border-border/60 bg-background"
      )}>
        {checked && <Check size={10} strokeWidth={3} />}
      </span>
    ),
  }), []);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
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
          <div className="text-[13.5px] text-foreground/90 leading-[1.75] chat-markdown">
            <MarkdownContent content={cleanText} />
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
      const name = file.name;
      const ext = name.toLowerCase().split(".").pop() || "";

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = e => resolve({
          id: crypto.randomUUID(), type: "image",
          name, preview: e.target?.result as string, size: file.size,
        });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      } else if (
        ext === "eml" ||
        file.type === "message/rfc822" ||
        file.type === "message/rfc2822"
      ) {
        const reader = new FileReader();
        reader.onload = e => {
          const text = e.target?.result as string;
          const att = parseEmlContent(text, name);
          resolve(att);
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      } else if (ext === "msg" || file.type === "application/vnd.ms-outlook") {
        // Outlook .msg file — read as binary and extract what we can
        const reader = new FileReader();
        reader.onload = e => {
          const text = e.target?.result as string;
          // .msg files are binary but contain readable strings — extract email-like content
          const readable = text.replace(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g, " ").replace(/\s{3,}/g, "\n").trim();
          if (readable.length > 50) {
            resolve({
              id: crypto.randomUUID(), type: "email",
              name: `Email: ${name}`,
              emailHtml: `<pre style="font-family:sans-serif;white-space:pre-wrap">${readable.replace(/</g, "&lt;")}</pre>`,
              emailPlainText: readable,
              emailSummary: `Outlook message: ${name}`,
              emailHasBody: true,
            });
          } else { resolve(null); }
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file, "latin1");
      } else if (
        // Text-readable documents — read as text and send content to LLM
        ["txt", "csv", "json", "xml", "html", "htm", "md", "log", "ini", "cfg", "yaml", "yml", "toml"].includes(ext) ||
        file.type.startsWith("text/") ||
        file.type === "application/json" ||
        file.type === "application/xml"
      ) {
        const reader = new FileReader();
        reader.onload = e => {
          const text = e.target?.result as string;
          resolve({
            id: crypto.randomUUID(), type: "file",
            name, size: file.size,
            fileText: text,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      } else {
        // Binary documents (PDF, Word, Excel, etc.) — read as data URL for attachment
        const reader = new FileReader();
        reader.onload = e => {
          resolve({
            id: crypto.randomUUID(), type: "file",
            name, size: file.size,
            preview: e.target?.result as string,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const processHtmlEmail = useCallback((html: string, extraPlainText?: string): Attachment | null => {
    if (!html || html.trim().length < 20) return null;
    const meta = extractEmailMeta(html);
    const htmlPlain = htmlToText(html);

    const headerLineRe = /^(From|To|Subject|Date|Sent|Cc|Bcc|Reply-To|De|Objet|Importance|Attachments?|Categories|Sensitivity|Priority)\s*[:\s]/i;
    const metaJunkRe = /^(mailto:|https?:\/\/|www\.|javascript:|#|[\s•–—·|]+$)/i;
    const extractBody = (text: string): string => {
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const nonHeaders = lines.filter(l => !headerLineRe.test(l) && !metaJunkRe.test(l) && l.length > 2);
      return nonHeaders.join(" ").replace(/\s+/g, " ").trim();
    };

    let bodyFromHtml = extractBody(htmlPlain);
    let bodyFromPlain = extraPlainText ? extractBody(extraPlainText) : "";

    const bestBody = bodyFromPlain.length > bodyFromHtml.length ? bodyFromPlain : bodyFromHtml;
    const emailHasBody = bestBody.length > 60 && bestBody.split(/\s+/).length > 8;

    let mergedHtml = html;
    if (!emailHasBody && extraPlainText && extraPlainText.trim().length > htmlPlain.length) {
      mergedHtml = `${html}\n<div style="white-space:pre-wrap;margin-top:12px;font-family:sans-serif">${extraPlainText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
    } else if (bodyFromPlain.length > bodyFromHtml.length + 40) {
      mergedHtml = `${html}\n<div style="white-space:pre-wrap;margin-top:12px;font-family:sans-serif">${extraPlainText!.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
    }

    const mergedPlain = [htmlPlain, extraPlainText].filter(Boolean).join("\n\n");
    const parts = [meta.from && `From: ${meta.from}`, meta.subject && `Subject: ${meta.subject}`, meta.date].filter(Boolean);

    return {
      id: crypto.randomUUID(),
      type: "email",
      name: meta.subject ? `Email: ${meta.subject.slice(0, 50)}` : "Email dropped",
      emailHtml: mergedHtml,
      emailPlainText: mergedPlain,
      emailSummary: parts.join(" · ") || htmlPlain.slice(0, 80),
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

    // Capture ALL available data types from the drag event
    const availableTypes = Array.from(e.dataTransfer.types || []);
    const html = e.dataTransfer.getData("text/html");
    const plainText = e.dataTransfer.getData("text/plain");

    // Try to read ALL text-based data types (some Outlook versions provide custom types)
    let richestContent = html;
    for (const type of availableTypes) {
      if (type === "text/html" || type === "Files") continue;
      try {
        const data = e.dataTransfer.getData(type);
        if (data && data.length > (richestContent?.length || 0)) {
          richestContent = data;
        }
      } catch {}
    }

    // Also check dataTransfer.items for any file-like entries (Outlook sometimes provides .msg/.eml as items)
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && (file.name.endsWith(".eml") || file.name.endsWith(".msg") || file.type === "message/rfc822")) {
            const att = await processFile(file);
            if (att) newAttachments.push(att);
          }
        }
      }
    }

    // Use the richest HTML content available
    const bestHtml = richestContent || html;
    if (bestHtml && bestHtml.trim().length > 20 && newAttachments.filter(a => a.type === "email").length === 0) {
      const emailAtt = processHtmlEmail(bestHtml, plainText || undefined);
      if (emailAtt) {
        newAttachments.push(emailAtt);
        if (emailAtt.emailHasBody) {
          toast({ title: "Email captured", description: "Full email ready — will be triaged when you send." });
        } else {
          toast({ title: "Email header captured", description: "Paste the email body (Ctrl+V) for full triage, or send as-is." });
        }
      }
    }

    if (e.dataTransfer.files.length > 0) {
      const filePromises = Array.from(e.dataTransfer.files).map(processFile);
      const results = await Promise.all(filePromises);
      const valid = results.filter((r): r is Attachment => r !== null);
      valid.forEach(r => {
        if (r.type === "email" && newAttachments.some(a => a.type === "email")) return;
        newAttachments.push(r);
      });
      const imageCount = valid.filter(r => r.type === "image").length;
      const emlCount   = valid.filter(r => r.type === "email").length;
      if (imageCount > 0) toast({ title: `${imageCount} image${imageCount > 1 ? "s" : ""} attached`, description: "Will be analysed when you send." });
      if (emlCount > 0) toast({ title: "Email file captured", description: "Will be triaged automatically when you send." });
    }

    if (newAttachments.length === 0 && plainText && plainText.trim()) {
      if (looksLikeEmail(plainText)) {
        const meta = { from: plainText.match(/^From:\s*(.+)/im)?.[1]?.trim() || "",
                       subject: plainText.match(/^Subject:\s*(.+)/im)?.[1]?.trim() || "Email",
                       date: plainText.match(/^(?:Date|Sent):\s*(.+)/im)?.[1]?.trim() || "" };
        const parts = [meta.from && `From: ${meta.from}`, meta.subject && `Subject: ${meta.subject}`, meta.date].filter(Boolean);
        const headerLineRe = /^(From|To|Subject|Date|Sent|Cc|Bcc|Reply-To|Importance|Attachments?)\s*[:\s]/i;
        const bodyLines = plainText.split("\n").map(l => l.trim()).filter(l => l && !headerLineRe.test(l) && l.length > 2);
        const hasBody = bodyLines.join(" ").length > 60 && bodyLines.length > 2;
        newAttachments.push({
          id: crypto.randomUUID(), type: "email",
          name: `Email: ${meta.subject.slice(0, 50)}`,
          emailHtml: `<pre style="font-family:sans-serif;white-space:pre-wrap">${plainText.replace(/</g, "&lt;")}</pre>`,
          emailPlainText: plainText,
          emailSummary: parts.join(" · ").slice(0, 120),
          emailHasBody: hasBody,
        });
        toast({ title: "Email captured", description: hasBody ? "Full email ready — will be triaged when you send." : "Paste the email body (Ctrl+V) for full triage, or send as-is." });
      } else {
        setInput(prev => prev ? `${prev}\n${plainText}` : plainText);
        textareaRef.current?.focus();
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

    const hasHeaderOnlyEmail = attachments.some(a => a.type === "email" && !a.emailHasBody);

    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");

    if (hasHeaderOnlyEmail) {
      e.preventDefault();
      const pastedContent = html && html.trim().length > 50 ? html : (text ? `<div style="white-space:pre-wrap;font-family:sans-serif">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>` : "");
      const pastedPlain = text || (html ? htmlToText(html) : "");
      if (pastedContent) {
        setAttachments(prev => prev.map(a =>
          a.type === "email" && !a.emailHasBody
            ? {
                ...a,
                emailHtml: `<div>${a.emailHtml || ""}</div>\n${pastedContent}`,
                emailPlainText: [a.emailPlainText, pastedPlain].filter(Boolean).join("\n\n"),
                emailHasBody: true,
              }
            : a
        ));
        toast({ title: "Email body merged", description: "Full email ready — send to triage." });
      }
      return;
    }

    if (html && html.trim().length > 20 && looksLikeEmail(htmlToText(html))) {
      const emailAtt = processHtmlEmail(html, text || undefined);
      if (emailAtt) {
        e.preventDefault();
        setAttachments(prev => [...prev, emailAtt]);
        toast({ title: "Email pasted", description: emailAtt.emailHasBody ? "Full email ready — send to triage." : "Header captured — paste body for full triage." });
        return;
      }
    }

    if (text && text.trim().length > 30) {
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
          emailPlainText: text,
          emailSummary: parts.join(" · ").slice(0, 120),
          emailHasBody: true,
        }]);
        toast({ title: "Email pasted", description: "Will be triaged automatically when you send." });
        return;
      }
    }
  }, [processHtmlEmail, processFile, toast, attachments]);

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));
  const updateAttachmentBody = (id: string, body: string) =>
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, emailBody: body } : a));

  // ── Cross-route file handoff ─────────────────────────────────────────────────
  // Files dropped on the global AIDE tray that aren't CSV/.msg get queued by
  // FileIntakeDialog and we navigate here. Drain the queue on mount and on the
  // CHAT_ATTACH_EVENT so multi-drop bursts and post-mount drops both land.
  //
  // Lifecycle is fiddly because the queue module is dynamically imported.
  // Without a `disposed` guard the listener could be attached AFTER unmount and
  // never removed — orphan listeners trigger ghost toasts and stale setState on
  // remount. We also defensively clear the queue on unmount so files queued by
  // a logged-out user can't bleed into a re-login in the same tab.
  useEffect(() => {
    let disposed = false;
    let attachedHandler: (() => void) | null = null;
    let attachedEvent: string | null = null;

    (async () => {
      const mod = await import("@/lib/chat-attachment-queue");
      if (disposed) return;
      const flush = async () => {
        if (disposed) return;
        const files = mod.drainChatFiles();
        if (files.length === 0) return;
        const results = await Promise.all(files.map(processFile));
        if (disposed) return;
        const valid = results.filter((r): r is Attachment => r !== null);
        if (valid.length === 0) return;
        setAttachments(prev => [...prev, ...valid]);
        const imageCount = valid.filter(r => r.type === "image").length;
        const otherCount = valid.length - imageCount;
        toast({
          title: `${valid.length} file${valid.length > 1 ? "s" : ""} ready to send`,
          description: [
            imageCount && `${imageCount} image${imageCount > 1 ? "s" : ""}`,
            otherCount && `${otherCount} document${otherCount > 1 ? "s" : ""}`,
          ].filter(Boolean).join(" · "),
        });
        textareaRef.current?.focus();
      };
      void flush();
      const handler = () => { void flush(); };
      window.addEventListener(mod.CHAT_ATTACH_EVENT, handler);
      attachedHandler = handler;
      attachedEvent = mod.CHAT_ATTACH_EVENT;
      // If unmount happened while we were awaiting setup, tear down now.
      if (disposed && attachedEvent && attachedHandler) {
        window.removeEventListener(attachedEvent, attachedHandler);
        mod.drainChatFiles(); // discard anything left
      }
    })();

    return () => {
      disposed = true;
      if (attachedEvent && attachedHandler) {
        window.removeEventListener(attachedEvent, attachedHandler);
      }
      // Defensive: prevent queued files from surviving an in-tab session change.
      void import("@/lib/chat-attachment-queue").then(m => m.drainChatFiles());
    };
  }, [processFile, toast]);

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
            owner: d.owner || "User",
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
    const fileAttsDisplay = attachments.filter(a => a.type === "file");
    if (emailAtt) displayContent = `[EMAIL DROPPED]\n${emailAtt.emailSummary || "Email"}${msg ? `\n\n${msg}` : ""}`;
    else if (fileAttsDisplay.length > 0) displayContent = `[${fileAttsDisplay.map(f => f.name).join(", ")} attached]${msg ? `\n\n${msg}` : ""}`;
    else if (imageAtts.length > 0) displayContent = `[${imageAtts.length} image(s) attached]${msg ? ` — ${msg}` : ""}`;

    const userMsg: Message = { id: `opt-${Date.now()}`, role: "user", content: displayContent, createdAt: new Date().toISOString() };
    setOptimisticMessages(prev => [...prev, userMsg]);
    // Clear attachments now — local vars (emailAtt, imageAtts) already hold the data
    setAttachments([]);
    setStreaming(true);
    setStreamingContent("");

    const msgIndex = allMessages.length;

    try {
      // Prefer the explicit API origin when the frontend is hosted cross-origin
      // (e.g. Vercel → Replit). Falls back to the Vite BASE_URL for same-origin
      // Replit all-in-one deploys.
      const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, "");
      const base = apiBase ?? (import.meta.env.BASE_URL?.replace(/\/$/, "") || "");
      // Always supply non-empty content — backend will merge with email HTML
      const body: Record<string, unknown> = { content: msg || "Please triage and analyse the attached content." };
      if (emailAtt?.emailHtml) {
        body.emailHtml = emailAtt.emailHtml;
      }
      if (emailAtt?.emailPlainText) {
        body.emailPlainText = emailAtt.emailPlainText;
      }
      if (imageAtts.length > 0) body.images = imageAtts.map(a => a.preview as string);

      // Attach file content (text-readable and binary documents)
      const fileAtts = attachments.filter(a => a.type === "file");
      if (fileAtts.length > 0) {
        const fileContents = fileAtts.map(f => ({
          name: f.name,
          text: f.fileText || null,
          dataUrl: !f.fileText ? f.preview || null : null,
          size: f.size,
        }));
        body.files = fileContents;
      }

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
        let buffer = "";
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
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
                accept="*/*"
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
