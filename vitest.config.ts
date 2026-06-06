import { defineConfig } from "vitest/config";

// Standalone config so the unit tests don't load the app's Vite plugins
// (the Cloudflare Worker plugin is incompatible with Vitest's environment).
// The RSVP core is pure TypeScript, so a plain node environment is enough.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
