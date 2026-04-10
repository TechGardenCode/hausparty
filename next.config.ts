import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_SENTRY_DSN:
      process.env.NEXT_PUBLIC_SENTRY_DSN ||
      "https://8b390977f5124743b2fd3ce7708df89e@glitchtip.techgarden.gg/1",
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID:
      process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID ||
      "d7bda746-ab82-4c2a-8d50-efb9d32d0489",
    NEXT_PUBLIC_OPENPANEL_API_URL:
      process.env.NEXT_PUBLIC_OPENPANEL_API_URL ||
      "https://openpanel.techgarden.gg/api",
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
