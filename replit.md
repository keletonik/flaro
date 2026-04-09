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

**AIDE v1.0** — Premium personal operations assistant for Casper Tavitian (FlameSafe Fire Protection, NSW). Dark theme by default (Claude-inspired), toggle persisted in localStorage.

### Artifacts
- `artifacts/aide` — React + Vite frontend (port from `$PORT`)
- `artifacts/api-server` — Express API server (port 8080)

### Frontend Pages
- `/` — Dashboard: greeting, metric widgets (critical/high/open/done), AI-generated focus, open jobs list, notes sidebar widget, on-call roster
- `/chat` — Clean chat UI with Claude (claude-sonnet-4-6) via SSE streaming; typing indicator, copy-to-clipboard, suggestion chips
- `/schedule` — NEW: full week calendar grid (7am–6pm); jobs from DB shown by due date (colour-coded by priority); add standalone events with title/time/location/colour picker
- `/jobs` — List + Kanban board toggle (Monday.com-style); status filter tabs; search; full CRUD modal
- `/jobs/:id` — Job detail with inline status/tech editing, contact call/email links
- `/notes` — Notion-style: list/grid toggle, category tabs with counts, expandable cards, mark done, search
- `/todos` — To-do checklist with quick-add, priority/category badges, inline edit, filter tabs (All/Active/Done)
- `/projects` — Monday.com-style project organiser: project cards with colour bars, status/priority badges, progress bars; expand to see tasks in list or Kanban board view; full CRUD for projects and tasks
- `/toolbox` — Toolbox briefing notes with TB-XXX refs, mark briefed, export/copy to clipboard

### Design System
- **Themes**: Light (default) + Dark mode via `.dark` class on `<html>`; toggled by button in sidebar, persisted in `localStorage["aide-theme"]`
- **Theme provider**: `src/lib/theme.tsx` → `ThemeProvider` + `useTheme()` hook
- **Light bg**: `hsl(220 14% 96%)` · card: `white` · primary purple: `hsl(267 84% 57%)`
- **Dark bg**: `hsl(222 47% 8%)` · card: `hsl(222 35% 11%)`
- Priority CSS classes: `priority-critical/high/medium/low` (left border), badge classes: `badge-critical/high/medium/low`
- Status badge classes: `badge-open/inprogress/booked/blocked/waiting/done`
- Desktop: sidebar nav (224px). Mobile: bottom tab bar (5 items)
- Animations: `card-appear`, `typing-dot`, `pulse-dot`, `pulse-ring`, `skeleton-pulse`, `slide-up`, `fade-in`

### API Routes
- `GET /api/dashboard/summary` — job counts (critical/high/open/doneToday)
- `GET /api/dashboard/focus` — AI-generated focus bullet points
- `GET/POST /api/jobs` — list/create jobs
- `GET/PUT/DELETE /api/jobs/:id` — job CRUD
- `GET/POST /api/notes` — list/create notes
- `GET/PUT/DELETE /api/notes/:id` — note CRUD
- `GET/POST /api/todos` — list/create todos
- `PATCH/DELETE /api/todos/:id` — update/delete todo
- `GET/POST /api/projects` — list/create projects
- `PATCH/DELETE /api/projects/:id` — update/delete project
- `GET/POST /api/projects/:projectId/tasks` — list/create project tasks
- `PATCH/DELETE /api/projects/:projectId/tasks/:taskId` — update/delete task (scoped to project)
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
- `todos` — id (UUID), text, completed, priority, category, due_date
- `projects` — id (UUID), name, description, status, priority, colour, due_date
- `project_tasks` — id (UUID), project_id (FK→projects), title, description, status, priority, assignee, due_date, position
- `conversations` — id (serial), title
- `messages` — id (serial), conversation_id, role, content
