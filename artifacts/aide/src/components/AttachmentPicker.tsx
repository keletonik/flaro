/**
 * AttachmentPicker — shared file-upload affordance for every AI chat.
 *
 * Usage:
 *   const [pending, setPending] = useState<AttachmentMeta[]>([]);
 *   <AttachmentPicker
 *     pending={pending}
 *     onChange={setPending}
 *     source="pa"
 *     disabled={streaming}
 *   />
 *
 *   // when sending a message:
 *   streamAgent("pa", text, history, handlers, pending.map((p) => p.id));
 *   setPending([]);
 *
 * Renders a paperclip button that opens the OS file picker. When
 * files are selected it uploads each via uploadAttachment() and
 * pushes the result into `pending`. A pill strip above the picker
 * shows each pending attachment with a remove button.
 *
 * Supports drag-and-drop if the parent wires up the dropzone. The
 * component exposes a handleFiles callback for that use-case.
 */

import { useRef, useState, type ChangeEvent } from "react";
import { uploadAttachment, type AttachmentMeta } from "@/lib/api";
import { Paperclip, X, Loader2, FileText, Image as ImageIcon, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  pending: AttachmentMeta[];
  onChange: (next: AttachmentMeta[]) => void;
  source?: string;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

export function AttachmentPicker({ pending, onChange, source, disabled, maxFiles = 4, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    if (!list.length) return;
    if (pending.length + list.length > maxFiles) {
      setError(`Max ${maxFiles} files at a time`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: AttachmentMeta[] = [];
      for (const f of list) {
        try {
          const meta = await uploadAttachment(f, source);
          uploaded.push(meta);
        } catch (e: any) {
          setError(e?.message ?? `Upload failed: ${f.name}`);
        }
      }
      if (uploaded.length > 0) onChange([...pending, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void handleFiles(e.target.files);
  }

  function remove(id: string) {
    onChange(pending.filter((p) => p.id !== id));
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pending.map((p) => (
            <AttachmentChip key={p.id} meta={p} onRemove={() => remove(p.id)} />
          ))}
        </div>
      )}
      {error && (
        <p className="text-[10px] text-red-500">{error}</p>
      )}
      <div className="flex">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/*,.csv,.md,.json"
          className="hidden"
          onChange={onInputChange}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={cn(
            "shrink-0 p-2 rounded-lg border transition-colors select-none",
            "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
            disabled && "opacity-40 cursor-not-allowed",
          )}
          title="Attach file (images, PDF, text, CSV)"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function AttachmentChip({ meta, onRemove }: { meta: AttachmentMeta; onRemove: () => void }) {
  const Icon = meta.kind === "image" ? ImageIcon : meta.kind === "document" ? FileText : FileIcon;
  const label = meta.filename || `${meta.kind}-${meta.id.slice(0, 6)}`;
  const sizeKb = Math.round(meta.size / 1024);
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-[11px] max-w-[240px]">
      <Icon className="w-3 h-3 text-primary shrink-0" />
      <span className="truncate" title={label}>{label}</span>
      <span className="text-[9px] text-muted-foreground shrink-0">{sizeKb}KB</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-foreground shrink-0"
        title="Remove"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

/** Convenience — expose the handleFiles imperatively so parents can
 * hook drag-and-drop on their own element without re-implementing
 * the upload flow. */
export function useAttachmentUpload(
  pending: AttachmentMeta[],
  onChange: (next: AttachmentMeta[]) => void,
  source?: string,
  maxFiles = 4,
) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    if (!list.length) return;
    if (pending.length + list.length > maxFiles) {
      setError(`Max ${maxFiles} files`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: AttachmentMeta[] = [];
      for (const f of list) {
        try { uploaded.push(await uploadAttachment(f, source)); }
        catch (e: any) { setError(e?.message ?? `Upload failed: ${f.name}`); }
      }
      if (uploaded.length > 0) onChange([...pending, ...uploaded]);
    } finally {
      setUploading(false);
    }
  }

  return { uploading, error, handleFiles };
}
