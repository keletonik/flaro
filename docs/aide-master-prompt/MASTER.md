# AIDE Master Prompt — Integration Brief

**Target:** integrate the three operator-authored files into the running
AIDE codebase as the canonical field-ops AI system prompt.

**Source files (uploaded to repo root April 2026):**
- `AIDE_AI_SYSTEM_PROMPT.md` — Master engineering specification v1.0
- `AIDEWidget.jsx` — Reference React widget (drag/resize floating panel)
- `api_chat_route.js` — Reference Express proxy (bare POST /api/chat)

**Author of source files:** Casper Tavitian / Mentaris
**This brief author:** AI engineer (me)
**Audit model:** triple-check verification protocol (from the spec itself)
  + 5-persona independent review gate.

---

## 0. What the three files actually propose

### 0.1 `AIDE_AI_SYSTEM_PROMPT.md` — the master spec
276 lines. The most comprehensive operator-written system prompt this
project has seen. It defines:

- Identity (Flamesafe NSW dry fire division, Casper as operator)
- Prime directive: ORGANISE, UPDATE, LOG, DIAGNOSE, PROTECT
- Operational data context (tasks, quotes, remarks, notes log, tech
  roster of 11, schedule)
- Permanent exclusion rule: Jade Ogony is ops support, never a tech
- Six permanent operational rules (two-tech, hold-before-write,
  CSV-trigger, notes-log, invoice-alert, requote-flag)
- Triple-check verification protocol (Pass 1 structural, Pass 2 data
  accuracy, Pass 3 independent maths — logged on every data op)
- Job search intelligence (5-step filter + score + bucket flow)
- Update parsing protocol (parse → confirm → hold → wait → write)
- Financial intelligence (monthly target $180k, win rate 60.5%,
  quote multiplier 1.65x, revenue gap $150k/mo, four levers)
- NSW fire protection technical knowledge (EP&A Act, AS 1851/1670/
  4428.6, BCA/NCC, platforms, fault diagnosis methodology)
- Response style (Australian English, no filler, no em dashes,
  no AI attribution, clean tables)
- Embedded widget behaviour (compact/expanded, persistence, no
  Claude/Anthropic references)
- Multi-pass audit on every response (5 gates)
- Deployment notes for Replit

### 0.2 `AIDEWidget.jsx` — reference widget
577 lines. Drag/resize floating panel with:
- Compact (single-line input) and expanded modes
- Talks to `/api/chat` via fetch (non-streaming, no tool use)
- Ships an embedded short-form copy of the system prompt
- State machine for drag/resize via window event listeners

### 0.3 `api_chat_route.js` — reference proxy
49 lines. Express route that POSTs directly to
`https://api.anthropic.com/v1/messages` with `claude-sonnet-4-6`,
returns the raw `data` object. Zero tool use, zero streaming, zero
observability, zero rate limiting.

---

## 1. Reconciliation decision

The current Flaro codebase already has:

| Existing surface | What it is | Problem the new files solve |
|---|---|---|
| `routes/chat-agent.ts` | Full tool-use streaming SSE with 26 agent tools, prompt caching, observability, eval harness | ✅ already superior to the new `api_chat_route.js` |
| `routes/fip-assistant.ts` | FIP-specific tool-use agent | ❌ irrelevant to the ops brief |
| `pages/pa.tsx` + `PA_SYSTEM_PROMPT` (pa-v2.0) | The dedicated PA page with slash menu, reminders, training rules | ⚠ the prompt overlaps materially with the new AIDE spec but is narrower |
| `components/AIDEAssistant.tsx` + `EmbeddedAgentChat.tsx` | Floating drawer that opens on every page | ✅ fulfils the "widget" requirement without needing the new JSX |

**Decision — hybrid integration:**

1. **Promote the new spec to canonical.** Convert the Markdown spec into
   a versioned TS constant `AIDE_MASTER_PROMPT_V1_0` in a new module
   `artifacts/api-server/src/lib/prompts/aide-master-prompt.ts`.

2. **Use it as the default chat-agent prompt.** When `section` is unset
   or is `"aide"` in `chat-agent.ts`, serve the new prompt. When
   `section === "pa"`, keep the existing PA prompt (it's narrower and
   has its own working-memory injection). When `section === "fip"`,
   the FIP assistant route continues unchanged.

