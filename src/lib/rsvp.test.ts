import { test, expect, describe } from "vitest";
import {
  stripMarkdown,
  tokenize,
  orpIndex,
  splitOrp,
  delayMultiplier,
  wordDelay,
  docId,
  clampWpm,
} from "./rsvp";

describe("stripMarkdown", () => {
  test("drops heading hashes, list markers, emphasis", () => {
    const out = stripMarkdown("# Title\n\n- **bold** item\n- _italic_ item");
    expect(out).toContain("Title");
    expect(out).toContain("bold item");
    expect(out).toContain("italic item");
    expect(out).not.toContain("#");
    expect(out).not.toContain("*");
    expect(out).not.toContain("-");
  });

  test("removes fenced code blocks and collapses links to text", () => {
    const out = stripMarkdown("see [docs](https://x.com)\n\n```js\nconst a=1\n```\nend");
    expect(out).toContain("docs");
    expect(out).not.toContain("https://x.com");
    expect(out).not.toContain("const a=1");
  });
});

describe("tokenize", () => {
  test("splits on whitespace and drops pure-punctuation tokens", () => {
    expect(tokenize("hello -> world •  ok")).toEqual(["hello", "world", "ok"]);
  });
});

describe("orpIndex", () => {
  test("scales with word length (~30% in)", () => {
    expect(orpIndex("a")).toBe(0); // <=1
    expect(orpIndex("words")).toBe(1); // <=5
    expect(orpIndex("recognize")).toBe(2); // <=9
    expect(orpIndex("comprehension")).toBe(3); // <=13
    expect(orpIndex("incomprehensibly")).toBe(4); // >13
  });

  test("nudges focal point off a symbol onto a letter", () => {
    const w = "a-very"; // index 1 is '-', should move to a letter
    expect(/[\p{L}\p{N}]/u.test(w[orpIndex(w)]!)).toBe(true);
  });
});

describe("splitOrp", () => {
  test("partitions a word around its focal letter", () => {
    expect(splitOrp("reading")).toEqual({ before: "re", focal: "a", after: "ding" });
  });
  test("reassembles to the original word", () => {
    for (const w of ["a", "speed", "Presentation", "RSVP,", "four-hundred"]) {
      const { before, focal, after } = splitOrp(w);
      expect(before + focal + after).toBe(w);
    }
  });
});

describe("delay heuristics", () => {
  test("sentence-ending punctuation pauses longest", () => {
    expect(delayMultiplier("end.")).toBeCloseTo(2.2);
    expect(delayMultiplier("clause,")).toBeCloseTo(1.6);
    expect(delayMultiplier("plain")).toBe(1);
  });
  test("long words add a little extra", () => {
    expect(delayMultiplier("recognizing")).toBeCloseTo(1.3);
  });
  test("wordDelay scales inversely with wpm", () => {
    expect(wordDelay("plain", 600)).toBeCloseTo(100);
    expect(wordDelay("plain", 300)).toBeCloseTo(200);
  });
});

describe("docId", () => {
  test("is stable for the same input and differs across inputs", () => {
    expect(docId("a.md", "hello")).toBe(docId("a.md", "hello"));
    expect(docId("a.md", "hello")).not.toBe(docId("a.md", "world"));
    expect(docId("a.md", "hello")).not.toBe(docId("b.md", "hello"));
  });
});

describe("clampWpm", () => {
  test("bounds to [100, 1000]", () => {
    expect(clampWpm(50)).toBe(100);
    expect(clampWpm(2000)).toBe(1000);
    expect(clampWpm(450)).toBe(450);
  });
});
