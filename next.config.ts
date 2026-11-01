import type { NextConfig } from "next";

/**
 * Prefer a dedicated subdomain (lifeops.dktech.co.in) with no basePath.
 * Only set LIFEOPS_BASE_PATH=/life-ops if you must serve under a path on ha.dktech.co.in.
 */
const basePath = (process.env.LIFEOPS_BASE_PATH || "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
