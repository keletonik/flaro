/**
 * Metrics page — the registry-backed rebuild of the analytics page.
 *
 * Unlike the legacy /analytics page (576 lines of hand-rolled
 * aggregation against two endpoints), this page pulls every number
 * from the metric registry via GET /api/metrics/:id. Every chart is
 * wrapped in ChartShell so every y-axis is pinned to zero, every
 * card has a CSV export button, and every card has a drill-down
 * panel showing the underlying rows.
 *
 * Period selection flows through PeriodPicker, which maps 1:1 to
 * the metric registry's `period` query param.
 *
 * Listed here are the 10 metrics shipped in Pass 4 fix 2. New
 * metrics appear automatically as soon as they land in the
 * registry — this page calls `/api/metrics` on mount to list them,
 * then fetches each that it knows how to render.
 */

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
  PeriodPicker,
  periodToQuery,
  type PeriodPickerValue,
  type Period,
} from "@/components/analytics/PeriodPicker";
import { ChartShell, type ChartShellMetric } from "@/components/analytics/ChartShell";
import { DrillDownPanel } from "@/components/analytics/DrillDownPanel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

interface MetricListItem {
  id: string;
  displayName: string;
  description: string;
  category: string;
  unit: string;
  supportedPeriods: Period[];
}

const DEFAULT_PICKER: PeriodPickerValue = { period: "30d" };

function pickDefaultPeriod(supported: Period[]): PeriodPickerValue {
  if (supported.includes("30d")) return { period: "30d" };
  if (supported.includes("mtd")) return { period: "mtd" };
  if (supported.includes("90d")) return { period: "90d" };
  if (supported.includes("7d")) return { period: "7d" };
  if (supported.includes("today")) return { period: "today" };
  return { period: supported[0] ?? "30d" };
}

function MetricCardView({ id, displayName }: { id: string; displayName: string }) {
  const [picker, setPicker] = useState<PeriodPickerValue>(DEFAULT_PICKER);
  const [metric, setMetric] = useState<ChartShellMetric | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<ChartShellMetric>(`/metrics/${id}?${periodToQuery(picker)}`);
      setMetric(result);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load metric");
    } finally {
      setLoading(false);
    }
  }, [id, picker]);

  useEffect(() => { void load(); }, [load]);

  const isTimeSeries = metric?.rows.length && /^\d{4}-\d{2}-\d{2}/.test(metric.rows[0]!.label);

  return (
    <>
      <ChartShell
        metric={metric}
        loading={loading}
        error={error}
        onDrillDown={() => setDrillOpen(true)}
        headerRight={
          <PeriodPicker
            value={picker}
            onChange={setPicker}
            options={["7d", "30d", "mtd", "90d", "ytd"]}
          />
        }
      >
        {metric && metric.rows.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            {isTimeSeries ? (
              <LineChart data={metric.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={10} tickMargin={4} />
                <YAxis fontSize={10} domain={[0, "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={metric.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={10} tickMargin={4} />
                <YAxis fontSize={10} domain={[0, "auto"]} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
        {metric && metric.rows.length === 0 && (
          <div className="grid place-items-center h-[160px] text-xs text-muted-foreground">
            No data in this window.
          </div>
        )}
      </ChartShell>

      <DrillDownPanel metric={metric} open={drillOpen} onClose={() => setDrillOpen(false)} />
    </>
  );
}

export default function MetricsPage() {
  const [list, setList] = useState<MetricListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ metrics: MetricListItem[] }>("/metrics")
      .then((r) => setList(r.metrics))
      .catch((e) => setError(e?.message ?? "Failed to load metric catalogue"));
  }, []);

  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;
  if (!list) return <div className="p-6 text-sm text-muted-foreground">Loading metric catalogue…</div>;

  const groups: Record<string, MetricListItem[]> = {};
  for (const m of list) {
    (groups[m.category] ??= []).push(m);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Metrics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every chart on this page reads from the metric registry. One number, one definition.
        </p>
      </header>

      {Object.entries(groups).map(([category, metrics]) => (
        <section key={category} className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <MetricCardView key={m.id} id={m.id} displayName={m.displayName} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
