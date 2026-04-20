/**
 * PAMessage — a single turn in the PA conversation.
 *
 * Rendering:
 *  - User turns: right-aligned compact bubble
 *  - Assistant turns: left-aligned wide block with markdown rendering,
 *    a collapsible tool-call tree, reaction buttons (copy, thumbs,
 *    retry), and follow-up chips
 *
 * Uses react-markdown + remark-gfm (already a project dep via the
 * legacy chat.tsx). Code blocks get a copy button inline.
 *
 * The tool-call tree distinguishes in-flight calls (spinner) from
 * completed ones (✓/✗) so the operator can see what the agent did.
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2, Check, X, Copy, ThumbsUp, ThumbsDown, RefreshCw, ChevronRight,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThinkingIndicator } from "@/components/ui/ThinkingIndicator";

export interface PAToolCall {
  name: string;
  input?: Record<string, unknown>;
  ok?: boolean;
  error?: string;
}

export interface PAMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: PAToolCall[];
  followUps?: string[];
  timestamp?: string;
  source?: "voice" | "text" | "slash";
}

interface Props {
  message: PAMessageData;
  streaming?: boolean;
  onFollowUpClick?: (text: string) => void;
  onRetry?: () => void;
  onReaction?: (kind: "up" | "down") => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
      }}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function PAMessage({ message, streaming, onFollowUpClick, onRetry, onReaction }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] group">
          {message.source === "voice" && (
            <p className="text-[10px] text-muted-foreground text-right mb-1">🎙 Voice</p>
          )}
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-3.5 py-2.5 text-sm">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Assistant turn
  const isEmpty = !message.content && (!message.toolCalls || message.toolCalls.length === 0);
  return (
    <div className="flex justify-start">
      <div className="max-w-full w-full group">
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallTree calls={message.toolCalls} />
        )}
        <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 text-sm">
          {isEmpty && streaming ? (
            <ThinkingIndicator />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: any) {
                    if (inline) {
                      return <code className={cn("px-1 py-0.5 rounded bg-muted text-[12px]", className)} {...props}>{children}</code>;
                    }
                    const text = String(children).replace(/\n$/, "");
                    return (
                      <div className="relative group/code">
                        <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                          <CopyButton text={text} />
                        </div>
                        <pre className="bg-muted rounded-md p-3 overflow-x-auto"><code className={className} {...props}>{children}</code></pre>
                      </div>
                    );
                  },
                }}
              >
                {message.content || ""}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Reaction bar */}
        {!streaming && message.content && (
          <div className="flex items-center gap-0.5 mt-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={message.content} />
            {onReaction && (
              <>
                <button onClick={() => onReaction("up")} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500" title="Good">
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button onClick={() => onReaction("down")} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500" title="Bad">
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </>
            )}
            {onRetry && (
              <button onClick={onRetry} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Retry">
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Follow-up chips */}
        {!streaming && message.followUps && message.followUps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.followUps.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onFollowUpClick?.(f)}
                className="px-2.5 py-1 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-[11px] text-foreground transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallTree({ calls }: { calls: PAToolCall[] }) {
  const [open, setOpen] = useState(true);
  if (!calls.length) return null;
  const anyInFlight = calls.some((c) => c.ok === undefined);
  return (
    <div className="mb-2 rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={cn("w-3 h-3 transition-transform", open && "rotate-90")} />
        <Wrench className="w-3 h-3" />
        <span className="font-mono">
          {anyInFlight ? "running" : "used"} {calls.length} tool{calls.length === 1 ? "" : "s"}
        </span>
      </button>
      {open && (
        <div className="px-2.5 pb-2 space-y-1">
          {calls.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="mt-0.5 shrink-0">
                {c.ok === undefined ? (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                ) : c.ok ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <X className="w-3 h-3 text-red-500" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-mono text-foreground">{c.name}</span>
                {c.input && Object.keys(c.input).length > 0 && (
                  <span className="font-mono text-muted-foreground">
                    {" "}
                    ({Object.entries(c.input).slice(0, 3).map(([k, v]) =>
                      `${k}=${JSON.stringify(v).slice(0, 30)}`
                    ).join(", ")})
                  </span>
                )}
                {c.error && (
                  <p className="text-red-500 mt-0.5">{c.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
