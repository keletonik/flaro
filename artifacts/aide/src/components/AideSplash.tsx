import { useEffect, useState } from "react";
import { AideWordmarkAnimated, AideFavicon } from "./AideLogo";

interface AideSplashProps {
  /** Duration in ms before calling onDone. Defaults to 10 000. */
  durationMs?: number;
  onDone?: () => void;
}

/**
 * 10-second animated splash used on the pre-login screen. The wordmark
 * strokes itself in, a gradient pulses through the letters, a progress
 * bar fills over the duration, and a loading caption cycles.
 *
 * Honours prefers-reduced-motion by hiding the pulse animations and
 * shortening the splash to 800 ms.
 */
export default function AideSplash({ durationMs = 10000, onDone }: AideSplashProps) {
  const [progress, setProgress] = useState(0);
  const [captionIdx, setCaptionIdx] = useState(0);

  const captions = [
    "Initialising workspace…",
    "Loading operations context…",
    "Syncing technicians…",
    "Warming analytics cache…",
    "Ready when you are.",
  ];

  useEffect(() => {
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const effective = reduce ? 800 : durationMs;

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(1, elapsed / effective);
      setProgress(pct);
      setCaptionIdx(Math.min(captions.length - 1, Math.floor(pct * captions.length)));
      if (pct >= 1) {
        clearInterval(interval);
        onDone?.();
      }
    }, 80);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, onDone]);

  return (
    <div className="aide-splash-root">
      <div className="aide-splash-bg" />
      <div className="aide-splash-grid" />
      <div className="aide-splash-center">
        <div className="aide-splash-mark">
          <AideFavicon size={56} className="aide-splash-favicon" />
        </div>
        <div className="aide-splash-wordmark-wrap">
          <AideWordmarkAnimated height={72} />
        </div>
        <p className="aide-splash-caption">{captions[captionIdx]}</p>
        <div className="aide-splash-progress">
          <div
            className="aide-splash-progress-bar"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="aide-splash-tag">
          <span>Service Operations</span>
          <span className="aide-splash-dot" aria-hidden />
          <span>Rydalmere NSW</span>
        </div>
      </div>
    </div>
  );
}
