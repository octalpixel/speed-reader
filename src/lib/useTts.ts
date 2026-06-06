import { useCallback, useEffect, useRef, useState } from "react";
import { MODELS, synthesize, webgpuAvailable, type TtsModel } from "./tts";
import type { Sentence } from "./sentences";

export type TtsStatus = "idle" | "loading" | "speaking" | "error";

type Options = {
  modelId: TtsModel["id"];
  voice: string;
  speed: number;
  onSentence: (s: Sentence) => void; // sync the reader (highlight + scroll)
};

// Drives "Listen" mode: synthesizes the current sentence, plays it through
// WebAudio, prefetches the next while it plays, and advances on end. Audio (not
// a word timer) is the clock in this mode.
export function useTts(words: string[], sentences: Sentence[], opts: Options) {
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const playingRef = useRef(false);
  const cache = useRef(new Map<number, AudioBuffer>());

  const cfg = useRef(opts);
  cfg.current = opts;

  const sentenceText = useCallback(
    (i: number) => words.slice(sentences[i]!.start, sentences[i]!.end + 1).join(" "),
    [words, sentences],
  );

  const render = useCallback(
    async (i: number): Promise<AudioBuffer | null> => {
      if (i < 0 || i >= sentences.length) return null;
      const cached = cache.current.get(i);
      if (cached) return cached;
      const model = MODELS[cfg.current.modelId];
      const gpu = await webgpuAvailable();
      const { audio, sampleRate } = await synthesize(model, gpu, sentenceText(i), cfg.current.voice, cfg.current.speed);
      const ctx = ctxRef.current!;
      const buf = ctx.createBuffer(1, audio.length, sampleRate);
      buf.getChannelData(0).set(audio);
      cache.current.set(i, buf);
      return buf;
    },
    [sentences, sentenceText],
  );

  const stop = useCallback(() => {
    playingRef.current = false;
    setSpeaking(false);
    setStatus("idle");
    const src = srcRef.current;
    srcRef.current = null;
    if (src) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
  }, []);

  const speak = useCallback(
    async (i: number) => {
      cfg.current.onSentence(sentences[i]!);
      let buf: AudioBuffer | null;
      try {
        setStatus(cache.current.has(i) ? "speaking" : "loading");
        buf = await render(i);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speech synthesis failed");
        setStatus("error");
        stop();
        return;
      }
      if (!playingRef.current || !buf) return;
      setStatus("speaking");
      const ctx = ctxRef.current!;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      srcRef.current = src;
      src.onended = () => {
        if (!playingRef.current || srcRef.current !== src) return;
        if (i + 1 < sentences.length) void speak(i + 1);
        else stop();
      };
      src.start();
      if (i + 1 < sentences.length) void render(i + 1).catch(() => {}); // prefetch
    },
    [render, sentences, stop],
  );

  const play = useCallback(
    async (from: number) => {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      await ctxRef.current.resume();
      playingRef.current = true;
      setSpeaking(true);
      setError(null);
      void speak(Math.max(0, Math.min(sentences.length - 1, from)));
    },
    [speak, sentences.length],
  );

  const toggle = useCallback(
    (from: number) => {
      if (playingRef.current) stop();
      else void play(from);
    },
    [play, stop],
  );

  const playFromSentence = useCallback(
    (i: number) => {
      stop();
      void play(i);
    },
    [play, stop],
  );

  // Voice / model / speed change invalidates the cached audio.
  useEffect(() => {
    cache.current.clear();
  }, [opts.modelId, opts.voice, opts.speed]);

  useEffect(
    () => () => {
      stop();
      void ctxRef.current?.close();
    },
    [stop],
  );

  return { status, error, speaking, toggle, stop, playFromSentence };
}
