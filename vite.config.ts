import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import fs from "fs";
import path from "path";

function generateIndexHtmlPlugin(): Plugin {
  return {
    name: "generate-index-html",
    closeBundle() {
      const clientDir = path.resolve(__dirname, "dist/client");
      const indexPath = path.join(clientDir, "index.html");
      if (fs.existsSync(clientDir) && !fs.existsSync(indexPath)) {
        const assetsDir = path.join(clientDir, "assets");
        let jsFile = "";
        let cssFile = "";
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          jsFile =
            files.find((f) => f.startsWith("router-") && f.endsWith(".js")) ||
            files.find((f) => f.startsWith("index-") && f.endsWith(".js")) ||
            files.find((f) => f.endsWith(".js")) ||
            "";
          cssFile = files.find((f) => f.endsWith(".css")) || "";
        }

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&amp;family=Bebas+Neue&amp;display=swap" />
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ""}
    <title>Hudson Homes | House &amp; Land Package Flyer Builder</title>
    <meta name="author" content="Hudson Homes" />
    <meta name="description" content="Hudson Homes staff portal for House &amp; Land package database and print-ready flyer studio." />
  </head>
  <body>
    <div id="app"></div>
    ${jsFile ? `<script type="module" src="/assets/${jsFile}"></script>` : ""}
  </body>
</html>`;
        fs.writeFileSync(indexPath, htmlContent, "utf-8");
      }
    },
  };
}

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    tailwindcss(),
    react(),
    generateIndexHtmlPlugin(),
  ],
});