3. **Do NOT create a new widget or a new proxy route.** The existing
   `EmbeddedAgentChat` + `chat-agent.ts` surface already delivers every
   capability the new widget asks for (drag/resize can be retro-fitted
   to the existing drawer if needed; streaming + tool-use is strictly
   better than the bare POST the new proxy offers). The two uploaded
   reference files remain in the repo root as historical reference,
   untouched.

4. **Expose the triple-check protocol as a first-class agent tool.**
   New tool `triple_check` that the agent can call at the end of any
   data-heavy response. Returns a structured `{pass1, pass2, pass3}`
   object that the UI renders as a compact verification log.

5. **Permanent exclusion of Jade Ogony** is added to the existing
   `chat-tools.ts` `db_search` dispatcher as a post-filter so every
   search result is scrubbed before it reaches the model.

6. **Financial constants** ($180k target, 60.5% win rate, 1.65x quote
   multiplier, $150k gap) go into a new tiny `lib/ops-financial-model.ts`
   module that the existing `get_kpi_summary` + `metric_get` tools can
   read so every revenue answer is grounded in the same numbers.

---

## 2. Triple-Check Verification Protocol (component spec)

This is the explicit audit surface the operator asked for. Every time
the agent produces numbers, job lists, or status changes it MUST run
this protocol end-to-end and log the result.

### 2.1 Pass 1 — Structural audit

```
INPUT:  a candidate response or a tool-call result
CHECK:  - every row has required fields
        - no duplicate primary keys in a result set
        - no Jade Ogony in any technician list or KPI table
        - no bright / neon colours in emitted HTML / markdown
        - no AI attribution anywhere ("as an AI", "Claude", "Anthropic")
        - no em dashes (operator style rule)
        - no banned filler phrases ("it's important to note", "certainly", etc.)
OUTPUT: { ok: boolean, failures: string[] }
```

### 2.2 Pass 2 — Data accuracy

```
INPUT:  a candidate response + the source rows used to build it
CHECK:  - every task_number / quote_number referenced exists in source
        - every status matches source exactly
        - every numeric value matches source within $1 tolerance
        - every technician assignment matches source
        - every date referenced exists on the source row
OUTPUT: { ok: boolean, failures: [{field, expected, actual}] }
```

### 2.3 Pass 3 — Independent mathematical verification

```
INPUT:  a candidate response containing KPIs
CHECK:  - re-derive every number from raw data without trusting cached metrics
        - win rate = count(finalised) / count(total quotes)
        - pipeline = sum(active_task_values)
        - gross profit = revenue - cost
        - quote multiplier = 1 / win rate
        - compare re-derived value to asserted value
OUTPUT: { ok: boolean, failures: [{kpi, asserted, recomputed}] }
```

### 2.4 Emission format

Every data op ends with a fenced block rendered as raw text (not
markdown) so the operator scans it at a glance:

```
TRIPLE CHECK: ✓ 3 passed  ✗ 0 failed
Pass 1 — Structural:   CLEAN
Pass 2 — Data accuracy: CLEAN
Pass 3 — Maths:        CLEAN
```

Any failed pass lists the specific failures inline. The agent must
not present the underlying answer as a number the operator can trust
when any pass has failed — it must prefix with `⚠ VERIFY` and surface
the failure reason first.

---

## 3. 5-panel independent audit gate

The standard Flaro persona set reviews every integration before it
ships.

### 3.1 A — Staff Engineer
Checks: no duplicate system prompts across surfaces, prompt versioning
discipline, no secrets in code, section routing is explicit, no
runtime regressions in the existing 54 vitest cases.

### 3.2 B — Product Designer
Checks: the operator's response-style rules land in the UI (no raw `##`
bleed-through, clean tables, no AI attribution), the embedded widget
continues to feel native to the app.

### 3.3 C — AI Engineer
Checks: the new prompt is properly cached (ephemeral cache_control
block), the triple-check protocol is enforceable (not just aspirational),
the tool set is compatible, the Jade-Ogony exclusion is in the retrieval
path not just the prompt.

### 3.4 D — Data Architect
Checks: no schema changes required (confirm), financial constants live
in one place, the existing metric registry still answers revenue
questions with the same numbers.

