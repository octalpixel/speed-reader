import { useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";

export type Doc = { name: string; text: string };

const SAMPLE: Doc = {
  name: "sample.md",
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

export function Uploader({ onLoad }: { onLoad: (doc: Doc) => void }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    try {
      let text: string;
      if (isPdf(file)) {
        setBusy("Parsing PDF…");
        // Lazy: the ~4 MB wasm parser only loads when a PDF is actually opened.
        const { extractPdfText } = await import("../lib/pdf");
        text = await extractPdfText(file);
        if (!text.trim()) throw new Error("No selectable text found — is this a scanned PDF?");
      } else {
        text = await file.text();
      }
      onLoad({ name: file.name, text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">Speed Reader</h1>
        <p className="mt-2 text-zinc-500">Upload a PDF, Markdown, or text file and read it one word at a time.</p>
      </div>

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
        className={`flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
          busy ? "cursor-wait border-zinc-700" : "cursor-pointer"
        } ${dragging ? "border-red-500 bg-red-500/5" : "border-zinc-800 hover:border-zinc-600"}`}
      >
        {busy ? (
          <>
            <Loader2 size={28} className="animate-spin text-red-400" />
            <span className="text-zinc-300">{busy}</span>
            <span className="text-xs text-zinc-600">parsing locally, nothing is uploaded</span>
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
