import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // The SDK's default Node export is a native addon. Wallet code uses the browser
  // WASM build, including when Next.js analyzes Client Components for SSR.
  turbopack: {
    resolveAlias: {
      "@miden-sdk/miden-sdk": "@miden-sdk/miden-sdk/lazy",
    },
  },
  webpack(config) {
    config.resolve.alias["@miden-sdk/miden-sdk$"] = "@miden-sdk/miden-sdk/lazy";
    return config;
  },
};

export default nextConfig;
