import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

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

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    tailwindcss(),
    react(),
    tsconfigPaths(),
    apiDevPlugin(),
  ],
  build: {
    outDir: "dist",
  },
});
