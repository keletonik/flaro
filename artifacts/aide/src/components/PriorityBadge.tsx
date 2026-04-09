import { cn } from "@/lib/utils";

type Priority = "Critical" | "High" | "Medium" | "Low";

const styles: Record<Priority, string> = {
  Critical: "bg-[#EF4444] text-white",
  High: "bg-[#F59E0B] text-black",
  Medium: "bg-[#3B82F6] text-white",
  Low: "bg-[#475569] text-white",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide", styles[priority])}>
      {priority}
    </span>
  );
}
