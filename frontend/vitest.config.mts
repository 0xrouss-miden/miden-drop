import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
  },
});
