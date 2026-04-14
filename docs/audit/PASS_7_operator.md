# Pass 7 — Operator Efficiency

**Lead persona:** E (Field Ops Principal)
**Reviewed at:** commit `af7d889`
**Scope:** the thirty-second question. How fast can a tech or
office lead go from "something is wrong" to "the right record is
on screen, updated correctly, and the fix is recorded"? Inbox
zero. Bulk actions. Mobile usability. Default views. Empty state
flows. Keyboard workflow coverage. Import/export round-trip.

---

## 1. Executive summary

This is the persona that will determine whether the site is
actually used after launch. Everything upstream of this pass can
be technically correct and still fail here if it takes three
clicks to scheduled a WIP instead of one, or if the office lead
can't tell at a glance how many criticals are overdue.

The short version: **the raw surface area is all there** — the
bento dashboard, the operations page, the command palette, the
embedded agent chat, the WIP filter drill-through from Pass 2,
the metric registry from Pass 4 — but most of the bulk-action
and inbox-zero affordances that an office lead actually wants
are either half-wired or missing. Specifically:

- No **inbox view** on the dashboard. Casper has to open three
  different pages to see "what needs me today".
- Bulk select works on WIPs (from `useListNav` in Pass 2) but the
  bulk action bar shows "Update status" only — not assign, not
  set priority, not schedule, not add note.
- The command palette has 13 navigate commands and 4 create
  commands, but zero "mark done", "assign to X", "schedule for
  tomorrow" commands.
- Mobile: the sidebar doesn't collapse to a bottom bar. Every
  page is a 100% desktop layout at 375px. Casper's techs will
  open this in the van and hate it.
- Import/export is **receive only**. You can import an Uptick
  CSV. You cannot export any filtered view to CSV for an email
  to the client.
- Default WIP view is "All open" with no personalisation. Every
  user sees the same 300 rows.

**Today's grade:** 5.4 / 10.
**With the Pass 7 fix set applied:** projected 7.9 / 10.

## 2. Inventory

### 2.1 Dashboard
- Bento grid with 8 KPI cards (Pass 2 drill-linked)
- "Today's focus" block (from /dashboard/focus)
- WIP pipeline + Quote conversion status bars
- No inbox / action-item block
- No "what changed since I was last here"

### 2.2 Operations page
- Tabs: WIP / Jobs / Quotes / Defects / Invoices
- Filter inputs: status, priority, search, client, assigned_tech
- Bulk select via `useListNav` (Pass 2)
- Bulk actions: update status, delete. No assign / schedule / add note.
- No saved views
- No "just show me mine"

### 2.3 Command palette
- Cmd-K global trigger
- 13 Navigate commands
- 4 Create commands (new todo / new note / new wip / new defect)
- 1 Ask AIDE handoff
- No Action commands (mark done / schedule / assign / change priority)

### 2.4 Mobile
- 100% desktop layout at every breakpoint
- Sidebar takes 220px permanently even at 375px
- No bottom tab bar
- Tables don't collapse to cards on narrow
- Command palette works but is unusable — modal takes the full screen and the results list has 0 padding

### 2.5 Import / export
- Imports: Uptick CSV, FireSense supplier CSV, FireMate catalogue
- Exports: **zero**. The Pass 4 ChartShell component adds a CSV
  download per chart, but no page-level "export this view" button
- No report builder

### 2.6 Default views / personalisation
- Hardcoded starting filter on every list page
- No saved views
- No "my jobs" shortcut
- No recent / pinned records

## 3. Findings

### 3.1 No "inbox" or "daily plan" view

An operations lead's day is: "what do I need to handle in the
next two hours, what can wait, what's stuck". The dashboard shows
totals but doesn't rank the rows. Casper asked for an embedded AI
chat on every page specifically because he wanted to ask "what
needs me today" — which works, but the canonical answer should
be visible without typing.

### 3.2 Bulk actions are incomplete

The `useListNav` hook from Pass 2 exposes `selectedIds`. The
WIPs page uses it for "update status" only. The field ops
principal will want **assign to X**, **schedule for <date>**,
**set priority**, **add note to all**, **export selected** at
minimum. All doable in existing code, all missing today.

### 3.3 Command palette is nav-only

Pass 2 Target 2 added navigation + a small set of creates, but
the "mute every keyboard to do things in one action" vision needs
action commands:
- "Mark T-39833 scheduled for tomorrow"
- "Assign all critical Goodman defects to Gordon"
- "Mark every invoice over 60 days paid"

The agent chat handles these via prose but the power-user path is
a command palette that takes the same verbs.

### 3.4 Mobile is unusable

The app has zero responsive breakpoints. At 375px the sidebar
eats 60% of the viewport. Tables overflow horizontally with no
sticky header. Casper's techs will open this on their phones in
the van and bounce.

### 3.5 No export on list pages

