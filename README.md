# Speed Reader

A web app for [RSVP](https://en.wikipedia.org/wiki/Rapid_serial_visual_presentation)
(Rapid Serial Visual Presentation) speed reading. Upload a **PDF, Markdown, or
text** file and read it one word at a time — each word flashes in place, pinned
on its focal letter between two guide lines, with a live words-per-minute slider.

**Live:** https://speed-reader.mithushancj.workers.dev

Everything runs on your device. PDFs are parsed locally in the browser via
WebAssembly — files are never uploaded anywhere.

## Features

- **Upload PDF / `.md` / `.txt`** — drag-and-drop or browse.
- **Focal-letter alignment** — each word is pinned on its Optimal Recognition
  Point (~30% in), the letter your eye naturally lands on, so your gaze never
  has to move.
- **Live WPM slider** — 100–1000 wpm, applied mid-read. Sentence- and
  clause-ending punctuation and long words get a slightly longer beat.
- **Four reading modes** (cycle with `m`, or pick from the bar):
  - *Minimal* — just the focal word.
  - *Context* — the full sentences sit behind the focal word, dimmed and
    readable, and scroll with you.
  - *Ticker* — a news-style horizontal crawl, current word pinned at the
    reading marker.
  - *Teleprompter* — full text scrolls upward, the current line centered.
- **Scroll & click to start anywhere** — scroll the wheel to scrub through the
  document, or click any word to start reading from there.
- **Resume where you left off** — position and speed are saved per document in
  `localStorage`.
- **Keyboard controls** — `space` play/pause, `←`/`→` speed, `↑`/`↓` or scroll
  to scrub, `m` mode, `r` restart, `esc` close.

## How it works

The reading core is a handful of pure functions (`src/lib/rsvp.ts`):

1. **Flatten** Markdown to clean prose (PDF/text are used as-is).
2. **Tokenize** into words, dropping lone punctuation.
3. Compute each word's **focal letter** and split it into `before` / `focal` /
   `after` so a `1fr auto 1fr` grid keeps the focal letter dead-center.
4. **Pace** playback at `60000 / wpm`, nudged by per-word delay heuristics.

PDF text extraction (`src/lib/pdf.ts`) uses the
[`@llamaindex/liteparse-wasm`](https://www.npmjs.com/package/@llamaindex/liteparse-wasm)
browser build. It's loaded lazily — the ~4 MB parser only downloads when you
actually open a PDF — and runs entirely client-side, so server-side rendering
and the Worker stay untouched.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19 + Vite) — SSR app shell
- Tailwind CSS v4
- [liteparse](https://github.com/run-llama/liteparse) WASM — in-browser PDF parsing
- Cloudflare Workers — hosting

## Development

```sh
bun install
bun run dev        # http://localhost:3000
bun run test       # vitest — covers the RSVP core
bun run build      # production build
bun run deploy     # build + wrangler deploy to Cloudflare Workers
```

## Acknowledgements

- The terminal RSVP reader [`agent-rsvp`](https://github.com/EvanBacon/agent-rsvp)
  by Evan Bacon — the focal-letter / WPM / delay-heuristic algorithm here is
  ported from it.
- [LiteParse](https://github.com/run-llama/liteparse) by LlamaIndex — the
  WebAssembly PDF parser that powers in-browser PDF reading.

## License

MIT — see [LICENSE](./LICENSE).
