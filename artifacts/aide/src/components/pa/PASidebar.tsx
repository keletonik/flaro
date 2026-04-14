/**
 * PASidebar — left rail of the PA page.
 *
 * Sections:
 *  1. "New chat" button
 *  2. Today's reminders (pending, sorted by remindAt)
 *  3. Recent conversations (placeholder — wired in once the PA gets
 *     persistent conversation storage in a later phase)
 *
 * Reminders are fetched directly from /api/reminders and updated on
 * the aide-data-changed window event so any reminder_create /
 * reminder_complete agent tool call instantly reflects in the rail.
 */

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Plus, Bell, Check, Clock, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reminder {
  id: string;
  title: string;
  body?: string | null;
  remindAt: string;
  status: string;
}

interface Props {
  onNewChat: () => void;
}

const DATA_CHANGED_EVENT = "aide-data-changed";

function relativeTime(iso: string): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diff = target - now;
  const absMin = Math.round(Math.abs(diff) / 60000);
  if (absMin < 1) return "now";
  if (absMin < 60) return `${diff < 0 ? "-" : ""}${absMin}m`;
  const hours = Math.round(absMin / 60);
  if (hours < 24) return `${diff < 0 ? "-" : ""}${hours}h`;
  const days = Math.round(hours / 24);
  return `${diff < 0 ? "-" : ""}${days}d`;
}

export function PASidebar({ onNewChat }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReminders = useCallback(async () => {
    try {
      const res = await apiFetch<{ reminders: Reminder[]; count: number }>(
        "/reminders?status=pending&limit=20",
      );
      setReminders(res.reminders || []);
    } catch { /* swallow — sidebar is non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadReminders();
    const onChange = () => { void loadReminders(); };
    window.addEventListener(DATA_CHANGED_EVENT, onChange);
    const interval = setInterval(loadReminders, 60_000);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, onChange);
      clearInterval(interval);
    };
  }, [loadReminders]);

  async function completeReminder(id: string) {
    try {
      await apiFetch(`/reminders/${id}/complete`, { method: "POST" });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  async function deleteReminder(id: string) {
    try {
      await apiFetch(`/reminders/${id}`, { method: "DELETE" });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  const dueReminders = reminders.filter((r) => new Date(r.remindAt).getTime() <= Date.now());
  const upcomingReminders = reminders.filter((r) => new Date(r.remindAt).getTime() > Date.now());

  return (
    <aside className="w-full h-full flex flex-col bg-card border-r border-border">
      <div className="p-3 border-b border-border">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Due now */}
        {dueReminders.length > 0 && (
          <section className="p-3 border-b border-border">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1.5">
              <Bell className="w-3 h-3" /> Due now
            </h3>
            <ul className="space-y-1">
              {dueReminders.map((r) => (
                <ReminderRow key={r.id} reminder={r} overdue onComplete={completeReminder} onDelete={deleteReminder} />
              ))}
            </ul>
          </section>
        )}

        {/* Upcoming */}
        <section className="p-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Upcoming
          </h3>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : upcomingReminders.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2">
              No reminders. Ask the PA: "Remind me to chase Pertronic tomorrow 9am".
            </p>
          ) : (
            <ul className="space-y-1">
              {upcomingReminders.slice(0, 12).map((r) => (
                <ReminderRow key={r.id} reminder={r} onComplete={completeReminder} onDelete={deleteReminder} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

function ReminderRow({
  reminder, overdue, onComplete, onDelete,
}: {
  reminder: Reminder;
  overdue?: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className={cn(
      "group px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors",
      overdue && "bg-red-500/5",
    )}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onComplete(reminder.id)}
          className="mt-0.5 w-3.5 h-3.5 rounded-full border border-muted-foreground hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors flex items-center justify-center shrink-0"
          title="Mark complete"
        >
          <Check className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-emerald-500" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-foreground leading-tight line-clamp-2">{reminder.title}</p>
          <p className={cn("text-[10px] mt-0.5", overdue ? "text-red-500" : "text-muted-foreground")}>
            {relativeTime(reminder.remindAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(reminder.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 shrink-0 transition-opacity"
          title="Cancel reminder"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </li>
  );
}
