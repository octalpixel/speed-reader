import { useEffect, useMemo, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { wordDelay } from "../lib/rsvp";
import { WPM_STEP, useRsvp } from "../lib/useRsvp";
import { sentenceAt, toSentences } from "../lib/sentences";
import { MODELS, type TtsModel } from "../lib/tts";
import { useTts } from "../lib/useTts";
import { FocalWord } from "./Focal";
import { Ticker } from "./Ticker";
import { VerticalReader } from "./VerticalReader";
import { ReaderHud, TTS_RATE } from "./ReaderHud";

type Props = {
  title: string;
  words: string[];
  id: string;
  onClose: () => void;
};

export function Reader({ title, words, id, onClose }: Props) {
  const r = useRsvp(words, id);
  const current = words[Math.min(r.index, words.length - 1)] ?? "";

  // Listen mode (TTS) state.
  const sentences = useMemo(() => toSentences(words), [words]);
  const [modelId, setModelId] = useState<TtsModel["id"]>("supertonic");
  const [voice, setVoice] = useState(MODELS.supertonic.voices[0]!.id);
  const [rate, setRate] = useState(TTS_RATE.default);
  const curSentence = sentenceAt(sentences, r.index);
  const tts = useTts(words, sentences, { modelId, voice, speed: rate, onSentence: (s) => r.seek(s.start) });

  // One playback selection so the rest of the UI never branches on mode.
  const isListen = r.mode === "listen";
  const isPlaying = isListen ? tts.speaking : r.playing;
  const togglePlay = () => (isListen ? tts.toggle(curSentence) : r.toggle());

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
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
    // togglePlay closes over the latest mode/index, so depend on its inputs.
  }, [r, onClose, tts, curSentence, isListen]);

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

        {r.done && !isListen && (
          <button
            onClick={r.restart}
            className="absolute bottom-28 z-20 flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            <RotateCcw size={15} /> Read again
          </button>
        )}
      </main>

      {r.showHud && (
        <ReaderHud
          r={r}
          wordsLength={words.length}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          listen={{ voice, setVoice, modelId, setModelId, rate, setRate, status: tts.status, error: tts.error }}
        />
      )}
    </div>
  );
}
