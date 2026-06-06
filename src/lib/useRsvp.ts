import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_WPM, WPM_STEP, clampWpm, wordDelay } from "./rsvp";

export type Mode = "minimal" | "context";

type Persisted = { index: number; wpm: number };

function load(id: string): Persisted | null {
  try {
    const raw = localStorage.getItem(`rsvp:${id}`);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

// Drives RSVP playback: timing loop, speed, position, and per-document
// progress persistence. The loop reschedules on every tick so a mid-read WPM
// change applies immediately.
export function useRsvp(words: string[], id: string) {
  const saved = load(id);
  const [index, setIndex] = useState(saved?.index ?? 0);
  const [wpm, setWpm] = useState(saved?.wpm ?? DEFAULT_WPM);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<Mode>("minimal");
  const [showHud, setShowHud] = useState(true);

  const done = index >= words.length;

  useEffect(() => {
    if (!playing || done) return;
    const t = setTimeout(() => setIndex((i) => i + 1), wordDelay(words[index]!, wpm));
    return () => clearTimeout(t);
  }, [playing, done, index, wpm, words]);

  // Stop at the end.
  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  // Persist progress (throttled to one write per second of wall clock).
  const lastSave = useRef(0);
  useEffect(() => {
    const now = performance.now();
    if (now - lastSave.current < 1000 && !done) return;
    lastSave.current = now;
    try {
      localStorage.setItem(`rsvp:${id}`, JSON.stringify({ index: Math.min(index, words.length), wpm }));
    } catch {
      // storage unavailable (private mode / quota) — progress just won't persist
    }
  }, [index, wpm, id, words.length, done]);

  const toggle = useCallback(() => {
    setIndex((i) => (i >= words.length ? 0 : i));
    setPlaying((p) => !p);
  }, [words.length]);

  const scrub = useCallback(
    (delta: number) => setIndex((i) => Math.max(0, Math.min(words.length - 1, i + delta))),
    [words.length],
  );

  const changeWpm = useCallback((delta: number) => setWpm((w) => clampWpm(w + delta)), []);
  const seek = useCallback((i: number) => setIndex(Math.max(0, Math.min(words.length - 1, i))), [words.length]);
  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);

  return {
    index,
    wpm,
    playing,
    mode,
    showHud,
    done,
    setWpm: (v: number) => setWpm(clampWpm(v)),
    changeWpm,
    toggle,
    scrub,
    seek,
    restart,
    setMode,
    toggleMode: () => setMode((m) => (m === "minimal" ? "context" : "minimal")),
    toggleHud: () => setShowHud((s) => !s),
  };
}

export { WPM_STEP };
