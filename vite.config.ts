import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

function proxyImagePlugin() {
  return {
    name: "proxy-image-plugin",
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
    proxyImagePlugin(),
  ],
  build: {
    outDir: "dist",
  },
});
