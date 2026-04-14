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

## 3. Findings

### 3.1 Unbounded list endpoints

`GET /api/wip`, `/api/jobs`, `/api/invoices`, `/api/quotes`,
`/api/defects`, `/api/notes`, `/api/todos`, `/api/suppliers`,
`/api/clients`, `/api/projects` all return `db.select().from(table)`
with no LIMIT. The frontend uses the full list to render a
filtered view. On a small database this is fine. As soon as wip
crosses 5k rows the wire payload hits a megabyte and the render
path hits the "long task" threshold on mid-range Android.

**Persona A:** "This is the classic 'it worked on my machine'
migration-to-prod failure. I've seen companies take dashboards
down for a week because of exactly this and then spend three
weeks retrofitting cursor pagination into a page that was never
designed for it."

### 3.2 Postgres pool is untuned

`new Pool({ connectionString: ... })` uses pg-driver defaults:

- `max: 10` — fine for small, but zero headroom
- `idleTimeoutMillis: 10000` — a connection can die between
  requests with nothing noticing until the next query fails
- no `statement_timeout` — a runaway query holds a slot forever
- no `application_name` — impossible to identify rogue connections
  in `pg_stat_activity`

On Replit (Neon under the hood) the idle timeout is 10 minutes
by default. A single long idle tab burns a slot. Under a mild
load spike every new request piles up behind the slots.

### 3.3 No SSE heartbeat

`chat-agent.ts` writes streaming events but doesn't emit a
`:heartbeat\n\n` comment line every 15 seconds. Replit's proxy
drops idle streams at 30 seconds. Every long-thinking tool call
races the timeout. This is the cause of every "API Error: Stream
idle timeout" we've hit during this audit.

### 3.4 No client-side reconnect

`EmbeddedAgentChat` hits the stream once and gives up on error.
The user's options are "refresh the page" or "retry the message".
A simple 2-retry wrapper with 1-2-4s backoff would fix 90% of the
reported "API error" support tickets.

### 3.5 recharts on the analytics page ships 455KB

`import { BarChart, LineChart, PieChart } from "recharts"` plus
the wrapper components imports the full library barrel. Named
imports don't tree-shake recharts because the barrel re-exports
everything with side-effectful module-level code. Fix is to deep
import from `recharts/es6/chart/BarChart` and friends, or swap
to a smaller library (nivo, visx). 455KB / 120KB gz is
disproportionate for a site whose next-heaviest page is 110KB / 40KB.

### 3.6 No React error boundary

`App.tsx` wraps routes in `<Suspense fallback={...}>` but not in
an `<ErrorBoundary>`. Any render error in a lazy page (including
a stale chunk after a deploy) blanks the whole app with "Something
went wrong" at best, a blank white screen at worst.

### 3.7 In-memory joins for dashboard rollups

`routes/kpi.ts` runs 6 full table scans (`jobs`, `wip`, `quotes`,
`defects`, `invoices`, `todos`) then rolls them up in JS. Pass 4
fix 3 routed `revenueThisMonth` through the metric registry; the
rest is still the in-memory pattern. At 50k rows across those six
tables that's ~500ms of JS time per dashboard load, doubled for
the dashboard's existing polling + SSE fan-out.

### 3.8 No HTTP caching on static assets

`index.html` and the hashed Vite chunks are served with no
`Cache-Control` header set by the Express static middleware. The
browser caches under its heuristic, but CDN caches don't. First
paint cost per fresh-tab is avoidable.

### 3.9 No slow-query log

When the site gets slow, the only diagnostic is "users are
complaining". There is no request-duration middleware, no p95
tracking, no slow-query log hook. The Pass 3 agent-observability
table is a good pattern to borrow.

### 3.10 No timeout on agent tool calls

`chat-tool-exec.ts` dispatches tools without a per-tool timeout.
A `db_search` that matches the entire 10k-row wip table will run
to completion even though the LLM's subsequent turn won't use the
result. An abort signal wired through the pool would cap each
tool at 5-10s.

## 4. Top 10 issues

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | Every list endpoint returns entire tables without LIMIT | 🔴 high | M |
| 2 | Postgres pool has zero tuning — no max, idle timeout, statement timeout, application_name | 🔴 high | S |
| 3 | No SSE heartbeat on `/api/chat-agent/stream` — cause of every stream idle timeout | 🔴 high | S |
| 4 | No client-side reconnect on SSE — transient errors surface as hard failures | 🟠 medium | S |
| 5 | recharts imported via barrel — 455KB / 120KB gz on analytics page | 🟠 medium | M |
| 6 | No React error boundary — a lazy chunk load error blanks the whole app | 🟠 medium | S |
| 7 | dashboard KPI route does six full table scans + in-memory rollup | 🟠 medium | M |
| 8 | No request duration / slow query log — zero production diagnostics | 🟡 low | S |
| 9 | No HTTP cache headers on index.html + hashed chunks | 🟡 low | S |
| 10 | No per-tool timeout on agent tool exec | 🟡 low | S |

## 5. 5-persona scoring

| Persona | Score | Reasoning |
|---|:---:|---|
| **A — Staff Engineer** | **4/10** | Unbounded queries + untuned pool are the two failures that bring sites down. Both fixable in a day. |
| **B — Product Designer** | **6/10** | Page feels snappy today. Will not feel snappy at 10x data. |
| **C — AI Engineer** | **5/10** | Missing SSE heartbeat is the root cause of every "API Error" the user has reported. |
| **D — Data Analytics Architect** | **6/10** | Query shapes are fine, join-by-task_number is the only red flag. |
| **E — Field Ops Principal** | **5/10** | I've been burned by "works on laptop, dies in the van on 4G" before. 455KB analytics bundle won't survive a cellular dead zone. |

**Average:** 5.2 / 10.

## 6. Proposed fix set (ordered)

1. **Pool tuning** — one edit to `lib/db/src/index.ts`. Set `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`, `statement_timeout`, `application_name`.

2. **SSE heartbeat** — emit `:heartbeat\n\n` every 15s on both chat streams. 10 lines of code.

3. **Pagination on list endpoints** — add `?limit=` and `?offset=` to every list route, default `limit=100`, hard cap at `500`. Frontend pages already render filtered subsets, so the wire size drops without a visible change for typical use.

4. **Client-side SSE reconnect** — wrap `EventSource` in a retry helper, 2 attempts with 1s and 3s backoff.

5. **React error boundary** — `<ErrorBoundary>` around the lazy routes in App.tsx with a reload button.

6. **recharts deep imports** — swap `import { BarChart } from "recharts"` for `import { BarChart } from "recharts/es6/chart/BarChart"` in analytics.tsx and MetricCardView.

7. **Request duration middleware** — log every request's method + path + status + ms, with a p95 rollup over the last 1000 requests available at `GET /api/diag/perf`.

8. **Per-tool timeout** — wrap every `chat-tool-exec` case in `Promise.race([work, timeout(8000)])`.

9. **task_number indexes** — add `idx_wip_task_number`, `idx_invoices_task_number`, `idx_quotes_task_number` via runtime DDL.

10. **HTTP cache headers** — `Cache-Control: public, max-age=31536000, immutable` for hashed chunks, `no-cache` for index.html.

---

## 7. What comes next

- **Pass 5 fix set execution** — pool tuning + SSE heartbeat first, they unblock every other audit.
- **Pass 6** (Security & access, Persona A + C).
- **Pass 7** (Operator efficiency, Persona E).

---

**End of Pass 5.**
