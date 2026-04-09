import { cn } from "@/lib/utils";

type Status = "Open" | "In Progress" | "Booked" | "Blocked" | "Waiting" | "Done";

const styles: Record<Status, string> = {
  "Open": "border-[#7C3AED] text-[#A855F7]",
  "In Progress": "border-[#F59E0B] text-[#F59E0B]",
  "Booked": "border-[#10B981] text-[#10B981]",
  "Blocked": "border-[#EF4444] text-[#EF4444]",
  "Waiting": "border-[#3B82F6] text-[#3B82F6]",
  "Done": "border-[#475569] text-[#475569]",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-semibold border bg-[#1A1A24]", styles[status])}>
      {status}
    </span>
  );
}
