import { cn } from "@/lib/utils";

type Status = "Open" | "In Progress" | "Booked" | "Blocked" | "Waiting" | "Done";

const classes: Record<Status, string> = {
  "Open":        "badge-open",
  "In Progress": "badge-inprogress",
  "Booked":      "badge-booked",
  "Blocked":     "badge-blocked",
  "Waiting":     "badge-waiting",
  "Done":        "badge-done",
};

export function StatusBadge({ status, size = "sm" }: { status: Status; size?: "sm" | "xs" }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border font-medium",
      size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-xs",
      classes[status]
    )}>
      {status}
    </span>
  );
}
