/**
 * PATrainingPanel — slide-out drawer for user-authored PA training rules.
 *
 * Lists every rule in pa_instructions, lets the operator:
 *   - toggle enabled state
 *   - edit title / content / priority / scope inline
 *   - delete
 *   - add new rules via a compact form
 *
 * Reads GET /api/pa/instructions, writes via POST/PATCH/DELETE. Every
 * mutation fires aide-data-changed so the rest of the app (and the
 * working memory builder on the next PA turn) sees the change.
 *
 * The panel also includes a "starter rules" section — 4 common
 * instructions the operator can one-tap-add (e.g. "Always set reminders
 * to 9am local unless I say otherwise", "Never ask about the insurance
 * claim"). This dramatically shortens time-to-value for first-time users.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { X, Plus, Trash2, Pencil, Check, Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Instruction {
  id: string;
  title: string;
  content: string;
  scope: "global" | "on_open" | "on_stale_check" | "on_todo_create";
  priority: number;
  enabled: boolean;
  source: "user" | "system" | "learned";
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const STARTER_RULES = [
  {
    title: "9am default reminders",
    content: "When the user sets a reminder without specifying a time, default to 9:00 AM Australia/Sydney.",
    scope: "global" as const,
    priority: 2,
  },
  {
    title: "Always confirm destructive",
    content: "Never call db_delete or reminder_delete without a one-line confirmation from the user in the same turn.",
    scope: "global" as const,
    priority: 1,
  },
  {
    title: "Brief me at 8am",
    content: "When I open /pa in the morning, start with a daily focus brief automatically.",
    scope: "on_open" as const,
    priority: 3,
  },
  {
    title: "Short replies",
    content: "Keep replies under 4 sentences unless I ask for detail. Summarise lists, don't dump them.",
    scope: "global" as const,
    priority: 2,
  },
];

const DATA_CHANGED_EVENT = "aide-data-changed";

const SCOPE_LABELS: Record<Instruction["scope"], string> = {
  global: "Always",
  on_open: "On open",
  on_stale_check: "On stale check",
  on_todo_create: "On todo create",
};

export function PATrainingPanel({ open, onClose }: Props) {
  const [rules, setRules] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftScope, setDraftScope] = useState<Instruction["scope"]>("global");
  const [draftPriority, setDraftPriority] = useState(3);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ instructions: Instruction[] }>("/pa/instructions");
      setRules(res.instructions || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }

  function broadcast() {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }

  async function createRule(title: string, content: string, scope: Instruction["scope"], priority: number) {
    try {
      await apiFetch("/pa/instructions", {
        method: "POST",
        body: JSON.stringify({ title, content, scope, priority, enabled: true, source: "user" }),
      });
      broadcast();
      await load();
      setShowNewForm(false);
      setDraftTitle("");
      setDraftContent("");
      setDraftScope("global");
      setDraftPriority(3);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create rule");
    }
  }

  async function updateRule(id: string, patch: Partial<Instruction>) {
    try {
      await apiFetch(`/pa/instructions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      broadcast();
      await load();
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update rule");
    }
  }

  async function deleteRule(id: string) {
    try {
      await apiFetch(`/pa/instructions/${id}`, { method: "DELETE" });
      broadcast();
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete rule");
    }
  }

  function beginEdit(rule: Instruction) {
    setEditingId(rule.id);
    setDraftTitle(rule.title);
    setDraftContent(rule.content);
    setDraftScope(rule.scope);
    setDraftPriority(rule.priority);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-[520px] bg-background border-l border-border flex flex-col shadow-xl">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">PA Training</h2>
              <p className="text-[10px] text-muted-foreground">
                Rules the PA reads at the start of every turn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-2 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-500">
              {error}
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && rules.length === 0 && !showNewForm && (
            <div className="p-4">
              <p className="text-[11px] text-muted-foreground mb-3">
                No rules yet. Tap a starter to add one, or write your own.
              </p>
              <div className="space-y-1.5">
                {STARTER_RULES.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => createRule(s.title, s.content, s.scope, s.priority)}
                    className="w-full text-left p-2.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-xs font-medium text-foreground">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && rules.length > 0 && (
            <ul className="p-3 space-y-2">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "rounded-lg border border-border p-3",
                    r.enabled ? "bg-card" : "bg-muted/20 opacity-70",
                  )}
                >
                  {editingId === r.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded bg-background border border-border"
                        placeholder="Title"
                      />
                      <textarea
                        value={draftContent}
                        onChange={(e) => setDraftContent(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1 text-xs rounded bg-background border border-border resize-none"
                        placeholder="The rule the PA should follow"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={draftScope}
                          onChange={(e) => setDraftScope(e.target.value as any)}
                          className="text-[10px] px-2 py-1 rounded bg-background border border-border"
                        >
                          {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <select
                          value={draftPriority}
                          onChange={(e) => setDraftPriority(Number(e.target.value))}
                          className="text-[10px] px-2 py-1 rounded bg-background border border-border"
                        >
                          {[1, 2, 3, 4, 5].map((p) => (
                            <option key={p} value={p}>P{p}</option>
                          ))}
                        </select>
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-[10px] px-2 py-1 text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRule(r.id, { title: draftTitle, content: draftContent, scope: draftScope, priority: draftPriority })}
                          disabled={!draftTitle.trim() || !draftContent.trim()}
                          className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-xs font-semibold text-foreground line-clamp-1">{r.title}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateRule(r.id, { enabled: !r.enabled })}
                            className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide",
                              r.enabled
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {r.enabled ? "On" : "Off"}
                          </button>
                          <button
                            type="button"
                            onClick={() => beginEdit(r)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRule(r.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{r.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                          {SCOPE_LABELS[r.scope]}
                        </span>
                        <span className="text-[9px] text-muted-foreground">P{r.priority}</span>
                        {r.source !== "user" && (
                          <span className="text-[9px] text-primary">{r.source}</span>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="p-3 border-t border-border">
          {showNewForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title — e.g. 'Never ask about insurance'"
                className="w-full px-2 py-1.5 text-xs rounded bg-muted/40 border border-border"
              />
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={3}
                placeholder="The rule the PA should follow"
                className="w-full px-2 py-1.5 text-xs rounded bg-muted/40 border border-border resize-none"
              />
              <div className="flex items-center gap-2">
                <select value={draftScope} onChange={(e) => setDraftScope(e.target.value as any)} className="text-[10px] px-2 py-1 rounded bg-muted/40 border border-border">
                  {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select value={draftPriority} onChange={(e) => setDraftPriority(Number(e.target.value))} className="text-[10px] px-2 py-1 rounded bg-muted/40 border border-border">
                  {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}
                </select>
                <div className="flex-1" />
                <button type="button" onClick={() => { setShowNewForm(false); setDraftTitle(""); setDraftContent(""); }} className="text-[10px] px-2 py-1 text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => createRule(draftTitle, draftContent, draftScope, draftPriority)}
                  disabled={!draftTitle.trim() || !draftContent.trim()}
                  className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
                >
                  <Check className="w-3 h-3 inline mr-1" /> Save rule
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setShowNewForm(true); setDraftTitle(""); setDraftContent(""); setDraftScope("global"); setDraftPriority(3); }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add a rule
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
