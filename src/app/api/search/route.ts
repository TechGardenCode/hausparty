import { NextResponse, type NextRequest } from "next/server";
import { typeaheadSearch } from "@/lib/queries/search";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  checkLimit,
  clientIp,
  rateLimitHeaders,
  type LimiterSpec,
} from "@/lib/rate-limit";
import { measureHandler } from "@/lib/metrics";

const MAX_QUERY_LENGTH = 100;
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/;

const SEARCH_UNAUTH: LimiterSpec = {
  keyPrefix: "rl:search:ip",
  points: 20,
  duration: 60,
};
const SEARCH_AUTH: LimiterSpec = {
  keyPrefix: "rl:search:u",
  points: 60,
  duration: 60,
};

export async function GET(request: NextRequest) {
  return measureHandler("/api/search", "GET", async () => {
    const user = await getCurrentUser();
    const spec = user ? SEARCH_AUTH : SEARCH_UNAUTH;
    const subject = user ? user.id : clientIp(request);

    const limit = await checkLimit(spec, subject);
    const headers = rateLimitHeaders(spec, limit);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "rate limited" },
        { status: 429, headers },
      );
    }

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json(
        { sets: [], artists: [], festivals: [] },
        { headers },
      );
    }
    if (q.length > MAX_QUERY_LENGTH || CONTROL_CHAR_RE.test(q)) {
      return NextResponse.json({ error: "invalid query" }, { status: 400, headers });
    }

    const results = await typeaheadSearch(q);
    return NextResponse.json(results, { headers });
  });
}
