import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(import.meta.dirname) },
      // The adapter publishes only a `module` entry; Vite's SSR resolver needs
      // its browser entry explicitly. Use browser WASM for wallet serialization.
      { find: /^@miden-sdk\/miden-wallet-adapter-base$/, replacement: path.resolve(import.meta.dirname, "node_modules/@miden-sdk/miden-wallet-adapter-base/dist/index.js") },
      { find: /^@miden-sdk\/miden-sdk$/, replacement: "@miden-sdk/miden-sdk/lazy" },
    ],
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
  },
});
