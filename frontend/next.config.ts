import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Note: For Route Handlers (app/api), some platforms like Vercel have a 4.5MB hard limit.
  // If deployed on Render/other VPS, this config might help depending on the Next.js version.
};

export default nextConfig;
