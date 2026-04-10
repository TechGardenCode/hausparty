import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Sentry's fetch instrumentation conflicts with Next.js 16's internal
  // fetch patching + RSC TransformStream streaming, causing
  // `controller[kState].transformAlgorithm is not a function` on x86_64.
  // Disable it — error capture via captureException/onRequestError is unaffected.
  skipOpenTelemetrySetup: true,
});
