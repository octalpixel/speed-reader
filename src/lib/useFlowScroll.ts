import { useLayoutEffect, useRef } from "react";
import { useFlowWindow } from "./useFlowWindow";

type Axis = "x" | "y";

type Options = {
  axis: Axis;
  frac: number; // where the anchor sits in the viewport (1/3 = ticker marker, 1/2 = centered)
  glideMs: number; // transition duration for a normal one-step move
  before: number;
  after: number;
  margin: number;
};

// Shared engine for the flowing-text modes (ticker + teleprompter/context).
// Keeps a stable render window and pins the anchor word in place by writing a
// transform on the inner element: it glides one step over `glideMs`, and snaps
// (no transition) when the window or index jumped — so motion stays monotonic.
export function useFlowScroll(index: number, total: number, { axis, frac, glideMs, before, after, margin }: Options) {
  const { start, end, shifted } = useFlowWindow(index, total, before, after, margin);
  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const lastIndexRef = useRef(index);

  useLayoutEffect(() => {
    const view = viewRef.current;
    const inner = innerRef.current;
    const anchor = anchorRef.current;
    if (!view || !inner || !anchor) return;
    const jump = shifted || Math.abs(index - lastIndexRef.current) > 1;
    lastIndexRef.current = index;
    inner.style.transitionDuration = jump ? "0ms" : `${glideMs}ms`;
    inner.style.transform =
      axis === "x"
        ? `translateX(${view.clientWidth * frac - (anchor.offsetLeft + anchor.offsetWidth / 2)}px)`
        : `translateY(${view.clientHeight * frac - (anchor.offsetTop + anchor.offsetHeight / 2)}px)`;
  });

  return { start, end, viewRef, innerRef, anchorRef };
}
