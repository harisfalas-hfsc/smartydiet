// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load all env vars (not just VITE_*) into process.env for server-side code.
// These are NOT exposed to the client bundle.
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);


// Routes precached at install time so a direct offline load of these URLs works.
const offlineRoutes = ["/", "/about", "/how-it-works", "/plans", "/questionnaire", "/inbox"];

// Emits dist/client/shell.html: a static app shell that boots the client bundle
// with zero network. It is the offline navigation fallback of last resort and
// the entry document copied to index.html for the native iOS/Android wrapper.
function appShellPlugin() {
  return {
    name: "smartydiet-app-shell",
    apply: "build" as const,
    writeBundle(options: { dir?: string }, bundle: Record<string, any>) {
      const dir = options.dir ?? "";
      if (!dir.includes("client")) return;
      const entry = Object.values(bundle).find(
        (c: any) => c.type === "chunk" && c.isEntry,
      ) as any;
      if (!entry) return;
      const css = new Set<string>();
      for (const chunk of Object.values(bundle) as any[]) {
        for (const file of chunk?.viteMetadata?.importedCss ?? []) css.add(file);
      }
      const html = [
        "<!doctype html>",
        '<html lang="en" class="dark">',
        "<head>",
        '<meta charset="utf-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
        "<title>SmartyDiet</title>",
        '<link rel="manifest" href="/manifest.webmanifest" />',
        ...[...css].map((f) => `<link rel="stylesheet" href="/${f}" />`),
        `<script type="module" src="/${entry.fileName}"></script>`,
        "</head>",
        '<body><div id="root"></div></body>',
        "</html>",
      ].join("\n");
      const fs = require("node:fs") as typeof import("node:fs");
      fs.writeFileSync(path.join(dir, "shell.html"), html);
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
      appShellPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        strategies: "generateSW",
        filename: "sw.js",
        manifest: false,
        devOptions: { enabled: false },
        // The static client bundle is emitted to dist/client — the worker and
        // its precache manifest MUST live there or /sw.js is never served.
        outDir: "dist/client",

        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/_serverFn/],
          additionalManifestEntries: offlineRoutes.map((url) => ({ url, revision: null })),
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,avif,woff,woff2,ttf,otf,json,txt}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "smartydiet-pages",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
            {
              urlPattern: ({ request }) =>
                ["script", "style", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "smartydiet-assets",
                expiration: { maxEntries: 250, maxAgeSeconds: 90 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});
