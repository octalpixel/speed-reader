import { splitOrp } from "../lib/rsvp";

// A word with its focal letter ("optimal recognition point") in red.
export function FocalText({ word }: { word: string }) {
  const { before, focal, after } = splitOrp(word);
  return (
    <>
      {before}
      <span className="text-red-500">{focal}</span>
      {after}
    </>
  );
}

// The focal band: the current word pinned on its focal letter between two guide
// lines. A 1fr/auto/1fr grid keeps the focal letter dead-center on the notch.
export function FocalWord({ word }: { word: string }) {
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
