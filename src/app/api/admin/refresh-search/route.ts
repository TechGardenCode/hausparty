import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("refresh_search_view");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ refreshed: true, timestamp: new Date().toISOString() });
}
