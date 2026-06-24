import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // CV render route reads NotoSans .ttf from public/fonts at runtime (see
  // lib/cv/renderer/reactPdf.tsx). On Vercel the public/ folder is served by the
  // CDN and is NOT bundled into the serverless function, and the file tracer
  // can't follow the dynamic path.join(process.cwd(), ...) access. Force-include
  // the fonts so they exist at /var/task/public/fonts in the lambda.
  outputFileTracingIncludes: {
    "/api/cv/render": ["./public/fonts/**/*.ttf"],
  },
};

export default nextConfig;
