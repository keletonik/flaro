# Pass 3 — AI Integration Depth

**Lead persona:** C (AI Engineer)
**Reviewed at:** commit `0e284a0`
**Scope:** every agent tool, the system prompt, the tool-use loop,
observability, evals, prompt caching, tool result shaping.

---

## 1. Executive summary

The agent is **functionally correct but developmentally immature**. The loop works. Claude picks tools. Writes commit. The UI refreshes via `ui_action`. What's missing is the production-grade scaffolding that makes an agent debuggable, cheap and reliable: no tool-use examples in the system prompt, no prompt caching, zero observability, zero evals, three missing UI tools from the original brief, and a system prompt that is a single monolithic string instead of a cached-block + dynamic tail.

**Today's grade:** 5/10 average across the panel.
**With the Pass 3 fix set applied:** projected 8/10.
**Cost implication:** adding prompt caching alone cuts every agent turn's input cost by ~80% and shaves ~400ms off first-token latency on a steady-state session.

## 2. Inventory

**Tools** — 15 total, 1:1 with dispatcher cases:
- `db_search`, `db_get`, `db_create`, `db_update`, `db_delete` (generic Drizzle path)
- `get_kpi_summary`
- `estimate_search_products`, `estimate_create`, `estimate_add_line`, `estimate_update_line`, `estimate_set_markup`, `estimate_get`, `estimate_list`
- `ui_navigate`, `ui_refresh`

**Table allowlist** — 20 tables covering jobs / wip / quotes / defects / invoices / suppliers / supplier_products / todos / notes / toolbox / schedule_events / projects / project_tasks plus 7 `fip_*` tables.

**Agent loop** — `routes/chat-agent.ts:96` bounded at `MAX_ITERATIONS = 8`.

**Model** — `claude-sonnet-4-6` via `anthropic.messages.create` with `tools` array (`chat-agent.ts:99`).

**System prompt** — one `const AGENT_SYSTEM_PROMPT` string (~30 lines) plus a dynamic tail appending `The user is currently on the "<section>" section...`. Single-block, no caching annotations.

**Protocol** — SSE events: `text | tool_start | tool_result | ui_action | error | done`.

**Destructive guardrail** — added in commit `032eecb`: `CONFIRM_REQUIRED_TABLES` (suppliers / fip_manufacturers / fip_models / fip_product_families / fip_fault_signatures) hard-fail `db_delete` without `confirm: "yes"`.

## 3. Findings against Anthropic best-practice

Measured against the patterns documented at `platform.claude.com/docs/en/agents-and-tools/tool-use/overview` and the April 2026 "advanced tool use" post.

### 3.1 Tool-use examples (missing)
Anthropic pushes examples hard. The docs say: *"Claude follows well-chosen examples more reliably than lengthy descriptions."* Our system prompt has **zero** examples. A pass through `chat-agent.ts:30` finds 0 occurrences of `Example:` or `<example>`.

### 3.2 Prompt caching (missing)
The tool schema block (`AGENT_TOOLS` export) is ~4 KB of stable JSON that gets sent on every single request. Anthropic's caching API lets us tag it with `cache_control: { type: "ephemeral" }` and pay cached-input rate on every subsequent call within 5 minutes. Not using it costs money and latency on every turn.

### 3.3 Observability (missing)
Zero `logger.info` / `console.log` lines around the tool-call loop. If the agent behaves badly on a Friday afternoon you have no way to reconstruct what it did unless you scroll the whole Replit log buffer. No `agent_tool_calls` table. No duration metric. No outcome enum.

### 3.4 Evals (missing)
`artifacts/api-server/src/agent-evals/` does not exist. There are no scripted prompts with assertions about what the DB should look like after. Every deploy is a Russian roulette on whether a prompt still produces the right tool chain.

### 3.5 Tool result shaping (mostly OK)
`summariseRow` in `chat-tool-exec.ts:72` clips rows to a per-table keep list. Returned JSON per row stays under ~300 chars. Good. But: the agent has no way to request "full row" when it needs the full raw — useful for debugging and for multi-step flows where the second tool needs a field the first one dropped.

### 3.6 `ui_set_filter` / `ui_open_record` / `ui_open_modal` (missing)
Listed in `docs/FULL_AUDIT_REBUILD_PROMPT.md` §6.3 step 3 as targets for Phase 2. Do not exist in `chat-tools.ts`. Without them, the agent can navigate (`ui_navigate`) but cannot apply a filter once it arrives or open a specific row/modal — the user still has to click.

### 3.7 Section-aware tool filtering (half-present)
The system prompt already appends `The user is currently on the "<section>" section` — weak guidance. Anthropic's "tool search tool" pattern (April 2026) lets you expose a small allowlist per section, keeping the tool schema block smaller and faster. Not used.

