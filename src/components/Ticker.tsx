import { useFlowScroll } from "../lib/useFlowScroll";

// News-style horizontal crawl. Text scrolls smoothly leftward at reading speed
// and you read at the fixed marker — like a real ticker, with no hopping
// per-word highlight. Edges fade so words ease in and out.
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
  const glideMs = playing ? Math.min(delayMs, 500) : 0;
  const { start, end, viewRef, innerRef, anchorRef } = useFlowScroll(index, words.length, {
    axis: "x",
    frac: 1 / 3,
    glideMs,
    before: 60,
    after: 120,
    margin: 30,
  });
  const slice = words.slice(start, end);

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
                ref={abs === index ? anchorRef : undefined}
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
