import type { NextConfig } from "next";

/**
 * Builds run on modest self-hosted servers (Coolify), where the default
 * worker fan-out and prerender source maps can exhaust memory and get the
 * build OOM-killed. BUILD_CPUS can raise the worker count on bigger boxes.
 */
const nextConfig: NextConfig = {
  devIndicators: false,
  productionBrowserSourceMaps: false,
  enablePrerenderSourceMaps: false,
  experimental: {
    cpus: Number(process.env.BUILD_CPUS ?? 2),
  },
};

export default nextConfig;
