/**
 * BatteryCalculatorCard — AS 1670.1 / AS 4428 battery sizing calculator.
 *
 * Inputs:
 *   - panel (optional, loads quiescent + standby Ah from fip_models)
 *   - quiescent current (mA)
 *   - alarm current (mA)
 *   - standby hours (default 24h — AS 1670.1 Class 1)
 *   - alarm minutes (default 30 min — AS 4428.3)
 *
 * Formula (AS 1670.1 §3.36 + AS 4428 Appendix G):
 *   required_ah = (quiescent_a × standby_h) + (alarm_a × alarm_min/60)
 *   required_ah_derated = required_ah / (1 - 0.25)     # 25% end-of-life
 *   required_ah_with_margin = required_ah_derated × 1.15
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

interface PanelOption {
  slug: string;
  name: string;
  batteryStandbyAh: number | null;
  recommendedBatterySize: string | null;
}

const STANDARD_SERIES_AH = [7, 12, 17, 24, 38, 65, 100];
const END_OF_LIFE_FACTOR = 0.25; // AS 1670.1 §3.36.3
const DESIGN_MARGIN = 0.15;      // 15% AS margin on top of EOL derating
const DEFAULT_STANDBY_H = 24;
const DEFAULT_ALARM_MIN = 30;

function pickBattery(requiredAh: number): number {
  for (const size of STANDARD_SERIES_AH) {
    if (size >= requiredAh) return size;
  }
  return STANDARD_SERIES_AH[STANDARD_SERIES_AH.length - 1];
}

export function BatteryCalculatorCard() {
  const [panels, setPanels] = useState<PanelOption[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [quiescentMa, setQuiescentMa] = useState(150);
  const [alarmMa, setAlarmMa] = useState(800);
  const [standbyH, setStandbyH] = useState(DEFAULT_STANDBY_H);
  const [alarmMin, setAlarmMin] = useState(DEFAULT_ALARM_MIN);

  useEffect(() => {
    apiFetch<PanelOption[]>("/fip/panels")
      .then(setPanels)
      .catch(() => setPanels([]));
  }, []);

  const selectedPanel = panels.find((p) => p.slug === selectedSlug);

  const result = useMemo(() => {
    const quiescentA = quiescentMa / 1000;
    const alarmA = alarmMa / 1000;
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
  }, [quiescentMa, alarmMa, standbyH, alarmMin, selectedPanel]);

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
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Panel</span>
          <select
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

        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Quiescent (mA)" value={quiescentMa} onChange={setQuiescentMa} min={0} step={10} />
          <NumberInput label="Alarm (mA)" value={alarmMa} onChange={setAlarmMa} min={0} step={50} />
          <NumberInput label="Standby (h)" value={standbyH} onChange={setStandbyH} min={1} step={1} />
          <NumberInput label="Alarm (min)" value={alarmMin} onChange={setAlarmMin} min={1} step={5} />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
        <ResultRow label="Raw required Ah" value={`${result.rawAh.toFixed(2)} Ah`} />
        <ResultRow label="+ 25% end-of-life" value={`${result.deratedAh.toFixed(2)} Ah`} />
        <ResultRow label="+ 15% AS design margin" value={`${result.withMargin.toFixed(2)} Ah`} />
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-[11px] font-semibold text-foreground">Recommended battery</span>
          <span className="text-sm font-bold text-amber-500">2 × 12V {result.recommended}Ah SLA</span>
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
