import { useLayoutEffect, useRef } from "react";
import { FocalText } from "./Focal";

const BEFORE = 40;
const AFTER = 80;

// News-style horizontal crawl. The current word is pinned at a reading marker
// (1/3 from the left) and the line glides left one word per beat, so it reads
// as a continuous ticker. Only a window of words is rendered for performance.
export function Ticker({
  words,
  index,
  playing,
  delayMs,
  onPlayFrom,
}: {
  words: string[];
  index: number;
  playing: boolean;
  delayMs: number;
  onPlayFrom: (i: number) => void;
}) {
  const start = Math.max(0, index - BEFORE);
  const slice = words.slice(start, index + AFTER);

  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const view = viewRef.current;
    const inner = innerRef.current;
    const cur = curRef.current;
    if (!view || !inner || !cur) return;
    const readX = view.clientWidth / 3;
    // Glide over the word's own beat while playing; snap instantly when paused
    // or jumping (click / scrub).
    inner.style.transitionDuration = playing ? `${Math.min(delayMs, 450)}ms` : "0ms";
    inner.style.transform = `translateX(${readX - (cur.offsetLeft + cur.offsetWidth / 2)}px)`;
  }, [index, words, playing, delayMs]);

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute bottom-0 top-0 left-1/3 z-10 w-px bg-red-500/50" />
      <div ref={viewRef} className="flex h-32 items-center overflow-hidden border-y border-zinc-800">
        <div
          ref={innerRef}
          className="whitespace-nowrap font-mono text-4xl ease-linear will-change-transform [transition-property:transform]"
        >
          {slice.map((w, i) => {
            const abs = start + i;
            const isCur = abs === index;
            return (
              <span
                key={abs}
                ref={isCur ? curRef : undefined}
                onClick={() => onPlayFrom(abs)}
                className={`inline-block cursor-pointer px-2 ${
                  isCur ? "font-semibold text-zinc-50" : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {isCur ? <FocalText word={w} /> : w}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
