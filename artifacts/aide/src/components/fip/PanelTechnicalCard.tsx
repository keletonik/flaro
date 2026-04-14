/**
 * PanelTechnicalCard — FIP panel dropdown + deep technical profile.
 *
 * Reads GET /api/fip/panels and renders a dropdown with every model.
 * Selecting one loads an inline deep-spec block with:
 *   - loops / devices per loop / protocol
 *   - network capability + max networked panels
 *   - battery standby + alarm + recommended size
 *   - config options list
 *   - approvals chips
 *   - commissioning notes
 *   - typical price band
 *
 * Empty fields render as "N/A" — never fabricated.
 */

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Cpu, ChevronDown, Loader2, Network, Battery, ShieldCheck, Wrench, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PanelSpec {
  id: string;
  slug: string;
  name: string;
  modelNumber: string | null;
  description: string | null;
  status: string | null;
  maxLoops: number | null;
  devicesPerLoop: number | null;
  loopProtocol: string | null;
  networkCapable: boolean | null;
  maxNetworkedPanels: number | null;
  batteryStandbyAh: number | null;
  batteryAlarmAh: number | null;
  recommendedBatterySize: string | null;
  configOptions: Array<{ label: string; value: string; notes?: string }> | null;
  approvals: string[] | null;
  commissioningNotes: string | null;
  typicalPriceBand: string | null;
}

export function PanelTechnicalCard() {
  const [panels, setPanels] = useState<PanelSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string>("");

  useEffect(() => {
    apiFetch<PanelSpec[]>("/fip/panels")
      .then((rows) => {
        setPanels(rows);
        // Prefer a panel with a real deep spec on first load.
        const rich = rows.find((r) => r.maxLoops != null);
        if (rich) setSelectedSlug(rich.slug);
      })
      .catch(() => setPanels([]))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => panels.find((p) => p.slug === selectedSlug) ?? null,
    [panels, selectedSlug],
  );

  return (
    <section className="bg-card border border-border rounded-2xl p-4">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">FIP Panel Specs</h3>
            <p className="text-[10px] text-muted-foreground">
              Deep technical profile for every supported panel
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : panels.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No panels in the library yet. Run the FIP seed pack first.
        </p>
      ) : (
        <>
          <div className="relative mb-4">
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">— Choose a panel —</option>
              {panels.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                  {p.modelNumber ? ` · ${p.modelNumber}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {selected ? (
            <PanelDetail panel={selected} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              Pick a panel to see its full technical profile.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function naOrValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "N/A";
  return String(v);
}

function PanelDetail({ panel }: { panel: PanelSpec }) {
  return (
    <div className="space-y-4">
      {panel.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{panel.description}</p>
      )}

      {/* Core spec grid */}
      <div className="grid grid-cols-2 gap-2">
        <SpecTile label="Max loops" value={naOrValue(panel.maxLoops)} />
        <SpecTile label="Devices / loop" value={naOrValue(panel.devicesPerLoop)} />
        <SpecTile label="Protocol" value={naOrValue(panel.loopProtocol)} />
        <SpecTile
          label="Network"
          value={
            panel.networkCapable === null
              ? "N/A"
              : panel.networkCapable
                ? `Yes (up to ${panel.maxNetworkedPanels ?? "N/A"} nodes)`
                : "No"
          }
          icon={Network}
        />
        <SpecTile
          label="Battery (standby)"
          value={panel.batteryStandbyAh != null ? `${panel.batteryStandbyAh} Ah` : "N/A"}
          icon={Battery}
        />
        <SpecTile
          label="Battery (alarm)"
          value={panel.batteryAlarmAh != null ? `${panel.batteryAlarmAh} Ah` : "N/A"}
          icon={Battery}
        />
      </div>

      {panel.recommendedBatterySize && (
        <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-[10px] uppercase tracking-wide text-amber-500 font-semibold mb-0.5">
            Recommended battery
          </p>
          <p className="text-xs text-foreground">{panel.recommendedBatterySize}</p>
        </div>
      )}

      {panel.configOptions && panel.configOptions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            <Wrench className="w-3 h-3" /> Config options
          </div>
          <ul className="space-y-1 text-xs">
            {panel.configOptions.map((opt, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[110px] shrink-0">{opt.label}</span>
                <span className="text-foreground">{opt.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {panel.approvals && panel.approvals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            <ShieldCheck className="w-3 h-3" /> Approvals
          </div>
          <div className="flex flex-wrap gap-1">
            {panel.approvals.map((a, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {panel.commissioningNotes && (
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            <Info className="w-3 h-3" /> Commissioning notes
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{panel.commissioningNotes}</p>
        </div>
      )}

      {panel.typicalPriceBand && (
        <p className="text-[10px] text-muted-foreground">
          Typical price band: <span className="text-foreground font-mono">{panel.typicalPriceBand}</span>
        </p>
      )}
    </div>
  );
}

function SpecTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Cpu;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center gap-1.5 mb-0.5">
        {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      </div>
      <p className={cn("text-xs text-foreground font-medium", value === "N/A" && "text-muted-foreground/60")}>
        {value}
      </p>
    </div>
  );
}
