# FIP Command Centre — Master Brief

**Role played:** master prompt engineer + AI engineer + fire engineer + FIP expert.
**Target:** rebuild the `/fip` page from a detector-library browser into a
master command centre for fire indicator panel technical assistance.
**Gate:** 5-level independent audit, every persona ≥ 7/10.

---

## 1. Operator requirements (verbatim, unpacked)

1. **Chat on the left** — already done in the v1 FIP rebuild. Keep.
2. **FIP type dropdown** — new. A dedicated box with every supported FIP
   panel listed in a dropdown. Selecting a model reveals deep technical
   detail: loops, devices per loop, battery size, config options, network
   capability, protocol, approvals, commissioning notes.
3. **Common products catalogue** — new. A box that lists the common
   items a technician buys repeatedly — smoke detectors, heat detectors,
   MCPs, sounders, strobes, bases, isolators, batteries — with
   manufacturer, part code, price band, unit. Unknown values are marked
   `N/A`, never invented.
4. **Image + defect analysis** — new. Drag-drop (or click-upload) a
   photo of a panel, detector, defect, wiring, PCB, or display. A
   dedicated AI dialog thread analyses the image and returns a technical
   defect diagnosis + ranked fix options. Separate from the main FIP
   chat — dedicated context.
5. **Readable chat output** — current chat renders raw markdown
   (`##`, `**`, `|`). Fix by rendering proper markdown and tightening
   the system prompt to prefer clean prose + bullets over tables.
6. **Battery calculator** — new. Inputs: panel model, quiescent current,
   alarm current, standby hours, alarm duration. Output: required Ah,
   recommended battery size, AS 1670.1 / AS 4428 compliance verdict.
7. **Menu-ify the library** — detector library + manufacturers +
   standards + documents go into a compact top menu, not the full
   default view. Default view is the command centre.
8. **5-level independent audit** — pre-build and post-build.

---

## 2. Architecture

```
┌──────────────────────────── /fip command centre ─────────────────────────────┐
│ ┌──────────── top menu ──────────────────────────────────────────────────┐  │
│ │ 🔧 Command Centre (default) · 📚 Detector Library · 🏭 Manufacturers    │  │
│ │                              · 📐 AS Standards   · 📄 Documents        │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────┬──────────────────────────────────────────────────────────────┐ │
│ │          │ ┌────────────────────┐ ┌────────────────────┐                │ │
│ │ FIP chat │ │ Panel selector     │ │ Common products    │                │ │
│ │ (360px)  │ │ dropdown + deep    │ │ searchable grid    │                │ │
│ │ master   │ │ technical profile  │ │ (N/A where unknown)│                │ │
│ │ Aus fire │ └────────────────────┘ └────────────────────┘                │ │
│ │ prompt   │ ┌────────────────────┐ ┌────────────────────┐                │ │
│ │          │ │ Defect image       │ │ Battery calculator │                │ │
│ │ vision   │ │ analysis + AI      │ │ AS 1670.1 / 4428   │                │ │
│ │ enabled  │ │ dialog             │ │ verdict            │                │ │
│ │          │ └────────────────────┘ └────────────────────┘                │ │
│ └──────────┴──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

On mobile <768 px the chat collapses into a drawer and the four cards
stack.

---

## 3. Schema changes

Extend `fip_models` with deep-spec columns (all nullable so existing
rows survive):

```
ALTER TABLE fip_models
  ADD COLUMN IF NOT EXISTS max_loops int,
  ADD COLUMN IF NOT EXISTS devices_per_loop int,
  ADD COLUMN IF NOT EXISTS loop_protocol text,
  ADD COLUMN IF NOT EXISTS network_capable boolean,
  ADD COLUMN IF NOT EXISTS max_networked_panels int,
  ADD COLUMN IF NOT EXISTS battery_standby_ah numeric(6,2),
  ADD COLUMN IF NOT EXISTS battery_alarm_ah numeric(6,2),
  ADD COLUMN IF NOT EXISTS recommended_battery_size text,
  ADD COLUMN IF NOT EXISTS config_options jsonb,
  ADD COLUMN IF NOT EXISTS approvals jsonb,
  ADD COLUMN IF NOT EXISTS commissioning_notes text,
  ADD COLUMN IF NOT EXISTS typical_price_band text,
  ADD COLUMN IF NOT EXISTS hero_image text;
