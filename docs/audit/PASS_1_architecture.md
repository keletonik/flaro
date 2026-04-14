# Pass 1 — Architecture & Data Model

**Lead persona:** A (Staff Engineer)
**Reviewed at:** commit `e196798`
**Scope:** Every Drizzle schema file, every runtime DDL file, the committed migration SQL, the agent tool registry, every place totals are computed, every foreign-key relationship.

---

## 1. Executive summary

The data model is **functionally correct but architecturally drifted**. Three separate systems each create tables and nobody owns the source of truth:

1. **Drizzle schemas** (`lib/db/src/schema/*.ts`) — 52 tables declared
2. **Committed migration SQL** (`lib/db/drizzle/0000_free_cardiac.sql`) — 30 tables created
3. **Runtime DDL** (`seed-fip-ddl.ts`, `seed-estimation-ddl.ts`) — 24 tables created on startup (22 FIP + 2 estimate)

That's **52 ≠ 30 ≠ 24**. The missing 22 FIP tables exist in the Drizzle schema AND in runtime DDL but NOT in the committed migration. The two estimate tables exist ONLY in runtime DDL — not in Drizzle at all. On a fresh DB, runtime DDL bridges the gap, so it works in practice; on a DB pushed via `drizzle-kit push` against the schema directly, the estimate tables wouldn't exist, and on a DB migrated strictly from the committed `0000_free_cardiac.sql`, neither FIP nor estimates would exist.

There are also duplicate artefacts (`0000_free_cardiac.sql` + `0000_curvy_gamora.sql` both numbered `0000_`, but the journal only knows about the first one — the second is phantom code), a money column that stores the same number twice (`invoices.amount` + `invoices.totalAmount`), server-side totals logic duplicated in two files, and half the foreign keys are implicit text columns with no DB-level constraint.

None of this is causing an outage. All of it is a 3am-pager wait-state.

---

## 2. Schema inventory

| Source | Table count |
|---|---:|
| Drizzle schema (`lib/db/src/schema/*.ts`) | 52 |
| Committed migration SQL (`0000_free_cardiac.sql`) | 30 |
| Runtime DDL (`seed-fip-ddl.ts`) | 22 |
| Runtime DDL (`seed-estimation-ddl.ts`) | 2 |

### 2.1 Tables in Drizzle but NOT in committed migration

All 22 FIP tables:
```
fip_audit_runs, fip_compatibility_links, fip_components, fip_document_sections,
fip_document_versions, fip_documents, fip_escalation_packs, fip_fault_signatures,
fip_image_identification_results, fip_labour_templates, fip_manufacturers, fip_models,
fip_part_cost_history, fip_product_families, fip_repair_estimates, fip_session_images,
fip_source_locations, fip_standard_clauses, fip_standard_cross_references, fip_standards,
fip_supplier_products, fip_troubleshooting_sessions
```

These tables are declared in `lib/db/src/schema/fip.ts` but never reached `lib/db/drizzle/0000_free_cardiac.sql`. They only exist at runtime because `seed-fip.ts` runs the `CREATE TABLE IF NOT EXISTS` statements from `seed-fip-ddl.ts` on boot.

### 2.2 Tables in runtime DDL but NOT in Drizzle at all

```
estimates
estimate_lines
```

These live **only** in `seed-estimation-ddl.ts`. They have no Drizzle schema file, which means:
- `db.select().from(estimates)` doesn't type-check
- The estimate routes (`routes/estimates.ts`) and agent tools (`lib/chat-tool-exec.ts` estimate* helpers) use raw `pool.query(...)` — a second query style in the codebase.
- Anyone adding a column has to remember to update the DDL **and** the raw SQL in at least 8 callsites.

### 2.3 Phantom migration file

```
lib/db/drizzle/0000_free_cardiac.sql   — listed in meta/_journal.json, known good
lib/db/drizzle/0000_curvy_gamora.sql   — NOT in journal, dead code
```

`_journal.json` lists only `0000_free_cardiac` with `idx: 0`. The second SQL file `0000_curvy_gamora.sql` is not referenced. `drizzle-kit migrate` ignores it. It is pure confusion waiting to trip someone up on the next `generate`.

---

## 3. Money / numeric columns

Every money column uses `numeric(p, 2)` with varying precision (12 or 14). Consistent, sensible. No floats. Grade: **8/10**.

Concerns:
- **`invoices` stores the same number twice**: `amount numeric(12,2)` + `total_amount numeric(12,2)`. Code reads `totalAmount ?? amount` in at least four places. Whichever field the importer fills becomes canonical; there's no invariant keeping them in sync.
- **`estimates.quantity` is `numeric(12,3)`** — supports fractional hours/metres/linear quantities, good.
- **`markup_pct` is `numeric(6,2)`** — supports up to 9999.99% — not harmful but oddly wide.

---

## 4. Totals computation — single source of truth

`recomputeEstimateTotals` is duplicated in TWO files:

```
artifacts/api-server/src/routes/estimates.ts:63-83
artifacts/api-server/src/lib/chat-tool-exec.ts:298-321
```

