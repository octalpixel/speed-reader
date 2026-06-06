import { FocalText } from "./Focal";
import { useFlowScroll } from "../lib/useFlowScroll";

// Vertical flowing text. Powers two modes:
//  - "teleprompter": full sentences scroll upward, current word highlighted and
//    kept on the centered line — what a news anchor reads from.
//  - "context": the same flowing text but dimmed and readable, sitting behind
//    the focal band; every word is clickable to start reading from there.
//  - "listen": the active sentence (index..highlightEnd) is highlighted while
//    TTS reads it.
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
  const { start, end, viewRef, innerRef, anchorRef } = useFlowScroll(index, words.length, {
    axis: "y",
    frac: 1 / 2,
    glideMs: 250,
    before: 120,
    after: 240,
    margin: 60,
  });
  const slice = words.slice(start, end);
  const dim = variant === "context";
  const rangeEnd = highlightEnd ?? index;

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
          const active = abs >= index && abs <= rangeEnd; // the highlighted word/sentence
          let cls: string;
          if (variant === "listen") {
            cls = active ? "font-medium text-zinc-50" : `hover:text-zinc-300 ${abs < index ? "opacity-50" : ""}`;
          } else if (dim) {
            cls = isAnchor ? "text-zinc-500" : `hover:text-zinc-300 ${abs < index ? "opacity-50" : ""}`;
          } else {
            cls = isAnchor ? "font-semibold text-zinc-50" : `hover:text-zinc-300 ${abs < index ? "opacity-50" : ""}`;
          }
          const showFocal = isAnchor && variant === "teleprompter";
          return (
            <span
              key={abs}
              ref={isAnchor ? anchorRef : undefined}
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
