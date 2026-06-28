import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "apps/http-server/ui",
  plugins: [react()],
  build: {
    outDir: "../../../dist/apps/http-server/src/public",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3333",
      "/mcp": "http://127.0.0.1:3333",
    },
  },
});
