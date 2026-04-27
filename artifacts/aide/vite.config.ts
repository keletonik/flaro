import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

// PORT / BASE_PATH are required by the Replit dev and preview servers but
// have no effect on the production build output. Fall back to sane defaults
// so `vite build` works in build-only environments (Vercel, GitHub Actions)
// that don't expose these variables. Explicit-but-invalid values still error.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;
if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      // Service-worker mode: generate via Workbox at build time.
      registerType: "autoUpdate",
      // We hand-author manifest.webmanifest in /public so iOS-friendly fields
      // (apple-touch-icon, status-bar styles) stay close to index.html. Disable
      // the plugin's manifest generation; precaching still picks it up.
      manifest: false,
      includeAssets: [
        "favicon.svg",
        "manifest.webmanifest",
        "icons/icon.svg",
        "icons/icon-maskable.svg",
      ],
      workbox: {
        // Precache the app shell + static panel/scenarios/training chunks.
        globPatterns: ["**/*.{js,css,html,svg,webmanifest,woff2,woff}"],
        // Don't try to precache the giant opengraph image.
        globIgnores: ["**/opengraph.*"],
        // SPA fallback so /panels, /fault-finding, /training etc. resolve from
        // the cached index.html when offline.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // GET reference data: panels, scenarios, training. Stale-revalidate
            // so the tech sees cached content instantly and freshness arrives
            // in the background.
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              (url.pathname.startsWith("/api/panels") ||
                url.pathname.startsWith("/api/scenarios") ||
                url.pathname.startsWith("/api/training") ||
                url.pathname.startsWith("/api/fip")),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "aide-reference-v1",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fonts (Google Fonts CSS + woff2). Cache for a month.
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "aide-fonts-v1",
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Don't auto-register on dev — only register in production builds so
      // local development doesn't get stuck on stale workers.
      devOptions: { enabled: false },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
