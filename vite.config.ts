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

// Each build gets a fresh revision so precached HTML is re-fetched on deploy.
// Without this (revision: null) the service worker keeps serving the HTML of an
// older build, which points at hashed CSS/JS files that no longer exist -> the
// page renders completely unstyled.
const BUILD_REVISION = `${Date.now().toString(36)}`;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
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
          additionalManifestEntries: offlineRoutes.map((url) => ({ url, revision: BUILD_REVISION })),
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,avif,woff,woff2,ttf,otf,json,txt}"],
          // App-identity files stay outside every service-worker cache. Chrome
          // must always resolve the manifest and icons directly from the host,
          // rather than alternating between an old worker copy and the network.
          globIgnores: ["**/manifest.webmanifest", "**/icon-*.png", "**/apple-touch-icon*.png", "**/favicon*.png"],
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
              handler: "StaleWhileRevalidate",
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
