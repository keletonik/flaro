/**
 * FipAssistantChat — left-side embedded master assistant for the FIP page.
 *
 * Layout: full-height column inside the FIP page's left rail. Always
 * visible (no drawer, no float). The user can:
 *   - type questions about detector types, standards, fault codes
 *   - drag a panel/detector image into the drop zone OR click upload
 *   - the latest uploaded image is bound to the next message so the
 *     assistant can call fip_analyse_image automatically
 *
 * Wire protocol: streamFipAssistant from lib/api.ts. The component
 * persists the conversation only for the current page session — it
 * resets when the user navigates away. Image upload uses the existing
 * /api/fip/sessions/:id/images endpoint.
 */

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch, streamFipAssistant, type AgentToolEvent } from "@/lib/api";
import { Send, ImageIcon, X, Loader2, Wrench, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ name: string; ok?: boolean; error?: string }>;
  imageId?: string;
}

interface UploadedImage {
  id: string;
  filename?: string;
  contentType: string;
  size: number;
  previewUrl: string;
}

const SUGGESTED_PROMPTS = [
  "What's a photoelectric smoke detector and where can I use it?",
  "Show me the AS 1670.1 spacing rules for heat detectors",
  "Identify this panel image",
  "Ampac FP1200 system fault LED — what to check first",
  "Compare beam detection vs aspirating for an atrium",
];

interface Props {
  /** Current detector slug if the user is viewing one — sent as context. */
  contextDetectorSlug?: string;
  /** Optional session id for image uploads — created lazily. */
}

export function FipAssistantChat({ contextDetectorSlug }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<UploadedImage | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId;
    try {
      const sess = await apiFetch<{ id: string }>("/fip/sessions", {
        method: "POST",
        body: JSON.stringify({ siteName: "Embedded chat session" }),
      });
      setSessionId(sess.id);
      return sess.id;
    } catch (e: any) {
      throw new Error(e?.message ?? "Failed to create session");
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const sid = await ensureSession();
      const data = await fileToBase64(file);
      const result = await apiFetch<{ id: string; filename?: string; contentType: string; size: number }>(
        `/fip/sessions/${sid}/images`,
        {
          method: "POST",
          body: JSON.stringify({
            data,
            kind: "panel_fascia",
            filename: file.name,
            contentType: file.type,
          }),
        },
      );
      const previewUrl = URL.createObjectURL(file);
      setPendingImage({
        id: result.id,
        filename: result.filename,
        contentType: result.contentType,
        size: result.size,
        previewUrl,
      });
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadImage(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void uploadImage(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function clearPendingImage() {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  }

  function send(message?: string) {
    const text = (message ?? input).trim();
    if (!text || streaming) return;
    setError(null);

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      imageId: pendingImage?.id,
    };
    const next = [...messages, userMessage, { role: "assistant" as const, content: "", toolCalls: [] }];
    setMessages(next);
    setInput("");
    const imageIdToSend = pendingImage?.id;
    clearPendingImage();
    setStreaming(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const contextLine = contextDetectorSlug
      ? `(Operator is currently viewing detector type "${contextDetectorSlug}".)\n\n`
      : "";

    controllerRef.current = streamFipAssistant(
      contextLine + text,
      history,
      imageIdToSend,
      {
        onText: (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        },
        onToolStart: (ev: AgentToolEvent) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                toolCalls: [...(last.toolCalls ?? []), { name: ev.name }],
              };
            }
            return updated;
          });
        },
        onToolResult: (ev: AgentToolEvent) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant" && last.toolCalls) {
              const calls = [...last.toolCalls];
              for (let i = calls.length - 1; i >= 0; i--) {
                if (calls[i].name === ev.name && calls[i].ok === undefined) {
                  calls[i] = { ...calls[i], ok: ev.ok, error: ev.error };
                  break;
                }
              }
              updated[updated.length - 1] = { ...last, toolCalls: calls };
            }
            return updated;
          });
        },
        onDone: () => setStreaming(false),
        onError: (err) => {
          setError(err);
          setStreaming(false);
        },
      },
    );
  }

  function reset() {
    controllerRef.current?.abort();
    setMessages([]);
    setError(null);
    clearPendingImage();
    setStreaming(false);
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">FIP Technical Assistant</h2>
            <p className="text-[10px] text-muted-foreground">Master-level Australian fire protection</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
          >
            New chat
          </button>
        )}
      </header>

      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 space-y-4 relative",
          isDragging && "bg-primary/5",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-2 border-2 border-dashed border-primary rounded-xl flex items-center justify-center pointer-events-none z-10">
            <p className="text-sm font-semibold text-primary">Drop image to analyse</p>
          </div>
        )}

        {messages.length === 0 && !streaming && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Ask anything about fire detectors, AS standards, fault codes, or upload a panel photo for live identification.
            </p>
            <div className="space-y-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted text-foreground border border-border hover:border-primary/30 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-foreground border border-border",
              )}
            >
              {msg.imageId && (
                <div className="text-[10px] opacity-80 mb-1 italic">📎 Image attached</div>
              )}
              {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-1.5 space-y-0.5">
                  {msg.toolCalls.map((c, j) => (
                    <div key={j} className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {c.ok === undefined ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : c.ok ? (
                        <span className="text-emerald-500">✓</span>
                      ) : (
                        <span className="text-red-500">✗</span>
                      )}
                      <span className="font-mono">{c.name}</span>
                      {c.error && <span className="text-red-500 truncate">— {c.error}</span>}
                    </div>
                  ))}
                </div>
              )}
              {msg.content && (
                msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1.5 prose-li:my-0 prose-headings:mt-2 prose-headings:mb-1 prose-headings:font-semibold prose-code:text-[11px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground prose-pre:text-[10px] prose-table:text-[11px] prose-hr:my-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )
              )}
              {msg.role === "assistant" && !msg.content && streaming && i === messages.length - 1 && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {pendingImage && (
        <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center gap-2">
          <img src={pendingImage.previewUrl} alt="" className="w-10 h-10 object-cover rounded" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium truncate">{pendingImage.filename || "Image"}</p>
            <p className="text-[10px] text-muted-foreground">
              {(pendingImage.size / 1024).toFixed(0)} KB · ready to analyse
            </p>
          </div>
          <button
            type="button"
            onClick={clearPendingImage}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form
        className="border-t border-border p-3 flex items-end gap-2 bg-card"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || streaming}
          className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Upload image"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about a detector, standard, fault code…"
          rows={1}
          className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          className={cn(
            "p-2 rounded-lg shrink-0 transition-colors",
            input.trim() && !streaming
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-muted text-muted-foreground/40",
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:image/jpeg;base64," prefix
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}
