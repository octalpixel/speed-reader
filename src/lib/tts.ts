// Client-only text-to-speech via Transformers.js. The library is loaded from a
// CDN (not bundled) so the ONNX runtime/wasm never touches the SSR/Worker
// build; model weights stream from the Hugging Face CDN and are cached by the
// browser after first load. Inference runs in-browser on WebGPU when available,
// falling back to wasm.

const TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

// Route model downloads through our same-origin proxy (see routes/hfproxy/$.ts).
const proxyBase = () => `${location.origin}/hfproxy`;
const HF_ORIGIN = "https://huggingface.co/";

// Belt-and-suspenders: rewrite any direct huggingface.co fetch to the same-
// origin proxy (fetching HF cross-origin fails CORS on some deploy origins).
let fetchPatched = false;
function patchFetch() {
  if (fetchPatched) return;
  fetchPatched = true;
  const orig = window.fetch.bind(window);
  const base = proxyBase();
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url && url.startsWith(HF_ORIGIN)) {
      const rewritten = `${base}/${url.slice(HF_ORIGIN.length)}`;
      return typeof input === "string" || input instanceof URL
        ? orig(rewritten, init)
        : orig(new Request(rewritten, input));
    }
    return orig(input, init);
  };
}

export type Voice = { id: string; label: string };

export type TtsModel = {
  id: "supertonic";
  modelId: string;
  label: string;
  dtype: string;
  approxMB: number;
  voices: Voice[];
  buildOptions: (voice: string, speed: number) => Record<string, unknown>;
};

const SUPERTONIC_VOICES: Voice[] = [
  ...["F1", "F2", "F3", "F4", "F5"].map((v) => ({ id: v, label: `Female ${v[1]}` })),
  ...["M1", "M2", "M3", "M4", "M5"].map((v) => ({ id: v, label: `Male ${v[1]}` })),
];

export const MODELS: Record<TtsModel["id"], TtsModel> = {
  supertonic: {
    id: "supertonic",
    modelId: "onnx-community/Supertonic-TTS-ONNX",
    label: "Supertonic",
    dtype: "fp32",
    approxMB: 262,
    voices: SUPERTONIC_VOICES,
    buildOptions: (voice, speed) => ({
      speaker_embeddings: `${proxyBase()}/onnx-community/Supertonic-TTS-ONNX/resolve/main/voices/${voice}.bin`,
      num_inference_steps: 5,
      speed,
    }),
  },
};

let gpuChecked: boolean | null = null;
export async function webgpuAvailable(): Promise<boolean> {
  if (gpuChecked !== null) return gpuChecked;
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    gpuChecked = !!gpu && !!(await gpu.requestAdapter());
  } catch {
    gpuChecked = false;
  }
  return gpuChecked;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transformersP: Promise<any> | null = null;
function loadTransformers() {
  if (!transformersP) {
    transformersP = import(/* @vite-ignore */ `${TRANSFORMERS_CDN}`).then((m) => {
      m.env.allowLocalModels = false;
      m.env.remoteHost = proxyBase();
      return m;
    });
  }
  return transformersP;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pipelines = new Map<string, Promise<any>>();
function getPipeline(model: TtsModel, gpu: boolean) {
  const key = `${model.modelId}:${gpu ? "gpu" : "wasm"}`;
  if (!pipelines.has(key)) {
    pipelines.set(
      key,
      (async () => {
        const m = await loadTransformers();
        return m.pipeline("text-to-speech", model.modelId, { device: gpu ? "webgpu" : "wasm", dtype: model.dtype });
      })(),
    );
  }
  return pipelines.get(key)!;
}

export type SynthResult = { audio: Float32Array; sampleRate: number };

export async function synthesize(
  model: TtsModel,
  gpu: boolean,
  text: string,
  voice: string,
  speed: number,
): Promise<SynthResult> {
  patchFetch();
  const tts = await getPipeline(model, gpu);
  const out = await tts(text, model.buildOptions(voice, speed));
  return { audio: out.audio as Float32Array, sampleRate: out.sampling_rate as number };
}
