import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isStaticSpaBuild = process.env.STATIC_SPA === "1";

export default defineConfig({
  tanstackStart: {
    ...(isStaticSpaBuild ? { client: { entry: "client-spa" } } : {}),
    server: { entry: "server" },
  },
  vite: {
    base: process.env.BASE_PATH || "/",
    build: {
      manifest: true,
    },
  },
});
