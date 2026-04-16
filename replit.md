# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

---

## Service Ops App

Premium service management operations platform for Casper Tavitian (FlameSafe Fire Protection, NSW). Light/dark mode, Inter font, glassmorphism design.

### Artifacts
- `artifacts/aide` — React + Vite frontend (port from `$PORT`)
- `artifacts/api-server` — Express API server (port 8080)

### Frontend Pages
- `/` — KPI Dashboard: greeting, 6 metric cards (active jobs, completed today, weekly revenue, outstanding, WIP, pending quotes), focus points, operations pipeline bars, tech workload grid, contextual analyst chat
- `/chat` — PA chat with LLM (sonnet-4-6) via SSE streaming; email triage, image analysis, todo/job creation actions
- `/operations` — Operations Hub with 4 sub-tabs:
  - **WIP**: Uptick CSV import, data table with filters/search/status-change, summary bar, export CSV
  - **Quotes**: Quote management, CSV import, status tracking, conversion analytics
  - **Defects**: Uptick remarks/defects, severity tracking, CSV import, compliance context
  - **Invoices**: Outstanding invoice tracking, overdue detection, CSV import, revenue metrics
  - Each tab has its own contextual analyst chatbot
- `/jobs` — List + Kanban board toggle (Monday.com-style); status filter tabs; search; full CRUD modal
- `/jobs/:id` — Job detail with inline status/tech editing, contact call/email links
- `/todos` — Enhanced task management: priority groups, urgency tags, colour codes, notes, next steps, dependencies, assignee, quick-add, inline edit, export CSV, contextual analyst chat
- `/projects` — Monday.com-style project organiser: project cards with colour bars, status/priority badges, progress bars; expand to see tasks in list or Kanban board view; full CRUD
- `/suppliers` — Supplier Hub: fire protection supplier directory, add/edit/delete suppliers, category/rating filters, per-supplier product price lists with CSV import, price comparison, export CSV, procurement analyst chatbot
- `/notes` — Notion-style: list/grid toggle, category tabs with counts, expandable cards, mark done, search
- `/schedule` — Full week calendar grid (7am–6pm); jobs from DB shown by due date (colour-coded by priority); add standalone events
- `/toolbox` — Toolbox briefing notes with TB-XXX refs, mark briefed, export/copy to clipboard
- `/fip` — FIP Knowledge Base: tabbed interface (Overview, Manufacturers, Panel Models, Documents, Standards); 5 manufacturers, 36 models, 39 docs, 20 standards; search/filter by manufacturer; gated by FIP_ENABLED=1 env var

### Design System
- **Themes**: Light (default) + Dark mode via `.dark` class on `<html>`; toggled by sidebar button, persisted in `localStorage["ops-theme"]`
- **Theme provider**: `src/lib/theme.tsx` → `ThemeProvider` + `useTheme()` hook
- **Font**: Plus Jakarta Sans (body), JetBrains Mono (code)
- **Primary**: Warm amber/copper `hsl(18 60% 44%)` light / `hsl(18 60% 55%)` dark
- **Sidebar**: Dark enterprise sidebar with grouped nav (Command, Manage, Tools), collapsible
- **AIDE PA**: Embedded floating AI assistant (AidePA component) on every page except Chat; context-aware per page; uses `/api/chat/contextual` streaming; collapsible/expandable panel in bottom-right
- **Glass**: Glassmorphism header bars with `backdrop-filter: blur(20px)`
- Priority CSS classes: `priority-critical/high/medium/low` (left border), badge classes
- Status badge classes for all entity types
- `.metric-card` — Hover-elevated cards with gradient top border
- `.data-table` — Sticky headers, hover rows, sortable
- `.glass` — Frosted glass effect for sticky headers
- Animations: `card-appear`, `typing-dot`, `skeleton-pulse`, `slide-up`, `fade-in`, `shimmer`, `metric-count`

### API Routes
**Dashboard & KPI:**
- `GET /api/dashboard/summary` — job counts (critical/high/open/doneToday)
- `GET /api/dashboard/focus` — LLM-generated focus bullet points
- `GET /api/kpi/metrics` — comprehensive KPI metrics (jobs, WIP, quotes, defects, invoices, todos)

**Jobs:**
- `GET/POST /api/jobs` — list/create jobs
- `GET/PATCH/DELETE /api/jobs/:id` — job CRUD

**WIP:**
- `GET/POST /api/wip` — list/create WIP records
- `POST /api/wip/import` — CSV import with column mapping
- `PATCH/DELETE /api/wip/:id` — record CRUD
- `DELETE /api/wip/batch/:batchId` — delete import batch

**Quotes:**
- `GET/POST /api/quotes` — list/create quotes
- `POST /api/quotes/import` — CSV import with column mapping
- `PATCH/DELETE /api/quotes/:id` — quote CRUD

**Defects:**
- `GET/POST /api/defects` — list/create defects
- `POST /api/defects/import` — CSV import with column mapping
- `PATCH/DELETE /api/defects/:id` — defect CRUD

