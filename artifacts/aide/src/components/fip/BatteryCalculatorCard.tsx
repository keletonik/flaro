/**
 * BatteryCalculatorCard — indicative AS 1670.1 / AS 4428 battery sizing.
 *
 * Inputs:
 *   - panel (optional — pre-populates quiescent current from the aux budget
 *     and checks the result against the panel's listed battery capacity)
 *   - panel quiescent current (mA)
 *   - NAC load — sounders + strobes + aux modules (mA)
 *   - standby hours (default 24h — AS 1670.1 Class 1)
 *   - alarm minutes (default 30 min — AS 4428.3)
 *
 * Formula (AS 1670.1 §3.36 + AS 4428 Appendix G):
 *   required_ah = (quiescent_a × standby_h) + (alarm_a × alarm_min/60)
 *   required_ah_derated = required_ah / (1 - 0.25)     # 25% end-of-life
 *   required_ah_with_margin = required_ah_derated × 1.15
 *
 * This is a design aid, not a compliance submission. The full AS 1670.1
 * calculation also covers external control modules, LED mimic loads and
 * zone-level accounting — capture those in the inputs if your site has
 * them.
 *
 * Output:
 *   - required Ah
 *   - recommended battery from the standard series (7, 12, 17, 24, 38, 65, 100 Ah)
 *   - compliance verdict against the panel's listed battery_standby_ah:
 *       GREEN if ≤ listed
 *       AMBER if ≤ 115% of listed
 *       RED   otherwise — split cabinet required
 */

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Battery, Calculator, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelSpec } from "./PanelTechnicalCard";

const STANDARD_SERIES_AH = [7, 12, 17, 24, 38, 65, 100];
const END_OF_LIFE_FACTOR = 0.25; // AS 1670.1 §3.36.3
const DESIGN_MARGIN = 0.15;      // 15% AS margin on top of EOL derating
const DEFAULT_STANDBY_H = 24;
const DEFAULT_ALARM_MIN = 30;
const FALLBACK_QUIESCENT_MA = 150;
const FALLBACK_NAC_MA = 800;

function pickBattery(requiredAh: number): number {
  for (const size of STANDARD_SERIES_AH) {
    if (size >= requiredAh) return size;
  }
  return STANDARD_SERIES_AH[STANDARD_SERIES_AH.length - 1];
}

/**
 * Most Australian FIPs ship with a 24 V string (2 × 12 V SLA) inside the
 * cabinet. A few models use a single 12 V string or a 48 V string for
 * larger networked installs. When the panel spec is rich enough to
 * infer the topology, show it. Otherwise keep the recommendation generic.
 */
function describeTopology(ah: number, panel: PanelSpec | undefined): string {
  const notes = (panel?.recommendedBatterySize ?? "").toLowerCase();
  if (notes.includes("48v") || notes.includes("48 v")) return `4 × 12 V ${ah} Ah SLA (48 V string)`;
  if (notes.includes("12v") && !notes.includes("24")) return `1 × 12 V ${ah} Ah SLA`;
  return `2 × 12 V ${ah} Ah SLA (24 V string)`;
}

interface Props {
  /** Panels supplied by the parent so the calculator doesn't refetch. */
  panels?: PanelSpec[];
  /** Controlled panel slug shared with sibling cards. */
  panelSlug?: string;
}

