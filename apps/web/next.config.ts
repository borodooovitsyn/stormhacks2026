import type { NextConfig } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const appHostname = appUrl ? new URL(appUrl).hostname : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: appHostname ? [appHostname] : [],
};

export default nextConfig;
