export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    import("../sentry.edge.config");
  }
}

export const onRequestError = (await import("@sentry/nextjs")).captureRequestError;
