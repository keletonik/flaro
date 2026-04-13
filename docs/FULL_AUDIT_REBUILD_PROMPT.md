# AIDE — Full Audit, Rebuild & Improvement Brief

**Version:** 1.0
**Audience:** Any capable software engineer, AI engineer or coding agent (Claude Code, GPT, Cursor, Replit Agent) picking up the project.
**Goal:** Conduct a complete audit of the AIDE platform, fix the AI-interaction gap, rebuild weak surfaces to best-in-class level, and deliver the result in a series of small, reviewable commits — with a built-in 5-person expert review panel gating the work.

---

## 0. How to use this document

Paste this entire file as the opening prompt into your coding agent, or link to it from a shorter kickoff. Everything the agent needs is here: context, mission, panel, passes, reference set, success criteria, deliverables format and ground rules. No other files are required to get started.

The agent may read any file in the repo before making changes. It must **never** modify files listed under "Hands-off files" (§ 12) and must **always** run the build before committing.

---

## 1. The mission (one paragraph)

Take AIDE — a TypeScript monorepo (Express API + React/Vite frontend) for a NSW fire-protection service business — from its current state of "most of the pieces are on disk but poorly connected" to a genuinely best-in-class operations platform that rivals BuildOps, ServiceTrade, Uptick and Buildertrend on their own terms, with one unique edge: a **deeply integrated AI agent** that can actually read, create, update and delete records across every page, not just analyse data in a sidebar. The finished product should feel inevitable — fast, opinionated, beautiful, and so obvious in its workflow that a technician with zero training can use it effectively on day one.

---

## 2. Current state

### 2.1 Stack
- **Monorepo:** pnpm workspaces (`artifacts/*`, `lib/*`, `scripts`)
- **Backend:** Express 5, Drizzle ORM, Postgres (Replit-provisioned), Anthropic SDK via Replit's AI Gateway (`claude-sonnet-4-6` / `claude-opus-4-6`)
- **Frontend:** React 19, Vite 7, TanStack Query, Wouter router, Tailwind v4, shadcn-style components
- **Deploy:** Replit artifact system (same-origin `/api/*` routing), optional Vercel mirror with `VITE_API_BASE` env var
- **Node:** 24

### 2.2 What's live on `main` right now
- **Data:** seeded production database (4,400+ WIP records, 326 jobs, 444 defects, 87 quotes, 76 suppliers with 1,730 products each carrying cost + sell price, 5 FIP manufacturers, 36 panel models, 40 manufacturer documents, 20 Australian standards)
- **Pages:** Dashboard, Chat, Operations (WIP/Quotes/Defects/Invoices tabs), Analytics, Jobs (Action List), Todos, Projects/PM, Suppliers (Directory + Estimation modes), Schedule, Notes, Toolbox, FIP Knowledge Base, Settings
- **Backend routes:** jobs, wip, quotes, defects, invoices, suppliers, supplier_products, kpi, contextual-chat, analytics, schedule-events, pm, on-call, clients, chat-history, auth (bypassed), uptick import, fip, chat-agent, estimates, diag
- **Agent:** `POST /api/chat/agent` runs Claude in a bounded tool-use loop with 15 tools (`db_search`, `db_get`, `db_create`, `db_update`, `db_delete`, `get_kpi_summary`, `ui_navigate`, `ui_refresh`, `estimate_search_products`, `estimate_create`, `estimate_add_line`, `estimate_update_line`, `estimate_set_markup`, `estimate_get`, `estimate_list`)
- **AidePA** floating PA widget on every page (read-only, `/chat/contextual`)
- **EmbeddedAgentChat** tool-use panel inside the Estimation Workbench (`/chat/agent`)
- **Diagnostic:** `/api/diag` returns DB health, table row counts, sample rows, env flags

