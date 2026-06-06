import { useRef } from "react";

// A stable render window for the flow modes. Returns a `start` that only moves
// when the current index drifts near the window edge — NOT every step. That
// keeps the rendered layout fixed between shifts, so a measured element's
// offset stays monotonic and motion is smooth. `shifted` is true only on the
// render where the window jumped, so callers can snap (skip the transition)
// to hide the reflow.
export function useFlowWindow(index: number, total: number, before = 120, after = 240, margin = 60) {
  const startRef = useRef(0);
  const size = before + after;
  let start = startRef.current;
  let shifted = false;

  if (index < start + margin || index >= start + size - margin) {
    const next = Math.max(0, Math.min(Math.max(0, total - 1), index - before));
    if (next !== start) {
      start = next;
      startRef.current = next;
      shifted = true;
    }
  }

  return { start, end: Math.min(total, start + size), shifted };
}
