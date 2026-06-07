import { createFileRoute } from "@tanstack/react-router";
import { Firecrawl } from "firecrawl";

// Server-only: scrape a web page to clean markdown via Firecrawl. The API key
// is read per-request from the environment (never reaches the client). Runs in
// the Cloudflare Worker; the browser can't fetch arbitrary cross-origin pages
// itself (CORS), so this is also the fetch proxy.
export const Route = createFileRoute("/api/scrape")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url");
        if (!url || !/^https?:\/\//i.test(url)) {
          return Response.json({ error: "Provide a valid http(s) URL." }, { status: 400 });
        }
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Web scraping is not configured." }, { status: 500 });
        }
        try {
          const firecrawl = new Firecrawl({ apiKey });
          const doc = await firecrawl.scrape(url, { formats: ["markdown"], onlyMainContent: true });
          const markdown = doc.markdown ?? "";
          if (!markdown.trim()) {
            return Response.json({ error: "No readable content found on that page." }, { status: 422 });
          }
          const title = (doc.metadata?.title as string | undefined)?.trim() || url;
          return Response.json({ url, title, markdown });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Scrape failed." }, { status: 502 });
        }
      },
    },
  },
});
