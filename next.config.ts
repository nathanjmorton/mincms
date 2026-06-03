import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the exe.dev proxy host to reach the dev server.
  allowedDevOrigins: ["narwhal-kayak.exe.xyz"],
};

export default nextConfig;