The operator can't copy a filtered view to an email. The Pass 4
ChartShell added per-chart CSV but no route-level export wrapper.
"Send me the overdue invoices for Goodman as a spreadsheet" needs
five clicks today.

### 3.6 No saved views / personalisation

Every user sees the same default. Casper wants "my opens over
20k" as a named view, pinned. Techs want "assigned to me, this
week, not scheduled". Both are the same query — just different
defaults.

### 3.7 No "what changed since last visit" surface

When the office lead comes back from lunch, the dashboard doesn't
say "while you were out: 2 new WIPs, 1 critical defect raised, 1
invoice marked paid". The SSE wire is there; no UI uses it.

### 3.8 Forms are unfriendly

Create WIP form has 14 fields, no progressive disclosure, no
smart defaults (site based on last-used client, priority defaulted
to Medium, status defaulted to Open). Every field is required
even when the data is a rough sketch.

### 3.9 No keyboard-first discoverability

`?` opens a keyboard cheat-sheet (from Pass 2). The cheat sheet
lists 6 shortcuts. The site has ~15 now.

### 3.10 No error recovery on bulk operations

A bulk update that fails halfway through leaves the selected set
in an unknown state. No toast, no retry, no "3 of 10 failed —
retry those".

## 4. Top 10 issues

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | No inbox / daily plan view on dashboard | 🔴 high | M |
| 2 | Bulk actions limited to status update + delete | 🔴 high | M |
| 3 | Mobile layouts missing everywhere | 🔴 high | L |
| 4 | No list-page CSV export | 🟠 medium | S |
| 5 | No saved views / personalisation | 🟠 medium | M |
| 6 | Command palette is nav-only — no action commands | 🟠 medium | M |
| 7 | No "what changed since last visit" surface | 🟡 low | M |
| 8 | Create forms have no smart defaults / progressive disclosure | 🟡 low | M |
| 9 | Keyboard cheat-sheet stale (6 shortcuts listed, 15+ exist) | 🟡 low | S |
| 10 | No partial-failure recovery on bulk operations | 🟡 low | S |

## 5. 5-persona scoring

| Persona | Score | Reasoning |
|---|:---:|---|
| **A — Staff Engineer** | **6/10** | Everything I'd fix here is product-side. The code paths exist. |
| **B — Product Designer** | **5/10** | Forms are the weakest spot. Mobile is an open wound. |
| **C — AI Engineer** | **7/10** | Agent chat compensates for a lot of the missing command palette surface. |
| **D — Data Analytics Architect** | **6/10** | CSV export is the main miss from my side — otherwise the numbers flow. |
| **E — Field Ops Principal** | **4/10** | This is where it hurts. No daily plan. No bulk assign. No mobile. I wouldn't use it for my crew today. |

**Average:** 5.6 / 10.

## 6. Proposed fix set (ordered)

1. **Inbox block on dashboard** — top of page, shows:
   - 5 oldest open critical defects
   - 5 overdue invoices sorted by days overdue
   - 5 open WIPs >$20k
   - Everything clickable, everything actionable from the same place.

2. **List-page CSV export** — add a "Download CSV" button to the
   operations tabs. Uses the same serialiser that's currently in
   `lib/exports.ts` plus the active filter state.

3. **Bulk action bar: assign / schedule / priority / note** — four
   dropdowns on the existing WIP bulk bar. Wire to the same
   per-id loop the current update-status uses.

4. **Command palette action commands** — add `mark-done`,
   `schedule-for`, `assign-to` to `CommandPalette.tsx`. Each takes
   an optional argument via a sub-prompt.

5. **Mobile breakpoints on the four core pages** — dashboard,
   operations, jobs/:id, chat. Sidebar collapses to bottom tab
   bar under 768px, tables become cards, command palette grows
   to full height.

6. **Saved views** — a simple `saved_views` table (user_id, page,
   filter_json, label, pinned). Plus a "save as…" icon on the
   operations filter bar.

7. **"What changed since last visit"** — last_seen_at on the
   session, plus a dashboard block that lists the mutations since
   that timestamp. Reads from `data_change` SSE events.

8. **Smart form defaults** — client dropdown defaults to the last
   used client in the session, status and priority defaulted, only
   required fields shown initially.

9. **Keyboard cheat-sheet regeneration** — move the list to a
   single source of truth (JSON) + auto-render in the `?` modal.

10. **Partial-failure toasts** — bulk loops should collect
    failures and present a "3 of 10 failed — retry" toast on
    error.

---

## 7. What comes next

- **Pass 7 fix set execution** — fixes 1, 2, 4, 9 are all small wins. 3 is a substantial mobile pass.
- **Phase 3 — page-by-page rebuild proposals**. Starts from the Pass 7 findings + the Pass 4 metric registry.
- **Phase 4 — the 10 success criteria from the master brief**.

---

**End of Pass 7.**
