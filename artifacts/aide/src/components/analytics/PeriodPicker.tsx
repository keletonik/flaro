/**
 * PeriodPicker — a segmented control for metric windows.
 *
 * Used by every chart on the analytics page and by any dashboard
 * card that supports time windows. Emits a `Period` string that
 * maps 1:1 to the `period` query param accepted by
 * `GET /api/metrics/:id` (today / 7d / 30d / mtd / 90d / ytd /
 * custom).
 *
 * The `custom` option opens two native date inputs next to the
 * segmented control. Deliberately no heavy calendar popover — we
 * want the component to weigh ~2KB gzipped, not 40KB.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Period = "today" | "7d" | "30d" | "mtd" | "90d" | "ytd" | "custom";

export interface PeriodPickerValue {
  period: Period;
  startDate?: string;
  endDate?: string;
}

interface Props {
  value: PeriodPickerValue;
  onChange: (next: PeriodPickerValue) => void;
  /** Limit which options are available — defaults to all seven. */
  options?: Period[];
  className?: string;
}

const LABELS: Record<Period, string> = {
  today: "Today",
  "7d": "7d",
  "30d": "30d",
  mtd: "MTD",
  "90d": "90d",
  ytd: "YTD",
  custom: "Custom",
};

const DEFAULT_OPTIONS: Period[] = ["today", "7d", "30d", "mtd", "90d", "ytd", "custom"];

export function PeriodPicker({ value, onChange, options = DEFAULT_OPTIONS, className }: Props) {
  const [localStart, setLocalStart] = useState(value.startDate ?? "");
  const [localEnd, setLocalEnd] = useState(value.endDate ?? "");

  const select = (period: Period) => {
    if (period === "custom") {
      onChange({ period, startDate: localStart, endDate: localEnd });
    } else {
      onChange({ period });
    }
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
        {options.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => select(p)}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-colors",
              value.period === p
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LABELS[p]}
          </button>
        ))}
      </div>

      {value.period === "custom" && (
        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            value={localStart}
            onChange={(e) => {
              setLocalStart(e.target.value);
              onChange({ period: "custom", startDate: e.target.value, endDate: localEnd });
            }}
            className="px-2 py-1 rounded-md border border-border bg-background"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={localEnd}
            onChange={(e) => {
              setLocalEnd(e.target.value);
              onChange({ period: "custom", startDate: localStart, endDate: e.target.value });
            }}
            className="px-2 py-1 rounded-md border border-border bg-background"
          />
        </div>
      )}
    </div>
  );
}

/** Convert a picker value into a URL query string for `/api/metrics/:id`. */
export function periodToQuery(v: PeriodPickerValue): string {
  const parts: string[] = [`period=${encodeURIComponent(v.period)}`];
  if (v.period === "custom") {
    if (v.startDate) parts.push(`start=${encodeURIComponent(v.startDate)}`);
    if (v.endDate) parts.push(`end=${encodeURIComponent(v.endDate)}`);
  }
  return parts.join("&");
}
