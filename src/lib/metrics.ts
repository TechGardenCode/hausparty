import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

// Singleton Prometheus registry. Initialized lazily so tests and dev hot-
// reload don't accidentally register duplicate metrics (prom-client throws
// on duplicate registration).
let registry: Registry | null = null;

function initRegistry(): Registry {
  if (registry) return registry;
  registry = new Registry();
  registry.setDefaultLabels({ app: "hausparty" });
  collectDefaultMetrics({ register: registry });
  return registry;
}

export function getRegistry(): Registry {
  return initRegistry();
}

const reg = initRegistry();

// Per-route request counter. `route` is the logical endpoint name (not the
// raw URL) to keep cardinality bounded.
export const httpRequestsTotal = new Counter({
  name: "hausparty_http_requests_total",
  help: "HTTP requests handled by route, method, and response status",
  labelNames: ["route", "method", "status"],
  registers: [reg],
});

// Request duration histogram. Buckets chosen around our SLOs (p95 < 500ms).
export const httpRequestDuration = new Histogram({
  name: "hausparty_http_request_duration_seconds",
  help: "HTTP request duration in seconds, by route and method",
  labelNames: ["route", "method"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [reg],
});

// Rate-limit decisions. `outcome` is one of: allowed | blocked | errored.
// `spec` is the limiter's keyPrefix (e.g. `rl:search:ip`, `rl:search:u`).
export const rateLimitDecisionsTotal = new Counter({
  name: "hausparty_ratelimit_decisions_total",
  help: "Rate-limit decisions by limiter spec and outcome",
  labelNames: ["spec", "outcome"],
  registers: [reg],
});

// External fetch (YouTube / SoundCloud / Edmtrain / OpenPanel proxy).
export const externalFetchDuration = new Histogram({
  name: "hausparty_external_fetch_duration_seconds",
  help: "External fetch duration in seconds, by target and outcome (ok|timeout|error)",
  labelNames: ["target", "outcome"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [reg],
});

// Helper: time an async handler, report method/status/route to metrics.
export async function measureHandler<T extends { status: number }>(
  route: string,
  method: string,
  fn: () => Promise<T>,
): Promise<T> {
  const stop = httpRequestDuration.startTimer({ route, method });
  let status = 0;
  try {
    const result = await fn();
    status = result.status;
    return result;
  } catch (err) {
    status = 500;
    throw err;
  } finally {
    stop();
    httpRequestsTotal.inc({ route, method, status: String(status) });
  }
}
