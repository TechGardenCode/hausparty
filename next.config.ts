import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Default is 1MB. Our largest legitimate payload is a submission
      // form with URL + small metadata — comfortably under 100kb. Reject
      // oversized bodies at the framework layer before they reach actions.
      bodySizeLimit: "100kb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "i1.sndcdn.com",
        pathname: "/avatars-**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "tech-garden",
  project: "hausparty",
  silent: true,
  disableLogger: true,
  sourcemaps: {
    disable: true,
  },
});
