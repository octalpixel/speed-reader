import { useEffect, useMemo } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { MAX_WPM, MIN_WPM, splitOrp } from "../lib/rsvp";
import { useRsvp, WPM_STEP } from "../lib/useRsvp";

type Props = {
  title: string;
  words: string[];
  id: string;
  onClose: () => void;
};

// The shared focal band: the current word pinned on its focal letter between
// two guide lines. A 1fr/auto/1fr grid keeps the focal column dead-center.
function FocalWord({ word }: { word: string }) {
  const { before, focal, after } = splitOrp(word);
  return (
    <div className="w-full max-w-3xl">
      <div className="guide guide-top">
        <span className="guide-tick" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-baseline py-6 font-mono text-5xl font-semibold tracking-tight sm:text-6xl">
        <span className="pr-px text-right text-zinc-100">{before}</span>
        <span className="text-center text-red-500">{focal}</span>
        <span className="pl-px text-left text-zinc-100">{after}</span>
      </div>
      <div className="guide guide-bottom">
        <span className="guide-tick" />
      </div>
    </div>
  );
}

export function Reader({ title, words, id, onClose }: Props) {
  const r = useRsvp(words, id);
  const current = words[Math.min(r.index, words.length - 1)] ?? "";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case " ":
          e.preventDefault();
          r.toggle();
          break;
        case "ArrowRight":
          r.changeWpm(WPM_STEP);
          break;
        case "ArrowLeft":
          r.changeWpm(-WPM_STEP);
          break;
        case "ArrowUp":
        case "l":
          r.scrub(1);
          break;
        case "ArrowDown":
        case "h":
          r.scrub(-1);
          break;
        case "m":
        case "Tab":
          e.preventDefault();
          r.toggleMode();
          break;
        case "?":
          r.toggleHud();
          break;
        case "r":
          r.restart();
          break;
        case "q":
        case "Escape":
          onClose();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [r, onClose]);

  const pct = words.length ? Math.round((Math.min(r.index + 1, words.length) / words.length) * 100) : 0;

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-200">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 text-sm text-zinc-500">
        <span className="truncate">{title}</span>
        <button onClick={onClose} className="rounded p-1 hover:bg-zinc-800 hover:text-zinc-200" title="Close (Esc)">
          <X size={18} />
        </button>
      </header>

      {/* Reading stage */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4">
        {r.mode === "context" && (
          <ContextPane words={words} index={r.index} side="before" />
        )}
        <FocalWord word={current} />
        {r.mode === "context" && (
          <ContextPane words={words} index={r.index} side="after" />
        )}
        {r.done && (
          <button
            onClick={r.restart}
            className="absolute bottom-28 flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            <RotateCcw size={15} /> Read again
          </button>
        )}
      </main>

      {/* HUD */}
      {r.showHud && (
        <footer className="flex flex-col gap-3 px-4 pb-6 pt-2 sm:px-8">
          <input
            type="range"
            min={0}
            max={Math.max(0, words.length - 1)}
            value={Math.min(r.index, words.length - 1)}
            onChange={(e) => r.seek(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded bg-zinc-800 accent-red-500"
            aria-label="Scrub position"
          />
          <div className="flex items-center justify-between gap-4 text-sm">
            <button
              onClick={r.toggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
              title="Play / pause (space)"
            >
              {r.playing ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
            </button>

            <div className="flex flex-1 items-center gap-3">
              <span className="w-20 tabular-nums text-zinc-400">{r.wpm} wpm</span>
              <input
                type="range"
                min={MIN_WPM}
                max={MAX_WPM}
                step={WPM_STEP}
                value={r.wpm}
                onChange={(e) => r.setWpm(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded bg-zinc-800 accent-green-500"
                aria-label="Words per minute"
              />
            </div>

            <span className="w-28 text-right tabular-nums text-zinc-500">
              {Math.min(r.index + 1, words.length)}/{words.length} · {pct}%
            </span>
          </div>

          <p className="text-center text-xs text-zinc-600">
            space play · ←/→ speed · ↑/↓ scrub · m context · r restart · esc close
          </p>
        </footer>
      )}
    </div>
  );
}

// Faded run of already-read (before) or upcoming (after) text around the band.
function ContextPane({ words, index, side }: { words: string[]; index: number; side: "before" | "after" }) {
  const slice = useMemo(() => {
    if (side === "before") return words.slice(Math.max(0, index - 60), index);
    return words.slice(index + 1, index + 61);
  }, [words, index, side]);

  return (
    <div
      className={`pointer-events-none absolute ${side === "before" ? "bottom-1/2 mb-20 fade-top" : "top-1/2 mt-20 fade-bottom"} max-h-[34vh] w-full max-w-2xl overflow-hidden px-2 text-center leading-relaxed text-zinc-600`}
    >
      {slice.join(" ")}
    </div>
  );
}
