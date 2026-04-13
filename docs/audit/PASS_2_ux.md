# Pass 2 — UX, UI and Design System

**Lead persona:** B (Senior Product Designer)
**Reviewed at:** commit `032eecb`
**Scope:** Every page, every shared component, every visual pattern.
Against best-in-class references: Linear (issue lists, cmd-K), Retool
(table density), Metabase (drill-down), Superhuman (keyboard-first),
Buildertrend (estimate flow).

---

## 1. Executive summary

The frontend is **competent but undistinguished**. It uses Tailwind v4 correctly, has 55 shadcn primitives installed, and ships a consistent visual vocabulary of grey cards / subtle borders / primary accent amber. Nothing looks broken. Nothing looks memorable either.

The gap between where it sits today and Linear/Retool/Superhuman class is not a redesign — it's five specific habits the codebase hasn't formed yet: consistent skeleton loaders, disciplined empty states, a command palette, keyboard-first flows on list pages, and density tiers. Everything else (typography, colour, spacing, component library) is fine.

Pages that are **close to great**: Estimation Workbench (strong 3-pane layout, live maths, embedded agent). Pages that are **functionally sufficient but visually generic**: Dashboard, Operations, Jobs, Todos. Pages that are **unfinished**: Analytics (455KB bundle, no drill-down), Schedule (no drag-drop), FIP (static layout, no cross-tab search), Notes, Toolbox, PM.

Measured today:
- **18 page files**, 7,969 total lines
- **12 empty-state implementations** across 18 pages (67% coverage, inconsistent)
- **6 loading-skeleton implementations** across 18 pages (33% coverage)
- **14 keyboard handlers** across the entire frontend (mostly for `Enter` in textareas; zero real keyboard navigation)
- **`cmdk` is installed** (`components/ui/command.tsx` exists) but **is not mounted** in any page as a command palette
- **1,232-line `chat.tsx`** — the single largest page in the codebase, indicating unresolved responsibility boundaries
- **Dashboard fires 7 fetches on mount** with no prefetching, no skeleton co-ordination, and no intersection-aware deferral for below-the-fold blocks

Persona B's headline: this is a 6/10 today. Without redesigning a single component, disciplined application of the five habits listed above takes it to 8/10 in a week of rebuild work.

## 2. Page inventory

| Page | Lines | Loading state | Empty state | Agent mount | Primary pattern |
|---|---:|:---:|:---:|:---:|---|
| `chat.tsx` | 1232 | spinner | — | own chat | SSE message list with attachments |
| `projects.tsx` | 655 | spinner | — | AnalyticsPanel | card grid with expand |
| `operations.tsx` | 646 | spinner | partial | AnalyticsPanel | 4-tab data table with inline edit |
| `todos.tsx` | 585 | skeleton | ✓ | AnalyticsPanel | grouped list with priority rails |
| `jobs.tsx` | 576 | skeleton | ✓ | AnalyticsPanel | list/kanban toggle |
| `analytics.tsx` | 576 | spinner | — | AnalyticsPanel | stacked charts |
| `fip.tsx` | 516 | Loader2 | ✓ | AidePA (global) | tabbed browser |
| `schedule.tsx` | 488 | — | — | AnalyticsPanel | week grid |
| `dashboard.tsx` | 432 | skeleton | partial | AnalyticsPanel | KPI cards + pipeline bars |
| `pm-board.tsx` | 396 | spinner | ✓ | AnalyticsPanel | kanban |
| `notes.tsx` | 395 | — | ✓ | AnalyticsPanel | expandable cards |
| `suppliers.tsx` | 381 | spinner | ✓ | AnalyticsPanel | supplier cards + nested products |
| `job-detail.tsx` | 270 | spinner | — | (none) | detail form |
| `toolbox.tsx` | 267 | — | ✓ | AnalyticsPanel | list with refs |
| `settings.tsx` | 235 | — | — | (none) | form |
| `pm.tsx` | 174 | — | ✓ | AnalyticsPanel | board list |
| `login.tsx` | 124 | — | — | (none) | bypassed |
| `not-found.tsx` | 21 | — | — | (none) | 404 |

**Legend:** `skeleton` = uses `Skeleton` primitive or `animate-pulse`. `spinner` = uses `Loader2`. `—` = nothing visible while loading / for empty data. `partial` = only some code paths covered.

