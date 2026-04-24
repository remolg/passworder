import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
  clearScreen: false,
});
