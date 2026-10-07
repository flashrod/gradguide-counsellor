import type { NextConfig } from "next";

// Browser traffic stays same-origin: /api/* is proxied to the backend,
// so there is no cross-origin fetch and auth cookies are first-party
// (no CORS allow-list to keep in sync, no third-party-cookie blocking).
const BACKEND_URL =
  process.env["BACKEND_API_URL"] ??
  process.env["NEXT_PUBLIC_API_URL"] ??
  "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