**Observations:**
- 6 pages skip any loading UI at all (including `settings`, `schedule`, `notes`, `toolbox`, `pm`). On a 2G connection the user stares at a blank screen.
- 6 pages have no empty state. Opening them with a clean DB shows a naked page.
- **Three separate AI chat components** are in play: `AnalyticsPanel` (legacy drawer), `AidePA` (Replit's global floating widget), `EmbeddedAgentChat` (the tool-use one used only by Estimation Workbench). Inconsistent affordance per page.
- `chat.tsx` at 1232 lines is a red flag — it's doing attachment handling, SSE streaming, message rendering, optimistic updates and file drop in one file. Needs breakup.

## 3. Per-page findings

### 3.1 Dashboard (`/`)
- Fires 7 parallel fetches on mount (`/on-call/today`, `/dashboard/summary`, `/kpi/metrics`, `/analytics/pipeline-gaps`, `/dashboard/focus`, `/todos`, `/notes?status=Open`). No `Promise.all`, no prefetch, no skeleton co-ordination — each block flickers in independently.
- 6 KPI cards at the top with no drill-through — clicking "Active Jobs" doesn't take you to the jobs list filtered by active.
- "Focus points" block is LLM-generated via `/dashboard/focus` and shown as a 5-bullet block. No way to tell which bullet came from which underlying signal.
- Right-hand `AnalyticsPanel` is the floating drawer — good.
- Missing: today's revenue vs $180k target (exists in KPI but buried), weather impact, callout-in-progress count.

### 3.2 Operations (`/operations`)
- 4 tabs (WIP / Quotes / Defects / Invoices), each its own table with basic filters, search, status filter, bulk actions limited to status change.
- No saved views, no column pinning, no keyboard nav (j/k/enter/escape), no cmd-K.
- Inline edit works but uses a full modal instead of in-row editing.
- Row actions are icon-only hover-reveal. Screen readers and keyboard users can't discover them.
- Missing: per-row "ask AIDE" action, row expand for history, density toggle.

### 3.3 Suppliers → Estimation Workbench (`/suppliers?mode=estimation`)
- **Best surface on the site.** 3-pane layout, live markup/margin, embedded tool-use agent.
- Small wins still available: line reordering (drag-drop), labour recipe templates, client margin overrides, PDF export, "duplicate estimate as template".

### 3.4 Jobs (`/jobs`)
- List/Kanban toggle works but the two views have different data shapes and different row actions. Confusing.
- Status filter pills across the top, search beside. No saved filters.
- Row click opens a full page `/jobs/:id` — should be a side panel for fast triage.
- Bulk edit exists but only for status.

### 3.5 FIP (`/fip`)
- Replit's tabbed layout: Overview / Manufacturers / Panel Models / Documents / Standards.
- Visually clean, clear counts per tab.
- Missing: cross-tab search, document viewer pane, fault-code quick-lookup, embedded agent. Global `AidePA` floats but has no tool use so it can't actually help here.

### 3.6 Todos (`/todos`)
- Priority-grouped list with urgency tags and colour codes. Busy but readable.
- No natural-language create ("remind me to chase Jamie on Friday"). The field accepts only structured input.
- No snooze. Marking done is a checkbox — no visual satisfaction, no undo.

### 3.7 Schedule (`/schedule`)
- Week grid 7am–6pm, jobs auto-placed by due date, standalone events.
- No drag-to-reschedule, no drag-to-reassign, no conflict warnings.
- Doesn't sync with any external calendar.

### 3.8 Analytics (`/analytics`)
- Stacked bar charts across 4-6 sections. Bundle size 455KB / 120KB gzipped — by far the heaviest page.
- No drill-down: clicking a bar doesn't open the underlying rows.
- No period selector beyond hardcoded windows.
- `lib/deep-analytics.ts` has Holt linear, exponential smoothing, rolling z-score anomaly detection, quote funnel — **none of it is surfaced** in the UI. Dark primitives.
- No export.

### 3.9 Notes / Toolbox / PM / Projects
- Functionally complete, visually consistent, but none has a clear primary action. Each feels like an inbox of things without any "next step".
- PM (project management board) is a Monday.com-style kanban but many of the backing `pm_*` tables have columns with no UI surface.

### 3.10 Chat (`/chat`)
- Single file, 1,232 lines. Handles attachments (drag-drop images + emails + documents), SSE streaming, `<ops-action>` JSON blocks embedded in the assistant response, and optimistic message updates.
- The feature list is genuinely impressive. The implementation is one giant React component doing ten jobs.
- UX is good once you're in it; getting in requires clicking a specific Chat nav item and typing. Should be Cmd-K accessible from anywhere.

## 4. Cross-cutting design-system issues

### 4.1 Loading states are inconsistent
- 6 pages use a `Loader2` spinner at 60vh (roll-your-own).
- 3 pages use the shared `Skeleton` component (`components/ui/skeleton.tsx`).
- 6 pages skip the loading UI entirely.
- 3 pages fall somewhere in between.
**Fix:** one `<PageSkeleton shape="list|grid|detail|table">` primitive used by every page.

### 4.2 Empty states are inconsistent
- 12 pages have an empty state (some inline, some as a separate component).
- 6 pages show a blank screen on empty data.
- No standard empty-state component exists.
**Fix:** a single `<EmptyState icon title body cta>` component.

### 4.3 No command palette
- `cmdk` is installed, `components/ui/command.tsx` is compiled, but nothing mounts it as a global Cmd-K palette.
- Persona B flags this as the single highest-ROI visual improvement: one component, wires to the existing agent + router, immediately elevates the site to "Linear-class feel".

### 4.4 Keyboard navigation is near-zero
- 14 `onKeyDown` handlers across the entire frontend, almost all for `Enter` in a textarea.
- No `j`/`k` row navigation on lists.
- No `e` to edit, `x` to select, `?` to show shortcuts.
- Impact: ops users who want to move fast fall back to mouse, which is strictly slower.

### 4.5 Three competing chat components
- `AnalyticsPanel.tsx` (legacy, read-only, floats on some pages)
- `AidePA.tsx` (Replit's global floating widget, read-only)
- `EmbeddedAgentChat.tsx` (tool-use, used only inside Estimation Workbench)
- Three different visual languages, three different affordances. The user cannot tell from the UI which one can actually do things.
**Fix:** one chat surface, one code path, `streamAgent` underneath everywhere. See Phase 2 in `docs/FULL_AUDIT_REBUILD_PROMPT.md`.

### 4.6 No density tiers
- Table rows are all the same height regardless of dataset size.
- Linear, Retool and Metabase all ship compact/comfortable/spacious. AIDE ships comfortable only.

### 4.7 No mobile view
- Every page is desktop-first with a `md:` breakpoint as an afterthought.
- The Estimation Workbench at 360px width renders all three panes stacked unreadably.
- No technician-in-the-field view exists for Jobs or Schedule.

### 4.8 Focus state and accessibility
- Primary action buttons use `focus:outline-none focus:ring-2 focus:ring-primary/20` inconsistently.
- Some interactive rows are `<div onClick>` — not keyboard-reachable, not screen-reader-announced.
- Colour contrast on `text-muted-foreground` against `bg-muted` borders on failing in light mode.

## 5. Top 10 issues (ranked by "primary task in under 60s" impact)

| # | Issue | Severity | Fix effort |
|---|---|---|---|
| 1 | Three competing chat components with different affordances — user can't tell which AI can act | 🔴 high | M: one surface, `streamAgent` everywhere |
| 2 | No command palette despite `cmdk` being installed — every interaction is mouse-dependent | 🔴 high | S: one global `<CommandPalette>` wired to router + agent |
| 3 | Loading states inconsistent across 18 pages — 6 pages show blank screens on load | 🟠 medium | M: `<PageSkeleton>` primitive + sweep |
| 4 | Empty states inconsistent across 18 pages — 6 pages show nothing on empty data | 🟠 medium | S: one `<EmptyState>` primitive + sweep |
| 5 | `chat.tsx` is 1,232 lines doing ten jobs in one component | 🟠 medium | L: split into message-list, input, streaming, attachments, action-handler modules |
| 6 | No keyboard navigation on list pages — Operations, Jobs, Todos, Suppliers | 🟠 medium | M: one `useListNav()` hook + wire to 4 pages |
| 7 | No drill-through on Dashboard KPI cards — clicking "Active Jobs" does nothing | 🟠 medium | S: wrap each card in a `<Link>` to a filtered list view |
| 8 | No mobile view parity — technician-in-the-field cannot use this on a phone | 🟠 medium | L: separate mobile layout component for Jobs + Todos + Schedule |
| 9 | Analytics bundle is 455KB / 120KB gz, heaviest page — no drill-down, no export | 🟡 low | L: covered by Pass 4 + Phase 4 |
| 10 | No density toggle on tables — fixed-height rows everywhere | 🟡 low | S: add `compact\|comfortable\|spacious` density context |

---

## 6. 5-persona scoring

| Persona | Score | Reasoning |
|---|:---:|---|
| **A — Staff Engineer** | **6/10** | Component library is clean, Tailwind discipline holds, no CSS anarchy. But `chat.tsx` at 1,232 lines is a maintainability bomb, and the three-chat-components situation is a refactor debt that will compound. |
| **B — Product Designer** | **6/10** | Looks fine. Doesn't sing. The gap to Linear-class isn't visual — it's five specific habits (skeletons, empty states, cmd-K, keyboard nav, density). All five are finite engineering tickets, not vision work. |
| **C — AI Engineer** | **5/10** | The fact that the user can see one AI widget that can act and another that can't, and they look identical, is the single most-confusing UX problem on the site. The agent's tool-use capability is hidden behind a visual indistinguishability. |
| **D — Data Analytics Architect** | **4/10** | Dashboard KPIs don't drill through. Analytics page has no period selector, no export, no drill-down on any chart. Charts use stacked bars where a waterfall or small-multiples would tell the story. `deep-analytics.ts` primitives are built and unused. |
| **E — Field Ops Principal** | **5/10** | On desktop it works, reluctantly. On a phone in the field it's unusable. Morning stand-up is not a clear primary surface — you have to hunt across three pages to answer "what do I do first today". |

**Average:** 5.2 / 10 — below the 7/10 merge threshold. Pass 2 does not clear the panel. Rebuild work is required before Pass 3.

### Consensus from panel
All five personas agree the #1 fix is **unify the chat surface around the tool-using `streamAgent` path** (also the subject of Phase 2 in the main brief). B, C and E jointly push for **command palette as the second fix**. D pushes for **Dashboard drill-through** as the third. A pushes for **`chat.tsx` decomposition** as the fourth. E pushes for **mobile parity** as the fifth.

## 7. Proposed rebuild targets (ordered)

Each target is a single reviewable commit. Targets 1-5 are blocking for the panel to clear Pass 2 at ≥ 7/10.

1. **Unify the chat surface.** Replace every `AidePA` and `AnalyticsPanel` mount with a single `<AIDEAssistant>` that speaks `streamAgent`. Visual: keep Replit's floating-button chrome for continuity. Tool-use everywhere, one code path.
2. **Global command palette.** Mount `<CommandPalette>` at the top of `Layout`. Wire it to Cmd-K / Ctrl-K. Commands: navigate (every route), create (job / quote / todo / estimate / note), ask AIDE (opens the agent with the input pre-filled), search.
3. **`<PageSkeleton>` + `<EmptyState>` primitives + sweep.** One `PageSkeleton` with `shape="list" | "grid" | "detail" | "table"` props. One `EmptyState` with `icon / title / body / cta` props. Sweep all 18 pages.
4. **Dashboard KPI drill-through.** Every card wraps its primary number in a `<Link>` to the corresponding filtered list. Add today's revenue vs $180k target as the lead card.
5. **`useListNav()` hook + wire to Operations, Jobs, Todos, Suppliers.** Keyboard: `j`/`k` move, `enter` open, `e` edit, `x` select, `shift+x` range-select, `escape` clear.

Deferred targets (non-blocking for Pass 2):

6. Split `chat.tsx` into `ChatPage` → (`MessageList`, `MessageInput`, `AttachmentDropzone`, `ActionBlockRenderer`).
7. Mobile layouts for Jobs / Todos / Schedule (Phase 3 target).
8. Density tiers on tables (small, later).
9. Analytics rebuild with drill-through (Pass 4 lead).
10. `<ops-action>` JSON blocks rendered as action pill buttons instead of raw code.

---

## 8. What comes next

- **Pass 3** — AI integration depth (Persona C lead). Will check whether `streamAgent` actually wires to tool use end-to-end on the pages that use it, whether the system prompt has examples, whether there's observability, whether there are evals.
- **Pass 4** — Data analytics and insights (Persona D lead). Will catalogue every metric, audit for honesty (truncated y-axis, missing zero lines), check the metric registry gap, map `deep-analytics.ts` primitives to the UI.

Pass 2 is **not clear to merge** at 5.2 / 10. A rebuild PR addressing targets 1-5 above is required before Pass 3 is considered accepted.

---

**End of Pass 2.**