Both query `SUM(line_cost) / SUM(line_sell) / SUM(line_margin)` from `estimate_lines WHERE deleted_at IS NULL`, both multiply `subtotal_sell * (gst_rate / 100)` for `gst_total`, both UPDATE the same estimate row. Currently identical logic, but the identity isn't enforced — the next person to change one will forget the other, and the numbers will diverge.

**Fix:** extract to a single `lib/estimate-totals.ts` module and import from both callsites.

---

## 5. Foreign-key consistency

| Pattern | Count |
|---|---:|
| `text("x_id").references(() => y.id, { onDelete: ... })` | 9 |
| `text("x_id")` with no `references()` | 17+ |

Explicit FKs exist for: `project_tasks.projectId`, `supplier_products.supplierId`, `messages.conversationId`, `jobs.clientId`, and the four `pm_*` tables.

Implicit FKs (text column, no constraint) exist for: every `import_batch_id`, every FIP `manufacturer_id` / `family_id` / `model_id`, `sessions.userId`, `uptick_facts.importId`, `uptick_facts.rawRowId`, `pm_items.parentId`, `pm_activity.userId`, `pm_activity.itemId`.

**Impact:** no referential integrity for FIP at the DB level. The agent can insert a `fip_documents` row with a `model_id` that points nowhere. The row silently exists, drill-downs return nothing, and the app carries on. Same story for the FIP seed itself.

**Fix:** add `references()` with `onDelete: "set null"` to every `_id` column whose target table exists, OR document the exceptions in a top-of-file comment per schema file.

---

## 6. Agent write surface

Agent tool allowlist (`lib/chat-tools.ts` `TABLE_ALLOWLIST`) covers 20 tables:

```
jobs, wip_records, quotes, defects, invoices, suppliers, supplier_products,
todos, notes, toolbox, schedule_events, projects, project_tasks,
fip_manufacturers, fip_product_families, fip_models, fip_documents,
fip_standards, fip_fault_signatures, fip_troubleshooting_sessions
```

Generic `db_create` / `db_update` / `db_delete` can write to every one of these. **No per-table policy.** The agent could, for example, delete a supplier and leave its `supplier_products` orphaned (the cascade exists in the schema, so this one specific case is safe — but there is no general invariant).

Concerns:
- **`suppliers`** — dropping a supplier cascades to `supplier_products` (via `references({ onDelete: "cascade" })`). On a bad prompt, the agent could wipe an entire supplier catalogue. Needs an explicit "confirm before destructive" guardrail in the agent system prompt that mentions this table.
- **`fip_fault_signatures`** — the knowledge base is the high-value asset. The agent shouldn't be able to delete entries without confirmation.
- **`estimates` / `estimate_lines`** — NOT in the generic allowlist; they're covered by the dedicated `estimate_*` tools, which is cleaner. Good.
- **`users`, `sessions`** — not in the allowlist. Good.

**Missing safety rail:** `db_delete` has no per-table confirm prompt. The system prompt says "confirm destructive deletes first unless the target is a todo or a note". This is soft guidance, not a hard rail. A determined prompt could get through it.

---

## 7. What the agent can read vs what's useful

Tables in the allowlist that drive agent answers today: ~10 are heavily used (`wip_records`, `defects`, `quotes`, `jobs`, `todos`, `supplier_products`, `fip_*`). Tables in the allowlist that are rarely-if-ever queried: `toolbox`, `schedule_events`, `projects`, `project_tasks`, `fip_troubleshooting_sessions`.

**Missing from allowlist that an operator would ask for:**
- `invoices` (in allowlist ✓ but I see no agent tool using it end-to-end)
- `on_call_roster` (rostering — NOT in allowlist)
- `chat_history` (agent memory across sessions — NOT in allowlist)
- `pm_*` boards — can the agent create a card on the PM board? No.

---

## 8. Where the database and the UI disagree on shape

### 8.1 `invoices.amount` vs `totalAmount`
Drizzle declares both. Route handlers read `totalAmount ?? amount`. Frontend charts read `totalAmount`. Seed data fills `amount`. Net effect: the charts work but the underlying model is ambiguous about which field is canonical.

### 8.2 `wip_records.importBatchId`
Present in Drizzle + migration + runtime inserts. Indexed. No `import_batches` table exists to join against — it's a label, not a FK. Comments imply there used to be one. Treat as a free-text label and document it.

### 8.3 `pm_*` tables
`pm_boards`, `pm_columns`, `pm_groups`, `pm_items`, `pm_views`, `pm_activity` — 6 tables declared, all in migration, all indexed — but `pages/pm.tsx` and `pages/pm-board.tsx` use them lightly. Several columns (`pm_items.parent_id` for subitems, `pm_activity.item_id`) have no UI surface at all.

### 8.4 `uptick_facts` / `uptick_imports` / `uptick_raw_rows`
Full dimensional import model with money columns (`revenue`, `cost`, `labour_cost`, `material_cost`, `other_cost`, `hours`, `markup`). **Gated behind `UPTICK_IMPORTS_ENABLED=1` which is off by default.** Routes exist (`routes/uptick.ts`) but the frontend doesn't use them. The infrastructure for rich Uptick CSV analytics is built but entirely dark.

