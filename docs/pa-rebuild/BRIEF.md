# PA Rebuild — Master Brief

**Role played in this document:** AI Engineer + Prompt Engineer + Product Designer.
**Target artefact:** the `/chat` page of the AIDE web app, to be renamed and
rebuilt as `/pa` — a full-fat Personal Assistant surface for the operator.
**Review gate:** a 5-person independent panel (Personas A-E) audits the
brief BEFORE execution and again AFTER execution.

---

## 0. Why we're rebuilding this

The current `/chat` page (1,232 lines in `artifacts/aide/src/pages/chat.tsx`)
is a legacy Anthropic-conversation-store viewer. It does not call the
agent tool-use endpoint, so the user cannot:

- Create or update todos from the chat
- Set reminders
- Trigger navigation or refresh
- Ask any question that needs live database reads

Tool-use is currently only reachable through `EmbeddedAgentChat` — the
small drawer summoned from the floating AIDE Assistant. That works, but
it's not the "full-functioning PA" the operator has asked for. The
dedicated page should be the primary PA surface: voice in, Notion-style
rendering out, reminders, slash commands, memory.

The 5-person panel below judges the brief on whether it actually delivers
that, or whether it's a cosmetic rewrite.

---

## 1. Requirements — the operator's exact asks

1. **Rename Chat → PA** throughout the UI.
2. **Voice input** — the operator can speak to it, not just type.
3. **Action capabilities** — add/remove todos, set reminders, everything
   a desktop PA would do.
4. **Notion-style UI** — best-in-class. Combine the best of the leading
   chat PAs.
5. **Debugging + audit process** — explicit, documented, not an
   afterthought.
6. **5-panel independent audit** — review gate before and after.

---

## 2. Prior art — the reference set

I'm listing the platforms my training covers so the rebuild is
justifiable. I cannot run live web searches from this session; content
is drawn from documentation and product tours observed through my
training cutoff (May 2025).

| Product | What we steal |
|---|---|
| **Notion AI** | Slash-command menu at the input, inline action cards, block-based render |
| **Linear Assistant** | Keyboard-first, tight palette, per-entity mentions |
| **ChatGPT Desktop** | Clean split pane, streaming text, tool-use visible, voice-to-text |
| **Claude.ai** | Reactions on messages, branching, artifact panel on the right |
| **Perplexity** | Citation cards, source chips, follow-up question chips |
| **Cursor Chat** | @-mention autocomplete, inline diff view, conversation context |
| **Raycast AI** | Quick actions surfaced directly on assistant output |
| **Superhuman** | Speed, zero-latency keybindings, Cmd-K everywhere |
| **Mem** | Long-term memory surfaced as context cards |
| **Copilot Voice** | Web Speech API voice in + out, push-to-talk |

**Synthesis:** a three-column Notion-shaped page.
- Left (260 px): conversation list + pinned items + "today" reminders.
- Centre (flex): message stream with markdown + tool-use tree +
  reactions + follow-up chips.
- Right (320 px, collapsible): artifact / context panel — shows which
  DB entities the assistant has touched this turn, plus open reminders.

Input row at the bottom of the centre column: slash-command menu, voice
button, @-mention autocomplete, multi-line expand, send shortcut.

---

## 3. Pre-build 5-panel audit

The same five personas that run the PASS audits are scoring this brief
against their own priorities. A brief that doesn't get at least 7/10
from every persona goes back to rewrite before any code is touched.

### 3.1 Persona A — Staff Engineer

**Score: 7/10**

The plan to consolidate `/chat` onto the existing tool-use agent is
structurally correct — we stop maintaining two chat surfaces, we get
caching + observability + the eval harness for free, and we kill ~1200
lines of legacy Anthropic-conversation-store code.

**What I want added to the brief:**
- Explicit migration story for the existing anthropic_conversations
  table. Keep the rows (never delete data) but stop writing to them
  from the new surface. Provide a one-time read-only importer in the
  PA sidebar so historical conversations are still browseable.
- Type-safety on every new tool schema. No `any` in the dispatcher —
  if drizzle can't infer, write the interface.
- A test case in the eval harness for every new PA tool (reminder_*).

### 3.2 Persona B — Product Designer

**Score: 6/10 → needs revision**

The three-column layout is right, but the brief under-specifies the
input row. That's where PA success lives. Nobody opens Notion to
admire its sidebar — they open it because the input is magic.

**What I want added:**
- Slash command menu with at least: `/todo`, `/remind`, `/note`,
  `/schedule`, `/find`, `/update`, `/summary`. Every slash command has
  a structured input with placeholder hints, not a free-text prompt.
- Voice input state machine documented: idle → listening → transcribing
  → confirm-or-send. Nothing worse than a voice UI that eats your words.
- Empty state: recent reminders + one-line nudges + three starter
  prompts by section.
- A11y — voice button must be keyboard-reachable (space bar push-to-talk).

### 3.3 Persona C — AI Engineer

**Score: 6/10 → needs the biggest rewrite**

The brief talks about 'tool use' as though it's free. It isn't. A PA
that can `reminder_create` but forgets what it reminded you about is
a worse PA than no PA. Memory is the killer feature, and the brief
doesn't mention it.

**What I want added:**
- **Explicit memory surface.** Every assistant turn reads the 5 most
  recent reminders, the 10 most recent todos, and the 5 most recent
  WIP updates into the system prompt. Cached via the existing
  ephemeral-cache block.
- **Follow-up question generation** — after every assistant response,
  generate 2-3 short follow-up suggestions as chips. These are
  rendered as one-click prompts.
- **System prompt versioning.** Every change to the PA system prompt
  commits a version number in the file so we can diff what changed
  if behaviour regresses. Observability records the version with
  every turn.
- **Evals first, not last.** Before any frontend code, write eval
  cases for the reminder tools against the existing agent-eval harness.
- **Safety:** voice input must never auto-send destructive commands.
  "Delete all todos" spoken out loud requires a confirmation chip,
  not a double-tap.

### 3.4 Persona D — Data Architect

**Score: 7/10**

Schema additions are straightforward. `pa_reminders` is the only new
table. Minimal blast radius.

**What I want added:**
- `pa_reminders` columns: id, user_id, title, body, remind_at (tz-aware
  timestamptz), created_at, completed_at, snoozed_until, status
  (pending|fired|completed|snoozed|cancelled), source_message_id,
  source_tool_call_id.
- Index on `(user_id, remind_at)` partial-where-status-not-completed
  for the "due now" query.
- Idempotent DDL via `CREATE TABLE IF NOT EXISTS`.
- A reminder check loop that runs every 60 seconds, scans due rows,
  and broadcasts a `reminder_fired` SSE event via the existing
  `broadcastEvent` plumbing.

### 3.5 Persona E — Field Ops Principal

**Score: 5/10 → biggest gap**

I open Notion on a desktop. I open my PA from my phone in a van. The
brief says "Notion-like" and then under-specifies mobile. Everything
about the centre column is fine for desktop and unusable at 375 px.

**What I want added:**
- Mobile layout: single column, left and right panels as drawers.
- Voice button MUST be a big, obvious touch target. 44×44 min.
- "What's on my plate today" default view — top of the left rail shows
  the 3 most urgent items before I've even typed anything.
- Offline handling — if the stream drops mid-reply, DO NOT lose the
  user's last prompt. Keep it in the input and show a "retry" affordance.
- Push-to-talk via hardware mic button on modern Android.