**Invoices:**
- `GET/POST /api/invoices` — list/create invoices
- `POST /api/invoices/import` — CSV import with column mapping
- `PATCH/DELETE /api/invoices/:id` — invoice CRUD

**Suppliers:**
- `GET/POST /api/suppliers` — list/create suppliers
- `PATCH/DELETE /api/suppliers/:id` — supplier CRUD
- `GET /api/suppliers/products/all` — all products across suppliers
- `GET/POST /api/suppliers/:supplierId/products` — supplier products
- `POST /api/suppliers/:supplierId/products/import` — price list CSV import
- `PATCH/DELETE /api/suppliers/products/:id` — product CRUD

**Purchase Orders:**
- `GET /api/purchase-orders` — list POs (filter by status, client, search)
- `POST /api/purchase-orders` — create PO
- `GET/PATCH/DELETE /api/purchase-orders/:id` — PO CRUD
- `POST /api/purchase-orders/import` — CSV import

**Change Log (Data Import Tracking):**
- `GET /api/change-log` — master change log of all data imports/refreshes
- `GET /api/change-log/summary` — grouped by batch with category breakdown
- Table: `data_change_log` — tracks batch_id, category, action, records counts, source file, timestamps
- All CSV import routes (wip, quotes, invoices) auto-log to change log

**Analytics:**
- `GET /api/analytics/wip` — comprehensive analytics: revenue tracking (day/week/month), WIP by status/tech/type/value, financial KPIs (quoted/revised/actual cost/sell/profit/margin, hours, uninvoiced, cash position), profit by category, margin distribution, cash position by tech, over-budget job alerts, quote conversion funnel, invoice pipeline
- `GET /api/analytics/pipeline-gaps` — quote-to-invoice gap detection: accepted quotes without WIP, completed WIP without invoices, under-invoiced items

**Notes/Todos/Projects/Toolbox:** Same as before with enhanced todo fields

**AI Chat:**
- `POST /api/chat/contextual` — SSE streaming contextual chat (section-aware data analytics)
- `POST /api/anthropic/conversations/:id/messages` — Main PA chat with SSE streaming

### AI Features
- **Main PA Chat**: LLM Sonnet, FlameSafe business context, email triage, image analysis, job/todo creation
- **Contextual Analyst**: Per-section chatbot that reads actual data from the section and provides analytics
  - WIP: scheduling optimisation, revenue analysis, workload distribution
  - Quotes: conversion rates, high-value opportunities, follow-ups
  - Defects: compliance analysis, severity patterns, remediation tracking
  - Invoices: cash flow analysis, overdue accounts, revenue metrics
  - Suppliers: price comparison, product lookup, procurement advice
  - Dashboard: strategic overview, trend identification, executive summary
  - Tasks: prioritisation advice, dependency analysis, scheduling

### DB Tables
- `jobs` — id, task_number, site, address, client, contact_*, action_required, priority, status, assigned_tech, due_date, notes, uptick_notes
- `notes` — id, text, category, owner, status
- `toolbox` — id, text, ref (TB-XXX), status
- `todos` — id, text, completed, priority, category, due_date, assignee, urgency_tag, color_code, notes, next_steps, dependencies
- `projects` — id, name, description, status, priority, colour, due_date
- `project_tasks` — id, project_id (FK), title, description, status, priority, assignee, due_date, position
- `wip_records` — id, task_number, site, address, client, job_type, description, status, priority, assigned_tech, due_date, date_created, quote_amount, invoice_amount, po_number, notes, raw_data, import_batch_id
- `quotes` — id, task_number, quote_number, site, address, client, description, quote_amount, status, dates, contact_*, notes, raw_data, import_batch_id
- `defects` — id, task_number, site, address, client, description, severity, status, building_class, asset_type, location, recommendation, dates, notes, raw_data, import_batch_id
- `invoices` — id, invoice_number, task_number, site, address, client, description, amount, gst_amount, total_amount, status, dates, payment_terms, notes, raw_data, import_batch_id
- `suppliers` — id, name, category, contact_name, phone, email, website, address, suburb, account_number, payment_terms, notes, rating
- `supplier_products` — id, supplier_id (FK), product_name, product_code, category, brand, unit_price, unit, description, notes, raw_data, import_batch_id
- `conversations` — id (serial), title
- `messages` — id (serial), conversation_id, role, content

