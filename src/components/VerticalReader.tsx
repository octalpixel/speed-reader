import { useLayoutEffect, useRef } from "react";
import { FocalText } from "./Focal";
import { useFlowWindow } from "../lib/useFlowWindow";

// Vertical flowing text. Powers two modes:
//  - "teleprompter": full sentences scroll upward, current word highlighted and
//    kept on the centered line — what a news anchor reads from.
//  - "context": the same flowing text but dimmed and readable, sitting behind
//    the focal band; every word is clickable to start reading from there.
// The render window is stable (see useFlowWindow), so the words above the
// current one don't reflow each step — the centered line stays put and only
// advances (gliding) when the current word crosses to a new line.
export function VerticalReader({
  words,
  index,
  highlightEnd,
  variant,
  onPlayFrom,
}: {
  words: string[];
  index: number;
  highlightEnd?: number; // last word of the active range (Listen highlights a whole sentence)
  variant: "teleprompter" | "context" | "listen";
  onPlayFrom: (i: number) => void;
}) {
  const { start, end, shifted } = useFlowWindow(index, words.length, 120, 240, 60);
  const slice = words.slice(start, end);
  const dim = variant === "context";
  const rangeEnd = highlightEnd ?? index;

  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLSpanElement>(null);
  const lastIndexRef = useRef(index);

  useLayoutEffect(() => {
    const view = viewRef.current;
    const inner = innerRef.current;
    const cur = curRef.current;
    if (!view || !inner || !cur) return;
    // Snap on a window shift or a jump (click/scrub); glide on normal steps.
    const jump = shifted || Math.abs(index - lastIndexRef.current) > 1;
    lastIndexRef.current = index;
    const center = view.clientHeight / 2;
    inner.style.transitionDuration = jump ? "0ms" : "250ms";
    inner.style.transform = `translateY(${center - (cur.offsetTop + cur.offsetHeight / 2)}px)`;
  });

  return (
    <div ref={viewRef} className="relative h-full w-full overflow-hidden">
      <div
        ref={innerRef}
        data-flow="vertical"
        className={`absolute inset-x-0 mx-auto max-w-3xl px-6 text-2xl leading-loose ease-out will-change-transform [transition-property:transform] sm:text-3xl ${
          dim ? "text-zinc-600" : "text-zinc-500"
        }`}
      >
        {slice.map((w, i) => {
          const abs = start + i;
          const isAnchor = abs === index;
          const inRange = abs >= index && abs <= rangeEnd;
          let cls: string;
          if (variant === "listen") {
            cls = inRange ? "font-medium text-zinc-50" : `hover:text-zinc-300 ${abs < index ? "opacity-50" : ""}`;
          } else if (dim) {
            cls = isAnchor ? "text-zinc-500" : `hover:text-zinc-300 ${abs < index ? "opacity-50" : ""}`;
          } else {
            cls = isAnchor ? "font-semibold text-zinc-50" : `hover:text-zinc-300 ${abs < index ? "opacity-50" : ""}`;
          }
          const showFocal = isAnchor && variant === "teleprompter";
          return (
            <span
              key={abs}
              ref={isAnchor ? curRef : undefined}
              onClick={() => onPlayFrom(abs)}
              className={`cursor-pointer ${cls}`}
            >
              {showFocal ? <FocalText word={w} /> : w}{" "}
            </span>
          );
        })}
      </div>
    </div>
  );
}
