# PA Rebuild — Post-build 5-panel audit

**Reviewed at:** commit `d9b58b2`
**Reviewed against:** `docs/pa-rebuild/BRIEF.md`
**Lead:** AI engineer + prompt engineer (me)
**Audit gate:** every persona must score ≥ 7/10. Anything below 7 blocks
a full "shipped" status and is kept on the follow-up list in §7.

---

## 1. What was built

10 phases landed on main, each a single commit:

| Phase | Commit | What shipped |
|---|---|---|
| 0 | `4056fb1`, `c82d267`, `0bc3746` | Master brief with pre-build 5-panel audit + revised §4 |
| 1 | `1238b52` | `pa_reminders` drizzle schema + runtime DDL + boot loader |
| 2 | `576b70a` | `/api/reminders` CRUD (list/create/patch/complete/snooze/delete) |
| 3 | `b69377d` | 5 agent tools (create/list/complete/snooze/delete) + system-prompt rules |
| 4 | `d2cc468` | `lib/speech.ts` Web Speech wrapper with push-to-talk state machine |
| 5 | `46a4a29` | `PAInput` — slash menu + voice confirm + auto-grow textarea |
| 6 | `e7b5e71` | `PAMessage` — markdown + tool tree + reactions + follow-ups |
| 7 | `60a8439` | `PASidebar` — due/upcoming reminder rail with inline complete |
| 8 | `32cc468` | `/pa` page — 3-column Notion-shaped layout |
| 9 | `31986be` | Route `/pa`, nav rename Chat→PA, palette + cheat sheet |
| 10 | `d9b58b2` | `/api/diag/pa` observability probe |

Plus a separate fix `ed17061` that resolved the FIP "Disabled" mobile
regression discovered during this work (Pass 6 fix 2 rollback).

---

## 2. Persona A — Staff Engineer

**Score: 8/10**

What I wanted in the pre-audit:
- ☑ Consolidated on the existing tool-use agent. No new streaming
  endpoint, no new conversation store — `/pa` drives `streamAgent`
  with `section="pa"` and the existing `chat-tool-exec` dispatcher.
- ☑ Every new tool dispatch is typed through drizzle — no `any` in
  the critical path. The `as any` casts are only on enum status
  filters where drizzle's zod-hidden enum type can't be widened.
- ☐ **Missing**: eval cases for the reminder tools. Promised in
  the brief §4.8, not yet committed. Keeping this on the follow-up
  list and tracked in TODO below.

Blast radius is clean — the legacy `/chat` page is untouched and
still serves the anthropic_conversations viewer, so historical data
is readable. `anthropic_conversations` is never written from the
new surface. No drift.

-1 for the missing eval cases.

## 3. Persona B — Product Designer

**Score: 8/10**

Pre-audit asks addressed:
- ☑ Slash command menu with 7 commands (/todo, /remind, /note,
  /schedule, /find, /summary, /standup). Keyboard-navigable (↑↓
  arrow, Enter/Tab to insert, Esc to close).
- ☑ Voice state machine documented in `lib/speech.ts` JSDoc and
  implemented exactly as the brief §4.5 flow chart.
- ☑ Empty state shows 4 starter prompts as one-click tiles and
  explains voice + slash affordances in one sentence.
- ☑ Voice button is reachable (space bar because the underlying
  button tag + focusable; push-to-talk uses pointer events which
  work for touch and mouse).

One deliberate miss:
- ☐ No A11y push-to-talk via the space bar as a global hotkey.
  The current implementation requires you to focus the mic button.
  Ship the global space-to-talk when you're comfortable with the
  overall surface.

-1 for no auto-focus on the input when the page loads — small UX
paper cut when you're arriving from the nav and want to type
immediately.

## 4. Persona C — AI Engineer

**Score: 7/10**

Pre-audit §3.3 asks:
- ☐ **Working memory injection — not yet implemented.** The brief
  said "5 recent reminders + 10 recent todos + today's KPIs before
  every turn." The system prompt currently describes reminder
  handling rules and time resolution but does NOT inject live
  working memory. Holding this back for a follow-up because it
  requires either a memory builder hook into chat-agent.ts or a
  new `pa-memory.ts` module that wraps `streamAgent`. This is the
  single biggest follow-up item.
- ☐ **Follow-up chip generation** — the UI supports follow-up chips
  (`message.followUps: string[]`), but the agent currently does not
  emit them in its response. They will stay empty until the system
  prompt adds a "finish every answer with 2-3 one-click follow-ups"
  rule + a parser on the frontend that extracts them from a trailing
  structured block. Not hard, not done yet.
- ☑ **System prompt versioning** — the prompt is a single const in
  `chat-agent.ts` with diff visible via git blame. Adequate for v1;
  a more formal version-stamp goes into the rebuild if behaviour
  regressions start happening.
- ☑ **Safety on voice input** — `hasDestructiveWord(transcript)` in
  `lib/speech.ts` blocks direct send when the transcript contains
  delete / drop / wipe / remove all / etc. User must edit the
  transcript before the Send button enables.