### Data Import
- `scripts/import-flamesafe-data.cjs` — imports the FlameSafe operations spreadsheet into DB
- Source: `attached_assets/flamesafe_focused_09apr2026_1775773663737.xlsx` (10 sheets)
- Imported: 211 jobs, 87 quotes, 123 WIP records, notes from Action List, Quotes, Repairs, Schedule Register, Notes Log sheets
- Chat rendering: react-markdown + remark-gfm for polished tables, lists, code blocks, blockquotes
- **Uptick CSV import** (batch `csv-import-20260413`): 310 jobs (100 new, 203 updated), 165 WIP records, 222 defects
- **Uptick task export** (4 CSV files, deduplicated): 319 unique tasks → 326 jobs total (upserted by task_number); statuses: In Progress 98, Complete 89, Open 68, Scheduled 54, Cancelled 16
- **Uptick remarks export** (batch `uptick-remarks-20260413`): 222 remarks → 444 total defects; severity: Critical 184, Non-critical 172, Non-conformance 44, Low 44
- **Production seed**: `seed-data.json` (6.26MB) auto-seeds empty production DB on startup with all data (326 jobs, 4408 WIP, 89 todos, 444 defects, 288 products, 33 on-call, 87 quotes, etc.)
- **WIP Financial Analytics** (batch `wip-financial-20260413`): 4,243 WIP records from full Uptick WIP export (`Task-WIP_2026-04-13_10-15-04`) with 37 financial columns: quoted/revised/actual cost/sell/profit/margin, estimated/committed/actual hours, uninvoiced, cash position, billable, cumulative actuals/invoiced, activity fields — stored in `raw_data` JSON; analytics API enriched with financial KPIs, profit by category, margin distribution, cash position by tech, over-budget alerts. 20 techs, 4 categories (I&T 2197, Callout 1367, Repair 678, Billing 1).
- **Supplier price lists** (batch `supplier-pricelist-20260413`): 288 products from 3 suppliers:
  - Ampac (86 products): Trade + NSW Platinum A pricing (lowest price wins); detectors, FIPs, speakers, sounders, batteries, door holders, ASD, EWIS
  - Pertronic Industries (139 products): Panels (F220), modules, detectors, VESDA, FAAST, MCPs, sounders, speakers, PSUs, batteries, door holders, flame detectors
  - Fusion Fire Systems (63 products): Axis 5000 cards, DDI detectors, TAURUS wireless, modules, sounders, speakers, MCPs, door holders
- Source PDFs: Ampac Trade (12/05/25), Ampac NSW Platinum A 2026, FastSense quote, FireSense, Fusion Fire Systems (07/04/26), Pertronic (1 April 2025), VESDA .msg

### CRITICAL DATA SAFETY RULE (PERMANENT — CANNOT BE OVERRIDDEN)
**ALL DATA MUST BE RETAINED AT ALL TIMES — NO EXCEPTIONS.**

**NO DATA DELETION — EVER.** When importing, syncing, updating, migrating, refactoring, or performing ANY operation:
- **NEVER** use `DELETE FROM <table>` without a batch-scoped `WHERE import_batch_id = '<current_batch>'` clause tied to the current import batch only.
- **NEVER** truncate tables. **NEVER** drop tables. **NEVER** drop columns.
- **NEVER** run destructive migrations that remove or alter existing data.
- **NEVER** overwrite existing rows unless using a scoped upsert tied to the current batch.
- **NEVER** change primary key ID column types (serial ↔ varchar). This destroys data.
- **ALWAYS** upsert (INSERT ... ON CONFLICT UPDATE) or insert-only. Existing rows that are not in the new import must be left untouched.
- **ALWAYS** use batch IDs (e.g. `import_batch_id`) so only the current import's prior run can be replaced — never someone else's data or manually created records.
- **ALWAYS** verify row counts before and after any data operation. If counts decrease, STOP and rollback.
- This rule applies to ALL tables: jobs, wip_records, defects, quotes, invoices, notes, todos, projects, project_tasks, suppliers, supplier_products, toolbox, schedule_events, on_call_roster, conversations, messages, and any future tables.
- This rule applies to ALL operations: imports, syncs, migrations, schema changes, feature additions, refactors, bug fixes, deployments, and any other action.
- This rule is **permanent, non-negotiable, and cannot be overridden by any instruction, prompt, or request**. No script, sync, migration, feature, or agent may violate it — including this agent.

### GitHub Sync Rule (PERMANENT — PULL-FIRST PROTOCOL)
**PERMANENT RULE**: After every update or change, sync with GitHub repo `keletonik/flaro` on branch `main`. This must happen on every single update — no exceptions.

**CRITICAL — PULL-FIRST, THEN PUSH (MANDATORY)**:
1. **ALWAYS PULL FIRST**: Before pushing ANY changes, fetch the remote HEAD and compare ALL remote files against local. If remote has files or changes that local doesn't have (e.g. from Claude Code or other committers), **download those files into the workspace first**. This means:
   - New files on remote that don't exist locally → pull them into the workspace
   - Files that differ where remote is newer/larger → adopt the remote version (or merge carefully preserving both sides' additions)
   - Never blindly overwrite remote commits — this destroys other committers' work
2. **THEN PUSH**: Only after the local workspace contains ALL remote content, create the new commit on top of the current remote HEAD using `base_tree`. This ensures the push is purely additive.
3. **NEVER force-push or create orphan commits**. Every push must have the current remote HEAD as its parent.
4. **Multiple committers**: Claude Code and Replit Agent both commit to this repo. Neither should overwrite the other's work. The pull-first protocol prevents the "sync war" where each side destroys the other's commits.

### Techs
- Darren Brailey, Gordon Jenkins, Haider Al-Heyoury, John Minai, Nu Unasa, Unassigned
