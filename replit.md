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

## AIDE App

**AIDE v1.0** — Premium dark-themed personal operations assistant for Casper Tavitian (FlameSafe Fire Protection, NSW).

### Artifacts
- `artifacts/aide` — React + Vite frontend (port from `$PORT`)
- `artifacts/api-server` — Express API server (port 8080)

### Frontend Pages
- `/` — Dashboard: greeting, summary strip (critical/high/open/done), AI-generated focus points, open jobs, recent notes, on-call roster
- `/chat` — Chat with Claude (claude-sonnet-4-6) via SSE streaming; quick actions (Triage Email, Log Job, Drop Note, PA Check); rich card rendering for [EMAIL_TRIAGE], [NEW_JOB], [NEW_NOTE], [PA_CHECK], [ACTIONS] tags
- `/jobs` — Jobs list with status/priority filters, search, full CRUD
- `/jobs/:id` — Job detail with inline status/tech editing, contact call/email links
- `/notes` — Notes with categories (Urgent/To Do/To Ask/Schedule/Done), expand/collapse, mark done
- `/toolbox` — Toolbox briefing notes with TB-XXX refs, mark briefed, export to clipboard

### Design System
- Dark only: background `#0F0F13`, cards `#1A1A24`, border `#2E2E45`
- Primary purple: `#7C3AED` / `#A855F7`
- Priority border colors: Critical=red (#EF4444), High=amber (#F59E0B), Medium=blue (#3B82F6), Low=gray
- Desktop: sidebar nav (240px). Mobile: bottom tab bar
- Animations: card-appear, typing-dot, pulse-glow, skeleton-pulse

### API Routes
- `GET /api/dashboard/summary` — job counts (critical/high/open/doneToday)
- `GET /api/dashboard/focus` — AI-generated focus bullet points
- `GET/POST /api/jobs` — list/create jobs
- `GET/PUT/DELETE /api/jobs/:id` — job CRUD
- `GET/POST /api/notes` — list/create notes
- `GET/PUT/DELETE /api/notes/:id` — note CRUD
- `GET/POST /api/toolbox` — toolbox notes list/create
- `PUT/DELETE /api/toolbox/:id` — toolbox note CRUD
- `GET /api/anthropic/conversations/:id` — get conversation with messages
- `POST /api/anthropic/conversations/:id/messages` — SSE streaming chat
- `DELETE /api/anthropic/conversations/:id` — clear chat

### AI
- Model: `claude-sonnet-4-6` via `@workspace/integrations-anthropic-ai`
- Chat uses SSE streaming (fetch + ReadableStream, not generated hook)
- Rich system prompt for Casper/FlameSafe business context
- Conversation ID=1 is the default AIDE conversation

### Techs
- Darren Brailey, Gordon Jenkins, Haider Al-Heyoury, John Minai, Nu Unasa, Unassigned

### DB Tables
- `jobs` — id (UUID), task_number, site, address, client, contact_name/number/email, action_required, priority, status, assigned_tech, due_date, notes, uptick_notes
- `notes` — id (UUID), text, category, owner, status
- `toolbox` — id (UUID), text, ref (TB-XXX), status
- `conversations` — id (serial), title
- `messages` — id (serial), conversation_id, role, content
