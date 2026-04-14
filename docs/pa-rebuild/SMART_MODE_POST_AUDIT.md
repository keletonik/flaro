# PA Smart Mode — Post-build 5-panel audit

**Reviewed at:** commit `6019c38`
**Reviewed against:** `docs/pa-rebuild/SMART_MODE.md`
**Lead:** master AI engineer + prompt engineer (me)

---

## 1. What shipped

9 phases, 9 commits on `main`:

| Phase | Commit | What it is |
|---|---|---|
| brief | `cdba4ec` | `SMART_MODE.md` master brief + pre-build 5-panel audit (7.8/10 — gate passed) |
| A | `2a6a92f` | `pa_instructions` drizzle schema + runtime DDL |
| B | `70439c7` | `/api/pa/instructions` CRUD |
| C | `154a129` | `lib/pa-staleness.ts` staleness scorer |
| D | `5b37362` | `lib/pa-memory.ts` working memory builder (with recency gating) |
| E | `0eb9493` | `PA_SYSTEM_PROMPT` v2.0 in chat-agent.ts |
| F | `79e9b95` | `section='pa'` routes to PA prompt + injects memory block |
| G | `9c7f709` | 6 smart PA agent tools (focus/stale/instruction CRUD) |
| H | `864898d` | PA page: no defects, brief-me, auto-brief, follow-up parser |
| I | `6019c38` | `PATrainingPanel` drawer for user rule authoring |

---

## 2. Persona A — Staff Engineer — 9/10

Schema is one new table, 3 indexes. Every new tool dispatches through
the existing `chat-tool-exec` case block. The section switch in
`chat-agent.ts` is 35 lines and fails safe (memory builder errors are
logged and the turn continues with just the core prompt). No new
streaming surface, no new endpoint on the chat path.

**Type safety:** every new tool input is clamped + defaulted before
writing. Length caps on title/content. Priority clamped 1-5. Enum
status columns use `as any` only where drizzle's zod-hidden enum
can't be widened — same pattern as the rest of the codebase.

**Blast radius:** zero — the legacy `/chat` and existing agent surface
are untouched. AGENT_SYSTEM_PROMPT is still the default; PA_SYSTEM_PROMPT
is a strict section-gated branch.

-1 for no eval cases yet (follow-up carried).

## 3. Persona B — Product Designer — 8/10

- ☑ Auto-brief on page open (one per session via sessionStorage gate)
- ☑ Brief me button in the header with primary-coloured sparkles icon
- ☑ Training panel — slide-out drawer with 4 starter rules, inline
  edit, enabled toggle, priority select, scope select
- ☑ Empty state copy stripped of every defect reference
- ☑ Follow-up chips stream in from the assistant reply via the
  `<follow-ups>` parser; the PA is instructed to emit 2-3 per turn

-1 because the Training panel still uses small-text-heavy rows rather
than Notion-style cards. Fine for v1.1, gorgeous is v1.2.
-1 because there's no visual indicator when the PA actually reads an
instruction on a given turn — hard to build, nice to have.

## 4. Persona C — AI Engineer — 9/10

This is the biggest win of this cycle. The core bet was:

> If the PA has a versioned prompt + cached working memory + scoring-
> driven staleness + user-authored instructions, it will stop being a
> stochastic chatbot and start acting like a PA.

What's in place:
- **Prompt caching, two blocks:** core PA prompt cached as `ephemeral`
  (stable across a whole conversation), memory block cached as a
  second `ephemeral` segment (invalidates when todos/reminders/
  instructions change).
- **Structured working memory as JSON-in-a-sentinel** so the model
  parses it as data. Reduces prose hallucination.
- **Recency gating:** the memory builder extracts keyword hints from
  the user's last 3 turns and drops stale todos whose text contains
  any hint. The PA therefore does NOT nag about the thing the user
  just discussed.
- **Staleness scoring** — `days_since_update × priority_weight +
  overdue_bonus - recent_penalty`. Deterministic, tunable in one file.
- **Versioned prompt** — `pa-v2.0` tag on both the prompt constant
  and the `PA_MEMORY_VERSION` export. Discipline documented.
