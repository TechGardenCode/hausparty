import { getRegistry } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prometheus scrape endpoint. Intentionally unauthenticated: ServiceMonitor
// in the cluster scrapes via the ClusterIP service, and the metrics
// exposed here are counts/histograms with no sensitive data (cardinality
// is bounded on route/method/status/spec labels).
export async function GET() {
  const reg = getRegistry();
  const body = await reg.metrics();
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": reg.contentType,
      "cache-control": "no-store",
    },
  });
}