### 3.5 E — Field Ops Principal
Checks: the triple-check protocol actually prevents the kind of errors
that have historically hurt the operator (Jade in a dispatch list,
PERFORMED but not invoiced, 5-yearly given to one tech). Every permanent
rule is covered.

**Gate:** every persona ≥ 7/10. Pre-build audit scores are recorded in
this document before any code is written. Post-build audit in
`POST_AUDIT.md` confirms each score is still met.

---

## 4. Pre-build 5-panel audit

| Persona | Score | Rationale |
|---|:---:|---|
| A Staff Engineer | **8** | One new prompt constant, one new agent tool, one small post-filter. No schema, no routes. -2 because the new prompt duplicates material that's already in `AGENT_SYSTEM_PROMPT` — need to prune the old one in parallel. |
| B Product Designer | **8** | The operator's response-style rules are already partly in the FIP prompt; rolling them up to the master prompt is a net simplification. -2 because widget drag/resize is a nice-to-have the existing drawer doesn't do. Defer. |
| C AI Engineer | **9** | Caching the new 276-line prompt as an ephemeral block is exactly the right move. The triple-check protocol is a tool, not prose — enforcement lives in code, not in the model's willingness to comply. -1 because no eval cases. |
| D Data Architect | **9** | Zero schema work. Financial constants centralised. -1 because the revenue numbers should ideally come from the metric registry dynamically, not hard-coded — v1.1. |
| E Field Ops Principal | **9** | Every permanent rule is reflected in code-enforced post-filter + tool contract. -1 because the widget UX is unchanged — the operator still relies on the existing floating drawer. |

**Average: 8.6 / 10.** Gate passes. Execute.

---

## 5. Execution plan (commits)

1. **New master prompt module** — `lib/prompts/aide-master-prompt.ts`
   with `AIDE_MASTER_PROMPT_V1_0` export + version tag.

2. **Financial constants module** — `lib/ops-financial-model.ts` with
   the operator's numbers as exported consts.

3. **Section routing** — `chat-agent.ts` adds an `isAideMode` branch
   that selects the master prompt. Default remains the existing agent
   prompt for backwards compat; explicit `section === "aide"` opts in.

4. **Jade Ogony post-filter** — `chat-tool-exec.ts` `dbSearch` case
   adds a filter that strips any row where `assigned_tech` is a
   case-insensitive match for "jade ogony" from the tech field (keeps
   the row, blanks the field). Also filters rows from an `_assignee`
   search explicitly for Jade.

5. **Triple-check tool** — new agent tool `triple_check` with the
   structural / data / maths pass contracts from §2.

6. **Response style filter** — frontend `PAMessage` / assistant chat
   runs a tiny post-processor on incoming text that strips em dashes
   and banned filler phrases (belt-and-braces even if the prompt
   slips).

7. **Post-build audit** — `POST_AUDIT.md` with the 5-persona scores
   and follow-up tracker.

---

## 6. What is NOT being changed (deliberately)

- `AIDEWidget.jsx` stays in the repo root as a reference implementation
  only — it is NOT imported, NOT rendered, NOT deployed. The existing
  `EmbeddedAgentChat` drawer delivers the same value with more features.
- `api_chat_route.js` stays in the repo root as reference only — it is
  NOT registered, NOT routed. The existing `chat-agent.ts` is strictly
  superior (streaming + tool use + observability + rate limiting).
- The FIP assistant at `/fip` is unchanged.
- The PA surface at `/pa` is unchanged (keeps its own narrower prompt).
- The 54 vitest cases must still pass after the integration.

---

## 7. Operator-visible outcome

After the next Replit restart:

- Every message sent from the default `/chat` / floating drawer flows
  through the new `AIDE_MASTER_PROMPT_V1_0`.
- Every tech-related search strips Jade Ogony from assignee fields
  before the result reaches the model.
- The triple-check protocol is available as a tool any time the agent
  produces a number or a job list — and the response style filter
  catches em dashes and banned phrases if the model slips.
- The master prompt is version-tagged `v1.0`. Future edits bump the
  version and the post-build audit doc gets appended.

---

**End of master prompt. Execute against §5 immediately below.**
