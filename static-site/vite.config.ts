import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    envDir: "..",
    plugins: [react()],
    base: env.VITE_BASE_PATH ?? "/",
    build: {
      outDir: "../out",
      emptyOutDir: true,
    },
  };
});
