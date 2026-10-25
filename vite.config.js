import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api calls ko backend (port 3000) pe bhej deta hai, isliye CORS ki zarurat nahi.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3000" },
  },
});
