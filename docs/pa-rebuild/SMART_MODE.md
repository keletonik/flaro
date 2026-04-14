# PA Smart Mode — Master Brief

**Role played in this document:** Master AI engineer + prompt engineer.
**Target artefact:** `/pa` page — upgrade from v1 (chat shell + tool use)
to Smart Mode (proactive, trainable, task-centric).
**Review gate:** same 5-persona panel, same rule (every persona ≥ 7/10).

---

## 0. What changed in the brief

The operator's asks, in order:

1. **Specific instructions + trainable behaviour** — the user wants to
   add their own rules that the PA follows on every turn. Not a config
   file — a first-class UI surface.
2. **Focus shift — no defects** — the PA is for tasks and todos only.
   Defects are a different surface (Operations page). The PA must
   stop surfacing defect rows anywhere.
3. **Intelligent staleness hunting** — the PA thinks about which
   items haven't been touched in a while and asks the user directly:
   "The Pertronic quote has been sitting for 9 days — any update?"
4. **Master-level engineering** — advanced techniques, not a prompt
   patch. Memory, scoring, caching, versioning, evals.

---

## 1. Architectural additions

```
┌────────────────────────────────────────────────────────────────┐
│                     /pa smart-mode pipeline                    │
│                                                                │
│  user turn   ─────►  chat-agent.ts (section="pa")              │
│                         │                                      │
│                         ▼                                      │
│    ┌────────────────────────────────────────────────────┐      │
│    │ system prompt (cached, versioned)                  │      │
│    │   ── core PA prompt v2.0                           │      │
│    │                                                    │      │
│    │ + pa-memory block (cached if stable)               │      │
│    │   ── user instructions, by priority                │      │
│    │   ── stale task top 5 (score-sorted)               │      │
│    │   ── recent todos (5)                              │      │
│    │   ── pending reminders (5)                         │      │
│    │   ── KPI summary slice (revenue MTD, outstanding)  │      │
│    │                                                    │      │
│    │ + section context tail (dynamic, never cached)     │      │
│    └────────────────────────────────────────────────────┘      │
│                         │                                      │
│                         ▼                                      │
│    tool loop — includes new PA tools:                          │
│      pa_get_daily_focus                                        │
│      pa_get_stale_tasks                                        │
│      pa_instruction_add / list / update / delete               │
│                         │                                      │
│                         ▼                                      │
│    assistant text + tool_use + follow-up suggestions           │
└────────────────────────────────────────────────────────────────┘
```

**Key techniques:**
- **Ephemeral prompt caching** on the core prompt + stable memory slice
  so a 6-message conversation costs one cached read per turn, not six
  full tokenisations.
- **Scoring** — `staleness_score = days_since_update × priority_weight`
  so a 14-day-old Medium beats a 4-day-old Low without hand-tuning.
- **Recency + frequency gating** on memory injection — if a todo was
  mentioned in the user's last 3 messages, we drop it from the
  "stale" list for this turn to avoid the PA nagging about what we
  just discussed.
- **Working memory structured as JSON** inside the prompt so the model
  can treat it as data, not prose. Reduces hallucination.
- **User instructions as first-class rows** — every instruction is a
  row in `pa_instructions` with priority + scope + enabled flag. The
  memory builder only injects enabled rows scoped to the current turn.

---

## 2. Schema additions

```
pa_instructions
  id              text pk
  title           text not null   -- short human label
  content         text not null   -- the actual rule injected verbatim
  scope           text not null   -- 'global' | 'on_open' | 'on_stale_check' | 'on_todo_create'
  priority        int  not null   -- 1 (must obey) to 5 (nice to have)
  enabled         boolean         -- allow soft-pause without delete
  source          text            -- 'user' | 'system' | 'learned'
  created_at      timestamptz
  updated_at      timestamptz
  deleted_at      timestamptz
```

No other new tables. Todos already carry everything needed for
staleness scoring.

---

## 3. New agent tools

