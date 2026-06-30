import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // @react-pdf/renderer calls React.createContext at module load. When Next
  // bundles it into the server/RSC graph it resolves the server React (which has
  // no createContext) and throws "createContext only works in Client
  // Components", making /api/cv/render and /api/cv/preview return a 500 HTML
  // page — the client then fails to parse it as JSON ("Unexpected token '<'").
  // Keeping it external lets it load with the full React at runtime.
  serverExternalPackages: ["@react-pdf/renderer"],
  // CV render/preview routes read NotoSans .ttf from public/fonts at runtime
  // (see lib/cv/renderer/reactPdf.tsx). On Vercel the public/ folder is served
  // by the CDN and is NOT bundled into the serverless function, and the file
  // tracer can't follow the dynamic path.join(process.cwd(), ...) access. Force-
  // include the fonts so they exist at /var/task/public/fonts in the lambda.
  outputFileTracingIncludes: {
    "/api/cv/render": ["./public/fonts/**/*.ttf"],
    "/api/cv/preview": ["./public/fonts/**/*.ttf"],
  },
};

export default nextConfig;
