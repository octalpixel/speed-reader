// Client-only PDF -> text via liteparse's WebAssembly build. The wasm (pdfium,
// ~4 MB) instantiates in the browser and the PDF bytes never leave the device.
// This module is dynamically imported from the upload handler so it stays out
// of the SSR/Worker bundle and only loads when someone actually opens a PDF.
import wasmUrl from "@llamaindex/liteparse-wasm/liteparse_wasm_bg.wasm?url";

type WasmModule = typeof import("@llamaindex/liteparse-wasm");

// Instantiate the wasm once and reuse it across parses.
let ready: Promise<WasmModule> | null = null;
function getModule(): Promise<WasmModule> {
  if (!ready) {
    ready = (async () => {
      const mod = await import("@llamaindex/liteparse-wasm");
      await mod.default({ module_or_path: wasmUrl });
      return mod;
    })();
  }
  return ready;
}

export async function extractPdfText(file: File): Promise<string> {
  const mod = await getModule();
  const parser = new mod.LiteParse({ outputFormat: "text", ocrEnabled: false });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = (await parser.parse(bytes)) as { text?: string };
  return typeof result.text === "string" ? result.text : "";
}
