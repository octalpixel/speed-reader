import { createFileRoute } from "@tanstack/react-router";

// Same-origin proxy for Hugging Face model files. Fetching them cross-origin
// from the browser is unreliable (HF's CDN serves `Vary: Origin` responses that
// can fail CORS from some deploy origins), so the TTS models stream through
// here instead — server-to-server, no CORS. Range requests are forwarded so the
// ONNX runtime can fetch large weight files in parts.
const HF = "https://huggingface.co/";

export const Route = createFileRoute("/hfproxy/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        if (!splat) return new Response("Not found", { status: 404 });

        const range = request.headers.get("range");
        const upstream = await fetch(HF + splat, {
          headers: range ? { range } : {},
          redirect: "follow",
        });

        const headers = new Headers();
        for (const h of ["content-type", "content-length", "accept-ranges", "content-range", "etag", "last-modified"]) {
          const v = upstream.headers.get(h);
          if (v) headers.set(h, v);
        }
        headers.set("cache-control", "public, max-age=31536000, immutable");
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
