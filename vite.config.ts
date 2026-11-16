import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "canasta-internal" && process.env.TAURI_ENV_PLATFORM !== "ios") {
    throw new Error("The packaged Canasta preview is for internal iOS testing only.");
  }
  return {
    base: "./",
    plugins: [svelte()],
    clearScreen: false,
    server: {
      host: process.env.TAURI_DEV_HOST ? "0.0.0.0" : "127.0.0.1",
      port: 1420,
      strictPort: true
    },
    envPrefix: ["VITE_", "TAURI_"],
    build: {
      target: "es2022",
      minify: !process.env.TAURI_DEBUG,
      sourcemap: !!process.env.TAURI_DEBUG
    }
  };
});
