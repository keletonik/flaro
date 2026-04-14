/**
 * lib/speech.ts — Web Speech API wrapper for the PA.
 *
 * Implements the voice state machine from docs/pa-rebuild/BRIEF.md §4.5:
 *
 *   idle → listening → transcribing → confirm → sent
 *          │           │               │
 *          └─[cancel]──┴──[cancel]─────┘
 *
 * Uses the browser-native SpeechRecognition API (no cloud dep). Chrome,
 * Edge, and Safari support it; Firefox does not — the hook returns
 * `available: false` so the UI hides the mic button gracefully.
 *
 * SAFETY: the caller is responsible for destructive-command guardrails.
 * We intentionally do NOT auto-send — the hook always hands back the
 * raw transcript and expects the caller to show a confirm step.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// Narrow the global SpeechRecognition interface because TypeScript's DOM
// lib file still doesn't ship the types in strict mode.
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string; confidence: number };
    };
  };
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const anyWin = window as any;
  return (anyWin.SpeechRecognition as SpeechRecognitionCtor | undefined) ??
    (anyWin.webkitSpeechRecognition as SpeechRecognitionCtor | undefined) ?? null;
}

export type VoiceState = "idle" | "listening" | "transcribing" | "confirm";

export interface UseVoiceInputResult {
  available: boolean;
  state: VoiceState;
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  cancel: () => void;
  accept: () => string;
  reset: () => void;
}

/** Words that force the confirm step regardless of the caller's policy. */
const DESTRUCTIVE_WORDS = [
  "delete", "drop", "remove all", "wipe", "clear all", "reset all",
  "cancel all", "destroy", "purge",
];

export function hasDestructiveWord(text: string): boolean {
  const lower = text.toLowerCase();
  return DESTRUCTIVE_WORDS.some((w) => lower.includes(w));
}

/**
 * Push-to-talk voice input hook.
 *
 * Usage:
 *   const voice = useVoiceInput();
 *   <button
 *     onPointerDown={voice.start}
 *     onPointerUp={voice.stop}
 *     disabled={!voice.available}
 *   >{voice.state}</button>
 *
 * When the user releases the mic, state moves to "transcribing" until the
 * recogniser fires its onend event, then "confirm" with the final transcript.
 * The caller renders a preview, the user taps Send or Edit, and then calls
 * accept() (returns transcript + moves back to idle).
 */
export function useVoiceInput(): UseVoiceInputResult {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const ctor = typeof window !== "undefined" ? getRecognitionCtor() : null;
  const available = !!ctor;

  // Lazy init so we don't crash on unsupported browsers
  const ensureRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (!ctor) return null;
    if (recognitionRef.current) return recognitionRef.current;
    const rec = new ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-AU";
    recognitionRef.current = rec;
    return rec;
  }, [ctor]);

  const start = useCallback(() => {
    const rec = ensureRecognition();
    if (!rec) {
      setError("Voice recognition not supported in this browser");
      return;
    }
    setError(null);
    setTranscript("");
    setState("listening");
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        const alt = r[0];
        if (r.isFinal) finalText += alt.transcript;
        else interimText += alt.transcript;
      }
      setTranscript((finalText || interimText).trim());
    };
    rec.onend = () => {
      setState((current) => (current === "listening" ? "confirm" : current));
    };
    rec.onerror = (ev: any) => {
      const msg = ev?.error ? String(ev.error) : "Voice recognition failed";
      setError(msg);
      setState("idle");
    };
    try { rec.start(); } catch (e: any) {
      setError(e?.message ?? "Failed to start recogniser");
      setState("idle");
    }
  }, [ensureRecognition]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    setState("transcribing");
    try { rec.stop(); } catch { /* noop */ }
  }, []);

  const cancel = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) { try { rec.abort(); } catch { /* noop */ } }
    setState("idle");
    setTranscript("");
    setError(null);
  }, []);

  const accept = useCallback((): string => {
    const text = transcript;
    setState("idle");
    setTranscript("");
    return text;
  }, [transcript]);

  const reset = useCallback(() => {
    cancel();
  }, [cancel]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) { try { rec.abort(); } catch { /* noop */ } }
    };
  }, []);

  return { available, state, transcript, error, start, stop, cancel, accept, reset };
}
