import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

const base = process.env.VITE_BASE_PATH || "/";
const legacyAssetAliases = {
  "site.js": ["index-BdQUCcF-.js", "index-DRCmcLZ3.js", "index-C6TopXdX.js"],
  "site.css": ["index-DUSGioc_.css", "index-Bv7zhXMv.css"],
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    {
      name: "legacy-asset-aliases",
      writeBundle(options) {
        const outputDir = options.dir ?? path.resolve(__dirname, "dist");
        const assetsDir = path.join(outputDir, "assets");

        Object.entries(legacyAssetAliases).forEach(([sourceName, aliases]) => {
          const sourcePath = path.join(assetsDir, sourceName);
          if (!fs.existsSync(sourcePath)) {
            return;
          }

          const sourceBuffer = fs.readFileSync(sourcePath);
          aliases.forEach((aliasName) => {
            fs.writeFileSync(path.join(assetsDir, aliasName), sourceBuffer);
          });
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/site.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: ({ name }) => {
          if (name?.endsWith(".css")) {
            return "assets/site.css";
          }

          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