---

## 9. Top 10 issues ranked by 3am-pager probability

| # | Issue | Severity | Fix effort |
|---|---|---|---|
| 1 | `estimates` + `estimate_lines` live only in runtime DDL — no Drizzle schema, no type safety on the hottest new surface in the app | 🔴 high | M: 1 new schema file + import wiring |
| 2 | Two files named `0000_*` in drizzle/ but the journal only knows one — `0000_curvy_gamora.sql` is phantom code | 🔴 high | S: delete or rename + update journal |
| 3 | 22 FIP tables missing from the committed migration; only created at runtime. `drizzle-kit push` against a fresh DB would miss them | 🟠 medium | M: generate a proper `0001_fip.sql` from schema and add to journal |
| 4 | `recomputeEstimateTotals` duplicated in `routes/estimates.ts` + `lib/chat-tool-exec.ts` — identical today, will drift | 🟠 medium | S: extract to `lib/estimate-totals.ts` |
| 5 | `invoices.amount` + `invoices.totalAmount` — two columns for the same number with no invariant | 🟠 medium | S: pick one canonical + document the other as deprecated |
| 6 | 17+ implicit FKs on `*_id` columns with no `references()` — zero referential integrity for the FIP subtree | 🟠 medium | M: add `references()` per column, one schema file at a time |
| 7 | Agent `db_delete` has no hard per-table confirm rail for `suppliers` / `fip_fault_signatures`. The system prompt is soft guidance only | 🟠 medium | S: hardcode a destructive-action whitelist that refuses without an explicit confirm token in the input |
| 8 | `uptick_facts` dimensional model fully built but entirely unused — dark infrastructure | 🟡 low | L (later): wire the existing `deep-analytics.ts` primitives to the uptick_facts rollups in the analytics page |
| 9 | `pm_*` tables declared and indexed but largely unused — some columns have no UI surface | 🟡 low | Defer or delete |
| 10 | Tools-allowlist inclusion of `toolbox`, `schedule_events`, `projects` without corresponding agent evals — unknown if the tools actually work on these tables | 🟡 low | M: add eval prompts per table |

---

## 10. 5-persona scoring

| Persona | Score | Reasoning |
|---|:---:|---|
| **A — Staff Engineer** | **6/10** | Schema is functional and consistently typed but has a 22-table drift between declared and committed state, duplicated totals logic, and half the FKs are implicit. All sleep-through-the-night issues, none fire, but they will. |
| **B — Product Designer** | **7/10** | Data shape is strong enough to support the rebuild; the wart is that dead tables (`pm_*`, `uptick_*`) clutter the schema directory and slow new developers down. |
| **C — AI Engineer** | **6/10** | Agent write surface is broad and mostly correct, but `db_delete` on `suppliers` / `fip_fault_signatures` is not hard-railed. There are no behavioural evals for 13 of the 20 allowlisted tables. |
| **D — Data Analytics Architect** | **5/10** | The metric registry doesn't exist yet. Multiple sources of truth for money (`invoices.amount` + `totalAmount`). The dimensional `uptick_facts` model is built and unused — the single most valuable analytics primitive in the codebase is dark. |
| **E — Field Ops Principal** | **8/10** | Don't care about schema purity. Data arrives at the right tables with the right types. Everything that matters works. Loses points for `fip_troubleshooting_sessions` never being touchable from a phone. |

**Average:** 6.4 / 10 — acceptable as a starting state, not acceptable as a finished state. All five personas can sign off to proceed to Pass 2 on condition that issues 1-4 from the top-10 are fixed in a follow-up commit before merge.

---

## 11. Immediate proposed fixes (one PR, surgical)

1. **Delete `lib/db/drizzle/0000_curvy_gamora.sql`** — phantom.
2. **Create `lib/db/src/schema/estimates.ts`** declaring `estimates` + `estimate_lines`, add to `schema/index.ts`, keep runtime DDL in place for backwards compatibility.
3. **Extract `lib/estimate-totals.ts`** with `recomputeEstimateTotals(client, estimateId)` — single source of truth. Import from both routes and agent tools.
4. **Add a `CANONICAL_INVOICE_FIELD` comment** at the top of `lib/db/src/schema/invoices.ts` declaring `totalAmount` as canonical, `amount` as deprecated but preserved for legacy data.
5. **Add a per-table destructive-action confirm set** in `lib/chat-tool-exec.ts:dbDelete()` that refuses to delete from `{suppliers, fip_fault_signatures, fip_models, fip_manufacturers}` unless `input.confirm === "yes"`.

Target: one commit, under 300 lines diff, all five personas sign off again after.

---

## 12. What comes next

- **Pass 2** (UX, design system) — led by Persona B
- **Pass 3** (AI integration depth) — led by Persona C
- **Pass 4** (Data analytics) — led by Persona D
- **Pass 5** (Performance & reliability) — shared Persona A + E
- **Pass 6** (Security & access) — shared Persona A + C
- **Pass 7** (Operator efficiency) — led by Persona E

Phase 2 (the AI interaction fix) can start in parallel with Pass 2 since the two surfaces don't collide.

---

**End of Pass 1.**
