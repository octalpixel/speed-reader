import { useEffect, useState } from "react";
import { FileText, Globe, Loader2, Upload } from "lucide-react";
import { getDoc, putDoc, recentDocs, type WebDoc } from "../lib/docStore";

export type Doc = { name: string; text: string; markdown?: boolean };

const SAMPLE: Doc = {
  name: "sample.md",
  markdown: true,
  text: `Speed reading is the practice of increasing one's reading speed without an
unacceptable reduction in comprehension. Rapid Serial Visual Presentation, or
RSVP, shows words one at a time in a fixed location so your eyes never have to
move. Because the focal point stays put, your brain spends its energy
recognizing words instead of physically scanning lines of text. With a little
practice, most people can comfortably read well above four hundred words per
minute. Use the slider to change the speed, the space bar to pause, and watch
how your comprehension holds up as the words begin to blur together.`,
};

const isPdf = (file: File) => /\.pdf$/i.test(file.name) || file.type === "application/pdf";
const normalizeUrl = (raw: string) => (/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);

export function Uploader({ onLoad }: { onLoad: (doc: Doc) => void }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [recent, setRecent] = useState<WebDoc[]>([]);

  useEffect(() => {
    recentDocs().then(setRecent).catch(() => {});
  }, []);

  async function accept(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    try {
      if (isPdf(file)) {
        setBusy("Parsing PDF…");
        // Lazy: the ~4 MB wasm parser only loads when a PDF is actually opened.
        const { extractPdfText } = await import("../lib/pdf");
        const text = await extractPdfText(file);
        if (!text.trim()) throw new Error("No selectable text found — is this a scanned PDF?");
        onLoad({ name: file.name, text, markdown: false });
      } else {
        onLoad({ name: file.name, text: await file.text(), markdown: /\.(md|markdown)$/i.test(file.name) });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(null);
    }
  }

  // Read a web page: served from the local IndexedDB cache if seen before,
  // otherwise scraped to markdown via the server route (which holds the API key)
  // and cached for next time.
  async function loadUrl(raw: string) {
    const target = normalizeUrl(raw);
    if (!target || busy) return;
    setError(null);
    try {
      let doc = await getDoc(target);
      if (!doc) {
        setBusy("Fetching page…");
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(target)}`);
        const data = (await res.json()) as { title?: string; markdown?: string; error?: string };
        if (!res.ok || !data.markdown) throw new Error(data.error || "Could not read that page.");
        doc = { url: target, title: data.title || target, markdown: data.markdown, fetchedAt: Date.now() };
        await putDoc(doc);
        recentDocs().then(setRecent).catch(() => {});
      }
      onLoad({ name: doc.title, text: doc.markdown, markdown: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that page.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">Speed Reader</h1>
        <p className="mt-2 text-zinc-500">Read a web page, PDF, Markdown, or text file one word at a time.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void loadUrl(url);
        }}
        className="flex w-full max-w-lg items-center gap-2"
      >
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-800 px-3 focus-within:border-zinc-600">
          <Globe size={16} className="shrink-0 text-zinc-500" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!!busy}
            placeholder="Paste a web page URL…"
            className="flex-1 bg-transparent py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!!busy || !url.trim()}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm text-white hover:bg-red-500 disabled:opacity-40"
        >
          Read
        </button>
      </form>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void accept(e.dataTransfer.files[0]);
        }}
        className={`flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-colors ${
          busy ? "cursor-wait border-zinc-700" : "cursor-pointer"
        } ${dragging ? "border-red-500 bg-red-500/5" : "border-zinc-800 hover:border-zinc-600"}`}
      >
        {busy ? (
          <>
            <Loader2 size={28} className="animate-spin text-red-400" />
            <span className="text-zinc-300">{busy}</span>
          </>
        ) : (
          <>
            <Upload size={28} className="text-zinc-500" />
            <span className="text-zinc-300">
              Drop a file here, or <span className="text-red-400">browse</span>
            </span>
            <span className="text-xs text-zinc-600">.pdf, .md, .markdown, .txt</span>
          </>
        )}
        <input
          type="file"
          accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
          className="hidden"
          disabled={!!busy}
          onChange={(e) => void accept(e.target.files?.[0])}
        />
      </label>

      {error && <p className="max-w-lg text-center text-sm text-red-400">{error}</p>}

      {recent.length > 0 && (
        <div className="flex w-full max-w-lg flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-zinc-600">Recent pages</span>
          <div className="flex flex-wrap gap-2">
            {recent.map((d) => (
              <button
                key={d.url}
                onClick={() => void loadUrl(d.url)}
                disabled={!!busy}
                title={d.url}
                className="max-w-[16rem] truncate rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
              >
                {d.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onLoad(SAMPLE)}
        disabled={!!busy}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
      >
        <FileText size={15} /> or try the sample
      </button>
    </div>
  );
}