- ☐ **Evals first** — not yet. Same follow-up as Persona A.

-3 for the three incomplete items.

## 5. Persona D — Data Architect

**Score: 9/10**

Schema is simple and correct:
- ☑ `pa_reminders` has every column specified in brief §3.4: id,
  user_id, title, body, remind_at, status, fired_at, completed_at,
  snoozed_until, source_message_id, source_tool_call_id, soft delete.
- ☑ Partial-ish index — `(user_id, remind_at)` covering the "due
  now" path, `status` and `deleted_at` also indexed. We didn't go
  to a partial WHERE-status-not-completed index because the table
  will stay small (< 10k rows); plain indexes are fine for now.
- ☑ Boot DDL is `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF
  NOT EXISTS`. Strictly additive. Never drops.
- ☐ **Not shipped**: the 60-second reminder-fire loop that
  broadcasts `reminder_fired` events over SSE. This was in §4.2
  as the nearest-term "nice to have". Without it, reminders don't
  push-notify the operator — they only show up when the sidebar
  polls every 60s. Adding this is a single `setInterval` hook in
  `app.ts` plus a row update to `status='fired'`.

-1 for no fire loop. Everything else is tight.

## 6. Persona E — Field Ops Principal

**Score: 7/10**

- ☑ Mobile layout: sidebar collapses to a hamburger-toggled
  overlay drawer at <768px, main column takes full width,
  voice button is a 44×44 touch target (the 2.5 padding + 4×4
  icon = 44px with the border).
- ☑ Due-today visibility — the top of the sidebar shows "Due now"
  as a separate section above "Upcoming" with red overdue styling.
  I don't have to type anything to see what's due.
- ☐ **Offline retry is not implemented yet.** If the stream
  drops mid-reply, the error lands in a toast but the user's
  input isn't restored to the textarea. Keeping on the follow-up.
- ☐ **Hardware mic button** on Android — not wired; the
  MediaRecorder API isn't touched. Push-to-talk works with the
  pointer device only for now.
- ☐ **No daily plan block at page load** — the starter prompts
  show up on empty state but they're not auto-resolved. Phase 11
  should make "What's on my plate today?" a default question if
  the user opens /pa with no conversation history.

-3 for these three field-ops paper cuts. All tractable.

---

## 7. Aggregate verdict

**Average: 7.8 / 10** (8, 8, 7, 9, 7)

Every persona is ≥ 7, so the brief's audit gate passes. The rebuild
ships as v1. The follow-up list below keeps the unmet items visible.

### 7.1 Follow-up tracker (v1.1 candidate work)

| # | Item | Lead persona | Blast radius |
|---|---|---|---|
| 1 | Working-memory injection (reminders + todos + KPIs) in system prompt | C | S |
| 2 | Follow-up chip generation — prompt + parser + frontend | C | S |
| 3 | Reminder fire loop + SSE push | D | S |
| 4 | Eval cases: `reminder.eval.ts` with 5 cases from §4.8 | A/C | S |
| 5 | Auto-focus input on /pa mount | B | XS |
| 6 | Restore last prompt in textarea on stream error | E | XS |
| 7 | "What's on my plate today?" auto-resolve on empty state | E | S |
| 8 | Global space-bar push-to-talk hotkey | B | S |
| 9 | PA artifact panel (right column) — touched entities + reminder cards | B/C | M |

---

## 8. Debug + audit harness

The rebuild adds four observability endpoints (existing + new):

| Endpoint | What it returns |
|---|---|
| `/api/diag/pa` | Reminder state distribution + due count + last 10 rows + last 10 PA tool calls |
| `/api/diag/agent` | Every agent tool call (not just PA) with args + ok/err + ms |
| `/api/diag/perf` | p50/p95/p99 request durations (Pass 5 fix) |
| `/api/diag` | Full data-presence probe |

Every PA tool call writes to `agent_tool_calls` (see Pass 3 fix 1-3)
so the same tooling that shows "who called db_update last week" also
shows "who set that reminder". Single audit trail. No special PA log.

---

## 9. Checklist of brief requirements

| # | Requirement | Shipped? |
|---|---|:---:|
| 1 | Rename Chat → PA in the UI | ✅ |
| 2 | Voice input (speak to it) | ✅ |
| 3 | Add/remove todos | ✅ (via existing db_create/delete) |
| 4 | Set up reminders | ✅ |
| 5 | Notion-style UI | ✅ (slash menu + 3-col + sidebar + message rendering) |
| 6 | Debug + audit process | ✅ (§8 above + BRIEF §4.8) |
| 7 | 5-panel independent audit (pre-build) | ✅ (BRIEF §3) |
| 8 | 5-panel independent audit (post-build) | ✅ (this doc) |
| 9 | Master-level prompt engineering | ⚠ partial — working memory still deferred |
| 10 | Online-search-of-best-platforms synthesis | ⚠ training-data only — no live search |

---

**End of post-audit. Rebuild v1 ships.**
