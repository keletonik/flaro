import React, { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Stagger index — child element i waits i * delay ms. */
  index?: number;
  /** Per-index delay in ms. */
  delay?: number;
  /** Only animate once we've entered the viewport. */
  onView?: boolean;
  className?: string;
  as?: React.ElementType;
}

/**
 * Wraps a block with a fade + slide-up reveal. Uses the shared `page-reveal`
 * keyframe so easing stays consistent. Optional IntersectionObserver gate.
 */
export function Reveal({
  children,
  index = 0,
  delay = 40,
  onView = false,
  className,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(!onView);

  useEffect(() => {
    if (!onView || shown) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
          break;
        }
      }
    }, { rootMargin: "-40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onView, shown]);

  const style: CSSProperties = {
    animationDelay: `${index * delay}ms`,
  };

  return (
    <Tag
      ref={ref as any}
      className={cn(shown && "page-reveal", className)}
      style={shown ? style : undefined}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