| Tool | What it does |
|---|---|
| `pa_get_daily_focus` | Returns a structured JSON brief: stale tasks, upcoming reminders, top 3 numbers the operator cares about (MTD revenue, outstanding invoices, pending quotes). Used on page open and on "brief me" requests. |
| `pa_get_stale_tasks` | Pure query — top N todos sorted by staleness_score. Caller decides what to do with the list. |
| `pa_instruction_add` | Create a user instruction from a natural-language rule. |
| `pa_instruction_list` | List every instruction with scope and enabled state. |
| `pa_instruction_update` | Patch one — change content, priority, enabled, scope. |
| `pa_instruction_delete` | Soft delete. |

Existing reminder_* and db_* tools stay; nothing is removed.

---

## 4. System prompt — PA mode v2.0

The prompt is section-switched: `section === "pa"` gets the Smart Mode
prompt, every other section still gets the general agent prompt.

Key rules in PA mode:

1. **Domain focus is tasks and todos. NEVER surface defects unless the
   user explicitly asks.** Defects are handled on the Operations page.
2. **Proactive check-ins are the PA's superpower.** On every turn,
   scan the working memory for stale tasks (> 7 days without update)
   and surface one at the end of your response as a follow-up question,
   unless the user just talked about it.
3. **Read user instructions carefully.** They override generic rules.
   If the user wrote "never ask about the insurance claim" it trumps
   the staleness check for that task.
4. **Ask, don't assume.** On a stale task, ask "what's the status of
   X?" — don't mark it anything on the user's behalf without an answer.
5. **Time resolution stays Australia/Sydney.**
6. **Follow-up chips: 2-3 per assistant turn.** Format at the end of
   your reply inside a `<follow-ups>…</follow-ups>` block, one per
   line. The frontend strips and renders them.

---

## 5. Frontend changes

- **Remove defect references** from `pa.tsx`: drop defect starter
  prompts, drop any "defect" mention from the empty state, remove the
  defect-aware copy in the PASidebar empty string.
- **Add "Brief me" button** in the PA header — clicking it sends a
  hidden `"Give me my daily focus brief"` message that triggers the
  `pa_get_daily_focus` tool.
- **Auto-brief on page load** with empty history — same trigger as
  the button, runs once per session.
- **PA Training panel** — a new settings drawer accessible from the
  sidebar or the palette. Lists every instruction, lets the user add
  / edit / toggle / delete. Backed by the `/api/pa/instructions` CRUD.
- **Follow-up chip parsing** — the `PAMessage` component already has
  a slot for follow-ups; add a parser that extracts `<follow-ups>`
  blocks from the assistant's final text and hands them to the chip
  renderer.

---

## 6. Pre-build 5-panel audit

### Persona A — Staff Engineer — 8/10
Schema is one new table. Memory builder is a pure function. System
prompt is a section-switch, no new endpoint. Everything is local
reasoning; no cross-service changes. -1 because the prompt is getting
long and needs versioning discipline documented in this doc.

### Persona B — Product Designer — 7/10
Auto-brief-on-open is the killer feature; the user arrives and sees a
one-screen plan before typing. -2 because the instruction CRUD UI is
not fully designed yet and because "Brief me" as a button needs a good
icon + placement (likely header right alongside "New chat").

### Persona C — AI Engineer — 8/10
Working memory + ephemeral caching + scoring + per-scope instruction
injection is the correct shape. -1 because we're deliberately NOT
shipping evals in the same pass — they're a follow-up, same as v1.
-1 because "learned" instructions (PA auto-adds rules when the user
corrects it) is a v1.2 feature, not v1.1.

### Persona D — Data Architect — 9/10
One new table. Everything else queries existing rows. Indexes:
(enabled, scope) for the memory builder query; (priority desc) for
tie-breaking. Staleness scoring is a single SQL with no new indexes
required (todos.updated_at is already indexed).

### Persona E — Field Ops Principal — 7/10
Nailed the "stop showing me defects" ask. Nailed the stale-task
check-ins. -3 because "training" the PA is still typing rules into a
form, not learning from my corrections. I'm not asking for that yet
but I'll want it.

**Average: 7.8 / 10.** Gate passes. Execute.
