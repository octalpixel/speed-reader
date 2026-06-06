export type Sentence = { start: number; end: number }; // inclusive word-index range

// Group the word stream into sentences for TTS. Breaks after sentence-ending
// punctuation, and caps length so a single utterance never gets too long to
// synthesize in one shot.
export function toSentences(words: string[], maxWords = 40): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;
  for (let i = 0; i < words.length; i++) {
    const endsSentence = /[.!?][")'\]]?$/.test(words[i]!);
    if (endsSentence || i - start + 1 >= maxWords) {
      out.push({ start, end: i });
      start = i + 1;
    }
  }
  if (start < words.length) out.push({ start, end: words.length - 1 });
  return out;
}

// Index of the sentence containing a given word index.
export function sentenceAt(sentences: Sentence[], wordIndex: number): number {
  for (let i = 0; i < sentences.length; i++) if (wordIndex <= sentences[i]!.end) return i;
  return Math.max(0, sentences.length - 1);
}
