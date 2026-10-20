import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_BUILD_TIME = Date.now();

// Merge .env and .env.local into process.env for local dev API handlers
try {
  const loadedEnv = loadEnv("development", __dirname, "");
  for (const [k, v] of Object.entries(loadedEnv)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
} catch {
  // Ignore if loadEnv is unavailable
}

function versionPlugin() {
  const version = "2026.1";
  const getPayload = () =>
    JSON.stringify(
      {
        buildTime: APP_BUILD_TIME,
        version,
        builtAt: new Date(APP_BUILD_TIME).toISOString(),
      },
      null,
      2
    );

  return {
    name: "hudson-version-plugin",
    buildStart() {
      try {
        const publicDir = path.resolve(__dirname, "public");
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(path.join(publicDir, "version.json"), getPayload());
      } catch (err) {
        console.warn("Could not write public/version.json:", err);
      }
    },
    generateBundle(this: any) {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: getPayload(),
      });
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith("/version.json")) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          return res.end(getPayload());
        }
        next();
      });
    },
  };
}

function apiDevPlugin() {
  return {
    name: "api-dev-plugin",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith("/api/proxy-image")) {
          try {
            const urlObj = new URL(req.url, "http://localhost");
            const targetUrl = urlObj.searchParams.get("url");
            if (!targetUrl) {
              res.statusCode = 400;
              return res.end("Missing url parameter");
            }
            const upstream = await fetch(decodeURIComponent(targetUrl));
            if (!upstream.ok) {
              res.statusCode = upstream.status;
              return res.end(`Failed to fetch upstream image: ${upstream.statusText}`);
            }
            const arrayBuffer = await upstream.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = upstream.headers.get("content-type") || "image/jpeg";
            res.setHeader("Content-Type", contentType);
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Cache-Control", "public, max-age=604800, immutable");
            return res.end(buffer);
          } catch (err: any) {
            res.statusCode = 500;
            return res.end(`Proxy error: ${err.message}`);
          }
        }

        if (req.url && req.url.startsWith("/api/address-autocomplete")) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }
          try {
            const urlObj = new URL(req.url, "http://localhost");
            const queryObj: Record<string, string> = {};
            urlObj.searchParams.forEach((v, k) => {
              queryObj[k] = v;
            });
            const { default: handler } = await import("./api/address-autocomplete.js");
            const mockReq = { method: req.method || "GET", query: queryObj };
            const mockRes = {
              setHeader: (k: string, v: string) => res.setHeader(k, v),
              status: (code: number) => {
                res.statusCode = code;
                return {
                  json: (data: any) => {
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(data));
                  },
                  end: () => res.end(),
                };
              },
            };
            await handler(mockReq, mockRes);
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message, suggestions: [] }));
            return;
          }
        }

        if (req.url && (req.url.startsWith("/api/redo-ai") || req.url.startsWith("/api/outpaint"))) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }

          if (req.method === "POST") {
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
              }
              const parsed = JSON.parse(body || "{}");
              const { default: handler } = await import("./api/redo-ai.js");
              
              // Wrap req and res
              const mockReq = { method: "POST", body: parsed };
              const mockRes = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => {
                  res.statusCode = code;
                  return {
                    json: (data: any) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end(),
                  };
                },
              };

              await handler(mockReq, mockRes);
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
            }
          }
        }

        if (req.url && req.url.startsWith("/api/save-facade")) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }

          if (req.method === "POST") {
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
              }
              const parsed = JSON.parse(body || "{}");
              const { default: handler } = await import("./api/save-facade.js");

              const mockReq = { method: "POST", body: parsed };
              const mockRes = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => {
                  res.statusCode = code;
                  return {
                    json: (data: any) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end(),
                  };
                },
              };

              await handler(mockReq, mockRes);
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ error: err.message }));
            }
          }
        }

        if (req.url && req.url.startsWith("/api/analyze-floorplan")) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }

          if (req.method === "POST") {
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
              }
              const parsed = JSON.parse(body || "{}");
              const { default: handler } = await import("./api/analyze-floorplan.js");

              const mockReq = { method: "POST", body: parsed };
              const mockRes = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => {
                  res.statusCode = code;
                  return {
                    json: (data: any) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end(),
                  };
                },
              };

              await handler(mockReq, mockRes);
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ error: err.message }));
            }
          }
        }

        if (req.url && req.url.startsWith("/api/cadastre-lookup")) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }

          try {
            const urlObj = new URL(req.url, "http://localhost");
            const queryParams: Record<string, string> = {};
            urlObj.searchParams.forEach((val, key) => {
              queryParams[key] = val;
            });

            const { default: handler } = await import("./api/cadastre-lookup.js");
            const mockReq = { method: req.method, query: queryParams };
            const mockRes = {
              setHeader: (k: string, v: string) => res.setHeader(k, v),
              status: (code: number) => {
                res.statusCode = code;
                return {
                  json: (data: any) => {
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(data));
                  },
                  end: () => res.end(),
                };
              },
            };

            await handler(mockReq, mockRes);
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        if (req.url && req.url.startsWith("/api/land-scout-search")) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }

          if (req.method === "POST") {
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
              }
              const parsed = JSON.parse(body || "{}");
              const { default: handler } = await import("./api/land-scout-search.js");

              const mockReq = { method: "POST", body: parsed };
              const mockRes = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => {
                  res.statusCode = code;
                  return {
                    json: (data: any) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end(),
                  };
                },
              };

              await handler(mockReq, mockRes);
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ error: err.message }));
            }
          }
        }

        if (req.url && req.url.startsWith("/api/parse-lot-list")) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }

          if (req.method === "POST") {
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
              }
              const parsed = JSON.parse(body || "{}");
              const { default: handler } = await import("./api/parse-lot-list.js");

              const mockReq = { method: "POST", body: parsed };
              const mockRes = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => {
                  res.statusCode = code;
                  return {
                    json: (data: any) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end(),
                  };
                },
              };

              await handler(mockReq, mockRes);
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ error: err.message }));
            }
          }
        }

        if (req.url && req.url.startsWith("/api/hub-chat")) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }

          if (req.method === "POST") {
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
              }
              const parsed = JSON.parse(body || "{}");
              const { default: handler } = await import("./api/hub-chat.js");

              const mockReq = { method: "POST", body: parsed };
              const mockRes = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => {
                  res.statusCode = code;
                  return {
                    json: (data: any) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end(),
                  };
                },
              };

              await handler(mockReq, mockRes);
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ error: err.message }));
            }
          }
        }

        if (
          req.url &&
          (req.url.startsWith("/api/house-material-ai") ||
            req.url.startsWith("/api/ai/design-chat") ||
            req.url.startsWith("/api/fal-render"))
        ) {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            return res.end();
          }

          if (req.method === "POST") {
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
              }
              const parsed = JSON.parse(body || "{}");
              const { default: handler } = await import("./api/redo-ai.js");

              const mockReq = { method: "POST", body: parsed };
              const mockRes = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => {
                  res.statusCode = code;
                  return {
                    json: (data: any) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end(),
                  };
                },
              };

              await handler(mockReq, mockRes);
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ error: err.message }));
            }
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_BUILD_TIME__: APP_BUILD_TIME,
  },
  server: {
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    TanStackRouterVite(),
    tailwindcss(),
    react(),
    apiDevPlugin(),
    versionPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "Hudson Homes Digital Builder OS",
        short_name: "Hudson OS",
        description: "Hudson Homes Estimating, Quoting, Floorplans & Tender Compare OS",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff2}"],
        navigateFallbackDenylist: [/^\/api\//, /^\/version\.json/],
        runtimeCaching: [
          // 1. STRICT EXCLUSION (NetworkOnly): AI endpoints, serverless /api/* routes, and external scraping
          {
            urlPattern: ({ url, request }) =>
              request.method === "POST" ||
              url.pathname.startsWith("/api/") ||
              url.hostname.includes("generativelanguage.googleapis.com") ||
              url.hostname.includes("openai.com") ||
              url.hostname.includes("anthropic.com") ||
              url.hostname.includes("supabase.co"),
            handler: "NetworkOnly",
          },
          // 2. Heavy Media & Floorplans (CacheFirst - 30 days)
          {
            urlPattern: ({ request, url }) =>
              request.destination === "image" ||
              request.destination === "font" ||
              /\.(?:png|jpg|jpeg|svg|webp|woff2|ico)$/i.test(url.pathname) ||
              url.pathname.startsWith("/facades/") ||
              url.pathname.startsWith("/floorplans/") ||
              url.pathname.startsWith("/floorplans_master/") ||
              url.pathname.endsWith(".pdf"),
            handler: "CacheFirst",
            options: {
              cacheName: "hudson-media-cache-v1",
              expiration: {
                maxEntries: 600,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 3. App Data / Specs (StaleWhileRevalidate)
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith(".json") && !url.pathname.includes("version.json"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "hudson-data-cache-v1",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    include: ["pdfjs-dist", "tesseract.js"],
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("three")) return "vendor-three";
            if (id.includes("pdfjs-dist") || id.includes("jspdf") || id.includes("pdf-lib")) return "vendor-pdf";
            if (id.includes("tesseract.js")) return "vendor-ocr";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("@google/genai")) return "vendor-genai";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("html2canvas")) return "vendor-canvas";
            if (id.includes("jszip")) return "vendor-zip";
          }
          if (id.includes("australianSuburbsData")) return "data-suburbs";
          if (id.includes("masterWindowDoorSchedules")) return "data-schedules";
          if (id.includes("hubKnowledgeEngine")) return "lib-hub-engine";
          if (id.includes("floorplanModificationDetector")) return "lib-floorplan-detector";
          if (id.includes("universalPlanningEngine")) return "lib-planning-engine";
          if (id.includes("routes/_authenticated/database.tsx")) return "route-database";
          if (id.includes("routes/_authenticated/tender-request.tsx")) return "route-tender-request";
          if (id.includes("routes/_authenticated/3d-studio.tsx")) return "route-3d-studio";
          if (id.includes("routes/_authenticated/elevations-3d.tsx")) return "route-elevations-3d";
          if (id.includes("routes/_authenticated/floorplan-editor.tsx")) return "route-floorplan-editor";
          if (id.includes("routes/_authenticated/land-scout.tsx")) return "route-land-scout";
          if (id.includes("routes/_authenticated/crm.tsx")) return "route-crm";
        },
      },
    },
  },
});
