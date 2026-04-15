/**
 * EditableCell — generic click-to-edit table cell primitive.
 *
 * Three variants (picked via the `type` prop):
 *   text   — single-line or multi-line text input
 *   select — dropdown from a fixed options list
 *   date   — native HTML date input
 *
 * Behaviour:
 *   click or focus      → enter edit mode
 *   Enter or blur       → commit (calls onCommit with the new value)
 *   Escape              → revert and exit without committing
 *   Tab                 → commit and move focus to next focusable element
 *
 * The cell is presentation-only. The parent owns the mutation call and
 * the optimistic update. onCommit returns a Promise<boolean> — resolve
 * true on success (cell clears the "saving" spinner), false on failure
 * (cell reverts to the original value and shows a red outline for 1s).
 *
 * Designed to drop into any table where every row is editable by the
 * operator. First consumer: pages/todos.tsx.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseProps {
  value: string;
  display?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  onCommit: (next: string) => Promise<boolean> | boolean;
  className?: string;
  cellClassName?: string;
}

interface TextProps extends BaseProps {
  type: "text";
  multiline?: boolean;
}

interface SelectProps extends BaseProps {
  type: "select";
  options: Array<{ value: string; label?: string }>;
}

interface DateProps extends BaseProps {
  type: "date";
}

export type EditableCellProps = TextProps | SelectProps | DateProps;

export function EditableCell(props: EditableCellProps) {
  const { value, display, disabled, onCommit, className, cellClassName } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      try {
        inputRef.current.focus();
        if ("select" in inputRef.current && typeof (inputRef.current as any).select === "function") {
          (inputRef.current as any).select();
        }
      } catch { /* ignore */ }
    }
  }, [editing]);

  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => setFailed(false), 1200);
    return () => clearTimeout(t);
  }, [failed]);

  async function commit(next: string) {
    if (committedRef.current) return;
    committedRef.current = true;
    if (next === value) {
      setEditing(false);
      committedRef.current = false;
      return;
    }
    setSaving(true);
    try {
      const result = await onCommit(next);
      if (result === false) {
        setFailed(true);
        setDraft(value);
      } else {
        setEditing(false);
      }
    } catch {
      setFailed(true);
      setDraft(value);
    } finally {
      setSaving(false);
      committedRef.current = false;
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKey(e: KeyboardEvent<any>) {
    if (e.key === "Enter" && !(props.type === "text" && props.multiline && e.shiftKey)) {
      e.preventDefault();
      void commit(draft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  const idleClass = cn(
    "w-full h-full cursor-pointer text-left rounded px-1 py-0.5 -mx-1 -my-0.5",
    "hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-colors",
    disabled && "cursor-default pointer-events-none opacity-60",
    failed && "ring-1 ring-red-500/60 bg-red-500/5",
    cellClassName,
  );

  if (!editing) {
    return (
      <button
        type="button"
        className={idleClass}
        onClick={() => !disabled && setEditing(true)}
        title={disabled ? undefined : "Click to edit"}
      >
        <span className={className}>{display ?? (value || <span className="text-muted-foreground/40">—</span>)}</span>
      </button>
    );
  }

  const savingIndicator = saving ? (
    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground absolute right-1 top-1/2 -translate-y-1/2" />
  ) : null;

  if (props.type === "text") {
    const common = {
      value: draft,
      onChange: (e: any) => setDraft(e.target.value),
      onKeyDown: handleKey,
      onBlur: () => void commit(draft),
      disabled: saving,
      placeholder: props.placeholder,
      className: cn(
        "w-full bg-background border border-primary/40 rounded px-1.5 py-0.5 text-inherit outline-none focus:ring-1 focus:ring-primary",
        className,
      ),
    } as const;
    return (
      <div className="relative">
        {props.multiline ? (
          <textarea
            {...(common as any)}
            ref={inputRef as any}
            rows={2}
          />
        ) : (
          <input
            {...(common as any)}
            ref={inputRef as any}
            type="text"
          />
        )}
        {savingIndicator}
      </div>
    );
  }

  if (props.type === "select") {
    return (
      <div className="relative">
        <select
          ref={inputRef as any}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => void commit(draft)}
          disabled={saving}
          className={cn(
            "w-full bg-background border border-primary/40 rounded px-1.5 py-0.5 text-inherit outline-none focus:ring-1 focus:ring-primary",
            className,
          )}
        >
          <option value="">{props.placeholder ?? "—"}</option>
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label ?? o.value}</option>
          ))}
        </select>
        {savingIndicator}
      </div>
    );
  }

  // date
  return (
    <div className="relative">
      <input
        ref={inputRef as any}
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => void commit(draft)}
        disabled={saving}
        className={cn(
          "w-full bg-background border border-primary/40 rounded px-1.5 py-0.5 text-inherit outline-none focus:ring-1 focus:ring-primary",
          className,
        )}
      />
      {savingIndicator}
    </div>
  );
}