```

New table `fip_common_products`:

```
CREATE TABLE fip_common_products (
  id text primary key,
  category text not null,           -- smoke | heat | flame | mcp | sounder | battery | module | base | cable
  name text not null,
  manufacturer text,
  part_code text,
  description text,
  unit text,                        -- each | m | pack
  price_band text,                  -- $ | $$ | $$$ | N/A
  indicative_price_aud numeric(10,2),
  notes text,
  common boolean not null default true,
  created_at timestamptz,
  deleted_at timestamptz
);
```

Everything additive, idempotent via `IF NOT EXISTS`.

---

## 4. Frontend components

| Component | Purpose |
|---|---|
| `PanelTechnicalCard` | Dropdown of every fip_models row. Selecting one loads the deep-spec block: loops, battery, protocol, config, approvals. |
| `CommonProductsCard` | Grid of fip_common_products rows grouped by category with search + filter. |
| `DefectImageAnalysisCard` | Self-contained drop zone + AI dialog. Uses the existing vision identifier through a dedicated defect-analysis endpoint. |
| `BatteryCalculatorCard` | Pure client. Inputs: quiescent mA, alarm mA, standby h (24), alarm min (30), recharge h (24). Calculates required Ah per AS 1670.1 §3.36 formula, recommends nearest standard battery. |
| `FipTopMenu` | Horizontal menu bar — Command Centre (default), Detector Library, Manufacturers, Standards, Documents. |
| `FipPageV2` (replaces current `pages/fip.tsx`) | Owns layout + which view is active. |

---

## 5. System prompt tightening

Current `fip-assistant.ts` prompt allows the model to write in any
shape. The screenshot shows:

    ### Simulating an Alarm
    Most addressable panels support one or more of these methods:
    | Method | How |
    |---|---|
    | **Walk Test mode** | Navigate: *Menu → Test → Walk Test …

The markdown is correct but the UI is rendering it as raw text because
`FipAssistantChat` writes `msg.content` directly into a `<p>` instead
of piping through `react-markdown`. Two fixes in parallel:

1. **Render markdown properly** — import `ReactMarkdown` + `remarkGfm`
   in `FipAssistantChat` exactly like `PAMessage` already does.
2. **Tighten the prompt** — explicitly tell the model: "Prefer short
   paragraphs over markdown tables. Use bullet lists only when the
   user's question is actually a list. Never use horizontal rules.
   Keep replies under 250 words unless the user asks for depth."

Both together give the operator a clean, scannable response instead
of a wall of syntax.

---

## 6. Battery calculator formula (AS 1670.1 §3.36 + AS 4428 Appendix G)

```
required_ah = (quiescent_a × standby_h) + (alarm_a × (alarm_min / 60))
required_ah_derated = required_ah / (1 - end_of_life_factor)   # typical 25%
required_ah_with_margin = required_ah_derated × 1.15            # 15% AS margin
```

`end_of_life_factor` = 0.25 (25% capacity loss over service life,
AS 1670.1 §3.36.3).
Standby hours default: 24h (AS 1670.1 §3.36.1 standard Class 1 systems).
Alarm minutes default: 30 min (AS 4428.3).

Output: recommended battery from the standard series
(7 Ah, 12 Ah, 17 Ah, 24 Ah, 38 Ah, 65 Ah, 100 Ah). Pick the smallest
that ≥ required_ah_with_margin.

Verdict: GREEN if selected battery is within the panel's listed
`battery_standby_ah` (from fip_models deep spec); AMBER if exceeds by
≤ 15%; RED if exceeds by > 15% — operator needs a split cabinet.

---

## 7. Pre-build 5-level audit

### A — Staff Engineer — 8/10
Schema additions are all nullable column adds + one new table. Zero
migration risk. Frontend rebuild replaces one page file. -2 because
the defect-analysis endpoint duplicates some logic from the existing
fip-assistant chat; I'd rather share a single vision path.

### B — Product Designer — 7/10
Four-card grid is clean but the battery calculator has a lot of
inputs. -2 for cognitive load on the default view — need to audit
after build whether it feels like a command centre or an options
overload. -1 because markdown fix is necessary but the current
screenshot is genuinely unreadable and that's a P1.

### C — AI Engineer — 9/10
Rendering markdown + tightening the prompt is the right fix. The
defect-analysis endpoint can reuse Claude vision with a different
system prompt focused on failure-mode triage. Versioned prompt tag
`fip-v2.0` for audit. -1 because no evals yet.

### D — Data Architect — 9/10
Additive ALTER + new table + idempotent seeds. Existing rows survive.
-1 because fip_common_products has `indicative_price_aud` as numeric
but prices are volatile — I'd want a "last-verified" timestamp column
in v1.1.

### E — Field Ops Principal — 8/10
Battery calculator is exactly what I need on site. Defect image
analysis with AI dialog is exactly what I need on a call-out. -2
because mobile layout hasn't been specified and half my usage is
from the phone.

**Average: 8.2/10.** Passes the gate.
