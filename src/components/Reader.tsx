import { useEffect, useMemo, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Volume2, X } from "lucide-react";
import { MAX_WPM, MIN_WPM, splitOrp, wordDelay } from "../lib/rsvp";
import { MODES, useRsvp, WPM_STEP, type Mode } from "../lib/useRsvp";
import { sentenceAt, toSentences } from "../lib/sentences";
import { MODELS, type TtsModel } from "../lib/tts";
import { useTts } from "../lib/useTts";
import { Ticker } from "./Ticker";
import { VerticalReader } from "./VerticalReader";

type Props = {
  title: string;
  words: string[];
  id: string;
  onClose: () => void;
};

const MODE_LABELS: Record<Mode, string> = {
  minimal: "Minimal",
  context: "Context",
  ticker: "Ticker",
  teleprompter: "Teleprompter",
  listen: "Listen",
};

// Map reading speed to the TTS speed range.
const ttsSpeed = (wpm: number) => Math.max(0.8, Math.min(1.3, 0.6 + wpm / 1000));

// The focal band: the current word pinned on its focal letter between two guide
// lines. A 1fr/auto/1fr grid keeps the focal column dead-center.
function FocalWord({ word }: { word: string }) {
  return (
    <div className="w-full max-w-3xl">
      <div className="guide guide-top">
        <span className="guide-tick" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-baseline py-6 font-mono text-5xl font-semibold tracking-tight sm:text-6xl">
        <FocalBandWord word={word} />
      </div>
      <div className="guide guide-bottom">
        <span className="guide-tick" />
      </div>
    </div>
  );
}

function FocalBandWord({ word }: { word: string }) {
  // before / focal / after across the three grid columns so the focal letter
  // lands exactly on the center notch.
  const { before, focal, after } = splitOrp(word);
  return (
    <>
      <span className="pr-px text-right text-zinc-100">{before}</span>
      <span className="text-center text-red-500">{focal}</span>
      <span className="pl-px text-left text-zinc-100">{after}</span>
    </>
  );
}

