import * as Sentry from "@sentry/nextjs";

declare global {
  interface Window {
    __ENV?: { SENTRY_DSN?: string };
  }
}

const dsn = typeof window !== "undefined" ? window.__ENV?.SENTRY_DSN : undefined;

Sentry.init({
  dsn,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: !!dsn,
});
