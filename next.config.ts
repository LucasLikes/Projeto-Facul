import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  allowedDevOrigins: ["192.168.0.4", "100.110.11.150"],
};

export default nextConfig;
