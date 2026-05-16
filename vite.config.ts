import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { resolve } from "node:path";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    base: process.env.BASE_PATH || "/",
    build: {
      manifest: true,
      rollupOptions: {
        input: {
          "client-spa": resolve(process.cwd(), "src/client-spa.tsx"),
        },
      },
    },
  },
});
