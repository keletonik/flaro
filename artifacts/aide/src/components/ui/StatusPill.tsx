import { cn } from "@/lib/utils";

type Tone = "red" | "orange" | "amber" | "blue" | "violet" | "emerald" | "slate";

const TONES: Record<Tone, string> = {
  red:     "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  orange:  "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  amber:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  blue:    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  violet:  "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  slate:   "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const STATUS_TONE: Record<string, Tone> = {
  // Priority
  critical: "red", high: "orange", medium: "blue", low: "slate",
  urgent: "red", normal: "blue",
  // WIP / job status
  open: "violet", "in progress": "amber", "in-progress": "amber",
  quoted: "blue", scheduled: "emerald", completed: "slate",
  "on hold": "red", "on-hold": "red", done: "emerald",
  blocked: "red", waiting: "blue", booked: "emerald",
  active: "blue", paused: "slate", archived: "slate",
  // Quote status
  draft: "slate", sent: "blue", accepted: "emerald",
  declined: "red", expired: "slate", revised: "amber",
  // Invoice status
  paid: "emerald", overdue: "red", void: "slate", partial: "amber",
  // Defect status
  resolved: "emerald", deferred: "slate",
  // To-quote queue
  "to quote": "amber", "to-quote": "amber",
};

function toneFor(status: string): Tone {
  return STATUS_TONE[status.toLowerCase().trim()] ?? "slate";
}

export function StatusPill({
  status,
  size = "sm",
  uppercase = false,
  className,
}: {
  status: string;
  size?: "xs" | "sm";
  uppercase?: boolean;
  className?: string;
}) {
  const tone = toneFor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium whitespace-nowrap",
        size === "xs"
          ? "px-1.5 py-0.5 text-[9px]"
          : "px-2 py-0.5 text-[10.5px]",
        uppercase && "uppercase tracking-wide font-semibold",
        TONES[tone],
        className,
      )}
    >
      {status}
    </span>
  );
}

export default StatusPill;