export function BatteryCalculatorCard({ panels: panelsProp, panelSlug }: Props = {}) {
  const [fetchedPanels, setFetchedPanels] = useState<PanelSpec[]>([]);
  const panels = panelsProp ?? fetchedPanels;

  const [internalSlug, setInternalSlug] = useState("");
  const isControlled = panelSlug !== undefined;
  const selectedSlug = isControlled ? (panelSlug ?? "") : internalSlug;
  const setSelectedSlug = (slug: string) => {
    if (!isControlled) setInternalSlug(slug);
  };

  const [quiescentMa, setQuiescentMa] = useState(FALLBACK_QUIESCENT_MA);
  const [nacMa, setNacMa] = useState(FALLBACK_NAC_MA);
  const [standbyH, setStandbyH] = useState(DEFAULT_STANDBY_H);
  const [alarmMin, setAlarmMin] = useState(DEFAULT_ALARM_MIN);
  // Tracks whether the operator has edited the inputs. If they have, a
  // panel change no longer overwrites their numbers — they might be
  // modelling a specific site, not the panel's nominal budget.
  const [userEditedInputs, setUserEditedInputs] = useState(false);

  useEffect(() => {
    if (panelsProp != null) return;
    apiFetch<PanelSpec[]>("/fip/panels")
      .then(setFetchedPanels)
      .catch(() => setFetchedPanels([]));
  }, [panelsProp]);

  const selectedPanel = panels.find((p) => p.slug === selectedSlug);

  // Pre-populate current draw from the panel spec whenever a different
  // panel is picked and the operator hasn't manually edited the inputs.
  useEffect(() => {
    if (!selectedPanel || userEditedInputs) return;
    const aux = selectedPanel.auxCurrentBudgetMa;
    if (aux != null && Number.isFinite(aux)) {
      // Aux budget covers quiescent detection current for most FIPs.
      // Split 30% quiescent / 70% NAC as a sensible default — operators
      // can tune from there without starting from zero.
      setQuiescentMa(Math.round(aux * 0.3));
      setNacMa(Math.round(aux * 0.7));
    }
  }, [selectedPanel, userEditedInputs]);

  function wrapSetter(fn: (n: number) => void) {
    return (n: number) => { setUserEditedInputs(true); fn(n); };
  }

  const result = useMemo(() => {
    const quiescentA = quiescentMa / 1000;
    const alarmA = nacMa / 1000;
    const rawAh = quiescentA * standbyH + alarmA * (alarmMin / 60);
    const deratedAh = rawAh / (1 - END_OF_LIFE_FACTOR);
    const withMargin = deratedAh * (1 + DESIGN_MARGIN);
    const recommended = pickBattery(withMargin);

    let verdict: "green" | "amber" | "red" | "unknown" = "unknown";
    let verdictText = "";
    if (selectedPanel?.batteryStandbyAh != null) {
      const listed = Number(selectedPanel.batteryStandbyAh);
      if (withMargin <= listed) {
        verdict = "green";
        verdictText = `Within the ${selectedPanel.name}'s listed capacity (${listed} Ah) — ships in the panel cabinet.`;
      } else if (withMargin <= listed * 1.15) {
        verdict = "amber";
        verdictText = `Exceeds the listed ${listed} Ah capacity by up to 15% — consider a split cabinet or derated standby hours.`;
      } else {
        verdict = "red";
        verdictText = `Exceeds the listed ${listed} Ah capacity by > 15% — external battery cabinet mandatory. Re-review site loads.`;
      }
    } else {
      verdictText = "Pick a panel to verify the result against its listed battery cabinet capacity.";
    }

    return {
      rawAh: Math.round(rawAh * 100) / 100,
      deratedAh: Math.round(deratedAh * 100) / 100,
      withMargin: Math.round(withMargin * 100) / 100,
      recommended,
      verdict,
      verdictText,
    };
  }, [quiescentMa, nacMa, standbyH, alarmMin, selectedPanel]);

  return (
    <section className="bg-card border border-border rounded-2xl p-4">
      <header className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Battery className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Battery Calculator</h3>
          <p className="text-[10px] text-muted-foreground">
            AS 1670.1 §3.36 + AS 4428 sizing with EOL derating + 15% margin
          </p>
        </div>
      </header>

      <div className="space-y-2 mb-3">
        {!isControlled && (
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Panel</span>
            <select
              aria-label="Choose panel for battery calculation"
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">— Any / not specified —</option>
              {panels.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Quiescent (mA)" value={quiescentMa} onChange={wrapSetter(setQuiescentMa)} min={0} step={10} />
          <NumberInput label="NAC load (mA)" value={nacMa} onChange={wrapSetter(setNacMa)} min={0} step={50} />
          <NumberInput label="Standby (h)" value={standbyH} onChange={wrapSetter(setStandbyH)} min={1} step={1} />
          <NumberInput label="Alarm (min)" value={alarmMin} onChange={wrapSetter(setAlarmMin)} min={1} step={5} />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
        <ResultRow label="Raw required Ah" value={`${result.rawAh.toFixed(2)} Ah`} />
        <ResultRow label="+ 25% end-of-life" value={`${result.deratedAh.toFixed(2)} Ah`} />
        <ResultRow label="+ 15% AS design margin" value={`${result.withMargin.toFixed(2)} Ah`} />
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-[11px] font-semibold text-foreground">Recommended battery</span>
          <span className="text-sm font-bold text-amber-500">{describeTopology(result.recommended, selectedPanel)}</span>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 p-2.5 rounded-lg text-[11px] flex items-start gap-2",
          result.verdict === "green" && "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500",
          result.verdict === "amber" && "bg-amber-500/10 border border-amber-500/30 text-amber-500",
          result.verdict === "red" && "bg-red-500/10 border border-red-500/30 text-red-500",
          result.verdict === "unknown" && "bg-muted/50 border border-border text-muted-foreground",
        )}
      >
        {result.verdict === "green" && <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        {result.verdict === "amber" && <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        {result.verdict === "red" && <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        {result.verdict === "unknown" && <Calculator className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        <p className="leading-relaxed">{result.verdictText}</p>
      </div>
    </section>
  );
}

function NumberInput({
  label, value, onChange, min, step,
}: { label: string; value: number; onChange: (n: number) => void; min: number; step: number }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full mt-0.5 px-2 py-1.5 rounded-md bg-background border border-border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
