import type { Transition, Variants } from "framer-motion";

/** Shared easing curves — kept in sync with index.css custom properties. */
export const easing = {
  spring:    [0.32, 0.72, 0.00, 1.00] as [number, number, number, number],
  outQuart:  [0.25, 1.00, 0.50, 1.00] as [number, number, number, number],
  smooth:    [0.22, 1.00, 0.36, 1.00] as [number, number, number, number],
  enter:     [0.16, 1.00, 0.30, 1.00] as [number, number, number, number],
  exit:      [0.50, 0.00, 0.75, 0.00] as [number, number, number, number],
};

/** Stiff spring for UI state transitions. Physics, not millis. */
export const springy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9,
};

/** Softer spring for panels/drawers. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 32,
  mass: 1.0,
};

/** Quick fade for mount/unmount — 160ms. */
export const fadeFast: Transition = { duration: 0.16, ease: easing.smooth };

/** Standard reveal (fade + slide up 6px). */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.36, ease: easing.smooth } },
  exit:   { opacity: 0, y: -4, transition: { duration: 0.18, ease: easing.exit } },
};

/** Stagger container — use with Reveal children. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

/** Panel drawer — spring slide from the right. */
export const drawerRight: Variants = {
  hidden: { x: "100%", opacity: 0 },
  show:   { x: 0,      opacity: 1, transition: springSoft },
  exit:   { x: "100%", opacity: 0, transition: { duration: 0.22, ease: easing.exit } },
};

/** Message bubble morph — matches .aide-message CSS. */
export const messageVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1,    transition: { duration: 0.24, ease: easing.smooth } },
};
