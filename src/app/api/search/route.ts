import { NextResponse, type NextRequest } from "next/server";
import { typeaheadSearch } from "@/lib/queries/search";

const MAX_QUERY_LENGTH = 100;
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ sets: [], artists: [], festivals: [] });
  }
  if (q.length > MAX_QUERY_LENGTH || CONTROL_CHAR_RE.test(q)) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  const results = await typeaheadSearch(q);
  return NextResponse.json(results);
}