export function Reader({ title, words, id, onClose }: Props) {
  const r = useRsvp(words, id);
  const current = words[Math.min(r.index, words.length - 1)] ?? "";

  // Listen mode (TTS) state.
  const sentences = useMemo(() => toSentences(words), [words]);
  const [modelId, setModelId] = useState<TtsModel["id"]>("supertonic");
  const [voice, setVoice] = useState(MODELS.supertonic.voices[0]!.id);
  const curSentence = sentenceAt(sentences, r.index);
  const tts = useTts(words, sentences, {
    modelId,
    voice,
    speed: ttsSpeed(r.wpm),
    onSentence: (s) => r.seek(s.start),
  });
  const listenToggle = () => tts.toggle(curSentence);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (r.mode === "listen") tts.toggle(curSentence);
          else r.toggle();
          break;
        case "ArrowRight":
          r.changeWpm(WPM_STEP);
          break;
        case "ArrowLeft":
          r.changeWpm(-WPM_STEP);
          break;
        case "ArrowUp":
        case "l":
          r.scrub(1);
          break;
        case "ArrowDown":
        case "h":
          r.scrub(-1);
          break;
        case "m":
        case "Tab":
          e.preventDefault();
          r.toggleMode();
          break;
        case "?":
          r.toggleHud();
          break;
        case "r":
          r.restart();
          break;
        case "q":
        case "Escape":
          onClose();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [r, onClose, tts, curSentence]);

  const pct = words.length ? Math.round((Math.min(r.index + 1, words.length) / words.length) * 100) : 0;

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-200">
      <header className="flex items-center justify-between px-4 py-3 text-sm text-zinc-500">
        <span className="truncate">{title}</span>
        <button onClick={onClose} className="rounded p-1 hover:bg-zinc-800 hover:text-zinc-200" title="Close (Esc)">
          <X size={18} />
        </button>
      </header>

      {/* Reading stage. Scrolling the wheel scrubs through the document. */}
      <main
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4"
        onWheel={(e) => r.scrub(e.deltaY > 0 ? 3 : -3)}
      >
        {r.mode === "minimal" && <FocalWord word={current} />}

        {r.mode === "context" && (
          <>
            <VerticalReader words={words} index={r.index} variant="context" onPlayFrom={r.playFrom} />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
              <div className="bg-zinc-950/80 px-6 backdrop-blur-sm">
                <FocalWord word={current} />
              </div>
            </div>
          </>
        )}

        {r.mode === "ticker" && (
          <Ticker
            words={words}
            index={r.index}
            playing={r.playing}
            delayMs={wordDelay(current, r.wpm)}
            onPlayFrom={r.playFrom}
          />
        )}

        {r.mode === "teleprompter" && (
          <VerticalReader words={words} index={r.index} variant="teleprompter" onPlayFrom={r.playFrom} />
        )}

        {r.mode === "listen" && (
          <VerticalReader
            words={words}
            index={sentences[curSentence]!.start}
            highlightEnd={sentences[curSentence]!.end}
            variant="listen"
            onPlayFrom={(i) => tts.playFromSentence(sentenceAt(sentences, i))}
          />
        )}

        {r.done && r.mode !== "listen" && (
          <button
            onClick={r.restart}
            className="absolute bottom-28 z-20 flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            <RotateCcw size={15} /> Read again
          </button>
        )}
      </main>

      {r.showHud && (
        <footer className="flex flex-col gap-3 px-4 pb-6 pt-2 sm:px-8">
          {/* Mode selector */}
          <div className="flex justify-center gap-1">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => r.setMode(m)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  r.mode === m ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, words.length - 1)}
            value={Math.min(r.index, words.length - 1)}
            onChange={(e) => r.seek(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded bg-zinc-800 accent-red-500"
            aria-label="Scrub position"
          />
          <div className="flex items-center justify-between gap-4 text-sm">
            <button
              onClick={r.mode === "listen" ? listenToggle : r.toggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
              title="Play / pause (space)"
            >
              {(r.mode === "listen" ? tts.speaking : r.playing) ? (
                <Pause size={18} />
              ) : (
                <Play size={18} className="translate-x-px" />
              )}
            </button>

            {r.mode === "listen" ? (
              <div className="flex flex-1 items-center gap-2 text-xs">
                <select
                  value={modelId}
                  onChange={(e) => {
                    const id = e.target.value as TtsModel["id"];
                    setModelId(id);
                    setVoice(MODELS[id].voices[0]!.id);
                  }}
                  className="rounded bg-zinc-800 px-2 py-1 text-zinc-200"
                  aria-label="Voice model"
                >
                  {Object.values(MODELS).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="rounded bg-zinc-800 px-2 py-1 text-zinc-200"
                  aria-label="Voice"
                >
                  {MODELS[modelId].voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <span className="flex items-center gap-1.5 text-zinc-500">
                  {tts.status === "loading" && (
                    <>
                      <Loader2 size={13} className="animate-spin" /> loading {MODELS[modelId].label} (~
                      {MODELS[modelId].approxMB} MB)…
                    </>
                  )}
                  {tts.status === "speaking" && (
                    <>
                      <Volume2 size={13} /> speaking
                    </>
                  )}
                  {tts.error && <span className="text-red-400">{tts.error}</span>}
                </span>
              </div>
            ) : (
              <div className="flex flex-1 items-center gap-3">
                <span className="w-20 tabular-nums text-zinc-400">{r.wpm} wpm</span>
                <input
                  type="range"
                  min={MIN_WPM}
                  max={MAX_WPM}
                  step={WPM_STEP}
                  value={r.wpm}
                  onChange={(e) => r.setWpm(Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded bg-zinc-800 accent-green-500"
                  aria-label="Words per minute"
                />
              </div>
            )}

            <span className="w-28 text-right tabular-nums text-zinc-500">
              {Math.min(r.index + 1, words.length)}/{words.length} · {pct}%
            </span>
          </div>

          <p className="text-center text-xs text-zinc-600">
            {r.mode === "listen"
              ? "space play/pause · pick a voice · click a sentence to read from there · m mode · esc close"
              : "space play · ←/→ speed · ↑/↓ or scroll to scrub · click a word to start there · m mode · esc close"}
          </p>
        </footer>
      )}
    </div>
  );
}
