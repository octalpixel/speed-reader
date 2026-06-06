import { useLayoutEffect, useRef } from "react";
import { FocalText } from "./Focal";

const BEFORE = 80;
const AFTER = 200;

// Vertical flowing text. Powers two modes:
//  - "teleprompter": full sentences scroll upward, current word highlighted and
//    kept on the centered line — what a news anchor reads from.
//  - "context": the same flowing text but dimmed and readable, sitting behind
//    the focal band; every word is clickable to start reading from there.
// Both keep the current word's line pinned at the vertical center; the line
// advances glide smoothly. Only a window of words is rendered.
export function VerticalReader({
  words,
  index,
  variant,
  onPlayFrom,
}: {
  words: string[];
  index: number;
  variant: "teleprompter" | "context";
  onPlayFrom: (i: number) => void;
}) {
  const start = Math.max(0, index - BEFORE);
  const slice = words.slice(start, index + AFTER);
  const dim = variant === "context";

  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const view = viewRef.current;
    const inner = innerRef.current;
    const cur = curRef.current;
    if (!view || !inner || !cur) return;
    const center = view.clientHeight / 2;
    inner.style.transform = `translateY(${center - (cur.offsetTop + cur.offsetHeight / 2)}px)`;
  }, [index, words, variant]);

  return (
    <div ref={viewRef} className="relative h-full w-full overflow-hidden">
      <div
        ref={innerRef}
        className={`absolute inset-x-0 mx-auto max-w-3xl px-6 text-2xl leading-loose ease-out will-change-transform [transition-property:transform] [transition-duration:300ms] sm:text-3xl ${
          dim ? "text-zinc-600" : "text-zinc-500"
        }`}
      >
        {slice.map((w, i) => {
          const abs = start + i;
          const isCur = abs === index;
          const cls = isCur
            ? dim
              ? "text-zinc-500" // current word is shown big in the focal band overlay
              : "font-semibold text-zinc-50"
            : `hover:text-zinc-300 ${abs < index ? "opacity-50" : ""}`;
          return (
            <span
              key={abs}
              ref={isCur ? curRef : undefined}
              onClick={() => onPlayFrom(abs)}
              className={`cursor-pointer ${cls}`}
            >
              {isCur && !dim ? <FocalText word={w} /> : w}{" "}
            </span>
          );
        })}
      </div>
    </div>
  );
}
