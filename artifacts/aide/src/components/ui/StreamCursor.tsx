import { cn } from "@/lib/utils";

/**
 * Pulsing block cursor that follows streaming tokens. Purely decorative;
 * mount it inline at the end of the most-recent assistant chunk.
 */
export function StreamCursor({ className }: { className?: string }) {
  return <span className={cn("aide-stream-cursor", className)} aria-hidden="true" />;
}

export default StreamCursor;
