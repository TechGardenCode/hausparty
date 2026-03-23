import { processPendingSubmissions } from "@/lib/services/submission-processor";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingSubmissions();
  return Response.json(result);
}