### 2.3 What's weak or broken
1. **AidePA can only talk, not act.** It uses `streamChat` and cannot create/update/delete anything. Every page except the Estimation Workbench has a chat that is functionally read-only. The user has asked for full tool use across every page four times in this project's history.
2. **Data analytics is shallow.** `/analytics` and the Dashboard show totals and trend lines but no drill-down, no cohort retention, no rolling averages with anomaly flags, no per-tech profitability, no aged-receivables heatmap. The library (`lib/deep-analytics.ts`) has Holt linear, exponential smoothing, quote funnel, rolling z-score — almost none of it is wired into the UI.
3. **Operations table** (the biggest daily-use surface) is utilitarian: basic filters, inline edit, no saved views, no bulk actions beyond status change, no keyboard nav, no command palette.
4. **Visual design** is consistent but generic — Tailwind grey cards, no density tiers, no mobile tech view, no dark-mode polish on edge cases.
5. **No test coverage** worth mentioning. The Vitest config exists, there are a handful of hashing tests in auth.test.ts, and nothing else. Zero integration tests on the agent, estimates, or seed pipeline.
6. **Performance cliffs** not measured. The Analytics page bundle is 455 KB / 120 KB gzipped. Initial Dashboard render fetches 7 endpoints in parallel with no prefetch and no skeleton co-ordination.
7. **Mobile field-tech view** doesn't exist. Everything is desktop-first.
8. **Onboarding/help** doesn't exist. No empty states with guidance, no command cheatsheet, no tour.

---

## 3. The 5-person independent expert panel

Every substantive proposal and every completed rebuild step must be signed off (in comments on the PR / commit body) by **all five** personas below. If any persona fires, the work stops until addressed. Personas argue with each other. They are not the same person giving the same answer five times.

### Persona A — Staff Engineer (architecture & data model)
Thinks in invariants, idempotency and database constraints. Hates hidden mutations and untyped `any`. Will reject anything where totals are computed twice in two places, where a route bypasses soft-delete, where a schema doesn't match its migration, or where an agent tool can produce a state unreachable by the REST API. Insists on one source of truth per number. Grades every diff on a scale of "would I page at 3am if this shipped": 0 = sleep fine, 10 = pager.

### Persona B — Senior Product Designer (UX, visual, information density)
Trained on Linear, Pitch, Notion, Arc, Superhuman, Height. Thinks every pixel has to earn its place. Rejects generic cards, "see more" buttons, status badges that look the same as everything else. Pushes for keyboard-first flows, command palettes, skeleton loaders that match final layout exactly, and one clear next action per page. Specific reference: Linear's issue list, Retool's admin panels, Superhuman's inbox. Grades on "could a new user complete the primary task in under 60 seconds".

### Persona C — AI Engineer (agent, tools, prompting, eval)
Has shipped production agents with Anthropic tool use. Knows the difference between read-only streaming and a real agentic loop. Rejects any agent surface that can only read. Pushes for: tool result shaping that stays under 2k tokens, structured outputs with zod validation, tool use examples in the system prompt, prompt caching for the tool schema block, bounded iterations, explicit stop conditions, observability (every tool call logged with duration and outcome), and behavioural evals (a suite of scripted prompts the agent must pass: "create a quote for X, mark the oldest open defect Y as scheduled and assign it to Gordon, add a todo to chase the Pertronic order"). Graded on "can the AI complete real multi-step workflows without the user ever needing to click".

### Persona D — Data Analytics Architect (warehousing, BI, metrics)
Has built on Metabase, Superset and in-app embedded analytics. Rejects charts that mislead (truncated y-axis, hidden zero line, linear scale on exponential data), rejects vanity metrics (total records), rejects manual recomputation of numbers that should be SQL rollups. Pushes for: a small number of high-signal metrics per page, consistent period windows (today / 7d / 30d / 90d / ytd), drill-down from every headline number, export to CSV and PDF on every table, one "what's changed since last visit" card per page, and a single query catalogue that every dashboard reads from. Graded on "could a non-technical operator explain this number to an auditor from what's on screen".

