import { cn } from "@/lib/utils";

type Priority = "Critical" | "High" | "Medium" | "Low";

const classes: Record<Priority, string> = {
  Critical: "badge-critical",
  High: "badge-high",
  Medium: "badge-medium",
  Low: "badge-low",
};

export function PriorityBadge({ priority, size = "sm" }: { priority: Priority; size?: "sm" | "xs" }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border font-semibold uppercase tracking-wide",
      size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
      classes[priority]
    )}>
      {priority}
    </span>
  );
}
