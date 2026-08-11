import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@app": path.resolve(import.meta.dirname, "./src/app"),
      "@api": path.resolve(import.meta.dirname, "./src/api"),
      "@assets": path.resolve(import.meta.dirname, "./src/assets"),
      "@components": path.resolve(import.meta.dirname, "./src/components"),
      "@config": path.resolve(import.meta.dirname, "./src/config"),
      "@context": path.resolve(import.meta.dirname, "./src/context"),
      "@features": path.resolve(import.meta.dirname, "./src/features"),
      "@hooks": path.resolve(import.meta.dirname, "./src/hooks"),
      "@layouts": path.resolve(import.meta.dirname, "./src/layouts"),
      "@lib": path.resolve(import.meta.dirname, "./src/lib"),
      "@pages": path.resolve(import.meta.dirname, "./src/pages"),
      "@services": path.resolve(import.meta.dirname, "./src/services"),
      "@store": path.resolve(import.meta.dirname, "./src/store"),
      "@styles": path.resolve(import.meta.dirname, "./src/styles"),
      "@utils": path.resolve(import.meta.dirname, "./src/utils"),
    },
  },
});
