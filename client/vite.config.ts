import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the backend during development
      "/api": {
        target: "http://localhost:5100",
        changeOrigin: true,
      },
      // Serve uploaded files from backend during development
      "/uploads": {
        target: "http://localhost:5100",
        changeOrigin: true,
      },
    },
  },
});
