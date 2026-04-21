import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ws"],
  async redirects() {
    return [
      // Browsers request /favicon.ico by default; our asset is JPEG-based (see app/icon.jpg).
      {
        source: "/favicon.ico",
        destination: "/icon.jpg",
        permanent: false,
      },
      { source: "/journal", destination: "/desk/dashboard", permanent: true },
      { source: "/journal/accounts", destination: "/desk/accounts", permanent: true },
      { source: "/journal/accounts/:path*", destination: "/desk/accounts/:path*", permanent: true },
      { source: "/journal/progress", destination: "/desk/progress", permanent: true },
      { source: "/journal/trades", destination: "/desk/trades", permanent: true },
      { source: "/journal/calendar", destination: "/desk/calendar", permanent: true },
      { source: "/journal/settings", destination: "/desk/settings", permanent: true },
      { source: "/journal/analytics", destination: "/desk/analytics", permanent: true },
    ];
  },
};

export default nextConfig;
