import { NextResponse, type NextRequest } from "next/server";
import { typeaheadSearch } from "@/lib/queries/search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ sets: [], artists: [], festivals: [] });
  }

  const results = await typeaheadSearch(q);
  return NextResponse.json(results);
}