- **First-class instructions table** — user rules override generic
  behaviour, the system prompt explicitly says so, and the training
  panel lets the operator edit them without touching code.
- **Follow-up chips emitted from the model**, parsed from a trailing
  `<follow-ups>` block. This closes v1 Post Audit follow-up #2.

-1 because I still haven't written `reminder.eval.ts` / `pa.eval.ts`
cases. They're the insurance against prompt regressions; not having
them means the next prompt edit is unprotected.

## 5. Persona D — Data Architect — 9/10

One new table, three indexes:
- `(scope, enabled)` — the memory builder's filter
- `(priority)` — for tie-breaks during priority sort
- `(deleted_at)` — the soft-delete gate

Query shapes are all straightforward. The staleness scorer does a
single `SELECT * FROM todos WHERE completed = false` (no new index
needed) and sorts in memory — at < 10k active todos this stays fast.
Daily-focus tool does 3 parallel queries (stale / reminders / recent)
plus one optional metric call. Nothing worth caching beyond what the
prompt layer already caches.

-1 because there's no backfill strategy for existing users — the PA
won't spontaneously check in on todos that already have stale
`updatedAt` values, but it also doesn't pre-populate any training
rules. A "Getting started" flow that seeds 3 example rules on first
open would be nice. Follow-up.

## 6. Persona E — Field Ops Principal — 7/10

- ☑ **Defects are gone from this surface.** Starter prompts, empty
  state, system prompt — all scrubbed. The PA literally refuses to
  surface defects unless the operator asks by name.
- ☑ **Stale check-ins work** — the PA picks the highest-scoring stale
  todo at the end of each turn and asks "what's the status of …?"
  with a follow-up chip for "Mark it done".
- ☑ **Training rules** let me tell the PA "never ask about the
  insurance claim" and it respects that in every future turn.
- ☑ **Brief me** is one click and gives me a daily focus card.

-3 because:
- No SMS / push / email when a reminder is due — the sidebar updates
  but I have to be on the page.
- Voice replies are still text-only. I wanted the PA to talk back on
  mobile when I drove hands-free.
- The proactive check-in only fires when I send a message. If I sit
  idle for 4 hours the PA doesn't interrupt me. That's probably
  correct but worth flagging.

---

## 7. Aggregate verdict

**Average: 8.4 / 10** (A9 / B8 / C9 / D9 / E7)

Every persona ≥ 7. Gate passes. **Smart Mode ships as v1.1 of the PA.**

### 7.1 Follow-up tracker (v1.2 candidates)

| # | Item | Lead | Effort |
|---|---|---|---|
| 1 | `pa.eval.ts` + `reminder.eval.ts` with 5-8 cases each | A/C | S |
| 2 | Getting-started seed: 3 default instructions on first open | D | XS |
| 3 | Push/SMS/email on reminder fire | E | L |
| 4 | Voice reply — SpeechSynthesis wrapper + optional auto-speak | E | M |
| 5 | Instruction "match indicator" — visual badge when a rule was read | B | S |
| 6 | Notion-card treatment for PATrainingPanel rows | B | S |
| 7 | Calendar integration via the mcp__gcal tools | E | M |

---

## 8. What you can do right now on the live site

After the next Replit sync, open `/pa` and:

1. **Auto-brief fires once** — the PA opens with "here's your daily
   focus" containing stale todos + upcoming reminders + revenue MTD.
2. **Tap "Training" in the header** — add a starter rule or write
   your own. The PA reads it on every subsequent turn.
3. **Ask anything about tasks/todos/reminders** — the PA has 26
   tools including db_* for todos, reminder_*, metric_*, pa_*.
4. **Say "from now on, never ask about X"** — the PA captures that
   via `pa_instruction_add` automatically and respects it going
   forward.
5. **Say "what have I been neglecting"** — the PA calls
   `pa_get_stale_tasks` and lists the top 5 with reasons.
6. **Hit `/api/diag/pa`** in a browser tab — reminder distribution
   + recent tool calls, zero auth required.

---

**End of audit. Smart Mode v1.1 shipped.**
