import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Izinkan HMR/WebSocket dev bila situs dibuka lewat IP jaringan lokal (mis. adapter VirtualBox 192.168.56.1).
  allowedDevOrigins: ["192.168.56.1", "192.168.*.*"],
  // Solver HiGHS memakai berkas .wasm: jangan di-bundle, dan sertakan di output serverless (Vercel).
  serverExternalPackages: ["highs"],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/highs/build/*.wasm"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
