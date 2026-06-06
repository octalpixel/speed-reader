import { Loader2, Pause, Play, Volume2 } from "lucide-react";
import { MAX_WPM, MIN_WPM, WPM_STEP } from "../lib/rsvp";
import { MODES, useRsvp, type Mode } from "../lib/useRsvp";
import { MODELS, type TtsModel } from "../lib/tts";
import type { TtsStatus } from "../lib/useTts";

const MODE_LABELS: Record<Mode, string> = {
  minimal: "Minimal",
  context: "Context",
  ticker: "Ticker",
  teleprompter: "Teleprompter",
  listen: "Listen",
};

export const TTS_RATE = { min: 0.7, max: 1.4, step: 0.05, default: 1 };

type Listen = {
  voice: string;
  setVoice: (v: string) => void;
  modelId: TtsModel["id"];
  setModelId: (id: TtsModel["id"]) => void;
  rate: number;
  setRate: (n: number) => void;
  status: TtsStatus;
  error: string | null;
};

export function ReaderHud({
  r,
  wordsLength,
  isPlaying,
  onTogglePlay,
  listen,
}: {
  r: ReturnType<typeof useRsvp>;
  wordsLength: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  listen: Listen;
}) {
  const isListen = r.mode === "listen";
  const pct = wordsLength ? Math.round((Math.min(r.index + 1, wordsLength) / wordsLength) * 100) : 0;

  return (
    <footer className="flex flex-col gap-3 px-4 pb-6 pt-2 sm:px-8">
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
        max={Math.max(0, wordsLength - 1)}
        value={Math.min(r.index, wordsLength - 1)}
        onChange={(e) => r.seek(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded bg-zinc-800 accent-red-500"
        aria-label="Scrub position"
      />

      <div className="flex items-center justify-between gap-4 text-sm">
        <button
          onClick={onTogglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
          title="Play / pause (space)"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
        </button>

        {isListen ? (
          <div className="flex flex-1 items-center gap-2 text-xs">
            {Object.keys(MODELS).length > 1 && (
              <select
                value={listen.modelId}
                onChange={(e) => {
                  const id = e.target.value as TtsModel["id"];
                  listen.setModelId(id);
                  listen.setVoice(MODELS[id].voices[0]!.id);
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
            )}
            <select
              value={listen.voice}
              onChange={(e) => listen.setVoice(e.target.value)}
              className="rounded bg-zinc-800 px-2 py-1 text-zinc-200"
              aria-label="Voice"
            >
              {MODELS[listen.modelId].voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="tabular-nums text-zinc-400">{listen.rate.toFixed(2)}×</span>
            <input
              type="range"
              min={TTS_RATE.min}
              max={TTS_RATE.max}
              step={TTS_RATE.step}
              value={listen.rate}
              onChange={(e) => listen.setRate(Number(e.target.value))}
              className="h-1 w-24 cursor-pointer appearance-none rounded bg-zinc-800 accent-green-500"
              aria-label="Speech speed"
            />
            <span className="flex items-center gap-1.5 text-zinc-500">
              {listen.status === "loading" && (
                <>
                  <Loader2 size={13} className="animate-spin" /> loading {MODELS[listen.modelId].label} (~
                  {MODELS[listen.modelId].approxMB} MB)…
                </>
              )}
              {listen.status === "speaking" && (
                <>
                  <Volume2 size={13} /> speaking
                </>
              )}
              {listen.error && <span className="text-red-400">{listen.error}</span>}
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
          {Math.min(r.index + 1, wordsLength)}/{wordsLength} · {pct}%
        </span>
      </div>

      <p className="text-center text-xs text-zinc-600">
        {isListen
          ? "space play/pause · pick a voice · drag speed · click a sentence to read from there · m mode · esc close"
          : "space play · ←/→ speed · ↑/↓ or scroll to scrub · click a word to start there · m mode · esc close"}
      </p>
    </footer>
  );
}
