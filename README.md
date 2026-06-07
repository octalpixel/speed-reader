# Speed Reader

A web app for [RSVP](https://en.wikipedia.org/wiki/Rapid_serial_visual_presentation)
(Rapid Serial Visual Presentation) speed reading. Read a **web page, PDF,
Markdown, or text** file one word at a time — each word flashes in place, pinned
on its focal letter between two guide lines, with a live words-per-minute slider.

**Live:** https://speed-reader.mithushancj.workers.dev

Everything runs on your device. PDFs are parsed locally in the browser via
WebAssembly — files are never uploaded anywhere.

## Features

- **Read a web page** — paste a URL; the page is scraped to clean markdown
  server-side (via [Firecrawl](https://firecrawl.dev), so the API key never
  reaches the browser) and cached locally in IndexedDB for instant, offline
  re-reads. Recently read pages show as one-click chips.
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
  - *Listen* — text-to-speech read-aloud (see below).
- **Listen / read-aloud** — synthesizes the document sentence-by-sentence and
  plays it back, highlighting the current sentence and prefetching the next.
  Runs **entirely in the browser on WebGPU** (wasm fallback) via
  [Supertonic](https://huggingface.co/onnx-community/Supertonic-TTS-ONNX); pick a
  voice. Audio never leaves the device.
- **Scroll & click to start anywhere** — scroll the wheel to scrub through the
  document, or click any word (or sentence, in Listen mode) to start there.
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
- [Transformers.js](https://github.com/huggingface/transformers.js) — in-browser WebGPU text-to-speech (loaded from CDN)
- [Firecrawl](https://firecrawl.dev) — web page → markdown, called from a server route so the key stays server-side
- IndexedDB — local-first cache of fetched web pages
- Cloudflare Workers — hosting (server routes + static assets)

## Development

Web scraping needs a [Firecrawl](https://firecrawl.dev) API key. For local dev,
put it in `.dev.vars` (gitignored): `FIRECRAWL_API_KEY="fc-…"`. For production:
`wrangler secret put FIRECRAWL_API_KEY`.

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
- [Supertonic](https://huggingface.co/onnx-community/Supertonic-TTS-ONNX) (via
  [Transformers.js](https://github.com/huggingface/transformers.js)) — the
  in-browser text-to-speech model behind Listen mode.

## License

MIT — see [LICENSE](./LICENSE).
