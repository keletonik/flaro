/**
 * TouchTarget - minimum-size hit area enforcer.
 *
 * Wrap any small clickable thing (icon button, badge with onClick, etc.)
 * to guarantee 48x48 in standard mode and 56x56 when [data-glove="on"]
 * is set on the document element. The visual content stays its original
 * size; the wrapper just expands the hit zone via padding and centres
 * the visual.
 *
 * Why a wrapper rather than CSS: keeps the visible affordance compact
 * while still meeting WCAG 2.5.5 and on-site glove ergonomics.
 */

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TouchTargetProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visible content - icon, text, badge. Centered in the hit area. */
  children: React.ReactNode;
  /** Visual size hint. The hit area is always 48px / 56px regardless. */
  size?: "sm" | "md" | "lg";
}

export const TouchTarget = forwardRef<HTMLButtonElement, TouchTargetProps>(
  ({ children, size = "md", className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        {...rest}
        className={cn(
          "inline-flex items-center justify-center select-none",
          "min-w-[48px] min-h-[48px]",
          "[html[data-glove='on']_&]:min-w-[56px] [html[data-glove='on']_&]:min-h-[56px]",
          "rounded-full transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          size === "sm" && "p-2",
          size === "md" && "p-2.5",
          size === "lg" && "p-3",
          className,
        )}
      >
        {children}
      </button>
    );
  },
);
TouchTarget.displayName = "TouchTarget";

export default TouchTarget;