### Persona E — Field Ops Principal (the actual user)
Runs a 6-tech fire-protection service operation. Cares about two things only: getting jobs done in the right order, and not losing money. Rejects anything that takes more than two taps on a phone, anything that requires typing an id, anything that shows data >60 seconds stale. Pushes for: mobile view parity, photo drop with OCR, voice-to-todo, "what's broken today" as the default landing tab, and a KPI bar that always shows revenue-vs-target for the month. Has no patience for "AI analysis" unless it saves time or money. Grades on "does this get the job done faster than a whiteboard".

---

## 4. Best-in-class reference set

Study these systems. Imitate what they do well. Do not copy their visual identity — take the patterns.

- **BuildOps** — commercial FSM with fire-protection roots. Look at its dispatch board, service agreement screen and recurring inspection flow.
- **ServiceTrade** — fire & life safety FSM. Look at its customer portal, deficiency rollup and quote-to-job flow.
- **Uptick (the actual product)** — inspection reporting. Look at its task lifecycle UI, remark severity ladder and recurring routine scheduling.
- **Inspect Point** — fire inspection on iPad. Look at offline-capable forms and barcode-driven asset walks.
- **ServiceTitan** — residential FSM, hated for pricing, loved for dispatch. Look at its dispatch board and its call-taking flow.
- **STACK** — preconstruction estimating. Look at its assemblies, line-item markup controls and takeoff integration.
- **Buildertrend** — builder-oriented. Look at its estimate → proposal → change-order flow and the customer-facing cost summary.
- **Procore Estimating** — enterprise. Look at its labour / material / equipment cost bucketing.
- **JobTread** — construction mgmt. Look at its cost catalogue and margin-by-job report.
- **Knowify** — small builder mgmt. Look at its budget-vs-actual on the job page.
- **Linear** — issue tracking. Look at its list density, keyboard shortcuts, command-K palette and real-time updates.
- **Retool** — internal tool builder. Look at its table component: column pinning, row selection, bulk actions.
- **Metabase** — BI. Look at its question editor, drill-through and alerts.
- **Superset** — BI. Look at its dashboard filters and time-grain selectors.
- **Notion AI** — integrated AI in a SaaS. Look at how actions are distinguished from analysis visually and how confirmations work.
- **Intercom Fin** — tool-using support agent. Look at its "handoff to human" boundary and its tool failure messaging.
- **Anthropic docs — tool use, advanced tool use, tool search tool, programmatic tool calling** — the production patterns for agents.

---

## 5. Phase 1 — Seven-pass audit framework

Run **all seven passes** in order before proposing any rebuild. Produce a written finding per pass, stored under `docs/audit/PASS_<n>_<slug>.md`. Each pass must end with a ranked list of "top 10 issues for this pass" and a scoring table by persona (0-10 from each of the 5 personas).

### Pass 1 — Architecture & data model
- Walk every Drizzle schema file and every runtime-DDL migration.
- List all FK relationships (including implicit ones, i.e. text columns holding ids).
- For every numeric column storing money: confirm `numeric(12,2)` or wider, confirm it is never stored as a float in JS, confirm totals are only computed in one place.
- Identify every table the agent can write to and every table it can read from. Confirm the two sets make sense (e.g. the agent should not be able to `db_delete` the `users` table).
- Grade: are there tables that have no UI surface? Are there UI surfaces whose data shape doesn't match the DB?
- Persona A is the lead for this pass.

### Pass 2 — UX, UI and design system
- Screenshot every page at four viewport widths: 360, 768, 1280, 1920.
- For every page list: primary action, secondary action, information hierarchy, empty state, loading state, error state.
- Inventory every visual pattern (card, table row, badge, button, modal, drawer, tooltip, toast) and check consistency.
- Run a "first 60 seconds" test: assuming a new user, can they complete the primary action on each page without scrolling or reading docs?
- Compare directly against Linear, Retool, Metabase and Buildertrend screenshots on the same intent.
- Persona B is the lead.

