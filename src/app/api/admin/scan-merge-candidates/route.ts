import { scanMergeCandidates } from "@/lib/services/sets/scan-merge-candidates";

interface Body {
  threshold?: unknown;
  dateWindowDays?: unknown;
  dryRun?: unknown;
  limit?: unknown;
}

function toNum(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  if (v < min || v > max) return undefined;
  return v;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  if (request.headers.get("content-length") !== "0") {
    try {
      body = (await request.json()) as Body;
    } catch {
      // Empty or invalid JSON is fine — scanner has defaults for every param.
      body = {};
    }
  }

  const result = await scanMergeCandidates({
    threshold: toNum(body.threshold, 0, 1),
    dateWindowDays: toNum(body.dateWindowDays, 0, 365),
    dryRun: body.dryRun === true,
    limit: toNum(body.limit, 1, 10000),
  });

  return Response.json(result);
}
