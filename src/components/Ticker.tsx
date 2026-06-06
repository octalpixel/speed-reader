import { useLayoutEffect, useRef } from "react";
import { useFlowWindow } from "../lib/useFlowWindow";

// News-style horizontal crawl. Text scrolls smoothly leftward at reading speed
// and you read at the fixed marker — like a real ticker, with no hopping
// per-word highlight. The render window is stable (see useFlowWindow) so the
// scroll position is monotonic; edges fade so words ease in and out.
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
  const { start, end, shifted } = useFlowWindow(index, words.length, 60, 120, 30);
  const slice = words.slice(start, end);

  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLSpanElement>(null);
  const lastIndexRef = useRef(index);

  useLayoutEffect(() => {
    const view = viewRef.current;
    const inner = innerRef.current;
    const cur = curRef.current;
    if (!view || !inner || !cur) return;
    // Snap when the window or index jumped; otherwise glide over the word's
    // beat so the crawl is continuous.
    const jump = shifted || Math.abs(index - lastIndexRef.current) > 1;
    lastIndexRef.current = index;
    const readX = view.clientWidth / 3;
    inner.style.transitionDuration = jump || !playing ? "0ms" : `${Math.min(delayMs, 500)}ms`;
    inner.style.transform = `translateX(${readX - (cur.offsetLeft + cur.offsetWidth / 2)}px)`;
  });

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute bottom-0 top-0 left-1/3 z-10 w-px bg-red-500/40" />
      <div
        ref={viewRef}
        className="flex h-32 items-center overflow-hidden border-y border-zinc-800 [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]"
      >
        <div
          ref={innerRef}
          data-flow="ticker"
          className="whitespace-nowrap font-mono text-4xl text-zinc-300 ease-linear will-change-transform [transition-property:transform]"
        >
          {slice.map((w, i) => {
            const abs = start + i;
            return (
              <span
                key={abs}
                ref={abs === index ? curRef : undefined}
                onClick={() => onPlayFrom(abs)}
                className="inline-block cursor-pointer px-2 hover:text-zinc-50"
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