### Pass 3 — AI integration depth
- Enumerate every place where the AI is visible or invocable.
- For each, record: which endpoint it hits, whether it has tools, which tools, what the result of each tool call looks like, what the user sees happen on the page after a tool call succeeds.
- Run the "action vs. description" test: for every promised capability ("mark defects as scheduled", "create a todo", "reprice an estimate"), attempt it in the chat and confirm the database state actually changes.
- Confirm the agent system prompts push toward action, not description ("YOU HAVE REAL TOOLS. Use them.").
- Confirm tool results are summarised in plain English, not dumped as JSON.
- Confirm `ui_action: refresh` works end-to-end: agent write → `broadcastEvent` → SSE → `aide-data-changed` window event → `queryClient.invalidateQueries()` → host page refetches.
- Persona C is the lead.

### Pass 4 — Data analytics and insights
- Catalogue every chart and every KPI on every page.
- For each: what question does it answer, what period window, is the y-axis honest, is there a drill-down, is the underlying query reusable?
- Identify the 10 metrics an operator would actually ask for every morning (revenue vs target month-to-date, overdue defects count, aged receivables by bucket, top-5 outstanding jobs by value, quote conversion 30d, tech utilisation last week, average time-to-invoice, margin by client top 10, repeat-site frequency, critical-defect backlog trend).
- Check which of those exist today, which are buried in a library but not exposed, and which are missing entirely.
- Persona D is the lead.

### Pass 5 — Performance and reliability
- Measure: cold TTFB, TTI, largest contentful paint, total bundle size, biggest chunk.
- Inventory every `fetch` and `useQuery` fired on each page. Identify waterfalls.
- Find every N+1 query in the backend. Find every unbounded `db.select().from(t)`. Confirm pagination actually limits.
- Find every place where totals are recomputed client-side that should be server-side.
- Check the seed pipeline: does a cold boot actually complete in under 60s?
- Persona A + Persona E share this pass.

### Pass 6 — Security and access
- Confirm `requireAuth` covers every mutating route.
- Confirm parameterised queries everywhere (grep for string concat in SQL).
- Confirm rate limits on auth, agent, import endpoints.
- Confirm no secrets in source. Confirm `.env*` in `.gitignore`.
- Confirm XSS-safe rendering of assistant text (the current markdown renderer escapes HTML — verify).
- Confirm CORS origin is configurable for the Vercel mirror.
- Persona A + Persona C share this pass.

### Pass 7 — Operator efficiency
- Sit with the real workflow: a tech starts their day — what do they see, what do they tap, what does the AI do for them?
- Find everywhere the operator currently does something the system could do automatically (assignment on import, status inference from notes, overdue flagging, reminder todos).
- Find everywhere the system makes the operator wait more than 300ms.
- Find everywhere a piece of data has to be copy-pasted across pages.
- Persona E is the lead. Ruthless.

At the end of Phase 1 you should have 7 markdown files under `docs/audit/`, a `docs/audit/SUMMARY.md` combining all 35 persona scores into a single matrix, and a ranked list of the top 25 issues across the whole site.

---

## 6. Phase 2 — Fix the AI interaction gap first (non-negotiable)

This is the single feature the user has asked for repeatedly. It must be done before any other rebuild work.

### 6.1 Current gap
- `AidePA` (the floating widget on every page) uses `streamChat` against `/chat/contextual`. It is a pure text analyst. It cannot create or update anything.
- `EmbeddedAgentChat` (inside the Estimation Workbench only) uses `streamAgent` against `/chat/agent`. It has full tool use.
- Result: the user experiences two different AIs depending on which page they're on, and most pages still feel read-only.

### 6.2 Target
**One AI everywhere**, and it's the tool-using one. Retire `streamChat` as the default path; keep it only for explicit read-only analysis surfaces (e.g. an "Explain this chart" button on the analytics page) where side-effects would be wrong.

