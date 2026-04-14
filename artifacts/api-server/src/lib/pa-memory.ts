/**
 * PA working memory builder.
 *
 * Every PA turn reads this module once to produce the working-memory
 * block injected into the system prompt. The block is structured as
 * JSON-in-a-sentinel so the model treats it as data, not prose, and
 * hallucinates less.
 *
 * Layout (stable — change only when bumping the PA prompt version):
 *
 *   <pa_memory v="pa-v2.0">
 *   {
 *     "instructions": [{ title, content, priority, scope }],
 *     "staleTodos":   [{ id, text, priority, daysSinceUpdate, reason }],
 *     "recentTodos":  [{ id, text, priority, dueDate, updatedAt }],
 *     "reminders":    [{ id, title, remindAt, status }],
 *     "now":          "2026-04-14T09:42:00.000+10:00"
 *   }
 *   </pa_memory>
 *
 * The caller (chat-agent.ts) wraps this in a `cache_control: ephemeral`
 * system prompt block so the working memory is cached across turns of
 * a single conversation. When the memory changes (new todo, new
 * instruction) the cache invalidates naturally and the next turn pays
 * the re-tokenisation cost — but only once per change.
 *
 * `excludeSubstrings` lets the caller drop todos the user mentioned
 * in the last few messages so the PA doesn't re-raise what was just
 * discussed.
 */

import { db } from "@workspace/db";
import { todos, paReminders, paInstructions } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { computeStaleTodos, type ScoredTodo } from "./pa-staleness";

export const PA_MEMORY_VERSION = "pa-v2.0";

export interface PaMemoryOptions {
  /** Text of the last few user messages — terms mentioned here are excluded from stale. */
  recentUserText?: string;
  /** How many stale todos to include in the block. Default 5, cap 10. */
  staleLimit?: number;
  /** How many recent todos to include. Default 5, cap 10. */
  recentLimit?: number;
  /** How many pending reminders to include. Default 5, cap 10. */
  reminderLimit?: number;
}

interface MemoryInstructionShape {
  title: string;
  content: string;
  priority: number;
  scope: string;
}

interface MemoryTodoShape {
  id: string;
  text: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
}

interface MemoryReminderShape {
  id: string;
  title: string;
  remindAt: string;
  status: string;
}

export interface PaMemory {
  version: string;
  instructions: MemoryInstructionShape[];
  staleTodos: ScoredTodo[];
  recentTodos: MemoryTodoShape[];
  reminders: MemoryReminderShape[];
  now: string;
}

/** Extract keyword hints from the recent user text so stale todos the
 * user just mentioned are dropped from the working memory. Simple:
 * tokenise, drop stop-words, dedupe, cap at 20 terms. */
function extractHints(text: string | undefined): string[] {
  if (!text) return [];
  const stop = new Set([
    "the","a","an","and","or","but","of","to","for","on","in","at","by",
    "is","are","was","were","be","been","being","have","has","had","do",
    "does","did","i","me","my","you","your","we","our","they","it","its",
    "that","this","these","those","what","when","where","how","with","without",
    "pa","please","thanks","thank",
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stop.has(w));
  return Array.from(new Set(words)).slice(0, 20);
}

/**
 * Build the PA working-memory block for the current turn.
 *
 * Reads 4 tables (pa_instructions, todos, todos again via staleness,
 * pa_reminders), runs the staleness scorer with the caller's exclusion
 * hints, then returns a fully-shaped memory object ready to be serialised
 * into the system prompt by chat-agent.ts.
 */
export async function buildPaMemory(opts: PaMemoryOptions = {}): Promise<PaMemory> {
  const staleLimit = Math.max(1, Math.min(opts.staleLimit ?? 5, 10));
  const recentLimit = Math.max(1, Math.min(opts.recentLimit ?? 5, 10));
  const reminderLimit = Math.max(1, Math.min(opts.reminderLimit ?? 5, 10));
  const hints = extractHints(opts.recentUserText);

  // Instructions — enabled, scope='global' for now. Scope-specific
  // rules (on_open / on_stale_check / on_todo_create) are injected at
  // the call sites that need them; global rules are always included.
  const instructionsRaw = await db
    .select()
    .from(paInstructions)
    .where(and(
      isNull(paInstructions.deletedAt),
      eq(paInstructions.enabled, true),
      eq(paInstructions.scope, "global" as any),
    ))
    .orderBy(paInstructions.priority, desc(paInstructions.updatedAt))
    .limit(20);

  const instructions: MemoryInstructionShape[] = instructionsRaw.map((r) => ({
    title: r.title,
    content: r.content,
    priority: r.priority,
    scope: String(r.scope),
  }));

  // Stale todos — exclude anything the user just mentioned
  const staleTodos = await computeStaleTodos({
    minDays: 0,
    limit: staleLimit,
    excludeSubstrings: hints,
  });

  // Recent todos — last N touched, regardless of staleness
  const recentRaw = await db
    .select()
    .from(todos)
    .where(eq(todos.completed, false))
    .orderBy(desc(todos.updatedAt))
    .limit(recentLimit);

  const recentTodos: MemoryTodoShape[] = recentRaw.map((r) => ({
    id: String(r.id),
    text: String(r.text ?? "").slice(0, 200),
    priority: String(r.priority ?? "Medium"),
    dueDate: r.dueDate ?? null,
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
  }));

  // Pending reminders — next N by remindAt ascending
  const reminderRaw = await db
    .select()
    .from(paReminders)
    .where(and(
      isNull(paReminders.deletedAt),
      eq(paReminders.status, "pending" as any),
    ))
    .orderBy(paReminders.remindAt)
    .limit(reminderLimit);

  const reminders: MemoryReminderShape[] = reminderRaw.map((r) => ({
    id: r.id,
    title: r.title,
    remindAt: r.remindAt.toISOString(),
    status: r.status,
  }));

  return {
    version: PA_MEMORY_VERSION,
    instructions,
    staleTodos,
    recentTodos,
    reminders,
    now: new Date().toISOString(),
  };
}

/** Serialise a PaMemory object into the sentinel-wrapped JSON block
 * ready to drop into a system-prompt text segment. */
export function serialisePaMemory(memory: PaMemory): string {
  return [
    `<pa_memory v="${memory.version}">`,
    JSON.stringify(
      {
        now: memory.now,
        instructions: memory.instructions,
        staleTodos: memory.staleTodos.map((t) => ({
          id: t.id,
          text: t.text,
          priority: t.priority,
          daysSinceUpdate: t.daysSinceUpdate,
          stalenessScore: t.stalenessScore,
          overdue: t.overdue,
          reason: t.reason,
        })),
        recentTodos: memory.recentTodos,
        reminders: memory.reminders,
      },
      null,
      2,
    ),
    `</pa_memory>`,
  ].join("\n");
}