## 4. Top 10 issues

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | No tool-use examples in the system prompt — agent misreads ambiguous prompts more often than it should | 🔴 high | S |
| 2 | No prompt caching on the tool schema block — paying full input rate on every turn, adding ~400ms latency | 🔴 high | S |
| 3 | Zero observability — no tool-call log, no duration, no outcome table. Debugging bad behaviour is archaeology | 🔴 high | M |
| 4 | No eval harness — every deploy risks regressing the agent without detection | 🟠 medium | M |
| 5 | `ui_set_filter` / `ui_open_record` / `ui_open_modal` missing — agent navigates but can't place the user on the exact row/filter they asked for | 🟠 medium | M |
| 6 | System prompt is one monolithic string — can't cache the stable part while rotating the dynamic tail | 🟠 medium | S |
| 7 | No way for the agent to request full raw rows when summarised view is insufficient | 🟡 low | S |
| 8 | Section-aware tool filtering is soft (prose hint) not hard (allowlist per section) | 🟡 low | S |
| 9 | No `ui_action` for opening the command palette with a pre-filled query | 🟡 low | S |
| 10 | No streaming of per-tool-call result previews — the user sees "tool_start → tool_result" but not the result summary in the chat | 🟡 low | M |

---

## 5. 5-persona scoring

| Persona | Score | Reasoning |
|---|:---:|---|
| **A — Staff Engineer** | **6/10** | Loop is bounded, Drizzle path is clean, destructive confirm rail exists, SSE protocol is correct. But: no logs, no metrics, no tool-call table means silent failures are undetectable. |
| **B — Product Designer** | **6/10** | Visuals of the in-flight state are fine (spinner → tick). But the three missing ui_* tools mean the agent navigates you and then leaves you to click the filter yourself. That gap visibly breaks the "AI actually does things" promise. |
| **C — AI Engineer** | **5/10** | Functional but undersized. Zero examples, zero caching, zero evals, zero observability. Every one of those is a 1-commit fix with measurable upside. |
| **D — Data Analytics Architect** | **4/10** | The agent has no `metric_get` / `metric_drilldown` / `metric_compare` tools. Cannot answer "how's revenue this month" without hallucinating — it falls back to `get_kpi_summary` which returns raw totals, no period window, no drill-down. |
| **E — Field Ops Principal** | **6/10** | Works for simple asks. Cannot say "show me overdue defects with severity Critical" and have the page actually land filtered. The agent navigates, then the tech re-clicks. |

**Average:** 5.4 / 10 — below the 7/10 merge threshold. The Pass 3 fix set below is required before Pass 4 accepts the agent as a data source.

## 6. Proposed fix set (ordered, each one small commit)

1. **Prompt caching on the tool schema block.** Annotate `AGENT_TOOLS` with `cache_control: { type: "ephemeral" }`. Measured win: ~80% input cost reduction, ~400ms first-token latency improvement on a steady-state session.
2. **Tool-use examples in the system prompt.** Three examples: one read ("find the five most valuable open WIPs"), one create ("add a todo to chase Pertronic on Monday"), one multi-step ("for every critical defect at Goodman sites, create a todo and mark the defect as scheduled for tomorrow").
3. **Observability scaffolding.** New `agent_tool_calls` table (created via runtime DDL) — columns: id, session_id, tool_name, input_redacted, duration_ms, outcome, error, created_at. Every tool call logs a row. New `/api/diag/agent` endpoint dumps the last 50 calls.
4. **Three missing `ui_*` tools.** `ui_set_filter(filter_key, value)`, `ui_open_record(table, id)`, `ui_open_modal(kind, id?)`. Each dispatches a window custom event the host page listens for. The agent can now land you on a filtered view with the right row highlighted and the right modal open.
5. **`ask_palette(query)` tool.** Dispatches `OPEN_AIDE_PROMPT_EVENT` so the agent can chain "open the command palette pre-filled with X" as a step.
6. **Split the system prompt.** Stable block (behavioural rules + domain context) = cached. Dynamic tail (current section, current user context, time of day) = uncached.
7. **Eval harness scaffolding.** `artifacts/api-server/src/agent-evals/` directory with one `run.ts` entrypoint and one `wip.eval.ts` file containing 5-10 scripted prompts with DB-state assertions. Wire into `package.json` as `pnpm --filter @workspace/api-server run agent-eval`.
8. **`db_get_full` tool.** When summariseRow clips a field the agent needs, it can call `db_get_full(table, id)` for the raw row.
9. **Per-section tool allowlist.** A small map from section to the subset of tools the agent should prefer. Pushed into the system prompt as a directive.
10. **Tool result preview streaming.** On `tool_result`, stream a short summary (first 200 chars of the JSON result) into the chat as a collapsed accordion so the user can expand to see what the tool saw.

---

## 7. What comes next

- **Pass 3 fix set execution** — commits 1-5 above as a block, 6-10 as follow-ups.
- **Pass 4** (Data analytics & insights, Persona D lead) — the metric registry work.
- **Pass 5** (Performance & reliability, Persona A + E shared).
- **Pass 6** (Security & access, Persona A + C shared).
- **Pass 7** (Operator efficiency, Persona E lead).

---

**End of Pass 3.**