### 6.3 Concrete steps
1. Either refactor `AidePA.tsx` to use `streamAgent`, or replace every mount of `AidePA` with `EmbeddedAgentChat` (or a new `AidePAAgent` component that wraps it). Preserve Replit's visual styling of the floating widget — but swap the underlying client.
2. Give the global agent a `section` prop that reflects the current route (e.g. `wouter`'s `useLocation()` → section string). This already works in `EmbeddedAgentChat` and in the estimation flow — generalise it.
3. Expand `AGENT_TOOLS` in `lib/chat-tools.ts` to include:
   - `ui_set_filter(filter_key, value)` — apply a filter on the current page (via a window event the host page listens for)
   - `ui_open_record(table, id)` — navigate and scroll-highlight a specific row
   - `ui_open_modal(kind, id?)` — open the create/edit modal for a record
   - Anything else the 7-pass audit surfaces as a daily-use action
4. Wire a `section` → tool allow-list in the agent system prompt so when the user is on `/suppliers`, the agent preferentially uses `estimate_*` tools, and when on `/jobs` it uses `db_*` against `wip_records` / `jobs` / `defects`.
5. Add **tool use examples** to the system prompt. Claude follows examples better than descriptions. Include 3 examples per section: one search, one create, one multi-step chain.
6. Add **prompt caching** on the system prompt + tool schema block. Anthropic supports this natively and it's ~2x cheaper.
7. Add a **behavioural eval harness** under `artifacts/api-server/src/agent-evals/`. One file per section, each with 10-20 prompts and an assertion about what the DB should look like after. Run it in CI. Failing an eval blocks a PR.
8. Add **observability**: every tool call logs its name, input (redacted), duration, and outcome to a `agent_tool_calls` table. Surface this in a new `/api/diag/agent` endpoint so operators can see what the AI did today.
9. Add a **visible tool-in-flight indicator** on every page that has the agent: a small badge near the chat launcher that shows "agent working…" when a tool call is outstanding.

### 6.4 Definition of done for Phase 2
- All 5 personas sign off.
- A non-trivial multi-step prompt ("for every critical defect at Goodman sites, create a todo and mark the defect as scheduled for tomorrow") completes in one chat turn with the page updating live.
- The eval harness passes.
- Latency for the first token on a simple tool call is under 2 seconds.

---

## 7. Phase 3 — Rebuild targets, page by page

Every page gets a dedicated rebuild proposal (one markdown file per page under `docs/rebuild/PAGE_<name>.md`) before any code changes. Each proposal must reference at least two best-in-class systems from § 4, show before/after wireframes (ASCII is fine), and be signed off by personas B and E at minimum.

### 7.1 Dashboard (`/`)
- **Today:** KPI cards + focus points + operations pipeline bars + tech workload grid + a contextual chat.
- **Target:** A single-screen "morning stand-up" layout. Left column: the 6 KPIs that matter, each with a sparkline, the last 7 days, and a drill-down. Middle: the top-3 things that need your attention today (computed from real rules, not magic). Right: today's schedule + roster. Bottom: a command palette (Cmd-K) with "assign T-XXXX to Gordon", "create todo", "show overdue defects".
- **Reference:** Linear's home view, Notion's "My day", Retool's admin dashboards.

### 7.2 Operations (`/operations`)
- **Today:** Four tabs (WIP / Quotes / Defects / Invoices), one table per tab, basic filters, inline edit, CSV import.
- **Target:** Saved views (like Linear's), column pinning, bulk actions (assign, status-change, export, delete), keyboard nav (j/k to move, e to edit, x to select), per-row agent action ("ask AIDE about this job"), a "needs attention" counter per tab.
- **Reference:** Linear issues, Retool tables, Airtable.

### 7.3 Suppliers → Estimation Workbench
- **Today:** 3-pane layout, live catalogue, markup/margin editing, embedded tool-use agent. Already the best surface on the site.
- **Target:** Labour line recipes (commissioning, replacement, service call templates), client margin overrides per estimate, version history per estimate, PDF export matching the company's brand, an "accept this" flow that converts the estimate into a quote row in the existing Uptick `quotes` table.
- **Reference:** Buildertrend proposals, STACK assemblies, JobTread cost catalogue.

### 7.4 Jobs / WIPs (`/jobs`)
- **Today:** List/Kanban toggle, basic filters, full CRUD modal, contextual chat.
- **Target:** A single unified view (no toggle). Density tiers (compact/comfortable/spacious). Row expand shows the full history of the job inline, not a modal. "Assign", "Schedule", "Quote", "Invoice" inline action chips. Map-view mode grouping jobs by site.
- **Reference:** Linear issue rows, Superhuman thread expand.

### 7.5 FIP Knowledge Base (`/fip`)
- **Today:** Replit's tabbed page: Overview, Manufacturers, Models, Documents, Standards.
- **Target:** Keep the tabs, add a global search that cross-ranks manufacturers / models / documents / standards by relevance, add a "quick troubleshoot" section that captures a fault code and returns likely causes + next checks via `fip_fault_signatures`, add a document-viewer pane (PDF inline) for manufacturer manuals, add the embedded tool-use agent as a permanent right column (same pattern as the Estimation Workbench).
- **Reference:** Notion docs search, ReadTheDocs, Algolia DocSearch.

### 7.6 Todos (`/todos`)
- **Today:** Priority groups, urgency tags, quick-add, CSV export, contextual chat.
- **Target:** Keyboard-first. Natural-language create via the agent ("remind me to chase Pertronic on Monday"). Three fixed sections (today / this week / later) that replace the priority groups, backed by dueDate rules. Snooze. "Send to calendar" into `/schedule`.
- **Reference:** Todoist, Things, Superhuman reminders.

### 7.7 Schedule (`/schedule`)
- **Today:** Week grid 7am–6pm, jobs by due date, add standalone events.
- **Target:** Drag-to-reassign, drag-to-reschedule, conflict warnings, technician lanes, a "suggest schedule" agent button that proposes an optimal week given open jobs + tech availability. Sync with iCal/Google Calendar via a public ics endpoint.
- **Reference:** Cron / Notion Calendar, Google Calendar, ServiceTitan dispatch.

### 7.8 Analytics (`/analytics`)
- **Today:** WIP / quote / defect / invoice charts driven by `routes/analytics.ts`, most visualisations stacked bar charts.
- **Target:** See § 8 below — this gets a dedicated overhaul.

### 7.9 All remaining pages (Notes, Toolbox, Chat, Projects, Settings)
- Less critical. Apply the same principles: consistent loading/empty/error states, keyboard shortcuts, agent action integration, density tiers. Detailed proposals only if the 7-pass audit flags them.

---

## 8. Phase 4 — Data analytics overhaul

`lib/deep-analytics.ts` already has the primitives: Holt linear smoothing, simple exponential smoothing, rolling z-score anomaly detection, quote funnel, client cohort retention, Pearson correlation, percentile rank, pivot, generic aggregators. Almost none of it is exposed in the UI. That is the core miss.

### 8.1 Metric catalogue (the 10 that matter)

Define these as named, versioned queries in a new `artifacts/api-server/src/lib/metrics/` directory. One file per metric. Each file exports a single function `compute(params): Promise<MetricResult>` and a metadata block (display name, description, period windows supported, drill-down query).

1. **Revenue vs $180k target MTD** — line chart, monthly, actual vs target, with pro-rata daily target.
2. **Overdue defects by severity** — stacked bar, critical/high/medium/low, rolling 4 weeks.
3. **Aged receivables heatmap** — client × (current / 0-30 / 31-60 / 61-90 / 90+) with outstanding $ per cell.
4. **Top-5 outstanding WIPs by value** — table, sortable, with days-since-created and assigned tech.
5. **Quote conversion 30d** — funnel (draft → sent → accepted → invoiced), value-weighted.
6. **Tech utilisation last 7d** — horizontal bar per tech, jobs completed + hours booked.
7. **Avg time-to-invoice** — number + 90d sparkline, red if >14 days.
8. **Margin by client top 10** — bar, with explicit margin % and $.
9. **Repeat-site frequency** — table of sites visited 3+ times in 90d with total revenue and avg interval.
10. **Critical-defect backlog trend** — line, rolling count of `defects.severity='Critical' AND status!='Resolved'` by day, last 90 days.

### 8.2 Query catalogue

Create `lib/metrics/registry.ts` that lists every metric by id. Every chart on every dashboard reads from this registry by id. No inline SQL in page components. No duplicated calculations. The registry becomes the single source of truth for "what does the number mean".

### 8.3 Drill-down contract

Every headline number links to a drill-down view (either a side panel or a dedicated route `/metrics/:id`) that shows:
- The exact underlying query in plain English
- The raw rows it aggregated
- The period window used
- A time series of the same metric for the previous 6 periods
- A "what's changed since last visit" diff

### 8.4 Export contract

Every metric and every table ships with CSV export and PDF export. Both include the query summary and the period in the footer so an auditor can reproduce it.

### 8.5 Agent integration

The agent gains three new tools:
- `metric_get(metric_id, params?)` → returns the MetricResult for any registered metric
- `metric_drilldown(metric_id, dimension, value)` → returns the underlying rows for a specific drill path
- `metric_compare(metric_id, period_a, period_b)` → returns both values and a plain-English delta

Usage pattern: user asks "how's revenue this month?" → agent calls `metric_get("revenue_vs_target", { period: "mtd" })` → responds with the number AND calls `ui_open_record("metrics", "revenue_vs_target")` to open the drill-down automatically.

---

## 9. Phase 5 — Panel review gate

Before any rebuild PR merges, it must carry **five sign-offs** in the commit body, one per persona, with a 0-10 score from each. Minimum to merge: **all five ≥ 7/10**. Anything below blocks the merge until addressed.

A sign-off line looks like:
```
Persona A (Staff Eng):      8/10 — clean schema, slight concern about FK cascade on cost_price
Persona B (Product Designer): 9/10 — density tiers land, loading skeletons match final layout
Persona C (AI Engineer):      8/10 — tool use present, examples in system prompt, eval passes
Persona D (Data Analytics):   7/10 — metric registry used, one drill-down still inline
Persona E (Field Ops):        9/10 — 3-tap mobile flow, morning stand-up screen is perfect
```

If the persona voice is not genuinely different from the others — if all five scores cluster in the same 2-point band for the same reasons — the sign-off is rejected as cosplay. Each persona must find at least one thing the others didn't.

---

## 10. Success criteria (measurable)

After the audit + Phase 2 + Phase 3 + Phase 4 are complete, the following must hold:

1. **Agent can do every read and write across every page in the app** via the floating widget. Demonstrated by running the eval harness and passing ≥ 90% of the 200+ scripted prompts.
2. **First meaningful paint** on the Dashboard is under 1.0s on a cold cache, under 300ms on a warm cache.
3. **Operations table** can render 10,000 rows with zero scroll jank. Sort + filter under 50ms at the 99th percentile.
4. **Estimation Workbench** can build a 40-line estimate in under 60 seconds start to finish using keyboard + agent only — no mouse required.
5. **Analytics page** loads in under 1.5s with 12 charts visible, each backed by a named metric from the registry.
6. **Mobile view** at 360px width is parity with desktop for the Dashboard, Jobs and Todos pages (measured: every primary action still reachable, every KPI still visible, no horizontal scroll).
7. **Build** (`pnpm -w run build`) stays green with zero TS errors and zero vite warnings.
8. **Test coverage** on agent tools is 100% (every tool has a unit test). Integration tests cover the 10 highest-value workflows end-to-end.
9. **Lighthouse** performance score on Dashboard ≥ 85, accessibility ≥ 95, best practices ≥ 95.
10. **Panel sign-off matrix** shows all 5 personas ≥ 7/10 on every merged PR.

---

## 11. Deliverables format

Every PR must contain:

1. **A scoped commit message** explaining the what and the why, referencing the pass or rebuild target it addresses.
2. **The 5-persona sign-off block** in the commit body.
3. **Only the files that need to change** — no drive-by refactors, no "while I was here" cleanups, no unrelated dependency bumps.
4. **A passing `pnpm -w run build`**. If the build is red, the PR doesn't ship.
5. **Updated documentation** under `docs/` if the change affects architecture, data model, agent tools, metric registry or deployment.
6. **A runbook entry** if the change adds a new environment variable, a new background job or a new external dependency.

Small commits are preferred over large ones. One rebuild target per PR is ideal. Bundling unrelated changes into a single "big refactor" commit is rejected.

---

## 12. Ground rules (hard — do not violate)

1. **Never delete or overwrite production data.** Every seed is additive, every migration uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, every write goes through a natural-key existence check. The user has been explicit about this across multiple sessions: it is the single non-negotiable invariant.
2. **Never store secrets in source.** `DATABASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, any OAuth client secrets stay in Replit Secrets / Vercel env vars. `.env*` remains gitignored.
3. **Never weaken the agent's safety rails.** `ui_navigate` stays on an allow-list. `db_delete` confirms before acting on anything other than todos/notes. Bounded tool iterations. No `db_execute_sql` tool ever.
4. **Hands-off files** (do not rewrite without explicit user permission):
   - `artifacts/aide/src/components/AidePA.tsx` — Replit owns this visually
   - `artifacts/aide/src/pages/fip.tsx` — Replit owns this layout
   - `artifacts/api-server/src/seed-prod.ts` + `seed-data.json` — Replit's original prod seed
   - `lib/db/drizzle/*.sql` — drizzle migration history
   - `replit.md` — project notes owned by the user / Replit
   Any change to these files must be justified, proposed, and signed off by the user individually.
5. **No `--no-verify`, no `git push --force`, no rewriting history on `main`.** Always create new commits.
6. **Every commit must build.** `pnpm -w run build` is the gate.
7. **Australian English** in all user-visible copy (colour, organise, prioritise, centre, programme). Never American English, never corporate waffle, never "I'd be happy to".

---

## 13. Sync-war protocol (how to work alongside Replit's agent)

This codebase has two writers: Claude Code and Replit's agent. Early in the project their pushes repeatedly overwrote each other's commits until Replit adopted a "pull before push" rule.

To stay out of trouble:

1. **Always pull first.** `git fetch origin main && git log HEAD..origin/main` before any change. If there are new commits, `git pull --rebase` them in and re-run the build.
2. **Never push a workspace snapshot.** Every commit must be a deliberate diff — files edited, build passing, message written. No "sync: full workspace sync" commits from this side.
3. **Prefer new files over editing shared ones.** The reason `EmbeddedAgentChat.tsx` exists as a separate file rather than as changes to `AnalyticsPanel.tsx` is precisely so the two agents don't collide on the same component. When in doubt, make a new file.
4. **If you find your work reverted,** investigate the specific commit (`git show <sha>`) and re-apply surgically — don't blanket-revert Replit's work. Replit's new components (`AidePA`, its `fip.tsx`) stay.
5. **When Replit's visual layer ships before Claude Code's data layer,** wire them together rather than replacing either. The current `AidePA` + `EmbeddedAgentChat` + `streamChat` + `streamAgent` split is an example: Replit owns the chrome, Claude Code owns the tool-use pipe, both live.
6. **Document the sync contract in `replit.md`** (currently the user / Replit own this file) and reference it from every PR.

---

## 14. The first move

When a coding agent picks up this prompt, its first move is:

1. `git fetch origin main && git log HEAD..origin/main` — get current.
2. Read `docs/FULL_AUDIT_REBUILD_PROMPT.md` (this file) end-to-end.
3. Read `replit.md` to understand Replit's view of the project.
4. Run `pnpm -w run build` and confirm it's green. If it's red, fix the build before anything else.
5. Create `docs/audit/` and start Pass 1 of the 7-pass audit.
6. Report back with Pass 1's top 10 issues and the 5-persona score matrix before touching any feature code.

From there, everything follows § 5 → § 6 → § 7 → § 8 → § 9 in order.

---

**End of brief.** Everything the user has asked for across the project is captured above: AI-interacts-with-the-page (Phase 2), data analytics overhaul (Phase 4), page-by-page rebuild (Phase 3), independent expert panel (§ 3), best-in-class references (§ 4), never-delete-data rule (§ 12.1), Replit sync coexistence (§ 13), and measurable success criteria (§ 10).
