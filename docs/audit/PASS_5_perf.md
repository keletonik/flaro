# Pass 5 — Performance & Reliability

**Lead personas:** A (Staff Engineer) + E (Field Ops Principal), shared lead
**Reviewed at:** commit `702e4bc`
**Scope:** query shapes, bundle size, SSE resilience, connection
pool health, error boundaries, retries, timeouts, unbounded list
fetches, N+1 joins, render cost on slow networks.

---

## 1. Executive summary

The site is fast enough on a small dev database and will get
painful long before the business outgrows it. There are **127
`db.select().from(…)` calls across 23 route files** and only **6**
of them use `.limit()`. Every list endpoint returns the entire
table, every time, with no pagination. On a 10k-row wip_records
table that's a 3-5 second page load on a warm connection and an
outright timeout on a cold one.

The Postgres pool is created with **no max size, no idle timeout,
no statement timeout** — `new Pool({ connectionString })` at
`lib/db/src/index.ts:13`. Under load Express will open connections
until Postgres refuses; under idle, connections linger until
Postgres closes them mid-query and every route returns 500 for a
minute until the pool self-heals.

SSE endpoints have partial resilience (Replit's stream idle
timeout is well-documented to the point of being a running joke
throughout the audit), but there is no heartbeat on `/api/chat`
or `/api/diag`, no client-side reconnect logic, and no server-side
cap on open connections.

The frontend bundle has 17 lazy-loaded routes (good) but the
analytics page alone imports the entire `recharts` barrel for
**455KB / 120KB gz** on first paint. Every page ships the full
lucide-react icon set via `import { X, Y } from "lucide-react"`
which tree-shakes poorly against Vite 7's prod profile.

**Today's grade:** 5.1/10.
**With the Pass 5 fix set applied** (pool config + pagination +
heartbeat + chart code-split + error boundary): projected 7.8/10.

## 2. Inventory

### 2.1 Query shape
- 127 `db.select().from(…)` across 23 route files
- 6 of those use `.limit()`
- ~20 use `.where(...)` but return full result sets after filter
- Joins are all done in-memory in JS after two separate SELECTs (the `countBy` helper in `routes/kpi.ts` is the clearest example: 6 full table scans and an in-memory rollup)

### 2.2 Indexes
- 127 `index(...)` declarations across 18 schema files
- Present where obvious (status, client, created_at on most fact tables)
- Missing on fkey-ish text columns that are used for joins: `wip_records.task_number`, `invoices.task_number`, `quotes.task_number` (the provisional margin metric's JOIN on `task_number` will table-scan both sides)

### 2.3 Connection pool
- `lib/db/src/index.ts:13` — `new Pool({ connectionString: process.env.DATABASE_URL })` — zero tuning
- Default pg pool: max=10, idleTimeoutMillis=10000, no statement_timeout
- No `application_name` — can't identify the api-server in pg_stat_activity

### 2.4 Streaming surfaces
- `/api/chat/stream` — SSE, no heartbeat
- `/api/chat-agent/stream` — SSE, no heartbeat
- `/api/diag` — not streaming; plain JSON
- Client reconnect: none. When the stream drops, the chat shows "Stream idle timeout" and the user retries manually.

### 2.5 Frontend bundle
- 17 lazy routes in `artifacts/aide/src/App.tsx` (good)
- `analytics.tsx` imports `recharts` via bare `"recharts"` — ships the whole library
- Every page imports individual lucide icons as named imports (`import { X } from "lucide-react"`) — Vite 7 tree-shakes these reasonably well but the fallback barrel still loads when the bundle is large
- No service worker / no HTTP cache headers on index.html

### 2.6 Error handling
- Express global error handler exists (drops to 500 JSON)
- No React error boundary — any render error blanks the whole app
- No retry wrapper on `apiFetch` — one transient 502 surfaces as a hard failure

### 2.7 Observability
- `agent_tool_calls` table exists (Pass 3 fix) — agent-side only
- No request log middleware on the api-server beyond Express's default
- No slow-query log, no p95 tracking anywhere
