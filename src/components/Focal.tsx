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
