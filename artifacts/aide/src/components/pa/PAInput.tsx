/**
 * PAInput — the input row for the PA page.
 *
 * Features:
 *  - Slash command menu ("/" opens a filterable list of structured intents)
 *  - Voice input via the push-to-talk speech hook (lib/speech.ts)
 *  - Multi-line textarea that auto-grows (Shift+Enter = newline, Enter = send)
 *  - Destructive-word detection forces a confirm step on voice submission
 *
 * The component is presentation-only — it never calls the agent. The parent
 * (pages/pa.tsx) owns the streaming state and hands down onSubmit.
 *
 * Slash commands are NOT pre-resolved to tool calls here — they're pre-
 * populated templates that the user can tab through and edit before sending.
 * The LLM resolves the actual tool call.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type DragEvent } from "react";
import { Send, Mic, Square, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceInput, hasDestructiveWord } from "@/lib/speech";
import { AttachmentPicker, AttachmentPreviewChip, useAttachmentUpload } from "@/components/AttachmentPicker";
import type { AttachmentMeta } from "@/lib/api";

interface SlashCommand {
  slug: string;
  label: string;
  description: string;
  template: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { slug: "todo",     label: "/todo",     description: "Create a todo",            template: "/todo " },
  { slug: "remind",   label: "/remind",   description: "Set a reminder",           template: "/remind tomorrow 9am " },
  { slug: "note",     label: "/note",     description: "Append a note",            template: "/note " },
  { slug: "schedule", label: "/schedule", description: "Add a schedule event",     template: "/schedule " },
  { slug: "find",     label: "/find",     description: "Search the database",      template: "/find " },
  { slug: "summary",  label: "/summary",  description: "Today's plan summary",     template: "/summary today" },
  { slug: "standup",  label: "/standup",  description: "Daily standup numbers",    template: "/standup" },
];

interface Props {
  onSubmit: (text: string, attachmentIds?: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PAInput({ onSubmit, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<AttachmentMeta[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const drop = useAttachmentUpload(pending, setPending, "pa");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceInput();

  const filteredCommands = useMemo(() => {
    if (!showSlashMenu) return [];
    const q = value.slice(1).toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((c) => c.slug.startsWith(q) || c.slug.includes(q));
  }, [showSlashMenu, value]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 200;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value]);

  // Track slash menu visibility
  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowSlashMenu(true);
      setSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  }, [value]);

  function commitSlashCommand(cmd: SlashCommand) {
    setValue(cmd.template);
    setShowSlashMenu(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        commitSlashCommand(filteredCommands[slashIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowSlashMenu(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    const text = value.trim();
    if ((!text && pending.length === 0) || disabled) return;
    onSubmit(text, pending.length > 0 ? pending.map((p) => p.id) : undefined);
    setValue("");
    setPending([]);
  }

  function handleDragOver(e: DragEvent<any>) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }
  function handleDragLeave(e: DragEvent<any>) {
    e.preventDefault();
    setIsDragging(false);
  }
  function handleDrop(e: DragEvent<any>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) void drop.handleFiles(e.dataTransfer.files);
  }

  // Voice confirm step — user pressed mic, spoke, released.
  // When the state machine reaches "confirm" we show the preview row.
  const voiceIsDestructive = voice.transcript ? hasDestructiveWord(voice.transcript) : false;

  function acceptVoiceAsInput() {
    const text = voice.accept();
    if (!text) return;
    setValue(text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function sendVoiceDirectly() {
    const text = voice.accept();
    if (!text) return;
    onSubmit(text);
  }

  return (
    <div className="relative">
      {/* Slash command menu */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto z-30">
          <div className="p-1.5">
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.slug}
                type="button"
                onClick={() => commitSlashCommand(cmd)}
                onMouseEnter={() => setSlashIndex(i)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors",
                  i === slashIndex ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="font-mono font-medium text-foreground">{cmd.label}</span>
                <span className="text-[11px]">{cmd.description}</span>
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground flex justify-between">
            <span>↑↓ navigate · ⏎ insert · Esc close</span>
            <span>{filteredCommands.length} commands</span>
          </div>
        </div>
      )}

      {/* Voice confirm strip */}
      {voice.state === "confirm" && voice.transcript && (
        <div className="mb-2 p-3 rounded-lg bg-primary/5 border border-primary/30">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">
                Voice transcript
                {voiceIsDestructive && <span className="ml-2 text-red-500">⚠ destructive</span>}
              </p>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">{voice.transcript}</p>
            </div>
            <button
              type="button"
              onClick={voice.cancel}
              className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              type="button"
              onClick={acceptVoiceAsInput}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground hover:bg-muted/80"
            >
              Edit in input
            </button>
            <button
              type="button"
              onClick={sendVoiceDirectly}
              disabled={voiceIsDestructive}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium",
                voiceIsDestructive
                  ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-90",
              )}
              title={voiceIsDestructive ? "Destructive commands must be edited before sending" : "Send"}
            >
              Send
            </button>
            {voiceIsDestructive && (
              <span className="text-[10px] text-muted-foreground">
                Edit before sending — destructive verb detected.
              </span>
            )}
          </div>
        </div>
      )}

      {voice.error && (
        <p className="mb-1 text-[10px] text-red-500 px-1">Voice: {voice.error}</p>
      )}

      {/* Pending attachment chips row (rendered above the form so they
          don't interfere with the input bar layout) */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 px-1">
          {pending.map((p) => (
            <AttachmentPreviewChip key={p.id} meta={p} onRemove={() => setPending((prev) => prev.filter((x) => x.id !== p.id))} />
          ))}
        </div>
      )}
      {drop.error && (
        <p className="mb-1 text-[10px] text-red-500 px-1">Upload: {drop.error}</p>
      )}

      <form
        className={cn(
          "flex items-end gap-2 p-2 rounded-xl bg-card border border-border focus-within:border-primary/40 transition-colors relative",
          isDragging && "border-primary/60 bg-primary/5",
        )}
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none grid place-items-center rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 z-10">
            <p className="text-xs font-semibold text-primary">Drop to attach</p>
          </div>
        )}
        <AttachmentPicker
          pending={[]}
          onChange={(added) => setPending([...pending, ...added])}
          source="pa"
          disabled={disabled}
          className="shrink-0"
        />
        {voice.available && (
          <button
            type="button"
            onPointerDown={voice.start}
            onPointerUp={voice.stop}
            onPointerLeave={() => voice.state === "listening" && voice.stop()}
            disabled={disabled}
            className={cn(
              "shrink-0 p-2.5 rounded-lg border transition-all select-none",
              voice.state === "listening"
                ? "bg-red-500 text-white border-red-500 animate-pulse"
                : voice.state === "transcribing"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
            )}
            title="Hold to speak"
          >
            {voice.state === "listening" ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? "Ask anything, drop a /slash command, or hold the mic to talk…"}
          rows={1}
          className="flex-1 px-2 py-2 bg-transparent border-none outline-none text-sm resize-none placeholder:text-muted-foreground/60"
        />

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={cn(
            "shrink-0 p-2.5 rounded-lg transition-colors",
            disabled || !value.trim()
              ? "bg-muted text-muted-foreground/40"
              : "bg-primary text-primary-foreground hover:opacity-90",
          )}
          title="Send (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
